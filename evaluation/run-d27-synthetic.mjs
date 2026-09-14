import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, relative, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { isDeepStrictEqual } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const study = JSON.parse(readFileSync(join(root, 'evaluation/d27-config.json'), 'utf8'));
const out = resolve(process.env.D27_SYNTHETIC_OUTPUT ?? join(root, 'output/d27/synthetic-v1'));
const toolDir = resolve(process.env.D27_TOOL_DIST ?? join(root, 'dist'));
const baselineDir = toolDir; // All D27 arms share the repaired core; A has no target spec.
const ledgerPath = resolve(process.env.D27_LEDGER ?? join(root, 'output/d27/budget.json'));
const expectedPlan = Object.fromEntries(['id','model','maxRequests','maxCostUsd','phases','price'].map(key => [key, study[key]]));
const readLedger = () => {
  const ledger=JSON.parse(readFileSync(ledgerPath,'utf8'));
  if(ledger.version!==1 || !Array.isArray(ledger.requests) || !isDeepStrictEqual(ledger.plan,expectedPlan)) throw new Error('Ledger does not match the exact frozen D27 plan');
  return ledger;
};
const hash = value => createHash('sha256').update(value).digest('hex');
const walk = dir => readdirSync(dir).sort().flatMap(n => {
  const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p];
});
const runtimeIdentity=()=>({node:process.version,playwright:JSON.parse(readFileSync(join(root,'node_modules/playwright/package.json'),'utf8')).version,browsersSha256:hash(readFileSync(join(root,'node_modules/playwright-core/browsers.json')))});
const nativePreflight=()=>{
 const path=join(root,'output/d27/native/preflight-status.json');
 const preflight=JSON.parse(readFileSync(path,'utf8'));
 if(!preflight.passed||preflight.providerCalls!==0||preflight.healerRuns!==0||preflight.reportSha256!==hash(readFileSync(resolve(root,preflight.report))))throw new Error('Independent native preflight missing or changed');
 const fixtureRoot=join(root,'evaluation/holdout');
 const files=walk(fixtureRoot).filter(p=>!relative(fixtureRoot,p).split('/').includes('evidence')&&!p.endsWith('/preflight-status.json')).map(p=>({path:relative(fixtureRoot,p),sha256:hash(readFileSync(p))})).sort((a,b)=>a.path.localeCompare(b.path));
 const report=JSON.parse(readFileSync(resolve(root,preflight.report),'utf8'));
 if(!isDeepStrictEqual(files,report.files)||hash(JSON.stringify(files))!==preflight.bundleSha256||preflight.bundleSha256!==report.fixtureBundleSha256)throw new Error('Native preflight fixture bundle changed');
 return {sha256:hash(readFileSync(path)),...preflight};
};
const trackedInputs = () => [
  ...walk(join(root, 'src')), ...walk(toolDir),
  ...walk(join(root, 'evaluation/holdout')).filter(p => !p.includes('/output/') && !p.endsWith('native-results.json')),
  join(root, 'evaluation/run-d27-synthetic.mjs'), join(root, 'evaluation/d27-config.json'),
  join(root, 'evaluation/native-d27-preflight.mjs'), join(root, 'evaluation/analyze-d27-synthetic.mjs'), join(root, 'evaluation/analyze-holdout.mjs'),
  join(root, 'docs/evaluation/candidate-recovery-protocol.md'), join(root, 'package-lock.json'),
].map(path => ({path, sha256:hash(readFileSync(path))}));

