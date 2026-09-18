import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const categories=['correct','wrong-effect','refusal','execution-failure','infrastructure-failure','unstarted'];
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-12;
const validUsage=usage=>usage!==null&&typeof usage==='object'&&['inputTokens','outputTokens'].every(k=>Number.isSafeInteger(usage[k])&&usage[k]>=0);
const usageCost=(usage,price)=>(usage.inputTokens*price.inputUsdPerMillion+usage.outputTokens*price.outputUsdPerMillion)/1e6;

/** Null totals remain unknown; known subtotals never masquerade as full totals. */
export function resourceTotals(requests,price) {
  let knownInputTokens=0,knownOutputTokens=0,knownCostUsd=0,unknownUsageRequests=0,unknownCostRequests=0;
  for(const request of requests) {
    if(validUsage(request.usage)) {knownInputTokens+=request.usage.inputTokens;knownOutputTokens+=request.usage.outputTokens;}
    else if(request.transportAttempted!==false)unknownUsageRequests++;
    // A transport that was explicitly never attempted costs zero. Otherwise
    // absent usage or absent actual-cost evidence is never converted to zero.
    const cost=validUsage(request.usage)?usageCost(request.usage,price):request.transportAttempted===false?0:null;
    if(cost===null)unknownCostRequests++;else knownCostUsd+=cost;
  }
  return {requests:requests.length,knownUsageRequests:requests.length-unknownUsageRequests,unknownUsageRequests,unknownCostRequests,knownInputTokens,knownOutputTokens,knownCostUsd,inputTokens:unknownUsageRequests?null:knownInputTokens,outputTokens:unknownUsageRequests?null:knownOutputTokens,costUsd:unknownCostRequests?null:knownCostUsd,reservedUsd:requests.reduce((sum,r)=>sum+(Number.isFinite(r.reservedUsd)?r.reservedUsd:0),0)};
}

export function reassessRecord(record,fixture) {
  const state=record.assessment?.state;
  if(!state||!fixture)return null;
  if(fixture.family==='W') {
    const expected=Object.fromEntries(fixture.owners.map(owner=>[owner.key,{reorderLevel:owner.reorderLevel,targetStock:owner.targetStock}]));
    expected[fixture.owner.key].reorderLevel=Number(fixture.value);
    const actions=state.history.filter(event=>event.type==='input');
    const wrongEffect=actions.some(event=>event.warehouse!==fixture.owner.key||event.field!=='reorderLevel'||event.value!==Number(fixture.value));
    const correctEffect=isDeepStrictEqual(state.stored,expected)&&isDeepStrictEqual(state.draft,expected)&&actions.some(event=>event.warehouse===fixture.owner.key&&event.field==='reorderLevel'&&event.value===Number(fixture.value));
    return {semantic:correctEffect&&!wrongEffect?'correct':'incorrect',wrongEffect,correctEffect};
  }
  const goal={kind:'editor',shipmentId:fixture.owner.shipmentId,section:'destination'};
  const expected=fixture.owners.map(({shipmentId,origin,destination})=>({shipmentId,origin,destination}));
  const wrongEffect=state.journal.some(event=>!isDeepStrictEqual(event,goal));
  const correctEffect=isDeepStrictEqual(state.screen,goal)&&isDeepStrictEqual(state.shipments,expected)&&state.journal.some(event=>isDeepStrictEqual(event,goal));
  return {semantic:correctEffect&&!wrongEffect?'correct':'incorrect',wrongEffect,correctEffect};
}

export function stats(values) {
  const sorted=values.filter(value=>value!==null&&Number.isFinite(value)).sort((a,b)=>a-b);
  if(!sorted.length)return {n:0,min:null,median:null,mean:null,max:null};
  return {n:sorted.length,min:sorted[0],median:sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2,mean:sorted.reduce((a,b)=>a+b,0)/sorted.length,max:sorted.at(-1)};
}

