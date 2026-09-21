import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
const directory = mkdtempSync(join(tmpdir(), 'healing-consumer-'));
const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'CI', 'PLAYWRIGHT_BROWSERS_PATH', 'npm_config_cache'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', directory], { cwd: root, env, encoding: 'utf8' }))[0];
  const allowed = /^(dist\/[a-z-]+\.(?:js|d\.ts)|README\.md|package\.json|docs\/integration\.md|docs\/implementation\/(?:component-inventory|thesis-method-alignment)\.md)$/;
  for (const file of packed.files) assert.match(file.path, allowed, `Unexpected package asset: ${file.path}`);
  assert(packed.files.some(f => f.path === 'dist/index.js'));
  assert(packed.files.some(f => f.path === 'docs/integration.md'));
  assert(packed.files.some(f => f.path === 'docs/implementation/thesis-method-alignment.md'));
  const consumer = join(directory, 'consumer'); mkdirSync(consumer);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'independent-consumer-check', version: '1.0.0', private: true, type: 'module' }));
  execFileSync('npm', ['install', '--prefer-offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', join(directory, packed.filename), 'playwright@1.62.1'], { cwd: consumer, env, stdio: 'pipe' });
  writeFileSync(join(consumer, 'smoke.mjs'), `import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import * as api from 'self-healing-tool';
assert.deepEqual(Object.keys(api).sort(), ['ConfigurationError','DEFAULT_CONFIG','HealingFailure','ProviderError','configFromEnv','createHealingSession','createOpenAIProvider','createBudgetedOpenAIProvider','createLiveBudget','readLiveBudget','serializeRequest','renderReport','reportView','summarize','validateConfig','writeReport'].sort());
const browser = await chromium.launch();
try {
 const page = await browser.newPage();
 await page.setContent('<label>Display name<input id="current"></label>');
 const session = api.createHealingSession(page, { config: { actionTimeoutMs: 1000 } });
 await session.fill('#current', 'normal', {description:'Display name'});
 await session.fill('#old', 'recovered', {description:'Display name'});
 assert.equal(await page.locator('#current').inputValue(), 'recovered');
 assert.equal(session.snapshot().events[1].actionExecuted, true);
 assert.equal(session.snapshot().provider, 'none');
 console.log('Clean tarball consumer: import, normal fill and ranker recovery passed');
} finally { await browser.close(); }
`);
  execFileSync(process.execPath, ['smoke.mjs'], { cwd: consumer, env, stdio: 'inherit' });
  const packageJson = JSON.parse(readFileSync(join(consumer, 'node_modules/self-healing-tool/package.json'), 'utf8'));
  assert.equal(packageJson.peerDependencies.playwright, '1.62.1');
  console.log(JSON.stringify({ node: process.version, playwright: '1.62.1', packageFiles: packed.files.map(f => f.path), result: 'pass' }));
} finally { rmSync(directory, { recursive: true, force: true }); }
