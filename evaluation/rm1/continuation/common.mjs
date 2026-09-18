import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  root, study, hash, readJson, writeJson, armConfig, runtimeIdentity, assertPayload,
  targetCoverage, stageCoverage, makeSchedule as originalSchedule, inputManifest as originalInputs,
} from '../common.mjs';

export { root, study, hash, readJson, writeJson, armConfig, runtimeIdentity, assertPayload, targetCoverage, stageCoverage };
export const originalOutput = join(root, 'output/d33');
export const output = join(originalOutput, 'continuation-v1');
export const ledgerPath = join(output, 'budget.json');
export const organizationPath = join(output, 'organization-verification.json');
export const FIRST_PAYLOAD_SHA256 = 'bc98ee7229404c6212cb2f480dbda34dce816f9afcf07138b42ef67329437472';
export const plan = {
  id: 'apsec-d33-rm1-dom-ranking-2026-09-18-continuation-v1', model: study.model,
  maxRequests: 349, maxCostUsd: 2.99816535, phases: { pilot: 25, main: 324 }, price: study.price,
};
export const PRIOR_ANCHORS = [
  ['output/d33/budget.json', '3b73af76fdca63c2552192f7a66a283c17a800bfff624a95b0aa177dd3fa2834'],
  ['output/d33/pilot/freeze.json', 'd99fb563ace4418caefcf3c9ef7a39b722a775c4d7825d9e3427139349b8040a'],
  ['output/d33/pilot/status.json', '5e0523fad768f0355a72cee0f46be1e48b5c9b2b8d9a1fb09dafb5e20ebf1c1d'],
  ['output/d33/pilot/records/pilot-P-W-A-U-R0-r1.json', 'd145d4b0a3d008bba071dafa7a008e9a7b57fbbdc302c7ba4e78c7675203bd2b'],
  ['output/d33/followup/diagnostic-plan.json', '4f4bd9e20f805b80957d30ff231e8a94213d44f0b66cc09be9d7d94f6cd31367'],
  ['output/d33/followup/diagnostic-budget.json', '824ba8059baba4d4100b8318ab1dc12880d819fee0c8e50ef7a08677fb2222bc'],
  ['output/d33/followup/diagnostic-payload.json', '1d53874ce5b5e607171bd1c825b4c40b1981d3c0bf951ceb64832b9f4252ce4f'],
  ['output/d33/followup/diagnostic-result.json', 'b921d9858513ab25b2adb4586b298b6203360a6a1e125765265dddcaf4974334'],
].map(([path, sha256]) => ({ path, sha256 }));

