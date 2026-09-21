import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLiveBudget, createBudgetedOpenAIProvider } from '../../../dist/index.js';
import { createCases } from '../cases.mjs';
import { makeSchedule as originalSchedule } from '../common.mjs';
import {
  assertPriorLineage, makeSchedule, plan, root, readJson, hash, armConfig,
  observedFetch, safeTransportError, FIRST_PAYLOAD_SHA256, organizationIdentity, continuationIntegrityStop,
} from './common.mjs';

test('continuation preserves both reservations and original fifty inputs without claiming reconciliation', () => {
  const lineage = assertPriorLineage();
  assert.equal(lineage.original.halted, 'unreconciled_usage');
  assert.equal(lineage.combinedBeforeContinuation.actualCostUsd, null);
  assert.equal(lineage.combinedBeforeContinuation.unresolvedRequests, 1);
  assert.equal(lineage.combinedBeforeContinuation.requests + plan.maxRequests, 351);
  assert(Math.abs(lineage.combinedBeforeContinuation.reservedUsd + plan.maxCostUsd - 3) < 1e-12);
  assert.equal(lineage.original.firstPayloadSha256, FIRST_PAYLOAD_SHA256);
  assert.equal(lineage.anchors.length, 8);
  assert.equal(plan.phases.pilot, 25); assert.equal(plan.phases.main, 324);
});

test('continuation changes only out-of-band schedule identities with one explicit interrupted pilot rerun', () => {
  for (const phase of ['pilot', 'main']) {
    const cases = createCases({ phase }), original = originalSchedule(cases, phase), continued = makeSchedule(cases, phase);
    assert.equal(continued.length, phase === 'pilot' ? 9 : 108);
    for (let index = 0; index < original.length; index++) {
      const { originalSlotId, lineage, id, ...slot } = continued[index];
      assert.equal(id, `continuation-v1-${original[index].id}`);
      assert.equal(originalSlotId, original[index].id);
      assert.deepEqual({ ...slot, id: originalSlotId }, original[index]);
      assert.equal(lineage, phase === 'pilot' && index === 0 ? 'rerun-interrupted-pilot' : 'previously-unstarted');
    }
  }
});

const url = 'https://api.openai.com/v1/chat/completions';
const org = 'org-testIdentity';
const options = payload => ({ method: 'POST', redirect: 'error', body: payload,
  headers: { Authorization: 'Bearer fake-test-key', 'Content-Type': 'application/json' }, signal: new AbortController().signal });

test('transport observer adds only organization header, preserves body/signal/options and never retries', async () => {
  const payload = '{"test":"unchanged"}', incoming = options(payload), transport = {};
  let checks = 0, calls = 0, sent;
  const fetch = observedFetch(async (address, args) => {
    calls++; assert.equal(address, url); sent = args;
    return new Response('same response bytes', { status: 200, headers: { 'x-request-id': 'req_testing' } });
  }, { organizationId: org, expectedPayload: payload, transport, verify() { checks++; } });
  const response = await fetch(url, incoming);
  assert.equal(await response.text(), 'same response bytes');
  assert.equal(sent.body, incoming.body); assert.equal(sent.signal, incoming.signal);
  assert.equal(sent.redirect, incoming.redirect); assert.equal(sent.method, incoming.method);
  assert.equal(sent.headers.get('authorization'), incoming.headers.Authorization);
  assert.equal(sent.headers.get('content-type'), incoming.headers['Content-Type']);
  assert.equal(sent.headers.get('openai-organization'), org);
  assert.equal([...sent.headers].length, 3);
  assert.equal(transport.payloadSha256, hash(payload)); assert.equal(transport.httpStatus, 200);
  assert.equal(transport.requestId, 'req_testing'); assert.equal(transport.organizationId, org);
  assert.equal(calls, 1); assert.equal(checks, 1);
  await assert.rejects(fetch(url, incoming), /cannot retry/);
  assert.equal(calls, 1);
});