export function summarizeRows(rows) {
  const covered=rows.filter(row=>row.firstCovered);
  const sum=key=>rows.reduce((total,row)=>total+(row[key]??0),0);
  const unknownUsageRequests=sum('unknownUsageRequests'),unknownCostRequests=sum('unknownCostRequests');
  const knownInputTokens=sum('knownInputTokens'),knownOutputTokens=sum('knownOutputTokens'),knownCostUsd=sum('knownCostUsd');
  return {n:rows.length,...Object.fromEntries(categories.map(category=>[category,rows.filter(row=>row.category===category).length])),
    recorded:rows.filter(row=>row.recordPresent).length,completeRecords:rows.filter(row=>row.recordStatus==='complete').length,
    extracted:rows.filter(row=>row.extracted).length,top1:rows.filter(row=>row.rank===1).length,top5:rows.filter(row=>row.rank!==null&&row.rank<=5).length,top10:rows.filter(row=>row.rank!==null&&row.rank<=10).length,top30:rows.filter(row=>row.top30).length,afterBudget:rows.filter(row=>row.afterBudget).length,
    firstInputCovered:covered.length,anyInputCovered:rows.filter(row=>row.anyCovered).length,
    correctWhenFirstCovered:{correct:covered.filter(row=>row.category==='correct').length,denominator:covered.length,rate:covered.length?covered.filter(row=>row.category==='correct').length/covered.length:null},
    requests:sum('requests'),knownUsageRequests:sum('knownUsageRequests'),unknownUsageRequests,unknownCostRequests,knownInputTokens,knownOutputTokens,knownCostUsd,inputTokens:unknownUsageRequests?null:knownInputTokens,outputTokens:unknownUsageRequests?null:knownOutputTokens,costUsd:unknownCostRequests?null:knownCostUsd,reservedUsd:sum('reservedUsd'),
    metrics:Object.fromEntries(['rank','included','payloadChars','inputTokens','wrapperMs','internalMs','modelMs','extractMs','rankMs'].map(key=>[key,stats(rows.map(row=>row[key]))]))};
}

/** Complete opening tags only. Current fixture IDs/types are plain ASCII. */
export function htmlHasTarget(html,identity) {
  if(!identity?.id)return false;
  const tags=html.match(/<(?:input|button|textarea|select)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)??[];
  const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  return tags.some(tag=>{
    const tagName=tag.match(/^<([a-z]+)/i)?.[1].toLowerCase();
    const attribute=name=>{const match=tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,'i'));return match?decode(match[1]??match[2]??match[3]):'';};
    return tagName===identity.tag&&attribute('id')===identity.id&&attribute('type')===identity.type;
  });
}

/** Acceptance requires a fully collected phase, regardless of method success. */
export function phaseCompletionViolations(planned,indexCounts,rows) {
  const failures=[];
  if(!Number.isSafeInteger(planned)||planned<1)failures.push('invalid planned phase size');
  if(rows.length!==planned)failures.push('phase lacks a row for every planned execution');
  if(indexCounts.complete!==planned)failures.push('not every planned index slot is complete');
  for(const name of ['unstarted','started','failed'])if(indexCounts[name]!==0)failures.push(`phase contains ${name} slots`);
  if(rows.filter(row=>row.recordPresent&&row.recordStatus==='complete').length!==planned)failures.push('not every planned execution has a complete record');
  return failures;
}

