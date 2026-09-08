import { test, expect } from '@playwright/test';
import { createHealingSession, HealingFailure, ProviderError, writeReport, renderReport, summarize } from '../dist/index.js';
import { collectContext } from '../dist/context.js';
import { validateConfig } from '../dist/config.js';
import { serializeRequest } from '../dist/provider.js';
import { startDemoServer, confineDemo, resetDemo, assertDemoTarget } from '../examples/local-demo/server.mjs';
import type { Context, Provider } from '../dist/index.js';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
const config = { actionTimeoutMs: 300, recoveryTimeoutMs: 2000, providerTimeoutMs: 200 };
function fake(choose: (context: Context, n: number) => unknown): Provider & { calls: number } {
  let calls = 0;
  return { kind: 'offline', get calls() { return calls; }, async select(context) { return { output: JSON.stringify(choose(context as Context, ++calls)), usage: { inputTokens: 11, outputTokens: 4 } }; } };
}
const form = '<label>Display name<input id="display"></label><label>Certificate name<input id="certificate" value="Original"></label><button id="save">Save</button><output></output><script>document.querySelector("button").onclick=()=>document.querySelector("output").textContent="Saved"</script>';

test('INT-002 controls preserve fill/native assertions and make zero provider calls', async ({ page }) => {
  await page.setContent(form);
  const provider = fake(() => { throw new Error('must not call'); });
  const session = createHealingSession(page, { config: { ...config, mode: 'full' }, provider });
  await session.fill('#display', 'Private form value', { description: 'Display name' });
  await session.click('#save', { description: 'Save' });
  await expect(page.locator('#display')).toHaveValue('Private form value');
  await expect(page.locator('output')).toHaveText('Saved');
  expect(provider.calls).toBe(0);
  expect(session.snapshot().events.every(e => !e.recoveryTriggered)).toBe(true);
  expect(JSON.stringify(session.snapshot())).not.toContain('Private form value');
});

test('HEAL-001 non-drift failures retain native errors without provider invocation', async ({ page }) => {
  const provider = fake(() => null);
  const session = createHealingSession(page, { config: { ...config, mode: 'full' }, provider });
  for (const [html, selector] of [['<button>One</button><button>Two</button>', 'button'], ['<button disabled>Save</button>', 'button'], ['<button hidden>Hidden</button>', 'button'], ['<button>Save</button>', '[broken']]) {
    await page.setContent(html);
    await expect(session.click(selector!, { description: 'Save' })).rejects.not.toBeInstanceOf(HealingFailure);
  }
  await page.close();
  await expect(session.click('#missing', { description: 'Save' })).rejects.not.toBeInstanceOf(HealingFailure);
  expect(provider.calls).toBe(0);
  expect(session.snapshot().events.every(e => !e.recoveryTriggered)).toBe(true);
});

test('HEAL/OBS missing fill recovers without changing the other field; semantics remain unassessed', async ({ page }) => {
  await page.setContent(form);
  const provider = fake(c => ({ selector: c.candidates.find(n => n.label === 'Display name')!.selector }));
  const session = createHealingSession(page, { config: { ...config, mode: 'full' }, provider });
  const event = await session.fill('#old-display', 'Chosen Input', { description: 'Display name' });
  expect(event.recoveryTriggered).toBe(true);
  expect(event.attempts[0]!.candidateAccepted).toBe(true);
  expect(event.attempts[0]!.actionExecuted).toBe(true);
  expect(event.semantic).toBe('unassessed');
  await expect(page.locator('#display')).toHaveValue('Chosen Input');
  await expect(page.locator('#certificate')).toHaveValue('Original');
  expect(event.originalMs).toBeGreaterThan(40);
  expect(event.totalMs).toBeGreaterThanOrEqual(event.originalMs + event.retryMs);
  expect(Math.abs(event.totalMs - event.originalMs - event.internalMs - event.retryMs)).toBeLessThan(1);
  expect(JSON.stringify(session.snapshot())).not.toContain('Chosen Input');
});

