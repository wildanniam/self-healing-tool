import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const baseEnv = Object.fromEntries(['PATH', 'HOME', 'TMPDIR'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
for (const [name, additional, expected] of [
  ['missing request limit', {}, /HEALING_LIVE_MAX_REQUESTS/],
  ['missing key', { HEALING_LIVE_MAX_REQUESTS: '1' }, /OPENAI_API_KEY/],
]) test(`live demo rejects ${name} before starting any services or model calls`, () => {
  const result = spawnSync(process.execPath, ['examples/local-demo/run.mjs', '--live'], { cwd: root, env: { ...baseEnv, ...additional }, encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 1); assert.match(result.stderr, expected); assert.equal(result.stdout, '');
});
test('demo rejects a remote target before opening a browser', () => {
  const result = spawnSync(process.execPath, ['examples/local-demo/run.mjs'], { cwd: root, env: { ...baseEnv, DEMO_TARGET: 'https://example.com' }, encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 1); assert.match(result.stderr, /Undeclared demo target/); assert.equal(result.stdout, '');
});