/** Historical unknown usage stays unknown. This is preservation, never reconciliation. */
export function assertPriorLineage() {
  for (const f of PRIOR_ANCHORS) assert.equal(hash(readFileSync(join(root, f.path))), f.sha256, `Historical anchor changed: ${f.path}`);
  const freeze = readJson(join(originalOutput, 'pilot/freeze.json'));
  const inputs = originalInputs();
  assert.equal(inputs.length, 50);
  assert.deepEqual(inputs, freeze.inputs, 'Original fifty live inputs changed');
  for (const f of inputs) assert.equal(hash(readFileSync(join(originalOutput, 'pilot/frozen-inputs', f.path))), f.sha256, `Historical archive changed: ${f.path}`);
  const original = readJson(join(originalOutput, 'budget.json'));
  const diagnostic = readJson(join(originalOutput, 'followup/diagnostic-budget.json'));
  const result = readJson(join(originalOutput, 'followup/diagnostic-result.json'));
  assert.equal(original.requests.length, 1); assert.equal(diagnostic.requests.length, 1);
  assert.equal(original.halted, 'unreconciled_usage');
  assert.equal(original.requests[0].status, 'failed'); assert.equal(original.requests[0].usage, null);
  assert.equal(original.requests[0].actualCostUsd, null);
  assert.equal(diagnostic.requests[0].status, 'complete'); assert.equal(diagnostic.halted, null);
  assert.deepEqual(result.ledger, diagnostic); assert.equal(result.generationSucceeded, true);
  const reserved = original.requests[0].reservedUsd + diagnostic.requests[0].reservedUsd;
  assert(Math.abs(reserved - 0.00183465) < 1e-12);
  const failed = readJson(join(originalOutput, 'pilot/records/pilot-P-W-A-U-R0-r1.json'));
  assert.equal(failed.requests.length, 1); assert.equal(hash(failed.requests[0].payload), FIRST_PAYLOAD_SHA256);
  assert.equal(failed.requests[0].sha256, FIRST_PAYLOAD_SHA256);
  return {
    schemaVersion: 1, anchors: PRIOR_ANCHORS,
    original: { ledgerPath: 'output/d33/budget.json', freezePath: 'output/d33/pilot/freeze.json', sourceSha256: freeze.sourceSha256,
      requests: 1, requestId: original.requests[0].id, reservedUsd: original.requests[0].reservedUsd, actualCostUsd: null,
      halted: original.halted, failedRecordPath: 'output/d33/pilot/records/pilot-P-W-A-U-R0-r1.json', firstPayloadSha256: FIRST_PAYLOAD_SHA256 },
    diagnostic: { ledgerPath: 'output/d33/followup/diagnostic-budget.json', requests: 1, requestId: diagnostic.requests[0].id,
      reservedUsd: diagnostic.requests[0].reservedUsd, actualCostUsd: diagnostic.requests[0].actualCostUsd },
    combinedBeforeContinuation: { requests: 2, reservedUsd: reserved, knownActualCostUsd: diagnostic.requests[0].actualCostUsd,
      actualCostUsd: null, unresolvedRequests: 1 },
  };
}