test('HEAL-002/005 malformed output and incompatible/duplicate targets remain rejected until bounded exhaustion', async ({ page }) => {
  await page.setContent(form);
  const provider: Provider = { kind: 'offline', async select(c) { return { output: '```js\nprocess.exit()\n```', usage: null }; } };
  const session = createHealingSession(page, { config: { ...config, mode: 'full' }, provider });
  await expect(session.fill('#missing', 'unchanged', { description: 'Display name' })).rejects.toBeInstanceOf(HealingFailure);
  const event = session.snapshot().events[0]!;
  expect(event.attempts).toHaveLength(3);
  expect(event.stopReason).toBe('attempt-limit');
  expect(event.attempts.every(a => a.failure === 'parse' && !a.candidateAccepted && !a.actionExecuted)).toBe(true);
  const invalid = fake((c, n) => ({ selector: n === 1 ? 'input' : c.candidates[0]!.selector }));
  const other = createHealingSession(page, { config: { ...config, mode: 'full' }, provider: invalid });
  const recovered = await other.fill('#absent', 'new', { description: 'Display name' });
  expect(recovered.attempts[0]!.failure).toBe('validation');
  expect(recovered.attempts[1]!.actionExecuted).toBe(true);
  const incompatible = fake(() => ({ selector: 'button' }));
  const wrong = createHealingSession(page, { config: { ...config, mode: 'full' }, provider: incompatible });
  await expect(wrong.fill('#missing', 'never', { description: 'Display name' })).rejects.toBeInstanceOf(HealingFailure);
  expect(wrong.snapshot().events[0]!.attempts.every(a => a.failure === 'validation' && !a.actionExecuted)).toBe(true);
});

test('HEAL-002/006 provider timeout stops without a late action and keeps unknown usage', async ({ page }) => {
  await page.setContent(form);
  let aborted = 0;
  const provider: Provider = { kind: 'offline', async select(_, signal) { return new Promise((resolve, reject) => { signal.addEventListener('abort', () => { aborted++; reject(new Error('abort')); }); }); } };
  const session = createHealingSession(page, { config: { ...config, mode: 'full', recoveryTimeoutMs: 150, providerTimeoutMs: 50 }, provider });
  const begin = performance.now();
  await expect(session.fill('#missing', 'never', { description: 'Display name' })).rejects.toBeInstanceOf(HealingFailure);
  expect(performance.now() - begin).toBeLessThan(3000);
  expect(aborted).toBeGreaterThan(0);
  expect(session.snapshot().events[0]!.attempts.every(a => a.usage === null && !a.actionExecuted)).toBe(true);
  await expect(page.locator('#display')).toHaveValue('');
});

test('HEAL-004 structurally accepted click that cannot execute remains an action failure', async ({ page }) => {
  await page.setContent('<button>Save</button><div style="position:fixed;inset:0;background:white">Overlay</div>');
  const provider = fake(c => ({ selector: c.candidates[0]!.selector }));
  const session = createHealingSession(page, { config: { ...config, mode: 'full', maxAttempts: 1 }, provider });
  await expect(session.click('#missing', { description: 'Save' })).rejects.toBeInstanceOf(HealingFailure);
  const a = session.snapshot().events[0]!.attempts[0]!;
  expect(a.candidateAccepted).toBe(true);
  expect(a.actionExecuted).toBe(false);
  expect(a.failure).toBe('action');
});

for (const container of ['article', 'tr', 'div', 'dialog']) {
  test(`CTX-002 distinguishes repeated ${container} entity labels`, async ({ page }) => {
    const card = (name: string) => container === 'tr' ? `<tr><td>${name}</td><td><button>View profile</button></td></tr>` : `<${container}${container === 'dialog' ? ' open' : ''}><h2>${name}</h2><button>View profile</button></${container}>`;
    await page.setContent((container === 'tr' ? '<table>' : '<main>') + card('Alya') + card('Bima') + (container === 'tr' ? '</table>' : '</main>'));
    const context = await collectContext(page, 'click', { description: 'View profile', scope: 'Bima' }, validateConfig(), []);
    expect(context.candidates[0]!.container).toContain('Bima');
    expect(context.candidates[0]!.score).toBeGreaterThan(context.candidates[1]!.score);
  });
}

