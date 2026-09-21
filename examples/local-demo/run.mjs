import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { createHealingSession, createBudgetedOpenAIProvider, configFromEnv, writeReport, serializeRequest, readLiveBudget } from '../../dist/index.js';
import { startDemoServer, confineDemo, resetDemo, assertDemoTarget } from './server.mjs';
import assert from 'node:assert/strict';

const live = process.argv.includes('--live');
if (process.argv.slice(2).some(a => a !== '--live')) throw new Error('Only --live is supported');
const config = configFromEnv(live ? process.env : {}, { mode: live ? 'full' : 'ranker-only' });
// A credential by itself never starts paid work. User explicitly supplies a per-run request cap.
const maxRequests = Number(process.env.HEALING_LIVE_MAX_REQUESTS);
if (live && (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 9)) throw new Error('Set HEALING_LIVE_MAX_REQUESTS explicitly (1–9) after approving the live run');
if (live && !process.env.OPENAI_API_KEY?.trim()) throw new Error('Invalid configuration: OPENAI_API_KEY');
if (live && !process.env.HEALING_LIVE_BATCH_FILE) throw new Error('Set HEALING_LIVE_BATCH_FILE to the approved persistent budget ledger');
const ledgerPath = process.env.HEALING_LIVE_BATCH_FILE;
const plan = live ? readLiveBudget(ledgerPath).plan : undefined;
if (live && (maxRequests !== plan.phases.demo || config.maxTokens !== 500 || config.maxAttempts !== 3 || config.temperature !== 0)) throw new Error('Live demo differs from the approved batch profile');
const delegate = live ? createBudgetedOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY, config, ledgerPath, phase: 'demo' }) : undefined;
const provider = delegate && { kind: delegate.kind, configuration: config, async select(context, signal) {
  const payload = serializeRequest(context, config);
  if (/EVAL_SENTINEL|sk-[A-Za-z0-9_-]{12,}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(payload)) throw new Error('Payload audit rejected before dispatch');
  const directory = join(dirname(ledgerPath), 'demo-inputs'); mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(join(directory, `${randomUUID()}.json`), payload, { flag: 'wx', mode: 0o600 });
  return delegate.select(context, signal);
} };
const price = plan && { model: config.model, ...plan.price };
if (process.env.DEMO_TARGET) assertDemoTarget(process.env.DEMO_TARGET, 'http://127.0.0.1:1');
const server = await startDemoServer();
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await confineDemo(context, server.origin);
  const page = await context.newPage();
  await resetDemo(page, server.origin, server);
  const session = createHealingSession(page, { config, provider });
  try {
    const normal = await session.fill('#display-name', 'Normal Demo', { description: 'Fill display name' });
    assert.equal(normal.recoveryTriggered, false);
    await resetDemo(page, server.origin, server);
    await page.locator('#display-name').evaluate(n => n.id = 'profile-display');
    const profile = await session.fill('#display-name', 'Updated Demo', { description: 'Fill display name' });
    const correct = await page.locator('#profile-display').inputValue() === 'Updated Demo' && await page.locator('#certificate-name').inputValue() === 'Demo User';
    session.assess({ eventId: profile.id, semantic: correct ? 'correct' : 'incorrect', wrongEffect: !correct });
    assert.equal(correct, true);
    const entity = await session.click('#old-bima', { description: 'View profile', scope: 'Bima Setiawan' });
    const dialogTitle = await page.locator('#dialog-title').textContent();
    session.assess({ eventId: entity.id, semantic: dialogTitle === 'Bima Setiawan' ? 'correct' : 'incorrect', wrongEffect: dialogTitle !== 'Bima Setiawan' });
    assert.equal(dialogTitle, 'Bima Setiawan');
  } finally {
    const directory = await writeReport(session.snapshot(), { directory: 'output/demo', price });
    console.log(JSON.stringify({ mode: live ? 'live' : 'offline-ranker-only', report: `${directory}/report.html`, note: live ? 'Development demo only; not final evaluation' : 'Offline mechanism check; no model calls or model-performance claim' }));
  }
} finally { await browser?.close(); await server.close(); }
