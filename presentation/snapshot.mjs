import {readFile} from 'node:fs/promises';
import {ARMS, validateRows} from './data.mjs';
import {RANKING_ARMS} from './ranking-data.mjs';

export async function loadReportSnapshot(path,{includePrivateAudit=false}={}){
  const saved=JSON.parse(await readFile(path,'utf8'));
  if(![1,2].includes(saved.schemaVersion))throw new Error('Unsupported snapshot version');
  const studies=saved.schemaVersion===2?saved.studies:[saved];
  if(!Array.isArray(studies)||!studies.length)throw new Error('No studies in snapshot');
  const seen=new Set();
  const normalized=studies.map(s=>{
    if(!['historical-d33','historical-d30','replay','live-demo'].includes(s.evidenceKind))throw new Error('Unsupported snapshot mode');
    const studyId=s.evidenceKind==='historical-d33'?'rm1':'rm2';
    if(seen.has(studyId))throw new Error('Duplicate study identity');seen.add(studyId);
    const arms=studyId==='rm1'?RANKING_ARMS:ARMS;validateRows(s.rows,arms);
    const rows=s.rows.map(row=>{
      if(!includePrivateAudit&&row.audit?.privateHost){const {audit,...safe}=row;return safe;}
      return row;
    });
    return {...s,studyId,arms,rows,privateAudit:includePrivateAudit&&rows.some(r=>r.audit?.privateHost)};
  });
  return {schemaVersion:2,evidenceKind:'research-archive',createdAt:new Date().toISOString(),
    snapshotCreatedAt:saved.createdAt,coverage:saved.coverage??[],studies:normalized};
}
