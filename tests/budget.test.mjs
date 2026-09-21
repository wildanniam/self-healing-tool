import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLiveBudget, readLiveBudget, createBudgetedOpenAIProvider, validateConfig } from '../dist/index.js';
const context = { action: 'click', task: { description: 'Save' }, candidates: [], coverage: {} };
const config = validateConfig({ mode: 'full' });
function setup(t, overrides={}) {
  const dir=mkdtempSync(join(tmpdir(),'healing-budget-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=join(dir,'ledger.json'); const plan={id:'test',model:config.model,maxRequests:3,maxCostUsd:0.25,phases:{demo:1,pilot:2},price:{version:'test-only',inputUsdPerMillion:0.15,outputUsdPerMillion:0.6},...overrides};
  createLiveBudget(file,plan);let calls=0;const prior=globalThis.fetch;t.after(()=>{globalThis.fetch=prior;});
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:'{"selector":null}'}}],usage:{prompt_tokens:100,completion_tokens:5}}));};
  const provider=(phase='demo')=>createBudgetedOpenAIProvider({apiKey:'test-only-placeholder',config,ledgerPath:file,phase});
  return {file,plan,provider,calls:()=>calls};
}
const signal=()=>new AbortController().signal;
test('persisted phase and total limits survive new provider instances',async t=>{
  const s=setup(t);await s.provider().select(context,signal());
  await assert.rejects(s.provider().select(context,signal()),/request_limit_exhausted/);
  await s.provider('pilot').select(context,signal());await s.provider('pilot').select(context,signal());
  await assert.rejects(s.provider('pilot').select(context,signal()),/request_limit_exhausted/);
  assert.equal(s.calls(),3);assert.equal(readLiveBudget(s.file).requests.length,3);
  assert(!readFileSync(s.file,'utf8').includes('test-only-placeholder'));assert.equal(statSync(s.file).mode & 0o777,0o600);
});
test('existing ledgers cannot be reset and unknown model/phase fails closed',t=>{
  const s=setup(t);assert.throws(()=>createLiveBudget(s.file,s.plan),/EEXIST/);
  assert.throws(()=>s.provider('unknown'),/budget model\/phase/);
  assert.throws(()=>createBudgetedOpenAIProvider({apiKey:'test-only',config:validateConfig({model:'gpt-4o-mini-2024-07-18'}),ledgerPath:s.file,phase:'demo'}),/budget model\/phase/);
});
test('cost reservation, aborted signals and oversized payloads stop before dispatch',async t=>{
  const s=setup(t,{maxCostUsd:0.00001});
  await assert.rejects(s.provider().select(context,signal()),/cost_limit/);
  await assert.rejects(s.provider().select(context,AbortSignal.abort()),/aborted/);
  await assert.rejects(s.provider().select({...context,task:{description:'x'.repeat(13000)}},signal()),/payload_limit/);
  assert.equal(s.calls(),0);assert.equal(readLiveBudget(s.file).requests.length,0);
});
test('unknown usage and transport failure retain reservation and halt later spending',async t=>{
  const s=setup(t);globalThis.fetch=async()=>{throw Error('PRIVATE_ERROR');};
  await assert.rejects(s.provider().select(context,signal()),/provider_transport_failure/);
  const r=readLiveBudget(s.file);assert.equal(r.requests[0].actualCostUsd,null);assert.equal(r.halted,'unreconciled_usage');
  assert(!readFileSync(s.file,'utf8').includes('PRIVATE_ERROR'));
  await assert.rejects(s.provider('pilot').select(context,signal()),/unreconciled/);
});
test('missing success usage also halts the next call without inventing zero cost',async t=>{
  const s=setup(t);globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'{"selector":null}'}}]}));
  await s.provider().select(context,signal());assert.equal(readLiveBudget(s.file).halted,'unreconciled_usage');
  await assert.rejects(s.provider('pilot').select(context,signal()),/unreconciled/);
});
test('locked or interrupted ledgers cannot create parallel/invisible spending',async t=>{
  const s=setup(t);writeFileSync(s.file+'.lock','busy');
  await assert.rejects(s.provider().select(context,signal()),/budget_locked/);rmSync(s.file+'.lock');
  const ledger=readLiveBudget(s.file);ledger.requests.push({id:'interrupted',phase:'demo',reservedUsd:0.001,status:'pending'});writeFileSync(s.file,JSON.stringify(ledger));
  await assert.rejects(s.provider('pilot').select(context,signal()),/unreconciled/);assert.equal(s.calls(),0);
});
