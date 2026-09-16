import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';

export const ARMS = {
  A: { title: 'Tanpa aturan requirement', short: 'LLM', description: 'DOM dan tujuan tes diberikan ke model. Kandidat diperiksa secara struktural.' },
  B: { title: 'Requirement sebagai konteks', short: 'LLM + konteks', description: 'Aturan requirement ikut diberikan ke model. Belum ada pemeriksaan aturan sebelum aksi.' },
  C: { title: 'Requirement diperiksa sebelum aksi', short: 'LLM + pemeriksaan', description: 'Konteks model sama dengan B, ditambah pemeriksaan aturan pada elemen sebelum pemulihan.' },
};
export const CATEGORIES = { control: 'Tanpa perubahan', ordinary: 'Perubahan biasa', negative: 'Target hilang / fitur nonaktif', stress: 'Label menyesatkan', quality: 'Requirement hilang / usang' };
export const GROUPS = { platform: 'Platform pembelajaran', warehouse: 'Aplikasi uji gudang', shipment: 'Aplikasi uji pengiriman' };
export const KIND_NAMES = {control:'Tanpa perubahan', 'attribute-drift':'Atribut berubah', 'structure-drift':'Struktur berubah', 'semantic-paraphrase':'Istilah berubah', 'ambiguity-distractor':'Label menyesatkan', 'target-absent':'Target dihilangkan', 'explicitly-retired':'Fitur dinonaktifkan', 'missing-spec':'Requirement tidak tersedia', 'stale-spec':'Versi requirement usang'};
const hash = text => createHash('sha256').update(text).digest('hex');
const safeNumber = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
export function usageOf(event) {
  const called = (event?.attempts ?? []).filter(a => a.providerCalled);
  const unknown = called.some(a => !a.usage || a.transportAttempted == null);
  return { requests: called.filter(a => a.transportAttempted === true).length, unknown,
    input: unknown ? null : called.reduce((n,a) => n + (a.usage?.inputTokens ?? 0),0),
    output: unknown ? null : called.reduce((n,a) => n + (a.usage?.outputTokens ?? 0),0) };
}
function detailOf(event, privateHost) {
  // Private host payloads, locators, DOM, task text, field values and state are never copied.
  return { original: privateHost ? null : event?.originalSelector ?? null,
    action: event?.action ?? null, stop: event?.stopReason ?? 'unavailable',
    applicability: event?.targetSpec?.applicability ?? null,
    decision: event?.targetSpec?.decision?.outcome ?? null,
    reason: event?.targetSpec?.decision?.reason ?? null,
    attempts: (event?.attempts ?? []).map(a => ({ number:a.number, proposal:privateHost ? null : a.proposedSelector ?? null,
      accepted:a.candidateAccepted === true, executed:a.actionExecuted === true, failure:a.failure, reason:a.reason,
      providerMs:safeNumber(a.providerMs) })), privateHost };
}
export function normalizeSynthetic(r) {
  const e = r.run?.events?.[0];
  const scope = r.scope;
  const category = scope === 'misleading-label-stress' ? 'stress' : scope === 'contract-quality' ? 'quality' : scope?.startsWith('ordinary') ? 'ordinary' : scope;
  return { id:`synthetic:${r.caseId}:${r.arm}:${r.repeat}`, caseId:r.caseId, arm:r.arm, repeat:r.repeat,
    group:r.group === 'warehouse-inventory' ? 'warehouse' : 'shipment', category, kind:r.kind, fresh:Boolean(r.fresh),
    title:r.group === 'warehouse-inventory' ? 'Mengubah batas pemesanan stok gudang Harbor' : 'Membuka editor alamat tujuan pengiriman CN-804',
    status:r.status === 'complete' ? 'complete' : r.status, correct:r.assessment?.semantic === 'correct' && !r.assessment?.wrongEffect,
    wrong:r.assessment?.wrongEffect === true, operational:Boolean(r.operational), executed:e?.actionExecuted === true,
    recovery:e?.recoveryTriggered === true, totalMs:safeNumber(e?.totalMs), usage:usageOf(e), detail:detailOf(e,false) };
}
export function normalizePrivate(r) {
  const titles = { profile:'Mengisi identitas sertifikat', search:'Mencari materi pembelajaran', navigation:'Membuka menu pembelajaran', entity:'Memilih entitas pada daftar' };
  return { id:`platform:${r.caseId}:${r.method}:${r.repeat}`, caseId:r.caseId, arm:r.method, repeat:r.repeat,
    group:'platform', category:r.caseClass === 'recoverable' ? 'ordinary' : r.caseClass, kind:r.caseClass, fresh:false,
    title:titles[r.flow] ?? 'Alur platform pembelajaran', status:r.status === 'completed' ? 'complete' : r.status,
    correct:r.correct === true && !r.wrongEffect, wrong:r.wrongEffect === true, operational:r.operationalFailure === true,
    executed:r.event?.actionExecuted === true, recovery:r.event?.recoveryTriggered === true,
    totalMs:safeNumber(r.event?.totalMs), usage:usageOf(r.event), detail:detailOf(r.event,true) };
}
export function validateRows(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('No evaluation records supplied');
  const ids = new Set();
  for (const r of rows) {
    if (!ARMS[r.arm] || !CATEGORIES[r.category] || !GROUPS[r.group] || !Number.isInteger(r.repeat) || r.repeat < 1 || typeof r.caseId !== 'string') throw new Error('Invalid evaluation identity');
    const key = `${r.group}/${r.caseId}/${r.arm}/${r.repeat}`;
    if(ids.has(key)) throw new Error(`Duplicate evaluation slot: ${key}`); ids.add(key);
    if(['correct','wrong','operational','executed','recovery'].some(k=>typeof r[k] !== 'boolean')) throw new Error('Invalid evaluation outcome');
    if(r.correct && r.wrong) throw new Error('Contradictory correct/wrong outcome');
    if(!r.usage || !Number.isInteger(r.usage.requests) || r.usage.requests < 0) throw new Error('Invalid usage');
  }
  return rows;
}
export function summarize(rows) {
  const complete=rows.filter(r=>r.status==='complete');
  const usageUnknown=rows.some(r=>r.usage.unknown);
  return { planned:rows.length, complete:complete.length,
    correct:complete.filter(r=>r.correct).length, wrong:complete.filter(r=>r.wrong).length,
    stops:complete.filter(r=>!r.executed&&!r.operational).length, operational:rows.filter(r=>r.operational).length,
    requests:rows.reduce((n,r)=>n+r.usage.requests,0),
    input:usageUnknown?null:rows.reduce((n,r)=>n+(r.usage.input??0),0), output:usageUnknown?null:rows.reduce((n,r)=>n+(r.usage.output??0),0),
    seconds:complete.length && complete.every(r=>r.totalMs!==null) ? complete.reduce((n,r)=>n+r.totalMs,0)/complete.length/1000 : null };
}
export async function loadEvidence({synthetic, privateDirectory, snapshot}) {
  const sources=[]; let rows=[];
  if(snapshot) {
    const raw=await readFile(snapshot,'utf8'), saved=JSON.parse(raw);
    if(saved.schemaVersion!==1 || saved.evidenceKind!=='historical-d30') throw new Error('Unsupported snapshot');
    rows=saved.rows; sources.push(...saved.sources);
  } else if(synthetic) {
    const raw=await readFile(synthetic,'utf8'); rows=JSON.parse(raw).map(normalizeSynthetic);
    sources.push({name:basename(synthetic),kind:'independent-apps',sha256:hash(raw),slots:rows.length});
  }
  if(privateDirectory) {
    const files=(await readdir(privateDirectory)).filter(f=>/^F-[CRN]\d+-[ABC]-r\d+\.json$/.test(f)).sort();
    if(!files.length) throw new Error('Configured private source has no run records');
    const hashes=[];
    for(const file of files) {const raw=await readFile(join(privateDirectory,file),'utf8');rows.push(normalizePrivate(JSON.parse(raw)));hashes.push({file,sha256:hash(raw)});}
    sources.push({name:'Private host · selected outcome fields only',kind:'private-host',sha256:hash(JSON.stringify(hashes)),slots:files.length});
  }
  validateRows(rows);
  const privateLoaded=rows.some(r=>r.group==='platform');
  const coverage=[];
  for(const [name,expected,selection] of [['independent-apps',198,rows.filter(r=>r.group!=='platform')],['private-host',180,rows.filter(r=>r.group==='platform')]]) {
    if(!selection.length) {coverage.push(`${name}: sumber belum dimuat`);continue;}
    if(selection.length!==expected || selection.some(r=>r.status!=='complete')) coverage.push(`${name}: ${selection.filter(r=>r.status==='complete').length}/${expected} eksekusi selesai`);
    const keys=new Set(selection.map(r=>`${r.caseId}/${r.arm}/${r.repeat}`));
    for(const id of new Set(selection.map(r=>r.caseId))) for(const arm of ['A','B','C']) for(let repeat=1;repeat<=3;repeat++) if(!keys.has(`${id}/${arm}/${repeat}`)) coverage.push(`Slot tidak tersedia: ${id}/${arm}/${repeat}`);
  }
  return {schemaVersion:1,evidenceKind:'historical-d30',createdAt:new Date().toISOString(),evaluationDate:'2026-09-15',
    title:'Perbandingan self-healing', privateLoaded,sources,coverage,rows,price:{inputUsdPerMillion:0.15,outputUsdPerMillion:0.6,version:'D30 retained price assumption'}};
}