test('CTX-001/003/004 actual provider serialization omits oracle/secret inputs and reports truncation', async ({ page }) => {
  await page.setContent('<div data-oracle="answer"><span>ORACLE_SENTINEL</span></div><script>window.answer="SECRET_ANSWER"</script>' + '<label data-answer-selector="#correct">Display name<input value="session_secret"></label>' + Array.from({ length: 40 }, (_, i) => `<article><h2>Entity ${i}</h2><button data-mutation="ANSWER_ID">View profile</button></article>`).join(''));
  const settings = validateConfig({ domMaxChars: 1000, payloadMaxChars: 2500, maxCandidates: 4 });
  const c = await collectContext(page, 'click', { description: 'View profile\nexpected_selector=#correct\nORACLE_SENTINEL', scope: 'Entity 1', oracle: 'SECRET_ANSWER' } as any, settings, ['session_secret']);
  const serialized = serializeRequest(c, settings);
  for (const secret of ['ORACLE_SENTINEL', 'SECRET_ANSWER', '#correct', 'ANSWER_ID', 'session_secret']) expect(serialized).not.toContain(secret);
  expect(serialized).toContain('Entity 1');
  expect(c.coverage.omitted).toBeGreaterThan(0);
  expect(c.coverage.payloadChars).toBe(serialized.length);
  expect(serialized.length).toBeLessThanOrEqual(settings.payloadMaxChars);
  expect(c.coverage.domChars).toBeLessThanOrEqual(settings.domMaxChars);
  expect(c.candidates.length).toBeLessThanOrEqual(settings.maxCandidates);
});

test('EVAL-003 same candidate information and ranker-only causes zero provider requests', async ({ page }) => {
  await page.setContent(form);
  let modelContext: Context | undefined;
  const provider = fake(c => { modelContext = c; return { selector: c.candidates[0]!.selector }; });
  const full = createHealingSession(page, { config: { ...config, mode: 'full' }, provider });
  await full.fill('#missing', 'alpha', { description: 'Display name' });
  await page.setContent(form);
  const ranker = createHealingSession(page, { config, provider });
  await ranker.fill('#missing', 'alpha', { description: 'Display name' });
  expect(ranker.snapshot().events[0]!.context).toEqual(modelContext);
  expect(provider.calls).toBe(1);
  expect(ranker.snapshot().events[0]!.attempts.every(a => !a.providerCalled)).toBe(true);
});

