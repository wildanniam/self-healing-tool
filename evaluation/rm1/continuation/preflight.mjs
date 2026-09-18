import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCases } from '../cases.mjs';
import { root, output, hash, readJson, writeJson, assertPriorLineage, organizationIdentity, inputManifest, runtimeIdentity,
  originalVerification, makeSchedule, plan } from './common.mjs';

export function runPreflight() {
  mkdirSync(output, { recursive: true, mode: 0o700 });
  const result = { createdAt: new Date().toISOString(), kind: 'rm1-continuation-offline-preflight', passed: false, providerCalls: 0 };
  try {
    result.lineage = assertPriorLineage();
    result.organization = organizationIdentity();
    result.verification = originalVerification();
    result.runtime = runtimeIdentity();
    assert.deepEqual(result.runtime, readJson(join(root, 'output/d33/pilot/freeze.json')).runtime, 'Original runtime changed');
    const before = inputManifest(); result.sourceSha256 = hash(JSON.stringify(before));
    result.schedules = Object.fromEntries(['pilot', 'main'].map(phase => [phase, makeSchedule(createCases({ phase }), phase)]));
    assert.equal(result.schedules.pilot.length, 9); assert.equal(result.schedules.main.length, 108);
    assert.equal(plan.maxRequests + result.lineage.combinedBeforeContinuation.requests, 351);
    assert(Math.abs(plan.maxCostUsd + result.lineage.combinedBeforeContinuation.reservedUsd - 3) < 1e-12);
    const args = ['--test', 'evaluation/rm1/continuation/continuation.test.mjs', 'evaluation/rm1/continuation/analyze.test.mjs'];
    const log = execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
    const path = join(output, 'preflight-tests.log'); writeFileSync(path, log, { mode: 0o600 });
    result.tests = { command: 'node ' + args.join(' '), passed: true, logPath: path, logSha256: hash(readFileSync(path)) };
    assert.deepEqual(inputManifest(), before, 'Continuation inputs changed during tests');
    assert.deepEqual(assertPriorLineage(), result.lineage);
    assert.deepEqual(organizationIdentity(), result.organization);
    result.passed = true;
  } catch (error) {
    result.failure = { name: error.name, message: String(error.message).slice(0, 3000) };
    if (error.stdout) writeFileSync(join(output, 'preflight-tests-failed.log'), String(error.stdout) + String(error.stderr ?? ''), { mode: 0o600 });
  }
  result.completedAt = new Date().toISOString();
  writeJson(join(output, 'preflight.json'), result);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runPreflight();
  console.log(JSON.stringify({ passed: result.passed, sourceSha256: result.sourceSha256, providerCalls: 0, failure: result.failure }, null, 2));
  if (!result.passed) process.exitCode = 1;
}
