import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { chromium } from 'playwright';
import { createHealingSession, validateConfig, loadTargetSpec, createLiveBudget, createBudgetedOpenAIProvider, readLiveBudget, serializeRequest } from '../dist/index.js';
import { createCases } from '../evaluation/d30-cases.mjs';
import { normalizeSynthetic } from './data.mjs';
import {buildAudit} from './audit.mjs';

export function replayProvider(record,config) {
  let cursor=0;
  return {kind:'offline',configuration:config,async select(context){
    const stored=record.decisions[cursor++];
    if(!stored)throw new Error('Recorded model decisions exhausted');
    const inputHash=createHash('sha256').update(serializeRequest(context,config)).digest('hex');
    if(inputHash!==stored.inputSha256)throw new Error('Replay input differs from recorded model request');
    return {output:JSON.stringify({selector:stored.selector}),usage:{inputTokens:0,outputTokens:0},transportAttempted:false};
  }};
}
export async function walkthrough({root,directory,headless=false,live=false,envFile,pause=1500,step=false}) {
  if(step&&!process.stdin.isTTY)throw new Error('--step requires an interactive terminal');
  const archive=JSON.parse(await readFile(join(root,'presentation/data/replay.json'),'utf8'));
  const study=JSON.parse(await readFile(join(root,'evaluation/d30-config.json'),'utf8'));
  const config=validateConfig(study.config);
  if(live&&envFile)process.loadEnvFile(envFile);
  if(live&&!process.env.OPENAI_API_KEY?.trim())throw new Error('OPENAI_API_KEY is required for explicit live mode');
  await mkdir(directory,{recursive:true,mode:0o700});
  const ledgerPath=join(directory,'live-budget.json');
  if(live)createLiveBudget(ledgerPath,{id:'presentation-'+randomUUID(),model:config.model,maxRequests:27,maxCostUsd:0.10,phases:{demo:27},price:study.price});
  const liveProvider=live?createBudgetedOpenAIProvider({apiKey:process.env.OPENAI_API_KEY,config,ledgerPath,phase:'demo'}):null;
  const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Self-healing presentation</title>');});
  await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const rows=[],mismatches=[];let browser;
  const terminal=step?createInterface({input:process.stdin,output:process.stdout}):null;
  try {
    browser=await chromium.launch({headless});
    for(const caseId of archive.caseIds)for(const arm of ['A','B','C']) {
      const c=createCases().find(x=>x.id===caseId),stored=archive.records.find(r=>r.caseId===caseId&&r.arm===arm);
      if(!c||!stored)throw new Error('Missing walkthrough case or recorded provenance');
      console.log(`[${live?'LIVE':'REPLAY'}] ${caseId} · ${arm} · ${c.kind}`);
      const context=await browser.newContext({viewport:{width:1100,height:760},serviceWorkers:'block'});
      await context.routeWebSocket('**/*',socket=>socket.close());
      await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      let session;
      const record={caseId,arm,repeat:1,group:c.group,kind:c.kind,scope:c.scope,fresh:false,status:'complete',operational:null,expectation:c.expectation,requestPayloads:[]};
      try {
        const page=await context.newPage();await page.goto(origin);await c.setup(page);
        await page.evaluate(({arm,caseId,live})=>{document.title=`${arm} · ${caseId} · ${live?'LIVE':'REPLAY — recorded AI decision'}`;},{arm,caseId,live});
        if(terminal)await terminal.question('Tekan Enter untuk menjalankan konfigurasi ini… ');
        else if(pause)await page.waitForTimeout(pause);
        const underlying=liveProvider??replayProvider(stored,config);
        const provider={kind:underlying.kind,configuration:underlying.configuration,async select(input,signal){
          const payload=serializeRequest(input,config);
          const packet={ordinal:record.requestPayloads.length+1,payload,sha256:createHash('sha256').update(payload).digest('hex')};
          record.requestPayloads.push(packet);
          const result=await underlying.select(input,signal);
          packet.output=result.output;
          return result;
        }};
        const options={config,provider,omitValues:c.value?[c.value]:[]};
        if(arm!=='A')options.targetSpec={mode:arm==='B'?'context':'enforce',contract:c.contractPath?await loadTargetSpec(c.contractPath):null,expectedRevision:c.expectedRevision};
        session=createHealingSession(page,options);
        try {if(c.action==='fill')await session.fill(c.originalSelector,c.value,c.task);else await session.click(c.originalSelector,c.task);}catch(error){if(error.name!=='HealingFailure')throw error;}
        const event=session.snapshot().events[0];
        if(c.afterAction)await c.afterAction(page,event);
        record.assessment=await c.assess(page);
        session.assess({eventId:event.id,semantic:record.assessment.semantic,wrongEffect:record.assessment.wrongEffect});
        record.run=session.snapshot();
        if(record.run.events[0].stopReason==='provider-failure')record.operational='provider-failure';
        // Presenter annotation is added only AFTER recovery and the independent oracle.
        // It cannot contaminate candidate extraction or the exact replay input hash.
        await page.evaluate(({arm,caseId,live,task,executed,correct,wrong,stop})=>{
          const panel=document.createElement('aside');
          Object.assign(panel.style,{position:'fixed',bottom:'20px',right:'20px',maxWidth:'430px',padding:'20px',zIndex:'99999',background:'#15393f',color:'#f7f5ef',borderRadius:'8px',boxShadow:'0 8px 35px #0004',font:'14px/1.6 sans-serif'});
          const add=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;panel.append(node);};
          add('small',`${live?'LIVE · API baru':'REPLAY · keputusan AI tersimpan'} / ${caseId}`);
          add('h2',`${arm} · ${wrong?'Salah sasaran':correct?(executed?'Tujuan tercapai':'Berhenti tepat'):'Belum pulih'}`);
          add('p',task);add('p',`Aksi dijalankan: ${executed?'ya':'tidak'} · ${stop}`);
          document.body.append(panel);
        },{arm,caseId,live,task:c.task.description,executed:event.actionExecuted,correct:record.assessment.semantic==='correct',wrong:record.assessment.wrongEffect,stop:event.stopReason});
        await page.screenshot({path:join(directory,`${caseId}-${arm}.png`),fullPage:true});
        if(terminal)await terminal.question('Hasil terlihat di browser. Tekan Enter untuk melanjutkan… ');
        else if(pause)await page.waitForTimeout(pause);
        if(!live){const actual={correct:record.assessment.semantic==='correct',wrong:record.assessment.wrongEffect,executed:event.actionExecuted};if(JSON.stringify(actual)!==JSON.stringify(stored.expected)||record.operational)mismatches.push(`${caseId}/${arm}`);}
      }catch(error){record.status='failed';record.operational=error.message;record.run=session?.snapshot()??null;mismatches.push(`${caseId}/${arm}: ${error.message}`);}
      finally{await context.close();}
      rows.push({...normalizeSynthetic(record),audit:buildAudit(record,{mode:live?'live-demo':'replay',source:{file:'walkthrough-progress.json',historicalSourceSha256:archive.sourceSha256}})});
      await writeFile(join(directory,'walkthrough-progress.json'),JSON.stringify({evidenceKind:live?'live-demo':'replay',rows},null,2),{mode:0o600});
    }
  }finally{terminal?.close();await browser?.close();await new Promise(ok=>server.close(ok));}
  return {schemaVersion:1,evidenceKind:live?'live-demo':'replay',createdAt:new Date().toISOString(),evaluationDate:new Date().toISOString().slice(0,10),
    rows,coverage:[],replayMismatches:mismatches,sources:[{name:live?'Fresh bounded provider demonstration':'Retained D30 model decisions · three illustrative conditions',sha256:archive.sourceSha256,slots:rows.length}],
    price:{...study.price},...(live?{accounting:readLiveBudget(ledgerPath)}:{})};
}