test('OBS wrong-target evidence survives later success and report artifacts cannot overwrite', async ({ page }) => {
  await page.setContent(form);
  const provider = fake(c => ({ selector: c.candidates.find(n => n.label === 'Certificate name')!.selector }));
  const session = createHealingSession(page, { config: { ...config, mode: 'full' }, provider });
  const bad = await session.fill('#missing', 'Changed', { description: 'Display name' });
  session.assess({ eventId: bad.id, attemptId: bad.attempts[0]!.id, semantic: 'incorrect', wrongEffect: true, targetInCandidates: false });
  const good = await session.fill('#display', 'Changed', { description: 'Display name' });
  session.assess({ eventId: good.id, semantic: 'correct', wrongEffect: false });
  expect(summarize(session.snapshot()).wrongEffects).toBe(1);
  expect(summarize(session.snapshot()).correctRepairs).toBe(0);
  expect(summarize(session.snapshot()).costPerCorrectRepairUsd).toBeNull();
  const root = await mkdtemp(join(tmpdir(), 'healing-report-test-'));
  try {
    const directory = await writeReport(session.snapshot(), { directory: root });
    await expect(writeReport(session.snapshot(), { directory: root })).rejects.toThrow();
    const repeat = createHealingSession(page, { repeatOf: session.id });
    const next = await writeReport(repeat.snapshot(), { directory: root });
    expect(next).not.toBe(directory);
    const json = JSON.parse(await readFile(join(directory, 'report.json'), 'utf8'));
    expect(json.assessments[0].wrongEffect).toBe(true);
    expect(json.events[0].context).toBeUndefined();
    expect(JSON.parse(await readFile(join(next, 'report.json'), 'utf8')).repeatOf).toBe(session.id);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('OBS default reports omit sensitive context; diagnostic capture is explicit and separately named', async ({ page }) => {
  await page.setContent('<label>Display name<input value="PRIVATE_FIELD"></label><script>window.token="PRIVATE_SESSION"</script>');
  const session = createHealingSession(page, { config, omitValues: ['PRIVATE_FIELD', 'PRIVATE_SESSION', 'CUSTOM_CREDENTIAL'] });
  const event = await session.fill('#missing', 'CUSTOM_CREDENTIAL', { description: 'Display name <script>alert(1)</script> sk-example-secret' });
  const html = renderReport(session.snapshot());
  for (const secret of ['PRIVATE_FIELD', 'PRIVATE_SESSION', 'CUSTOM_CREDENTIAL', 'sk-example-secret']) expect(html).not.toContain(secret);
  expect(html).not.toContain('<script>alert(1)</script>');
  expect(html).toContain('&lt;script&gt;');
  expect(session.diagnostics()).toEqual([]);
  await session.captureDiagnostics(event.id);
  expect(session.diagnostics()[0]!.rawDom).toContain('PRIVATE_SESSION');
  const root = await mkdtemp(join(tmpdir(), 'healing-diagnostic-test-'));
  try {
    const directory = await writeReport(session.snapshot(), { directory: root, diagnostics: session.diagnostics() });
    expect(await readFile(join(directory, 'SENSITIVE-local-diagnostics.json'), 'utf8')).toContain('PRIVATE_SESSION');
    expect(await readFile(join(directory, 'report.json'), 'utf8')).not.toContain('PRIVATE_SESSION');
    expect((await stat(join(directory, 'SENSITIVE-local-diagnostics.json'))).mode & 0o777).toBe(0o600);
  } finally { await rm(root, { recursive: true, force: true }); }

});

test('DEMO independent app supports reset and forbids undeclared target', async ({ browser }) => {
  const server = await startDemoServer();
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await confineDemo(context, server.origin);
    const page = await context.newPage();
    await resetDemo(page, server.origin, server);
    await page.locator('#display-name').fill('Changed');
    await resetDemo(page, server.origin, server);
    await expect(page.locator('#display-name')).toHaveValue('Demo User');
    expect(() => assertDemoTarget('https://example.com', server.origin)).toThrow();
    await expect(resetDemo(page, server.origin, { ...server, instance: 'different-instance' })).rejects.toThrow('Mismatched');
  } finally { await context.close(); await server.close(); }
});

test('DEMO blocks an undeclared loopback service, redirects and application fetch', async ({ browser }) => {
  let remoteHits = 0;
  const remote = createServer((_, res) => { remoteHits++; res.end('remote'); });
  await new Promise<void>(resolve => remote.listen(0, '127.0.0.1', resolve));
  const remoteOrigin = `http://127.0.0.1:${(remote.address() as any).port}`;
  const local = createServer((req, res) => { if (req.url === '/redirect') { res.writeHead(302, { location: remoteOrigin }); res.end(); } else res.end('<html>local</html>'); });
  await new Promise<void>(resolve => local.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(local.address() as any).port}`;
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await confineDemo(context, origin);
    const page = await context.newPage();
    await expect(page.goto(`${origin}/redirect`)).rejects.toThrow();
    const fetchPage = await context.newPage();
    await fetchPage.goto(origin);
    const result = await fetchPage.evaluate(async url => { try { await fetch(url); return 'allowed'; } catch { return 'blocked'; } }, remoteOrigin);
    expect(result).toBe('blocked');
    expect(remoteHits).toBe(0);
  } finally { await context.close(); await Promise.all([new Promise<void>(resolve => remote.close(() => resolve())), new Promise<void>(resolve => local.close(() => resolve()))]); }
});

test('provider/session mismatch fails at construction with no provider call', async ({ page }) => {
  let calls = 0;
  const provider: Provider = { kind: 'openai', configuration: validateConfig({ model: 'gpt-4o-mini-2024-07-18' }), async select() { calls++; return { output: '{"selector":null}', usage: null }; } };
  expect(() => createHealingSession(page, { config: { mode: 'full' }, provider })).toThrow('provider/session model mismatch');
  expect(calls).toBe(0);
});

test('CTX oracle-marked ARIA label references cannot leak unmarked answer text', async ({ page }) => {
  await page.setContent('<span id="answer-label" data-healing-evaluator>ANSWER_TEXT_WITHOUT_RESERVED_WORDS</span><button aria-labelledby="answer-label">Open</button>');
  const context = await collectContext(page, 'click', {description:'Open'}, validateConfig(), []);
  expect(JSON.stringify(context)).not.toContain('ANSWER_TEXT_WITHOUT_RESERVED_WORDS');
});


test('HEAL-006 terminal provider failures stop after one invocation with truthful dispatch/usage', async ({ page }) => {
  await page.setContent(form);
  const cases = [
    { reason: 'provider_budget_unreconciled', dispatched: false, usage: null },
    { reason: 'request_limit_exhausted', dispatched: false, usage: null },
    { reason: 'provider_http_429', dispatched: true, usage: null },
    { reason: 'provider_missing_output', dispatched: true, usage: { inputTokens: 17, outputTokens: 3 } },
  ];
  for (const item of cases) {
    let calls = 0;
    const configuration = validateConfig({ ...config, mode: 'full' });
    const provider: Provider = {kind:'openai',configuration,async select() {
      calls++; throw new ProviderError(item.reason,item.usage,item.dispatched);
    }};
    const session = createHealingSession(page,{config:configuration,provider});
    await expect(session.fill('#missing','Never apply',{description:'Display name'})).rejects.toBeInstanceOf(HealingFailure);
    const event = session.snapshot().events[0]!;
    expect(calls).toBe(1); expect(event.attempts).toHaveLength(1);
    expect(event.stopReason).toBe('provider-failure'); expect(event.failure).toBe('provider');
    expect(renderReport(session.snapshot())).toContain('<code>no selector</code>');
    expect(renderReport(session.snapshot())).not.toContain('<code>abstained</code>');
    expect(event.attempts[0]).toMatchObject({reason:item.reason,transportAttempted:item.dispatched,usage:item.usage,actionExecuted:false});
    await expect(page.locator('#display')).toHaveValue('');
  }
});

test('HEAL-006 timed-out provider cannot retry or apply a late valid answer', async ({ page }) => {
  await page.setContent(form); let calls=0; let finish!:()=>void;
  const configuration=validateConfig({...config,mode:'full',providerTimeoutMs:30,recoveryTimeoutMs:2000});
  const provider:Provider={kind:'openai',configuration,select: async context => {
    calls++;
    return new Promise(resolve=>{finish=()=>resolve({output:JSON.stringify({selector:context.candidates[0]!.selector}),usage:{inputTokens:10,outputTokens:4},transportAttempted:true});});
  }};
  const session=createHealingSession(page,{config:configuration,provider});
  await expect(session.fill('#missing','Late answer',{description:'Display name'})).rejects.toBeInstanceOf(HealingFailure);
  const before=session.snapshot(); expect(calls).toBe(1);
  expect(before.events[0]).toMatchObject({failure:'provider',stopReason:'provider-failure',actionExecuted:false});
  expect(before.events[0]!.attempts).toHaveLength(1);
  expect(before.events[0]!.attempts[0]).toMatchObject({transportAttempted:null,usage:null});
  finish(); await page.evaluate(()=>Promise.resolve());
  expect(session.snapshot()).toEqual(before); await expect(page.locator('#display')).toHaveValue('');
});
