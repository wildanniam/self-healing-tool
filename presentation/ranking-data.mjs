import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildAudit, diagnosticData} from './audit.mjs';
import {usageOf, validateRows} from './data.mjs';

const hash = raw => createHash('sha256').update(raw).digest('hex');
export const RANKING_ARMS = {
  R0:{title:'Jaccard dengan relasi', short:'Jaccard', description:'Baseline leksikal; field relasional tetap tersedia.'},
  R1:{title:'TA tanpa skor relasional', short:'Tanpa skor relasi', description:'Kontribusi relasional pada skor dihapus; field relasi tetap ada dalam input.'},
  R2:{title:'Formula TA penuh', short:'TA penuh', description:'Formula lengkap. Representasi, batas input dan model sama; kontrak target dimatikan.'},
};

export function normalizeRanking(record, source) {
  if(record.phase !== 'main' || !RANKING_ARMS[record.arm] || !/^[WS]-[AS]-[UDL]$/.test(record.caseId)
    || record.status !== 'complete' || !record.assessment || !Array.isArray(record.audits)
    || !record.run?.events?.length) throw new Error('Invalid D33 main record');
  const event=record.run.events[0], first=record.audits[0], coverage=record.requests?.[0]?.coverage;
  if(!first?.coverageStages || typeof coverage?.targetPresent!=='boolean') throw new Error('Missing D33 coverage evidence');
  const packets=(record.requests??[]).map(r=>({ordinal:r.ordinal,payload:r.payload,sha256:r.sha256,output:r.response?.output}));
  const audit=buildAudit({...record,requestPayloads:packets},{source,mode:'historical-d33'});
  audit.dom=diagnosticData({raw:record.rawDom??null,cleaned:first.cleanedDom??null,ranked:first.ranked,
    stages:first.coverageStages,observations:record.audits.map(a=>({stages:a.coverageStages,timingsMs:a.timingsMs}))});
  audit.missing=['Per-feature score contributions are not recorded. Evaluation target annotations are not AI inputs.',
    ...(record.rawDom==null?['Raw DOM was not recorded.']:[])];
  const family=record.caseId[0]==='W'?'warehouse':'shipment';
  return {id:`ranking:${record.caseId}:${record.arm}:${record.repeat}`,studyId:'rm1',caseId:record.caseId,
    arm:record.arm,repeat:record.repeat,group:family,category:'ordinary',kind:record.caseId[2]==='A'?'attribute-drift':'structure-drift',
    profile:record.caseId.at(-1),fresh:false,title:event.task?.description??record.caseId,status:'complete',
    correct:record.assessment.correctEffect===true && !record.assessment.wrongEffect,wrong:record.assessment.wrongEffect===true,
    assessed:typeof record.assessment.correctEffect==='boolean',operational:Boolean(record.harnessError),
    executed:event.actionExecuted===true,recovery:event.recoveryTriggered===true,
    totalMs:Number.isFinite(record.wrapperMs)?record.wrapperMs:null,usage:usageOf(event),
    ranking:{targetPresent:coverage.targetPresent,rank:first.coverageStages.rank,extracted:first.coverageStages.extracted,
      top30:first.coverageStages.top30,afterBudget:first.coverageStages.afterBudget,included:coverage.finalCandidateCount},
    detail:{original:event.originalSelector,action:event.action,stop:event.stopReason,privateHost:false,
      attempts:event.attempts.map(a=>({number:a.number,proposal:a.proposedSelector,accepted:a.candidateAccepted,executed:a.actionExecuted,reason:a.reason}))},audit};
}

/** Read only declared main records. Pilot/diagnostic ledgers are never consumed. */
export async function loadRankingEvidence(directory) {
  const files=(await readdir(directory)).filter(f=>/^continuation-v1-main-[WS]-[AS]-[UDL]-R[012]-r[123]\.json$/.test(f)).sort();
  if(!files.length) throw new Error('Configured D33 directory has no main records');
  const rows=[],manifest=[];
  for(const file of files){
    const raw=await readFile(join(directory,file),'utf8'),sha256=hash(raw),source={file,sha256};
    const record=JSON.parse(raw);
    if(file!==`continuation-v1-main-${record.caseId}-${record.arm}-r${record.repeat}.json`)throw new Error('D33 filename and record identity differ');
    rows.push(normalizeRanking(record,source));manifest.push(source);
  }
  validateRows(rows,RANKING_ARMS);
  const expected=[];
  for(const family of ['W','S'])for(const mutation of ['A','S'])for(const profile of ['U','D','L'])
    for(const arm of Object.keys(RANKING_ARMS))for(let repeat=1;repeat<=3;repeat++)expected.push(`${family}-${mutation}-${profile}/${arm}/${repeat}`);
  const keys=new Set(rows.map(r=>`${r.caseId}/${r.arm}/${r.repeat}`));
  const missing=expected.filter(k=>!keys.has(k));
  return {schemaVersion:1,studyId:'rm1',evidenceKind:'historical-d33',evaluationDate:'2026-09-18',
    createdAt:new Date().toISOString(),title:'Pemeringkatan DOM',arms:RANKING_ARMS,rows,privateLoaded:false,privateAudit:false,
    coverage:missing.length?[`D33 tidak lengkap: ${rows.length}/108 slot; ${missing.length} slot tidak tersedia.`]:[],
    sources:[{name:'D33 continuation main records',kind:'ranking-main',sha256:hash(JSON.stringify(manifest)),slots:rows.length}],
    price:{inputUsdPerMillion:.15,outputUsdPerMillion:.6,version:'D33 main retained rate assumption'}};
}