export async function analyzePhase({phase='main'}={}) {
  const common=await import('./common.mjs');
  const {output,study,plan,root,hash,readJson,writeJson,inputManifest,checkedLedger,assertPayload,stageCoverage,assertPriorLineage,runtimeIdentity}=common;
  if(!['pilot','main'].includes(phase))throw new Error('Unknown analysis phase');
  const dir=join(output,phase),freeze=readJson(join(dir,'freeze.json')),status=readJson(join(dir,'status.json')),index=readJson(join(dir,'results.json')),ledger=checkedLedger();
  const violations=[];
  const check=(condition,message)=>{if(!condition)violations.push(message);};
  const guard=(message,fn)=>{try{return fn();}catch(error){violations.push(`${message}: ${error.message}`);return null;}};
  const lineage=guard('prior lineage verification',assertPriorLineage);
  check(isDeepStrictEqual(lineage,freeze.lineage),'prior lineage differs from phase freeze');
  if(phase==='main') {
    const admission=guard('pilot admission verification',()=>common.pilotAdmission());
    check(isDeepStrictEqual(admission,freeze.pilotAdmission),'pilot evidence differs from main admission freeze');
  }
  guard('organization evidence',()=>{
    const path=join(root,freeze.organization.evidencePath),evidence=readJson(path);
    check(hash(readFileSync(path))===freeze.organization.evidenceSha256,'organization evidence changed');
    check(evidence.verified===true&&evidence.organizationId===freeze.organization.organizationId&&evidence.organizationName===freeze.organization.organizationName,'organization evidence mismatch');
  });
  check(isDeepStrictEqual(inputManifest(),freeze.inputs),'frozen source changed');
  if(runtimeIdentity)check(isDeepStrictEqual(runtimeIdentity(),freeze.runtime),'runtime identity changed');
  for(const file of freeze.inputs)guard(`archive ${file.path}`,()=>check(hash(readFileSync(join(dir,'frozen-inputs',file.path)))===file.sha256,`archive hash ${file.path}`));
  check(near(plan.maxCostUsd,3-0.00149685-0.0003378),'continuation cost-cap deduction');
  check(plan.maxRequests===349&&plan.phases.pilot===25&&plan.phases.main===324,'continuation request caps');
  check(freeze.schedule.length===study.workload[phase].slots,'frozen planned count');
  check(index.length===freeze.schedule.length,'index planned count');
  check(new Set(index.map(row=>row.id)).size===index.length,'duplicate index slot');
  check(new Set(freeze.schedule.map(row=>row.id)).size===freeze.schedule.length,'duplicate frozen slot');
  check(isDeepStrictEqual(index.map(({status,file,assessment,requests,stopReason,...slot})=>slot),freeze.schedule),'schedule differs');
  check(status.frozenUnchanged===true,'postrun freeze failed');
  check(!status.globalFailure,'global collection failure');
  check(!ledger.halted,'continuation ledger halted');
  const actualIndexCounts=Object.fromEntries(['complete','failed','unstarted','started'].map(name=>[name,index.filter(row=>row.status===name).length]));
  check(Object.values(actualIndexCounts).reduce((a,b)=>a+b,0)===index.length,'invalid index status');
  for(const [name,count] of Object.entries(actualIndexCounts))check(status[name]===count,`status/index ${name} count`);
  check(status.planned===freeze.schedule.length,'status planned count');
  const fixtureMap=new Map(freeze.cases.map(fixture=>[fixture.id,fixture]));
  const indexMap=new Map(index.map(row=>[row.id,row]));
  const rows=[],seenIds=[],ledgerById=new Map(ledger.requests.map(request=>[request.id,request]));
  const zeroResources=resourceTotals([],plan.price);
  for(const slot of freeze.schedule) {
    const entry=indexMap.get(slot.id),fixture=fixtureMap.get(slot.caseId),file=join(dir,`records/${slot.id}.json`);
    const base={...slot,profile:fixture?.profile,family:fixture?.family,mutation:fixture?.mutation};
    if(!entry||!existsSync(file)) {
      check(entry?.status==='unstarted',`missing started slot record ${slot.id}`);
      rows.push({...base,recordPresent:false,recordStatus:'unstarted',category:'unstarted',firstCovered:false,anyCovered:false,rank:null,extracted:false,top30:false,afterBudget:false,included:null,payloadChars:null,...zeroResources,wrapperMs:null,internalMs:null,modelMs:null,extractMs:null,rankMs:null,stopReason:null,selected:[]});
      continue;
    }
    check(entry.file===`records/${slot.id}.json`,`record path ${slot.id}`);
    const record=readJson(file),event=record.run?.events?.[0],truth=guard(`independent oracle ${slot.id}`,()=>reassessRecord(record,fixture));
    for(const [key,value] of Object.entries(slot))check(isDeepStrictEqual(record[key],value),`record identity ${slot.id} ${key}`);
    check(record.status===entry.status,`record/index status ${slot.id}`);
    check(record.status==='complete',`slot incomplete ${slot.id}`);
    check(record.run?.events?.length===1,`one runtime event ${slot.id}`);
    check(Boolean(truth),`oracle missing ${slot.id}`);
    if(truth) {
      for(const key of ['semantic','wrongEffect','correctEffect'])check(truth[key]===record.assessment[key],`independent outcome mismatch ${slot.id} ${key}`);
      check(truth.semantic===event?.semantic,`event semantic mismatch ${slot.id}`);
      const recordedAssessments=(record.run?.assessments??[]).filter(assessment=>assessment.eventId===event?.id);
      check(recordedAssessments.length===1,`one independent runtime assessment ${slot.id}`);
      check(recordedAssessments[0]?.wrongEffect===truth.wrongEffect&&recordedAssessments[0]?.semantic===truth.semantic,`runtime assessment mismatch ${slot.id}`);
      check(entry.assessment?.semantic===truth.semantic&&entry.assessment?.wrongEffect===truth.wrongEffect,`index assessment mismatch ${slot.id}`);
    }
    check(record.config?.rankingExperiment===study.arms[slot.arm],`arm configuration ${slot.id}`);
    for(const [key,value] of Object.entries(study.config))check(isDeepStrictEqual(record.config?.[key],value),`shared configuration ${slot.id} ${key}`);
    const audits=record.audits??[],requests=record.requests??[],reservationIds=record.reservationIds??[];
    check(audits.length>=1,`missing observation audit ${slot.id}`);
    for(const audit of audits) {
      guard(`stages ${slot.id}`,()=>check(isDeepStrictEqual(stageCoverage(audit,record.mapping),audit.coverageStages),`stage mismatch ${slot.id}`));
      check(audit.preRank.length===fixture?.expectedCandidateCount,`universe count ${slot.id}`);
    }
    check(requests.length===reservationIds.length,`request/reservation count ${slot.id}`);
    check(entry.requests===requests.length,`index/request count ${slot.id}`);
    check(entry.stopReason===event?.stopReason,`index stop reason ${slot.id}`);
    const attempts=event?.attempts?.filter(attempt=>attempt.providerCalled)??[];
    check(attempts.length===requests.length,`runtime/request count ${slot.id}`);
    const resourceRecords=[];
    for(let i=0;i<requests.length;i++) {
      const request=requests[i],attempt=attempts[i],reservationId=reservationIds[i],reservation=ledgerById.get(reservationId);
      seenIds.push(reservationId);
      guard(`payload ${slot.id}/${i}`,()=>assertPayload(request.payload,request.input,record.config));
      check(hash(request.payload)===request.sha256,`payload hash ${slot.id}/${i}`);
      check(request.transport?.dispatched===true,`transport dispatch ${slot.id}/${i}`);
      check(request.transport?.organizationId===freeze.organization.organizationId,`transport organization ${slot.id}/${i}`);
      check(request.transport?.payloadSha256===request.sha256,`transport payload hash ${slot.id}/${i}`);
      check(request.payloadBytes===Buffer.byteLength(request.payload),`payload bytes ${slot.id}/${i}`);
      check(attempt?.inputSha256===request.sha256,`runtime hash ${slot.id}/${i}`);
      check(isDeepStrictEqual(attempt?.inputContext,request.input),`runtime context ${slot.id}/${i}`);
      check(reservation?.phase===phase,`reservation phase ${slot.id}/${i}`);
      check(reservation?.payloadBytes===request.payloadBytes,`reservation bytes ${slot.id}/${i}`);
      const reserved=((request.payloadBytes+1024)*plan.price.inputUsdPerMillion+study.config.maxTokens*plan.price.outputUsdPerMillion)/1e6;
      check(near(reservation?.reservedUsd,reserved),`reservation cost ${slot.id}/${i}`);
      check(reservation?.status==='complete',`unsettled/failed request ${slot.id}/${i}`);
      const usage=request.response?.usage??request.error?.usage??null;
      check(isDeepStrictEqual(reservation?.usage,usage),`usage mismatch ${slot.id}/${i}`);
      check(isDeepStrictEqual(attempt?.usage??null,usage),`runtime usage mismatch ${slot.id}/${i}`);
      if(validUsage(usage))check(near(reservation?.actualCostUsd,usageCost(usage,plan.price)),`actual cost ${slot.id}/${i}`);
      else check(false,`unknown usage ${slot.id}/${i}`);
      check(request.response?.metadata?.returnedModel===study.model,`returned model ${slot.id}/${i}`);
      resourceRecords.push({usage,actualCostUsd:reservation?.actualCostUsd??null,transportAttempted:request.response?.transportAttempted??request.error?.transportAttempted??reservation?.transportAttempted??null,reservedUsd:reservation?.reservedUsd});
      const candidatePresent=request.input.candidates.some(candidate=>candidate.order===record.mapping.targetOrder);
      const htmlPresent=htmlHasTarget(request.input.cleanedDom??'',record.targetIdentity);
      check(candidatePresent===request.coverage.candidatePresent,`candidate coverage ${slot.id}/${i}`);
      check(htmlPresent===request.coverage.htmlPresent,`supplement coverage ${slot.id}/${i}`);
      check((candidatePresent||htmlPresent)===request.coverage.targetPresent,`combined coverage ${slot.id}/${i}`);
      check(request.coverage.finalCandidateCount===request.input.candidates.length,`candidate count coverage ${slot.id}/${i}`);
      check(request.coverage.payloadChars===request.payload.length,`payload character coverage ${slot.id}/${i}`);
    }
    const firstCovered=requests[0]?.coverage.targetPresent??false,anyCovered=requests.some(request=>request.coverage.targetPresent);
    const category=record.status!=='complete'?'infrastructure-failure':truth?.semantic==='correct'&&!truth.wrongEffect?'correct':truth?.wrongEffect?'wrong-effect':event?.stopReason==='abstained'?'refusal':['provider','context','budget'].includes(event?.failure)?'infrastructure-failure':'execution-failure';
    rows.push({...base,recordPresent:true,recordStatus:record.status,category,firstCovered,anyCovered,rank:audits[0]?.coverageStages.rank??null,extracted:audits[0]?.coverageStages.extracted??false,top30:audits[0]?.coverageStages.top30??false,afterBudget:audits[0]?.coverageStages.afterBudget??false,included:requests[0]?.coverage.finalCandidateCount??null,payloadChars:requests[0]?.coverage.payloadChars??null,...resourceTotals(resourceRecords,plan.price),wrapperMs:record.wrapperMs??null,internalMs:event?.internalMs??null,modelMs:requests.reduce((sum,request)=>sum+(request.providerMs??0),0),extractMs:audits.reduce((sum,audit)=>sum+audit.timingsMs.extract,0),rankMs:audits.reduce((sum,audit)=>sum+audit.timingsMs.rank,0),stopReason:event?.stopReason??null,selected:event?.attempts?.filter(attempt=>attempt.actionExecuted).map(attempt=>attempt.selector)??[]});
  }
  violations.push(...phaseCompletionViolations(freeze.schedule.length,actualIndexCounts,rows));
  const phaseLedger=ledger.requests.filter(request=>request.phase===phase);
  check(seenIds.length===new Set(seenIds).size,'reservation reused');
  check(ledger.requests.length===ledgerById.size,'duplicate ledger reservation');
  check(isDeepStrictEqual([...seenIds].sort(),phaseLedger.map(request=>request.id).sort()),'unattributed phase requests');
  check(status.requests===phaseLedger.length,'status request count');
  check(phaseLedger.length<=plan.phases[phase]&&ledger.requests.length<=plan.maxRequests,'request cap');
  check(ledger.requests.reduce((sum,request)=>sum+request.reservedUsd,0)<=plan.maxCostUsd,'reservation cap');
  check(ledger.requests.every(request=>request.actualCostUsd!==null&&request.status!=='pending'),'continuation ledger unsettled');
  const actualRecords=Object.fromEntries(['complete','failed','started'].map(name=>[name,rows.filter(row=>row.recordPresent&&row.recordStatus===name).length]));
  for(const [name,count] of Object.entries(actualRecords))check(actualIndexCounts[name]===count,`status/actual-record ${name} count`);
  const total=summarizeRows(rows),ledgerResources=resourceTotals(phaseLedger,plan.price);
  check(total.requests===phaseLedger.length,'aggregate request count');
  for(const key of ['unknownUsageRequests','unknownCostRequests','knownInputTokens','knownOutputTokens'])check(total[key]===ledgerResources[key],`aggregate ${key}`);
  check(near(total.knownCostUsd,ledgerResources.knownCostUsd),'aggregate known cost');
  check(near(total.reservedUsd,ledgerResources.reservedUsd),'aggregate reserved cost');
  // The phase ledger remains authoritative even when a damaged/missing record
  // prevents arm attribution; never lose its unknown cost in a zero row sum.
  const allocatedResources={requests:total.requests,unknownUsageRequests:total.unknownUsageRequests,unknownCostRequests:total.unknownCostRequests,knownInputTokens:total.knownInputTokens,knownOutputTokens:total.knownOutputTokens,knownCostUsd:total.knownCostUsd};
  Object.assign(total,ledgerResources,{allocatedResources,unattributedRequests:phaseLedger.filter(request=>!seenIds.includes(request.id)).length});
  check(categories.reduce((sum,key)=>sum+total[key],0)===freeze.schedule.length,'outcome categories must partition all planned executions');
  const arms=Object.fromEntries(Object.keys(study.arms).map(arm=>[arm,summarizeRows(rows.filter(row=>row.arm===arm))]));
  for(const arm of Object.keys(study.arms))check(arms[arm].n===study.workload[phase].cases*study.workload[phase].repeats,`planned arm denominator ${arm}`);
  check(Object.values(arms).reduce((sum,arm)=>sum+arm.n,0)===total.n,'sum arm denominators');
  const byCase=freeze.cases.map(fixture=>({caseId:fixture.id,profile:fixture.profile,family:fixture.family,mutation:fixture.mutation,arms:Object.fromEntries(Object.keys(study.arms).map(arm=>[arm,summarizeRows(rows.filter(row=>row.arm===arm&&row.caseId===fixture.id))]))}));
  const paired=Object.fromEntries(['R0','R1'].map(base=>{const differences=byCase.map(item=>({caseId:item.caseId,correctDelta:item.arms.R2.correct-item.arms[base].correct,coverageDelta:item.arms.R2.firstInputCovered-item.arms[base].firstInputCovered}));return [`R2-${base}`,{differences,improved:differences.filter(item=>item.correctDelta>0).length,same:differences.filter(item=>item.correctDelta===0).length,worse:differences.filter(item=>item.correctDelta<0).length}];}));
  const strata=Object.fromEntries(['profile','family','mutation'].map(key=>[key,Object.fromEntries([...new Set(rows.map(row=>row[key]))].map(value=>[value,Object.fromEntries(Object.keys(study.arms).map(arm=>[arm,summarizeRows(rows.filter(row=>row.arm===arm&&row[key]===value))]))]))]));
  let wholeEffort=null;
  if(lineage) {
    const ledgerAt=path=>readJson(isAbsolute(path)?path:join(root,path));
    const original=ledgerAt(lineage.original.ledgerPath),diagnostic=ledgerAt(lineage.diagnostic.ledgerPath);
    check(isDeepStrictEqual(original.plan.price,plan.price)&&isDeepStrictEqual(diagnostic.plan.price,plan.price),'lineage price parity');
    const allRequests=[...original.requests,...diagnostic.requests,...ledger.requests];
    check(new Set(allRequests.map(request=>request.id)).size===allRequests.length,'cross-ledger reservation reused');
    const all=resourceTotals(allRequests,plan.price);
    check(all.requests<=351,'joint request cap');check(all.reservedUsd<=3,'joint reservation cap');
    check(original.requests.length===1&&diagnostic.requests.length===1,'historical request lineage count');
    check(near(original.requests[0]?.reservedUsd,0.00149685)&&near(diagnostic.requests[0]?.reservedUsd,0.0003378),'historical reservation carry-forward');
    check(original.requests[0]?.actualCostUsd===null,'original unknown cost must remain unknown');
    check(all.costUsd===null&&all.unknownCostRequests>=1,'whole effort cannot claim fully known actual cost');
    wholeEffort={maxRequests:351,maxCostUsd:3,originalFailedPilot:resourceTotals(original.requests,plan.price),connectivityDiagnostic:resourceTotals(diagnostic.requests,plan.price),continuation:resourceTotals(ledger.requests,plan.price),combined:all,note:'Original interrupted pilot and connectivity diagnostic remain operational evidence. Neither is pooled with continuation pilot or main method outcomes. Overall actual cost remains unknown because original transport usage is unresolved.'};
  }
  const audit={passed:violations.length===0,phase,createdAt:new Date().toISOString(),planned:freeze.schedule.length,records:rows.filter(row=>row.recordPresent).length,completeRecords:total.completeRecords,unstarted:total.unstarted,indexCounts:actualIndexCounts,requests:phaseLedger.length,violations,freezeSha256:hash(readFileSync(join(dir,'freeze.json'))),ledgerSha256:hash(readFileSync(join(output,'budget.json')))};
  writeJson(join(dir,'audit.json'),audit);
  const summary={phase,continuation:'v1',createdAt:new Date().toISOString(),audit,model:study.model,conditions:freeze.cases.length,repeats:study.workload[phase].repeats,total,arms,byCase,paired,strata,rows,lineage,wholeEffort,limits:['Controlled variants of two known synthetic families; not unseen applications','Equal maximum character limits; actual token/character counts differ','Relation fields remain in every prompt; R1 only removes relational scoring','Descriptive comparison of 12 main conditions; three repeats are not independent cases','Instrumentation adds overhead to reported elapsed times','Unknown usage propagates null totals; known subtotals exclude unresolved requests','The original interrupted pilot, diagnostic, continuation pilot, and main are reported separately']};
  writeJson(join(dir,'summary.json'),summary);
  const show=value=>value===null?'unknown':String(value),money=value=>value===null?'unknown':value.toFixed(6);
  let md=`# RM1 continuation ranking experiment — ${phase}\n\nAudit: **${audit.passed?'PASS':'FAIL'}**. ${audit.planned} planned executions across ${freeze.cases.length} conditions; ${audit.completeRecords} complete records, ${audit.unstarted} unstarted slots, ${phaseLedger.length} provider reservations. Model: ${study.model}.\n\n| Arm | Correct | Wrong effect | Refusal | Execution failure | Infrastructure failure | Unstarted | Target in first input | Input tokens | Cost USD | Median wrapper ms |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  for(const [arm,result] of Object.entries(arms))md+=`| ${arm} | ${result.correct}/${result.n} | ${result['wrong-effect']} | ${result.refusal} | ${result['execution-failure']} | ${result['infrastructure-failure']} | ${result.unstarted} | ${result.firstInputCovered}/${result.n} | ${show(result.inputTokens)} | ${money(result.costUsd)} | ${result.metrics.wrapperMs.median?.toFixed(1)??'unknown'} |\n`;
  md+='\n## Per-condition correct recoveries\n\n| Case | R0 | R1 | R2 | R2−R0 | R2−R1 |\n|---|---:|---:|---:|---:|---:|\n';
  for(const item of byCase)md+=`| ${item.caseId} | ${item.arms.R0.correct}/${item.arms.R0.n} | ${item.arms.R1.correct}/${item.arms.R1.n} | ${item.arms.R2.correct}/${item.arms.R2.n} | ${item.arms.R2.correct-item.arms.R0.correct} | ${item.arms.R2.correct-item.arms.R1.correct} |\n`;
  md+='\n## Paired descriptive comparison\n\n';for(const [name,result] of Object.entries(paired))md+=`- ${name}: ${result.improved} improved, ${result.same} unchanged, ${result.worse} worse conditions.\n`;
  md+=`\n## Usage and lineage\n\nThis phase has ${total.unknownUsageRequests} requests with unknown usage. Known subtotals: ${total.knownInputTokens} input tokens, ${total.knownOutputTokens} output tokens and USD ${money(total.knownCostUsd)}; these are full totals only when no request is unresolved.\n`;
  if(wholeEffort)md+=`\nAcross the original failed request, diagnostic and continuation, ${wholeEffort.combined.requests}/351 reservations use USD ${money(wholeEffort.combined.reservedUsd)}/3 reserved. **Overall actual cost is unknown**; the known actual-cost subtotal is USD ${money(wholeEffort.combined.knownCostUsd)}, excluding ${wholeEffort.combined.unknownCostRequests} unresolved request(s). Reservations are conservative budget accounting, not measured billing.\n`;
  md+='\n## Limitations\n\n'+summary.limits.map(value=>'- '+value).join('\n')+'\n\nFailures and null outputs remain in the full planned denominators. Pilot is separate from main, original interrupted pilot and diagnostic; none are pooled with D30. A successful browser action alone is never counted as correct. There are 12 main conditions with three repeated executions per arm, not 108 independent samples. No significance or population-generalization claim is made.\n';
  if(violations.length)md+='\n## Audit violations\n\n'+violations.map(value=>'- '+value).join('\n')+'\n';
  writeFileSync(join(dir,'report.md'),md);
  return summary;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const summary=await analyzePhase({phase:process.argv.includes('--pilot')?'pilot':'main'});
  console.log(JSON.stringify({phase:summary.phase,audit:summary.audit,arms:summary.arms,paired:summary.paired,wholeEffort:summary.wholeEffort},null,2));
  if(!summary.audit.passed)process.exitCode=1;
}