test('transport captures safe original fetch/cause codes while excluding error messages and credentials', async () => {
  const error = Object.assign(new TypeError('fake-test-key private raw request'), { code: 'ERR_FETCH', cause: Object.assign(new Error('sensitive cause detail'), { code: 'ECONNRESET' }) });
  const transport = {}; let calls = 0;
  const fetch = observedFetch(async () => { calls++; throw error; }, { organizationId: org, expectedPayload: '{}', transport, verify() {} });
  await assert.rejects(fetch(url, options('{}')), value => value === error);
  assert.equal(calls, 1);
  assert.deepEqual(transport.error, { name: 'TypeError', code: 'ERR_FETCH', causeName: 'Error', causeCode: 'ECONNRESET' });
  assert(!JSON.stringify(transport).includes('fake-test-key')); assert(!JSON.stringify(transport).includes('sensitive'));
  assert.equal(safeTransportError({ code: 'Bearer some-secret', name: 'invalid\nname' }).code, null);
});

test('transport records response status/request identity and original stream cause when body reading fails', async () => {
  const error = Object.assign(new Error('private stream message'), { code: 'UND_ERR_SOCKET', cause: Object.assign(new Error('private cause'), { code: 'ECONNRESET' }) });
  const transport = {};
  const fetch = observedFetch(async () => new Response(new ReadableStream({ pull(controller) { controller.error(error); } }),
    { status: 200, headers: { 'x-request-id': 'req_stream' } }), { organizationId: org, expectedPayload: '{}', transport, verify() {} });
  const response = await fetch(url, options('{}'));
  await assert.rejects(response.body.getReader().read(), value => value === error);
  assert.equal(transport.httpStatus, 200); assert.equal(transport.requestId, 'req_stream');
  assert.deepEqual(transport.bodyError, { name: 'Error', code: 'UND_ERR_SOCKET', causeName: 'Error', causeCode: 'ECONNRESET' });
  assert(!JSON.stringify(transport).includes('private'));
});

test('transport refuses altered payload, organization, or failed freeze check before network access', async () => {
  let calls = 0;
  for (const variant of ['payload', 'organization', 'freeze']) {
    const fetch = observedFetch(async () => { calls++; return new Response('{}'); }, { organizationId: org, expectedPayload: '{}', transport: {},
      verify() { if (variant === 'freeze') throw new Error('Frozen source changed'); } });
    const input = options(variant === 'payload' ? '{"changed":true}' : '{}');
    if (variant === 'organization') input.headers['OpenAI-Organization'] = 'org-other';
    await assert.rejects(fetch(url, input));
  }
  assert.equal(calls, 0);
});

test('the companion pilot cap cannot borrow main capacity and new unknown usage halts its ledger', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'rm1-continuation-test-'));
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    const path = join(temp, 'budget.json'); createLiveBudget(path, plan);
    const ledger = readJson(path);
    ledger.requests = Array.from({ length: 25 }, (_, index) => ({ id: `known-${index}`, phase: 'pilot', status: 'complete', reservedUsd: 0.001,
      usage: { inputTokens: 1, outputTokens: 1 }, actualCostUsd: 0.00000075, transportAttempted: true }));
    writeFileSync(path, JSON.stringify(ledger));
    const config = armConfig('R0');
    const context = readJson(join(root, 'output/d33/pilot/records/pilot-P-W-A-U-R0-r1.json')).requests[0].input;
    globalThis.fetch = async () => { calls++; throw new TypeError('offline simulated failure'); };
    const pilot = createBudgetedOpenAIProvider({ apiKey: 'fake-test-key', config, ledgerPath: path, phase: 'pilot' });
    await assert.rejects(pilot.select(context, new AbortController().signal), /request_limit_exhausted/);
    assert.equal(calls, 0); assert.equal(readJson(path).requests.length, 25);
    const main = createBudgetedOpenAIProvider({ apiKey: 'fake-test-key', config, ledgerPath: path, phase: 'main' });
    await assert.rejects(main.select(context, new AbortController().signal), /provider_transport_failure/);
    assert.equal(calls, 1); assert.equal(readJson(path).halted, 'unreconciled_usage');
    await assert.rejects(main.select(context, new AbortController().signal), /provider_budget_unreconciled/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; rmSync(temp, { recursive: true, force: true }); }
});