export function inputManifest() {
  const additions = ['common.mjs', 'run.mjs', 'preflight.mjs', 'analyze.mjs', 'continuation.test.mjs', 'analyze.test.mjs']
    .map(name => join(root, 'evaluation/rm1/continuation', name));
  additions.push(join(root, 'docs/evaluation/rm1-continuation-protocol.md'));
  return [...originalInputs(), ...additions.map(path => ({ path: relative(root, path), sha256: hash(readFileSync(path)) }))]
    .sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

export function makeSchedule(cases, phase) {
  return originalSchedule(cases, phase).map(slot => ({ ...slot, id: `continuation-v1-${slot.id}`, originalSlotId: slot.id,
    lineage: phase === 'pilot' && slot.slotIndex === 0 ? 'rerun-interrupted-pilot' : 'previously-unstarted' }));
}

export function checkedLedger() {
  const ledger = readJson(ledgerPath);
  assert.equal(ledger.version, 1); assert.deepEqual(ledger.plan, plan);
  assert(ledger.requests.length <= 349);
  for (const phase of ['pilot', 'main']) assert(ledger.requests.filter(r => r.phase === phase).length <= plan.phases[phase]);
  const reserved = ledger.requests.reduce((sum, request) => sum + request.reservedUsd, 0);
  assert(reserved + 0.00183465 <= 3 + 1e-12, 'Combined reservation ceiling exceeded');
  return ledger;
}

export function organizationIdentity(env = process.env) {
  const evidence = readJson(organizationPath);
  assert.equal(evidence.verified, true, 'Organization identity has not been verified');
  assert.equal(evidence.organizationName, 'Vanie');
  assert.equal(evidence.paidCalls, 0);
  assert.equal(evidence.probe?.method, 'GET');
  assert.equal(evidence.probe?.path, '/v1/models/' + study.model);
  assert.equal(evidence.probe?.model, study.model);
  assert.equal(evidence.probe?.httpStatus, 200);
  assert.equal(evidence.probe?.explicitOrganizationHeader, true);
  assert(/^org-[A-Za-z0-9_-]{1,120}$/.test(evidence.organizationId), 'Invalid organization identifier');
  assert.equal(env.OPENAI_ORGANIZATION, evidence.organizationId, 'Explicit organization differs from verified organization');
  return { organizationId: evidence.organizationId, organizationName: evidence.organizationName,
    evidencePath: relative(root, organizationPath), evidenceSha256: hash(readFileSync(organizationPath)) };
}

/** Bind main admission to completed, audited pilot evidence while permitting only new main reservations. */
export function pilotAdmission(requireCurrentLedger = false) {
  const dir = join(output, 'pilot');
  const audit = readJson(join(dir, 'audit.json')), status = readJson(join(dir, 'status.json'));
  const index = readJson(join(dir, 'results.json')), freeze = readJson(join(dir, 'freeze.json'));
  assert.equal(audit.passed, true); assert.equal(audit.phase, 'pilot');
  assert.equal(audit.planned, 9); assert.equal(audit.records, 9); assert.equal(audit.completeRecords, 9); assert.equal(audit.unstarted, 0);
  assert.equal(status.phase, 'pilot'); assert.equal(status.planned, 9); assert.equal(status.complete, 9);
  for (const key of ['failed', 'unstarted', 'started']) assert.equal(status[key], 0);
  assert.equal(status.globalFailure, null); assert.equal(status.ledgerHalted, null); assert.equal(status.frozenUnchanged, true);
  assert.equal(index.length, 9); assert(index.every(slot => slot.status === 'complete'));
  assert.equal(audit.freezeSha256, hash(readFileSync(join(dir, 'freeze.json'))));
  const ledger = checkedLedger();
  if (requireCurrentLedger) assert.equal(audit.ledgerSha256, hash(readFileSync(ledgerPath)), 'Pilot audit is stale relative to ledger');
  const ledgerRequests = ledger.requests.filter(request => request.phase === 'pilot');
  assert.equal(ledgerRequests.length, audit.requests); assert.equal(ledgerRequests.length, status.requests);
  assert(ledgerRequests.every(request => request.status === 'complete' && request.usage !== null));
  const paths = ['audit.json', 'status.json', 'results.json', 'freeze.json', 'schedule.json', 'started.json', 'summary.json', 'report.md',
    ...index.map(slot => slot.file), ...freeze.inputs.map(f => join('frozen-inputs', f.path))];
  const artifacts = paths.sort().map(path => ({ path: relative(root, join(dir, path)), sha256: hash(readFileSync(join(dir, path))) }));
  return { phase: 'pilot', planned: 9, completeRecords: 9, auditLedgerSha256: audit.ledgerSha256, ledgerRequests, artifacts };
}

export function originalVerification() {
  assertPriorLineage();
  const native = readJson(join(originalOutput, 'native/status.json'));
  const offline = readJson(join(originalOutput, 'offline/status.json'));
  const review = readJson(join(originalOutput, 'review.json'));
  assert(native.passed && offline.passed && review.passed);
  assert.equal(native.providerCalls, 0); assert.equal(offline.providerCalls, 0);
  assert.equal(offline.sourceSha256, hash(JSON.stringify(originalInputs())));
  assert.equal(review.sourceSha256, offline.sourceSha256);
  assert.equal(native.reportSha256, hash(readFileSync(join(originalOutput, 'native/report.json'))));
  assert.equal(offline.reportSha256, hash(readFileSync(join(originalOutput, 'offline/report.json'))));
  const nativeReport = readJson(join(originalOutput, 'native/report.json'));
  const files = nativeReport.files.map(f => ({ path: f.path, sha256: hash(readFileSync(join(root, f.path))) }));
  assert.deepEqual(files, nativeReport.files);
  assert.equal(nativeReport.fixtureBundleSha256, hash(JSON.stringify(files)));
  assert.equal(native.fixtureBundleSha256, nativeReport.fixtureBundleSha256);
  return { native, offline, review };
}

export function verification() {
  const prior = originalVerification();
  const preflight = readJson(join(output, 'preflight.json'));
  const review = readJson(join(output, 'review.json'));
  const sourceSha256 = hash(JSON.stringify(inputManifest()));
  assert(preflight.passed && review.passed, 'Continuation preflight and review must pass');
  assert.equal(preflight.providerCalls, 0);
  assert.equal(preflight.sourceSha256, sourceSha256); assert.equal(review.sourceSha256, sourceSha256);
  assert.deepEqual(preflight.lineage, assertPriorLineage());
  assert.deepEqual(preflight.organization, organizationIdentity());
  return { prior, preflight, review };
}

export function phaseStatus(phase) {
  const path = join(output, phase, 'status.json');
  return existsSync(path) ? readJson(path) : null;
}

/** Complete method failures remain data; missing collection/accounting evidence stops dispatch. */
export function continuationIntegrityStop(record) {
  if (record.status !== 'complete' || record.harnessError) return 'harness_failure';
  if (!record.audits?.length) return 'missing_observation_evidence';
  const attempts = record.run?.events?.[0]?.attempts?.filter(attempt => attempt.providerCalled) ?? [];
  if (attempts.length !== record.requests.length) return 'missing_request_evidence';
  if (record.requests.length !== record.reservationIds.length) return 'request_reservation_mismatch';
  if (record.requests.some(request => request.transport?.dispatched !== true)) return 'missing_transport_evidence';
  if (record.requests.some(request => (request.response?.usage ?? request.error?.usage ?? null) === null)) return 'unreconciled_usage';
  return null;
}

const safeCode = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(value) ? value : null;
export function safeTransportError(error) {
  return { name: safeCode(error?.name), code: safeCode(error?.code), causeName: safeCode(error?.cause?.name), causeCode: safeCode(error?.cause?.code) };
}

/** Observe the original fetch and stream errors, without modifying paid request bytes or retrying. */
export function observedFetch(baseFetch, { organizationId, expectedPayload, transport, verify, persist = () => {} }) {
  return async (url, options) => {
    verify();
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(options.method, 'POST'); assert.equal(options.body, expectedPayload); assert.equal(options.redirect, 'error');
    assert(/^org-[A-Za-z0-9_-]{1,120}$/.test(organizationId));
    const headers = new Headers(options.headers);
    assert(!headers.has('OpenAI-Organization') || headers.get('OpenAI-Organization') === organizationId);
    headers.set('OpenAI-Organization', organizationId);
    assert.equal(transport.dispatched, undefined, 'Transport cannot retry a request');
    transport.dispatched = true; transport.organizationId = organizationId; transport.payloadSha256 = hash(expectedPayload);
    const start = performance.now();
    try {
      const response = await baseFetch(url, { ...options, headers });
      transport.httpStatus = response.status;
      const requestId = response.headers.get('x-request-id');
      transport.requestId = typeof requestId === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(requestId) ? requestId : null;
      transport.headersMs = performance.now() - start; persist();
      // Binding native methods avoids changing Response/ReadableStream semantics.
      return new Proxy(response, { get(target, key) {
        if (key === 'body' && target.body) return new Proxy(target.body, { get(body, method) {
          if (method === 'getReader') return (...args) => {
            const reader = body.getReader(...args);
            return new Proxy(reader, { get(actual, operation) {
              if (operation === 'read') return async (...readArgs) => {
                try { return await actual.read(...readArgs); }
                catch (error) { transport.bodyError = safeTransportError(error); persist(); throw error; }
              };
              const value = Reflect.get(actual, operation, actual); return typeof value === 'function' ? value.bind(actual) : value;
            } });
          };
          const value = Reflect.get(body, method, body); return typeof value === 'function' ? value.bind(body) : value;
        } });
        const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
      } });
    } catch (error) {
      transport.error = safeTransportError(error); transport.aborted = options.signal?.aborted ?? false;
      transport.failedAfterMs = performance.now() - start; persist(); throw error;
    }
  };
}
