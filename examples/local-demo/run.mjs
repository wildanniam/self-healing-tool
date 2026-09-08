import { chromium } from 'playwright';
import { createHealingSession, createOpenAIProvider, configFromEnv, writeReport } from '../../dist/index.js';
import { startDemoServer, confineDemo, resetDemo, assertDemoTarget } from './server.mjs';
import assert from 'node:assert/strict';

const live = process.argv.includes('--live');
if (process.argv.slice(2).some(a => a !== '--live')) throw new Error('Only --live is supported');
const config = configFromEnv(live ? process.env : {}, { mode: live ? 'full' : 'ranker-only' });
// A credential by itself never starts paid work. User explicitly supplies a per-run request cap.
const maxRequests = Number(process.env.HEALING_LIVE_MAX_REQUESTS);
if (live && (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 9)) throw new Error('Set HEALING_LIVE_MAX_REQUESTS explicitly (1–9) after approving the live run');
const provider = live ? createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY ?? '', config, maxRequests }) : undefined;
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
    const directory = await writeReport(session.snapshot(), { directory: 'output/demo' });
    console.log(JSON.stringify({ mode: live ? 'live' : 'offline-ranker-only', report: `${directory}/report.html`, note: live ? 'Development demo only; not final evaluation' : 'Offline mechanism check; no model calls or model-performance claim' }));
  }
} finally { await browser?.close(); await server.close(); }
