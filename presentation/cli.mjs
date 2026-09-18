import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { loadEvidence } from './data.mjs';
import { renderReport } from './report.mjs';
import {loadRankingEvidence} from './ranking-data.mjs';
import {loadReportSnapshot} from './snapshot.mjs';

export function parseArgs(args) {
  const result={open:true,headless:false,live:false,walkthrough:false,step:false,pause:1500};
  const values={'--synthetic':'synthetic','--private':'privateDirectory','--snapshot':'snapshot','--ranking':'rankingDirectory','--out':'out','--env-file':'envFile','--pause':'pause'};
  for(let i=0;i<args.length;i++) {
    const a=args[i];
    if(a==='--no-open')result.open=false;
    else if(a==='--headless')result.headless=true;
    else if(a==='--live')result.live=true;
    else if(a==='--walkthrough')result.walkthrough=true;
    else if(a==='--step')result.step=true;
    else if(a==='--private-audit')result.privateAudit=true;
    else if(a==='--summary-only')result.privateAudit=false;
    else if(a==='--help')result.help=true;
    else if(values[a]){if(!args[i+1]||args[i+1].startsWith('--'))throw new Error(`Missing value for ${a}`);result[values[a]]=args[++i];}
    else throw new Error(`Unknown option: ${a}`);
  }
  result.pause=Number(result.pause);
  if(!Number.isFinite(result.pause)||result.pause<0||result.pause>10000)throw new Error('--pause must be 0–10000 milliseconds');
  if(result.live&&!result.walkthrough)throw new Error('--live requires --walkthrough');
  if(result.envFile&&!result.live)throw new Error('--env-file is allowed only with explicit --live');
  if(result.step&&!result.walkthrough)throw new Error('--step requires --walkthrough');
  return result;
}
export async function openReport(file) {
  const command=process.platform==='darwin'?'open':process.platform==='win32'?'cmd':'xdg-open';
  const args=process.platform==='win32'?['/c','start','',file]:[file];
  await new Promise(resolvePromise=>{const child=spawn(command,args,{stdio:'ignore'});child.once('error',()=>{console.warn('Could not open a browser automatically. Open the report path below.');resolvePromise();});child.once('exit',code=>{if(code)console.warn('Browser opener exited unsuccessfully. Open the report path below.');resolvePromise();});});
}
export async function saveReport(data,directory,{open=false}={}) {
  await mkdir(directory,{recursive:true,mode:0o700});
  const json=join(directory,'results.json'),html=join(directory,'report.html');
  await writeFile(json,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
  await writeFile(html,renderReport(data),{flag:'wx',mode:0o600});
  if(open)await openReport(html);
  return {json,html};
}
export async function main(args=process.argv.slice(2)) {
  const options=parseArgs(args);
  if(options.help){console.log('npm run demo [-- --no-open | --private DIRECTORY | --snapshot FILE]\nD33 main archive: --ranking /path/to/main/records. Snapshot reopens a saved report without local source injection.\nLocal private inspection: --private-audit (or privateAudit: true in ignored local config); --summary-only omits private diagnostics.\nnpm run demo:walkthrough [-- --step | --headless --no-open --pause 0]\nnpm run demo:live:compare -- --env-file /absolute/path/to/.env\nDefault: historical report. Walkthrough: recorded model decisions. Live: explicit fresh API calls, maximum 27 requests / US$0.10 per invocation.');return;}
  const root=resolve(import.meta.dirname,'..');
  let local={};
  try{await access(join(root,'.presentation.local.json'));local=JSON.parse(await readFile(join(root,'.presentation.local.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const directory=resolve(options.out??join(root,'output/presentation',`${options.walkthrough?options.live?'live':'replay':'historical'}-${new Date().toISOString().replaceAll(':','-')}-${randomUUID().slice(0,8)}`));
  if(options.walkthrough){const {walkthrough}=await import('./walkthrough.mjs');const data=await walkthrough({...options,directory,root});const files=await saveReport(data,directory,options);console.log(JSON.stringify({mode:data.evidenceKind,slots:data.rows.length,mismatches:data.replayMismatches??[],...files}));if(data.replayMismatches?.length||data.rows.some(r=>r.operational))process.exitCode=1;return;}
  if(options.snapshot){
    const data=await loadReportSnapshot(options.snapshot,{includePrivateAudit:options.privateAudit??false});
    const files=await saveReport(data,directory,options);
    console.log(JSON.stringify({mode:data.evidenceKind,...files}));return;
  }
  const explicitSource=options.synthetic;
  const requirements=await loadEvidence({synthetic:options.synthetic??(!explicitSource?local.synthetic:undefined),snapshot:options.snapshot??(!explicitSource&&!local.synthetic?join(root,'presentation/data/d30-synthetic.json'):undefined),privateDirectory:options.privateDirectory??(!explicitSource?local.privateDirectory:undefined),includePrivateAudit:options.privateAudit??local.privateAudit??false});
  const rankingDirectory=options.rankingDirectory??(!explicitSource?local.rankingDirectory:undefined);
  const ranking=rankingDirectory?await loadRankingEvidence(rankingDirectory):null;
  const data={schemaVersion:2,evidenceKind:'research-archive',createdAt:new Date().toISOString(),
    studies:[...(ranking?[ranking]:[]),{...requirements,studyId:'rm2'}],
    coverage:ranking?[]:['RM1 belum dimuat. Gunakan --ranking DIRECTORY untuk arsip main D33.']};
  const files=await saveReport(data,directory,options);
  console.log(JSON.stringify({mode:data.evidenceKind,studies:data.studies.map(s=>({id:s.studyId,slots:s.rows.length,coverage:s.coverage})),...files}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(`Presentation failed: ${e.message}`);process.exitCode=1;});
