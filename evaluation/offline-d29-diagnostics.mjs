import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {createCases,nativeReferences} from './holdout/cases.mjs';
import {root,historicalRoot,historicalProvenance,sha,reservation,assertCleanPayload,walk} from './d29-audit-utils.mjs';

const out=resolve(process.env.D29_OFFLINE_OUTPUT ?? join(root,'output/d29/offline'));
if(existsSync(join(out,'diagnostics.json'))) throw new Error('Offline output already exists; preserve it and choose a new D29_OFFLINE_OUTPUT');
mkdirSync(out,{recursive:true,mode:0o700});
const study=JSON.parse(readFileSync(join(root,'evaluation/d29-config.json'),'utf8'));
const before=historicalProvenance();
const tools={D27:await import(pathToFileURL(join(historicalRoot,'frozen-inputs/dist/index.js')).href),D29:await import(pathToFileURL(join(root,'dist/index.js')).href)};
const {collectContext}=await import(pathToFileURL(join(root,'dist/context.js')).href);
const {buildSpecContext}=await import(pathToFileURL(join(root,'dist/spec.js')).href);
const cases=createCases(),forced=[],payloads=[],checks=[];
const check=(name,condition)=>{assert(condition,name);checks.push(name);};
const server=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>D29 local diagnostic host</title>');});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser,failure=null,externalRequests=0;
const selected=['h1-01','h2-01','h1-05','h2-03','h2-04'];
const config=tools.D29.validateConfig(study.config);
try {
 browser=await chromium.launch({headless:true});
 const newPage=async()=>{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){externalRequests++;return route.abort();}return route.continue();});
  const page=await context.newPage();await page.goto(origin);return {context,page};
 };
 for(const version of ['D27','D29']) for(const id of selected) for(const arm of ['A','B','C']) for(const choice of ['intended','wrong']){
  const item=cases.find(item=>item.id===id),lib=tools[version],{context,page}=await newPage();
  await item.setup(page);
  const requests=[];
  const provider={kind:'offline',async select(input){const payload=lib.serializeRequest(input,config);assertCleanPayload(payload);requests.push({sha256:sha(payload),payload});return {output:JSON.stringify({selector:nativeReferences(item)[choice]}),usage:{inputTokens:0,outputTokens:0},transportAttempted:false};}};
  const options={config:{...study.config,actionTimeoutMs:200},provider,omitValues:item.value?[item.value]:[]};
  if(arm!=='A')options.targetSpec={mode:arm==='B'?'context':'enforce',contract:item.contractPath?await lib.loadTargetSpec(item.contractPath):null,expectedRevision:item.expectedRevision};
  const session=lib.createHealingSession(page,options);let wrapperFailure=null;
  try{if(item.action==='fill')await session.fill(item.originalSelector,item.value,item.task);else await session.click(item.originalSelector,item.task);}catch(error){wrapperFailure=error.name;}
  const event=session.snapshot().events[0];
  if(event.actionExecuted&&item.afterAction)await item.afterAction(page,event);
  const assessment=await item.assess(page,event);
  forced.push({version,caseId:id,arm,forcedChoice:choice,suppliedSelector:nativeReferences(item)[choice],wrapperFailure,requests,run:session.snapshot(),assessment});
  check(`${version}/${id}/${arm}/${choice}: no operational failure`,!['provider','context','budget'].includes(event.failure));
  if(item.kind==='control')check(`${version}/${id}/${arm}/${choice}: untouched control`,event.stopReason==='original-success'&&requests.length===0&&assessment.semantic==='correct'&&!assessment.wrongEffect);
  if(item.kind!=='control'&&arm!=='C')check(`${version}/${id}/${arm}/${choice}: oracle sees forced choice`,event.actionExecuted&&assessment.semantic===(choice==='intended'?'correct':'incorrect')&&assessment.wrongEffect===(choice==='wrong'));
  await context.close();
 }
 // Exact current first payload for all noncontrol conditions, without paying or selecting a target.
 for(const item of cases.filter(item=>item.kind!=='control')) for(const arm of ['A','B','C']){
  const {context,page}=await newPage();await item.setup(page);
  const options=arm==='A'?undefined:{mode:arm==='B'?'context':'enforce',contract:item.contractPath?await tools.D29.loadTargetSpec(item.contractPath):null,expectedRevision:item.expectedRevision};
  const input=await collectContext(page,item.action,item.task,config,item.value?[item.value]:[],item.originalSelector,options?buildSpecContext(options,item.action,item.value?[item.value]:[]):undefined);
  const payload=tools.D29.serializeRequest(input,config);assertCleanPayload(payload);
  payloads.push({caseId:item.id,arm,kind:item.kind,sha256:sha(payload),...reservation(study,payload),coverage:input.coverage,payload});
  await context.close();
 }
 for(const item of cases.filter(item=>item.kind!=='control')){
  check(`${item.id}: B/C exact first payload parity`,payloads.find(r=>r.caseId===item.id&&r.arm==='B').sha256===payloads.find(r=>r.caseId===item.id&&r.arm==='C').sha256);
 }
 // Sentinels belong only to an ephemeral independent privacy diagnostic, never empirical fixtures.
 {
  const {context,page}=await newPage();
  await page.setContent('<section aria-label="Owner Alpha"><h2>Owner Alpha</h2><input id="safe-input" aria-label="Display name" value="D29_PRIVATE_SENTINEL"><div data-oracle="true">D29_ORACLE_SENTINEL</div><aside hidden>D29_HIDDEN_SENTINEL</aside><button id="safe-button">Save</button></section>');
  for(const action of ['fill','click']){
   const input=await collectContext(page,action,{description:'Update display name for Owner Alpha'},config,['D29_PRIVATE_SENTINEL'],'#missing');
   assertCleanPayload(tools.D29.serializeRequest(input,config));
   check(`${action}: private/oracle/hidden sentinels excluded`,true);
  }
  await context.close();
 }
 check('no external browser requests',externalRequests===0);
 assert.deepEqual(historicalProvenance(),before);check('D27 source/build/results and all fixture bytes unchanged',true);
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
const firstPassReservation=payloads.reduce((sum,row)=>sum+row.reservedUsd,0)*study.holdout.repeats;
const constantPayloadThreeAttemptProjection=firstPassReservation*study.config.maxAttempts;
// Static payloadMaxChars allows four UTF-8 bytes per UTF-16 code unit as an intentionally loose ceiling.
const absolutePerRequest=((study.config.payloadMaxChars*4+1024)*study.price.inputUsdPerMillion+study.config.maxTokens*study.price.outputUsdPerMillion)/1e6;
const theoreticalNoncontrolRequests=(cases.length-2)*3*study.holdout.repeats*study.config.maxAttempts;
const estimate={firstPassReservationUsd:firstPassReservation,constantPayloadThreeAttemptProjectionUsd:constantPayloadThreeAttemptProjection,
 constantPayloadProjectionFits:constantPayloadThreeAttemptProjection<=study.maxCostUsd,hardCapUsd:study.maxCostUsd,maxRequests:study.maxRequests,theoreticalNoncontrolRequests,
 conservativeByteEnvelopeUsd:absolutePerRequest*theoreticalNoncontrolRequests,fullBatchGuaranteedWithinBudget:false,
 caveats:['Exact first payload reservations; not an actual-token billing forecast','Three-attempt projection repeats initial payload size; later feedback/refreshed payload may differ','Absolute byte bound intentionally loose; ledger enforces per-request cumulative reservations','No cap increase or automatic top-up; preserve unstarted slots if exhausted']};