if (process.argv.includes('--freeze')) {
  mkdirSync(out, {recursive:true, mode:0o700});
  const record = {id:study.id,createdAt:new Date().toISOString(),node:process.version,
    description:'Repaired shared core and unchanged known regression fixtures frozen before D27 collection; not an unseen holdout.',
    inputs:trackedInputs(),study,runtime:runtimeIdentity(),nativePreflight:nativePreflight(),ledgerPath,ledgerPlan:readLedger().plan,startingRequestIds:readLedger().requests.map(r=>r.id)};
  writeFileSync(join(out,'freeze.json'), JSON.stringify(record,null,2), {flag:'wx',mode:0o600});
  console.log(JSON.stringify({freeze:join(out,'freeze.json'),inputCount:record.inputs.length,sha256:hash(JSON.stringify(record))}));
  process.exit(0);
}
if (!process.argv.includes('--live')) throw new Error('Choose --freeze or explicit --live; no implicit paid execution');
if (!process.env.OPENAI_API_KEY) throw new Error('Explicit environment key required; no automatic file discovery');
const freeze = JSON.parse(readFileSync(join(out,'freeze.json'),'utf8'));
if(!isDeepStrictEqual(runtimeIdentity(),freeze.runtime)||!isDeepStrictEqual(nativePreflight(),freeze.nativePreflight))throw new Error('Runtime or native preflight changed after freeze');
const actual = trackedInputs();
if (JSON.stringify(actual)!==JSON.stringify(freeze.inputs)) throw new Error('Frozen input changed; do not reuse this held-out batch');
if (existsSync(join(out,'started.json'))) throw new Error('Holdout already started; preserve outputs and inspect before any resume');
const tool = await import(pathToFileURL(join(toolDir,'index.js')).href);
const baseline = await import(pathToFileURL(join(baselineDir,'index.js')).href);
const {createCases} = await import('./holdout/cases.mjs'); // only after freeze validation
const initialLedger=readLedger();
if(freeze.ledgerPath!==ledgerPath || !isDeepStrictEqual(freeze.ledgerPlan,initialLedger.plan) || !isDeepStrictEqual(initialLedger.requests.slice(0,freeze.startingRequestIds.length).map(r=>r.id),freeze.startingRequestIds)) throw new Error('Ledger provenance changed');
if(initialLedger.requests.some(r=>r.phase==='holdout')) throw new Error('Holdout ledger phase already used');
const cases = await createCases();
if(study.model!==study.config.model||new Set(cases.map(c=>c.id)).size!==cases.length||!Number.isSafeInteger(study.holdout.repeats)||study.holdout.repeats<1)throw new Error('Invalid study identity or repeats');
if(cases.length!==study.holdout.cases || new Set(cases.map(c=>c.group)).size!==study.holdout.applicationGroups) throw new Error('Unexpected held-out group/case count');
const schedule=[];
for(let repeat=1;repeat<=study.holdout.repeats;repeat++) for(let index=0;index<cases.length;index++) {
  const rotation=(index+repeat-1)%3;
  for(let j=0;j<3;j++) schedule.push({caseIndex:index,caseId:cases[index].id,group:cases[index].group,kind:cases[index].kind,repeat,arm:['A','B','C'][(j+rotation)%3]});
}
if(schedule.length!==study.holdout.slots||schedule.length!==144)throw new Error('Invalid holdout slot count');
writeFileSync(join(out,'schedule.json'),JSON.stringify(schedule,null,2),{flag:'wx',mode:0o600});
writeFileSync(join(out,'started.json'),JSON.stringify({createdAt:new Date().toISOString(),freezeSha256:hash(JSON.stringify(freeze)),slots:schedule.length}),{flag:'wx',mode:0o600});
const records=schedule.map((slot,slotIndex)=>({...slot,slotIndex,expectation:cases[slot.caseIndex].expectation,startedAt:null,status:'unstarted',operational:null,run:null,assessment:null,requestHashes:[]}));
if(records.some(r=>!r.expectation || !['action','refusal'].includes(r.expectation.goalExpected) || ['intendedRecoverable','specApplicable','recoveryExpected'].some(k=>typeof r.expectation[k]!=='boolean'))) throw new Error('Missing independent predeclared evaluator expectation');
const persist=()=>writeFileSync(join(out,'results.json'),JSON.stringify(records,null,2),{mode:0o600});
persist();
const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local evaluation</title>');});
const origin='http://127.0.0.1:4386';
let browser,globalFailure=null,budgetStop=null;
try {
  await new Promise((ok,no)=>{server.once('error',no);server.listen(4386,'127.0.0.1',ok);});
  browser=await chromium.launch({headless:true});
  for(let slotIndex=0;slotIndex<schedule.length;slotIndex++) {
    const slot=schedule[slotIndex], c=cases[slot.caseIndex];
    const record=records[slotIndex];
    const ledger=readLedger();
    if(ledger.requests.length>=ledger.plan.maxRequests||ledger.requests.filter(r=>r.phase==='holdout').length>=ledger.plan.phases.holdout)budgetStop='budget_exhausted';
    if(budgetStop || ledger.halted || ledger.requests.some(r=>r.status==='pending')) {
      record.operational=budgetStop??'budget_halted';
      persist();
      continue;
    }
    let context,session;const pendingSelections=[];const priorIds=new Set(ledger.requests.map(r=>r.id));
    record.startedAt=new Date().toISOString();
    try {
      context=await browser.newContext({serviceWorkers:'block'});
      await context.route('**/*',route=>new URL(route.request().url()).origin===origin ? route.continue() : route.abort());
      const page=await context.newPage();
      await page.goto(origin);
      await c.setup(page);
      const lib=slot.arm==='A'?baseline:tool;
      const config=lib.validateConfig(study.config);
      const underlying=lib.createBudgetedOpenAIProvider({apiKey:process.env.OPENAI_API_KEY,config,ledgerPath,phase:'holdout'});
      const provider={kind:underlying.kind,configuration:underlying.configuration,async select(input,signal){
        record.requestHashes.push(hash(lib.serializeRequest(input,config)));
        const pending=underlying.select(input,signal).catch(error=>{if(['request_limit_exhausted','provider_budget_cost_limit'].includes(error?.message))budgetStop='budget_exhausted';throw error;});pendingSelections.push(pending);
        return pending;
      }};
      const options={config,provider,repeatOf:`${c.group}:${c.id}`,omitValues:c.value?[c.value]:[]};
      if(slot.arm!=='A') {
        const contract=c.contractPath ? await tool.loadTargetSpec(c.contractPath) : null;
        options.targetSpec={mode:slot.arm==='B'?'context':'enforce',contract,expectedRevision:c.expectedRevision};
        record.contractSha256=hash(JSON.stringify({contract,expectedRevision:c.expectedRevision}));
      }
      session=lib.createHealingSession(page,options);
      try {
        if(c.action==='fill') await session.fill(c.originalSelector,c.value,c.task);
        else await session.click(c.originalSelector,c.task);
      } catch(error) {
        record.wrapperFailure=error?.name==='HealingFailure'?'HealingFailure':'action_failure';
      }
      const event=session.snapshot().events[0];
      if(!event) throw new Error('No event recorded');
      if(event.actionExecuted && c.afterAction) await c.afterAction(page,event);
      record.assessment=await c.assess(page,event);
      session.assess({eventId:event.id,semantic:record.assessment.semantic,wrongEffect:record.assessment.wrongEffect});
      record.run=session.snapshot();
      record.status='complete';
      record.operational=['provider','context','budget'].includes(event.failure)?event.failure:null;
      record.safetyStop=!event.actionExecuted && ['abstained','spec-refused','spec-unknown'].includes(event.stopReason);
      record.stopClass=event.stopReason==='spec-unknown'?'unknown':record.safetyStop?'refusal':null;
      if(event.context) record.contextSha256=hash(lib.serializeRequest(event.context,config));
    } catch(error) {
      record.status='failed';record.operational='harness_failure';
      record.failureClass=error?.name??'Error'; // never raw provider/browser error text
      record.run=session?.snapshot()??null;
    } finally {
      let settleTimer;
      await Promise.race([Promise.allSettled(pendingSelections),new Promise(ok=>{settleTimer=setTimeout(ok,3000);})]);clearTimeout(settleTimer);
      record.reservationIds=readLedger().requests.filter(r=>!priorIds.has(r.id)).map(r=>r.id);
      record.completedAt=new Date().toISOString();
      record.run=session?.snapshot()??record.run;
      if(context)await context.close().catch(()=>{record.cleanupFailure=true;});
      persist();
      console.log(JSON.stringify({slot:slotIndex+1,total:schedule.length,id:c.id,arm:slot.arm,repeat:slot.repeat,status:record.status,semantic:record.assessment?.semantic??null,wrongEffect:record.assessment?.wrongEffect??null,stop:record.run?.events[0]?.stopReason??null,operational:record.operational}));
    }
  }
} catch(error) { globalFailure=error?.name??'Error'; } finally {
  await browser?.close().catch(()=>{});if(server.listening)await new Promise(ok=>server.close(ok));
  if(globalFailure)for(const record of records)if(record.status==='unstarted'&&!record.operational)record.operational='interrupted';
  persist();
  const accounting=tool.readLiveBudget(ledgerPath);
  const groups=[];
  for(const arm of ['A','B','C']) {
    const runs=records.filter(r=>r.arm===arm),complete=runs.filter(r=>r.status==='complete');
    const recovered=runs.filter(r=>r.run?.events[0]?.recoveryTriggered && r.run?.events[0]?.actionExecuted);
    const assessed=recovered.filter(r=>['correct','incorrect'].includes(r.assessment?.semantic));
    const wrong=assessed.filter(r=>r.assessment.wrongEffect || r.assessment.semantic==='incorrect');
    const allowed=runs.filter(r=>r.expectation.goalExpected==='action'&&r.expectation.recoveryExpected&&r.expectation.specApplicable);
    const stopped=complete.filter(r=>r.safetyStop&&!r.operational&&r.assessment?.semantic==='correct'&&!r.assessment.wrongEffect);
    groups.push({arm,planned:runs.length,complete:complete.length,failed:runs.filter(r=>r.status==='failed').length,
      unstarted:runs.filter(r=>r.status==='unstarted').length,operational:runs.filter(r=>r.operational).length,
      acceptedRecovery:recovered.length,unassessedAccepted:recovered.length-assessed.length,incorrectAccepted:wrong.length,
      acceptedRisk:recovered.length&&assessed.length===recovered.length?wrong.length/recovered.length:null,
      correctRecoveries:assessed.filter(r=>r.assessment.semantic==='correct'&&!r.assessment.wrongEffect).length,
      wrongEffects:runs.filter(r=>r.assessment?.wrongEffect).length,
      recoverableOpportunities:runs.filter(r=>r.expectation.intendedRecoverable&&r.expectation.recoveryExpected).length,
      allowedRecoveryOpportunities:allowed.length,
      unnecessaryStops:allowed.filter(r=>r.safetyStop).length,
      appropriateStops:stopped.filter(r=>r.expectation.goalExpected==='refusal').length,
      appropriateRefusals:stopped.filter(r=>r.expectation.goalExpected==='refusal'&&r.stopClass==='refusal').length,
      appropriateUnknown:stopped.filter(r=>r.expectation.goalExpected==='refusal'&&r.stopClass==='unknown').length,
      refusalOpportunities:runs.filter(r=>r.expectation.goalExpected==='refusal').length,
      normalControls:runs.filter(r=>!r.expectation.recoveryExpected&&r.expectation.goalExpected==='action').length,
      controlInterference:complete.filter(r=>!r.expectation.recoveryExpected&&r.expectation.goalExpected==='action'&&r.run?.events[0]?.recoveryTriggered).length,
      normalCorrect:complete.filter(r=>!r.expectation.recoveryExpected&&r.expectation.goalExpected==='action'&&r.run?.events[0]?.stopReason==='original-success'&&!r.run.events[0].recoveryTriggered&&r.requestHashes.length===0&&r.assessment.semantic==='correct'&&!r.assessment.wrongEffect).length});
  }
  const parity=[];
  for(const c of cases) for(let repeat=1;repeat<=study.holdout.repeats;repeat++) {
    const b=records.find(r=>r.caseId===c.id&&r.repeat===repeat&&r.arm==='B'),cc=records.find(r=>r.caseId===c.id&&r.repeat===repeat&&r.arm==='C');
    parity.push({caseId:c.id,repeat,contractEqual:b?.contractSha256&&cc?.contractSha256?b.contractSha256===cc.contractSha256:null,
      firstRequestEqual:b?.requestHashes[0]&&cc?.requestHashes[0]?b.requestHashes[0]===cc.requestHashes[0]:null,
      contextEqual:b?.contextSha256&&cc?.contextSha256?b.contextSha256===cc.contextSha256:null});
  }
  const holdoutAccounting=accounting.requests.filter(r=>r.phase==='holdout');
  const subtotal=rows=>({reservations:rows.length,dispatched:rows.filter(r=>r.transportAttempted===true).length,notDispatched:rows.filter(r=>r.transportAttempted===false).length,unknownDispatch:rows.filter(r=>r.transportAttempted===null).length,inputTokens:rows.reduce((sum,r)=>sum+(r.usage?.inputTokens??0),0),outputTokens:rows.reduce((sum,r)=>sum+(r.usage?.outputTokens??0),0),knownCostUsd:rows.reduce((sum,r)=>sum+(r.actualCostUsd??0),0),costComplete:rows.every(r=>r.actualCostUsd!==null),unknownUsage:rows.filter(r=>r.actualCostUsd===null).length});
  const strata=[];for(const dimension of ['group','kind'])for(const value of new Set(records.map(r=>r[dimension])))for(const arm of ['A','B','C']){
   const rows=records.filter(r=>r[dimension]===value&&r.arm===arm);
   strata.push({dimension,value,arm,planned:rows.length,complete:rows.filter(r=>r.status==='complete').length,wrongEffects:rows.filter(r=>r.assessment?.wrongEffect).length,correctActions:rows.filter(r=>r.run?.events[0]?.actionExecuted&&r.assessment?.semantic==='correct'&&!r.assessment?.wrongEffect).length,safetyStops:rows.filter(r=>r.safetyStop&&!r.operational).length,unknownStops:rows.filter(r=>r.stopClass==='unknown').length,totalMs:rows.reduce((sum,r)=>sum+(r.run?.events[0]?.totalMs??0),0)});
  }
  const summary={id:study.id,createdAt:new Date().toISOString(),globalFailure,planned:schedule.length,groups,parity,strata,holdoutAccounting:subtotal(holdoutAccounting),studyAccounting:subtotal(accounting.requests),
    ledger:{requests:accounting.requests.length,holdoutRequests:accounting.requests.filter(r=>r.phase==='holdout').length,halted:accounting.halted,observedCostUsd:accounting.requests.reduce((s,r)=>s+(r.actualCostUsd??0),0),unknownUsage:accounting.requests.filter(r=>r.actualCostUsd===null).length},
    limitations:['Known synthetic regression rerun; cases were previously inspected, not an unseen holdout','Three repeats are not independent tasks','Contracts manually authored before mutations','Lexical admission does not prove business semantics','Do not alter frozen inputs during collection; subsequent changes require a separate batch']};
  writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2),{mode:0o600});
  console.log(JSON.stringify({summary:join(out,'summary.json'),groups,ledger:summary.ledger}));
}

if(globalFailure)process.exitCode=1;