test('actual provider reader and budget settle one successful mocked response through the observer', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'rm1-continuation-success-'));
  const originalFetch = globalThis.fetch;
  try {
    const path = join(temp, 'budget.json'); createLiveBudget(path, plan);
    const original = readJson(join(root, 'output/d33/pilot/records/pilot-P-W-A-U-R0-r1.json')).requests[0];
    const transport = {}; let calls = 0;
    globalThis.fetch = observedFetch(async (_address, args) => {
      calls++; assert.equal(args.body, original.payload); assert.equal(args.headers.get('openai-organization'), org);
      return new Response(JSON.stringify({ model: plan.model, choices: [{ message: { content: '{"selector":null}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 210, completion_tokens: 5 } }), { status: 200, headers: { 'x-request-id': 'req_success_mock' } });
    }, { organizationId: org, expectedPayload: original.payload, transport, verify() {} });
    const provider = createBudgetedOpenAIProvider({ apiKey: 'fake-test-key', config: armConfig('R0'), ledgerPath: path, phase: 'pilot' });
    const response = await provider.select(original.input, new AbortController().signal);
    assert.equal(response.output, '{"selector":null}'); assert.deepEqual(response.usage, { inputTokens: 210, outputTokens: 5 });
    assert.equal(response.metadata.returnedModel, plan.model); assert.equal(calls, 1);
    const ledger = readJson(path); assert.equal(ledger.requests.length, 1); assert.equal(ledger.halted, null);
    assert.equal(ledger.requests[0].status, 'complete'); assert.deepEqual(ledger.requests[0].usage, response.usage);
    assert.equal(ledger.requests[0].actualCostUsd, 0.0000345); assert.equal(transport.requestId, 'req_success_mock');
  } finally { globalThis.fetch = originalFetch; rmSync(temp, { recursive: true, force: true }); }
});

test('organization selection is explicit and verified, not inferred from the API key or empty dashboard', () => {
  const evidence = readJson(join(root, 'output/d33/continuation-v1/organization-verification.json'));
  const identity = organizationIdentity({ OPENAI_ORGANIZATION: evidence.organizationId });
  assert.equal(identity.organizationName, 'Vanie'); assert.equal(identity.organizationId, evidence.organizationId);
  assert.throws(() => organizationIdentity({}), /Explicit organization/);
  assert.throws(() => organizationIdentity({ OPENAI_ORGANIZATION: 'org-other' }), /Explicit organization/);
});

test('collection stops on missing evidence without censoring fully accounted method failures', () => {
  const complete = { status: 'complete', harnessError: null, audits: [{}], requests: [{ transport: { dispatched: true }, response: { usage: { inputTokens: 5, outputTokens: 2 } } }],
    reservationIds: ['one'], run: { events: [{ failure: 'abstained', attempts: [{ providerCalled: true }] }] } };
  for (const failure of ['abstained', 'parse', 'validation', 'action', 'budget']) {
    const record = structuredClone(complete); record.run.events[0].failure = failure;
    assert.equal(continuationIntegrityStop(record), null);
  }
  const missing = structuredClone(complete); missing.reservationIds = [];
  assert.equal(continuationIntegrityStop(missing), 'request_reservation_mismatch');
  const lost = structuredClone(complete); lost.requests = []; lost.reservationIds = [];
  assert.equal(continuationIntegrityStop(lost), 'missing_request_evidence');
  const noDispatch = structuredClone(complete); noDispatch.requests[0].transport = {};
  assert.equal(continuationIntegrityStop(noDispatch), 'missing_transport_evidence');
  const unknown = structuredClone(complete); unknown.requests[0].response.usage = null;
  assert.equal(continuationIntegrityStop(unknown), 'unreconciled_usage');
});
