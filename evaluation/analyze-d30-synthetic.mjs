import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {analyzeHoldout,renderMarkdown} from './analyze-d30-common.mjs';
import {isDeepStrictEqual} from 'node:util';
import {historicalProvenance,assertCleanPayload} from './d29-audit-utils.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

async function main() {
  const args = process.argv.slice(2), root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  let directory = join(root, 'output/d30/synthetic-v1'), budgetPath, partial = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--partial') partial = true;
    else if (['--directory', '--budget'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) {
      const flag = args[i], value = resolve(args[++i]); if (flag === '--directory') directory = value; else budgetPath = value;
    } else throw new Error('Usage: node evaluation/analyze-d30-synthetic.mjs [--directory PATH] [--budget PATH] [--partial]');
  }
  const files = { records: join(directory, 'results.json'), schedule: join(directory, 'schedule.json'), freeze: join(directory, 'freeze.json'), started: join(directory, 'started.json'), budget: budgetPath ?? join(directory, 'budget.json') };
  const entries = await Promise.all(Object.entries(files).map(async ([key, path]) => { const bytes = await readFile(path); return [key, { data: JSON.parse(bytes), path, sha256: hash(bytes) }]; }));
  const loaded = Object.fromEntries(entries), inputs = Object.fromEntries(entries.map(([key, value]) => [key, value.data]));
  let frozenSummary = null, summaryProvenance = null;
  try { const path = join(directory, 'summary.json'), bytes = await readFile(path); frozenSummary = JSON.parse(bytes); summaryProvenance = { path, sha256: hash(bytes) }; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const report = analyzeHoldout({ ...inputs, partial, frozenSummary, provenance: { inputs: Object.fromEntries(entries.map(([key, value]) => [key, { path: value.path, sha256: value.sha256 }])), frozenSummary: summaryProvenance, analyzerSha256: hash(await readFile(fileURLToPath(import.meta.url))) } });
  report.studyRole='known-regression-plus-six-new-same-application-variants';
  const requestChecks=[], conditionRows=[];
  for(const row of inputs.records){
    const attempts=(row.run?.events?.[0]?.attempts??[]).filter(attempt=>attempt.providerCalled);
    const payloads=row.requestPayloads??[], ids=row.reservationIds??[];
    if(payloads.length!==row.requestHashes.length||attempts.length!==payloads.length)throw new Error('Request/attempt capture mismatch');
    for(let index=0;index<payloads.length;index++){
      const request=payloads[index],attempt=attempts[index],payloadInput=assertCleanPayload(request.payload);
      if(hash(request.payload)!==request.sha256||request.sha256!==row.requestHashes[index]||request.sha256!==attempt.inputSha256||request.payloadBytes!==Buffer.byteLength(request.payload,'utf8'))throw new Error('Captured request differs from attempted wire input');
      if(!isDeepStrictEqual(request.coverage,attempt.inputCoverage)||!isDeepStrictEqual(request.coverage,payloadInput.coverage))throw new Error('Attempt coverage differs from dispatched payload');
      const ledger=inputs.budget.requests.find(item=>item.id===ids[index]);
      if(ledger&&ledger.payloadBytes!==request.payloadBytes)throw new Error('Ledger payload bytes differ from captured request');
      requestChecks.push({caseId:row.caseId,arm:row.arm,repeat:row.repeat,attempt:attempt.number,sha256:request.sha256,coverage:request.coverage,
        reserved:!!ledger,transportAttempted:attempt.transportAttempted,returnedModel:attempt.providerMetadata?.returnedModel??null,exactHash:true});
    }
  }
  for(const caseId of new Set(inputs.records.map(row=>row.caseId)))for(const arm of ['A','B','C']){
    const rows=inputs.records.filter(row=>row.caseId===caseId&&row.arm===arm),complete=rows.filter(row=>row.status==='complete');
    conditionRows.push({caseId,arm,kind:rows[0].kind,scope:rows[0].scope,fresh:rows[0].fresh,planned:rows.length,complete:complete.length,
      correctAcknowledgedRecovery:complete.filter(row=>row.run.events[0].recoveryTriggered&&row.run.events[0].actionExecuted&&row.assessment.semantic==='correct'&&!row.assessment.wrongEffect).length,
      normalCorrect:complete.filter(row=>row.run.events[0].stopReason==='original-success'&&row.assessment.semantic==='correct'&&!row.assessment.wrongEffect).length,
      wrongEffects:rows.filter(row=>row.assessment?.wrongEffect).length,stops:complete.filter(row=>row.safetyStop&&!row.operational).length,
      stopReasons:complete.map(row=>row.run.events[0].stopReason),operational:rows.filter(row=>row.operational).length,providerInvocations:rows.reduce((sum,row)=>sum+row.requestHashes.length,0)});
  }
  report.d30ExactRequests={captured:requestChecks.length,allHashesVerified:true,attempts:requestChecks};
  report.d30PerCondition=conditionRows;
  report.d30HistoricalInputsUnchanged=isDeepStrictEqual(historicalProvenance(),inputs.freeze.historicalProvenance);
  if(!report.d30HistoricalInputsUnchanged)throw new Error('D27 or frozen fixture inputs changed');
  report.d30Budget={maxCostUsd:inputs.budget.plan.maxCostUsd,maxRequests:inputs.budget.plan.maxRequests,reservedUsd:inputs.budget.requests.reduce((sum,row)=>sum+row.reservedUsd,0),allReservationsWithinCap:inputs.budget.requests.reduce((sum,row)=>sum+row.reservedUsd,0)<=inputs.budget.plan.maxCostUsd};
  if(!report.d30Budget.allReservationsWithinCap)throw new Error('D30 reservation cap exceeded');
  report.limitations=report.limitations.map(x=>x.replace('Frozen methods and primary metrics unchanged. State/acknowledgment analyses were added after inspecting outcomes.','Primary and supplementary state/acknowledgment analyses inherited from D26 and specified before D30 collection.').replace('Synthetic holdout only; no real-world or universal-effectiveness claim.','Known synthetic regression rerun: previously inspected cases, not unseen validation.'));
  // Refuse to publish a report assembled while any retained input was changing.
  for (const { path, sha256 } of Object.values(loaded)) if (hash(await readFile(path)) !== sha256) throw new Error('Input changed during analysis; no report written.');
  const stem = partial ? 'posthoc-analysis.partial' : 'posthoc-analysis';
  const jsonPath = join(directory, stem + '.json'), markdownPath = join(directory, stem + '.md');
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await writeFile(markdownPath, renderMarkdown(report).replace('# D26 ', '# D30 ').replace('## Added posthoc state', '## State') + '\n## D30 exact request audit\n\nEvery captured request hash was compared with its per-attempt input hash, recorded coverage and reservation payload bytes. Initial event context was not substituted for refreshed attempts. See `d30ExactRequests`, `d30PerCondition`, `d30Budget` and `d30HistoricalInputsUnchanged` in the JSON report.\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: report.status, complete: report.completion.complete, json: jsonPath, markdown: markdownPath, primaryMatchesRunner: report.frozenPrimary.matchesRetainedSummary }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
