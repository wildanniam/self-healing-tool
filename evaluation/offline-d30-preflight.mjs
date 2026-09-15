import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {chromium} from 'playwright';
import * as tool from '../dist/index.js';
import {collectContext} from '../dist/context.js';
import {buildSpecContext} from '../dist/spec.js';
import {createCases,nativeReferences} from './d30-cases.mjs';
import {root,sha,walk,assertCleanPayload,historicalProvenance,reservation} from './d29-audit-utils.mjs';

if(process.env.OPENAI_API_KEY)throw new Error('Preflight must not receive API credentials');
const study=JSON.parse(readFileSync(join(root,'evaluation/d30-config.json'),'utf8'));
const config=tool.validateConfig(study.config),records=[];
const history=historicalProvenance();
const oldCore='/Users/wildanniam/Development/project-ta/self-healing-tool/output/d29/frozen-inputs';
let unchangedCore=0;
for(const dir of ['src','dist'])for(const path of walk(join(root,dir))){
  assert.equal(sha(readFileSync(path)),sha(readFileSync(join(oldCore,relative(root,path)))),`D29 core changed: ${relative(root,path)}`);unchangedCore++;
}
const server=createServer((_,res)=>res.end('<!doctype html><title>Local preflight</title>'));
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 for(const item of createCases()){
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();await page.goto(origin);await item.setup(page);
  let firstB=null;
  for(const arm of ['A','B','C']){
   const omitted=item.value?[item.value]:[];
   const options=arm==='A'?undefined:{mode:arm==='B'?'context':'enforce',contract:item.contractPath?await tool.loadTargetSpec(item.contractPath):null,expectedRevision:item.expectedRevision};
   const input=await collectContext(page,item.action,item.task,config,omitted,item.originalSelector,options?buildSpecContext(options,item.action,omitted):undefined);
   const payload=tool.serializeRequest(input,config);assertCleanPayload(payload);
   const body=JSON.parse(payload);assert.equal(body.model,study.model);assert.equal(body.temperature,0);assert.equal(body.max_tokens,500);assert(payload.length<=12000);
   if(arm==='B')firstB=payload;if(arm==='C')assert.equal(payload,firstB,'B/C input parity');
   const target=page.locator(nativeReferences(item).intended);
   let targetRepresented=false;
   if(await target.count()===1)for(const candidate of input.candidates){
    for(const selector of new Set([candidate.selector,...(candidate.suggestedLocators??[])])){
     try{const loc=page.locator(selector);if(await loc.count()===1){const h=await target.elementHandle();targetRepresented ||= await loc.evaluate((node,expected)=>node===expected,h);await h?.dispose();}}catch{}
    }
   }
   records.push({caseId:item.id,arm,scope:item.scope,fresh:Boolean(item.fresh),payload,sha256:sha(payload),coverage:input.coverage,targetRepresented,...reservation(study,payload)});
  }
  await context.close();
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
const out=join(root,'output/d30/offline');mkdirSync(out,{recursive:true,mode:0o700});
const report={passed:true,providerCalls:0,healerRuns:0,unchangedCore,knownHistory:history.sourceFreezeSha256,checks:records.length,records,firstAttemptReservationEstimate:records.filter(r=>r.scope!=='control'&&!(r.arm==='C'&&['contract-quality','negative'].includes(r.scope))).reduce((s,r)=>s+r.reservedUsd*3,0)};
const text=JSON.stringify(report,null,2)+'\n';writeFileSync(join(out,'preflight.json'),text,{flag:'wx',mode:0o600});
const files=[...walk(join(root,'src')),...walk(join(root,'dist')),...walk(join(root,'evaluation')).filter(p=>relative(join(root,'evaluation'),p).split('/').length===1&&/d30/.test(p)),join(root,'docs/evaluation/scoped-d30-protocol.md')];
writeFileSync(join(out,'status.json'),JSON.stringify({passed:true,providerCalls:0,report:relative(root,join(out,'preflight.json')),reportSha256:sha(text),sourceManifest:files.map(path=>({path:relative(root,path),sha256:sha(readFileSync(path))}))},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:true,payloads:records.length,unchangedCore,providerCalls:0,firstAttemptReservationEstimate:report.firstAttemptReservationEstimate}));