const output={kind:'offline-forced-selector-and-payload-diagnostic',createdAt:new Date().toISOString(),node:process.version,playwright:JSON.parse(readFileSync(join(root,'node_modules/playwright/package.json'),'utf8')).version,
 passed:failure===null,providerCalls:0,liveProviderCalls:0,offlineSelectionInvocations:forced.reduce((sum,row)=>sum+row.requests.length,0),paidCalls:0,externalRequests,diagnosticActionTimeoutMs:200,empiricalActionTimeoutMs:study.config.actionTimeoutMs,
 checks,forced,payloads,reservationPrecheck:estimate,historicalProvenance:before,failure,
 limitations:['Forced output is an evaluator intervention, not an observed AI decision','No correct selector, native reference, expectation or business state is used in ordinary collected payloads','This output is not additional empirical success-rate evidence']};
const text=JSON.stringify(output,null,2)+'\n';writeFileSync(join(out,'diagnostics.json'),text,{flag:'wx',mode:0o600});
writeFileSync(join(out,'status.json'),JSON.stringify({passed:output.passed,providerCalls:0,report:relative(root,join(out,'diagnostics.json')),reportSha256:sha(text),sourceManifest: [...new Set([...walk(join(root,'src')),...walk(join(root,'dist')),join(root,'evaluation/offline-d29-diagnostics.mjs'),join(root,'evaluation/d29-audit-utils.mjs'),join(root,'evaluation/d29-config.json')])].map(path=>({path:relative(root,path),sha256:sha(readFileSync(path))})),reservationPrecheck:estimate},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:output.passed,checks:checks.length,forcedRuns:forced.length,firstPayloads:payloads.length,reservationPrecheck:estimate,report:join(out,'diagnostics.json'),failure}));
if(failure)process.exitCode=1;
