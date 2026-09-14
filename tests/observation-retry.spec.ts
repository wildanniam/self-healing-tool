import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import type { Page, Locator } from 'playwright';
import { createHealingSession, HealingFailure, validateConfig } from '../dist/index.js';
import { serializeRequest } from '../dist/provider.js';
import type { Context, Provider } from '../dist/index.js';

// These tests exercise recovery policy, not sub-second browser IPC latency. The
// original-action/count probes need scheduling headroom on concurrent CI workers.
const config = validateConfig({ mode: 'full', actionTimeoutMs: 1000, recoveryTimeoutMs: 5000, providerTimeoutMs: 1000 });
const response = (selector: string | null) => ({ output: JSON.stringify({ selector }), usage: { inputTokens: 11, outputTokens: 3 } });
function observeCollections(page: Page, before: (number: number) => Promise<void>): Page {
  let count = 0;
  return new Proxy(page, { get(target, key) {
    if (key === 'locator') return (selector: string, options?: Parameters<Page['locator']>[1]) => {
      const locator = target.locator(selector, options);
      if (selector !== 'html') return locator;
      return new Proxy(locator, { get(actual, method) {
        if (method === 'evaluateHandle') return async (...args: any[]) => {
          await before(++count);
          return (actual.evaluateHandle as Function).apply(actual, args);
        };
        const member = Reflect.get(actual, method); return typeof member === 'function' ? member.bind(actual) : member;
      } }) as Locator;
    };
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  } });
}

test('HEAL-010 unchanged observed evidence stops after one parsed-null provider call', async ({ page }) => {
  await page.setContent('<label>Name<input id="name"></label>');
  let calls = 0, observations = 0;
  const provider: Provider = { kind: 'offline', async select() { calls++; return response(null); } };
  const session = createHealingSession(observeCollections(page, async () => { observations++; }), { config, provider });
  await expect(session.fill('#old-name', 'Unwritten', { description: 'Name' })).rejects.toBeInstanceOf(HealingFailure);
  const event = session.snapshot().events[0]!;
  expect(calls).toBe(1); expect(observations).toBe(2); expect(event.attempts).toHaveLength(1);
  expect(event).toMatchObject({ stopReason: 'abstained', actionExecuted: false, failure: 'abstained' });
  expect(event.attempts[0]).toMatchObject({ reason: 'no_candidate_selected_evidence_unchanged', usage: { inputTokens: 11, outputTokens: 3 }, transportAttempted: false });
  const refresh = event.attempts[0]!.observationRefresh!;
  expect(refresh).toMatchObject({ policy: 'null-refresh-once-v1', outcome: 'unchanged' });
  expect(refresh.previousSha256).toBe(refresh.refreshedSha256); expect(refresh.context).toEqual(event.context);
  await expect(page.locator('#name')).toHaveValue('');
});

test('HEAL-010 coverage-only scan count changes do not create another provider attempt', async ({ page }) => {
  await page.setContent(Array.from({ length: 6 }, (_, i) => `<label>Field ${i}<input id="field-${i}"></label>`).join(''));
  let calls = 0;
  const provider: Provider = { kind: 'offline', async select() {
    calls++; await page.evaluate(() => { const hidden = document.createElement('button'); hidden.hidden = true; hidden.textContent = 'Unavailable'; document.body.append(hidden); });
    return response(null);
  } };
  const session = createHealingSession(page, { config, provider });
  await expect(session.fill('#old', 'Unwritten', { description: 'Field' })).rejects.toBeInstanceOf(HealingFailure);
  const event = session.snapshot().events[0]!, refresh = event.attempts[0]!.observationRefresh!;
  expect(calls).toBe(1); expect(refresh.outcome).toBe('unchanged');
  expect(refresh.context!.coverage.scanned).toBeGreaterThan(event.context!.coverage.scanned!);
});

test('HEAL-010 a newly observed target permits one new input while preserving first evidence', async ({ page }) => {
  await page.setContent('<label>Unrelated<input id="unrelated"></label>');
  const inputs: Context[] = [];
  const provider: Provider = { kind: 'offline', async select(context) {
    inputs.push(structuredClone(context));
    if (inputs.length === 1) {
      await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<label>Name<input id="new-name"></label>'); });
      return response(null);
    }
    return response('#new-name');
  } };
  const session = createHealingSession(page, { config, provider });
  const event = await session.fill('#old-name', 'Private current fill', { description: 'Name' });
  expect(inputs).toHaveLength(2); expect(event.attempts).toHaveLength(2);
  expect(event.context!.candidates.some(c => c.selector === '#new-name')).toBe(false);
  expect(inputs[1]!.candidates.some(c => c.selector === '#new-name')).toBe(true);
  expect(event.attempts[0]!.observationRefresh!.outcome).toBe('changed');
  expect(event.attempts[0]!.observationRefresh!.previousSha256).not.toBe(event.attempts[0]!.observationRefresh!.refreshedSha256);
  for (let i = 0; i < inputs.length; i++) {
    expect(event.attempts[i]!.inputContext).toEqual(inputs[i]);
    expect(event.attempts[i]!.inputSha256).toBe(createHash('sha256').update(serializeRequest(event.attempts[i]!.inputContext!, config)).digest('hex'));
    expect(event.attempts[i]!.inputCoverage!.payloadChars).toBeLessThanOrEqual(config.payloadMaxChars);
  }
  expect(event.attempts[0]!.inputSha256).not.toBe(event.attempts[1]!.inputSha256);
  expect(JSON.stringify(event)).not.toContain('Private current fill');
  await expect(page.locator('#new-name')).toHaveValue('Private current fill');
  await expect(page.locator('#unrelated')).toHaveValue('');
});

test('HEAL-010 one refresh per event and configured maxAttempts remain hard bounds', async ({ page }) => {
  for (const maxAttempts of [1, 3]) {
    await page.setContent('<label>Name<input id="name"></label>');
    let calls = 0, observations = 0;
    const provider: Provider = { kind: 'offline', async select() {
      calls++; await page.evaluate(n => { document.querySelector('label')!.prepend(document.createTextNode(` version ${n} `)); }, calls);
      return response(null);
    } };
    const session = createHealingSession(observeCollections(page, async () => { observations++; }), { config: { ...config, maxAttempts }, provider });
    await expect(session.fill('#old', 'Unwritten', { description: 'Name' })).rejects.toBeInstanceOf(HealingFailure);
    const event = session.snapshot().events[0]!;
    expect(calls).toBe(maxAttempts === 1 ? 1 : 2); expect(observations).toBe(maxAttempts === 1 ? 1 : 2);
    expect(event.stopReason).toBe('abstained'); expect(event.attempts.filter(a => a.observationRefresh)).toHaveLength(maxAttempts === 1 ? 0 : 1);
  }
});

test('HEAL-010 invalid-selector feedback retries retain their prior policy', async ({ page }) => {
  await page.setContent('<label>Name<input id="name"></label><label>Code<input id="code"></label>');
  const inputs: Context[] = [];
  const provider: Provider = { kind: 'offline', async select(context) { inputs.push(structuredClone(context)); return response(inputs.length === 1 ? 'input' : '#code'); } };
  const session = createHealingSession(page, { config, provider });
  const event = await session.fill('#old-code', 'Chosen value', { description: 'Code' });
  expect(inputs).toHaveLength(2); expect(inputs[1]!.feedback).toContainEqual({ selector: 'input', count: 2, reason: 'ambiguous' });
  expect(event.attempts.every(a => a.observationRefresh === undefined)).toBe(true);
  expect(event.attempts[0]!.failure).toBe('validation'); expect(event.attempts[1]!.actionExecuted).toBe(true);
});

test('HEAL-010 failed refresh is terminal and does not erase the billed null response', async ({ page }) => {
  await page.setContent('<label>Name<input id="name"></label>');
  let calls = 0;
  const provider: Provider = { kind: 'offline', async select() { calls++; return response(null); } };
  const observed = observeCollections(page, async n => { if (n === 2) throw new Error('diagnostic observation failure'); });
  const session = createHealingSession(observed, { config, provider });
  await expect(session.fill('#old', 'Unwritten', { description: 'Name' })).rejects.toBeInstanceOf(HealingFailure);
  const event = session.snapshot().events[0]!;
  expect(calls).toBe(1); expect(event).toMatchObject({ stopReason: 'context-failure', failure: 'context', actionExecuted: false });
  expect(event.attempts[0]).toMatchObject({ reason: 'observation_refresh_failed', usage: { inputTokens: 11, outputTokens: 3 }, observationRefresh: { outcome: 'failed' } });
});

test('HEAL-010 refresh is limited by remaining event time and cannot cause a late action', async ({ page }) => {
  await page.setContent('<label>Name<input id="name"></label>');
  let calls = 0, release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const observed = observeCollections(page, async n => { if (n === 2) await pending; });
  const provider: Provider = { kind: 'offline', async select() { calls++; return response(null); } };
  const session = createHealingSession(observed, { config: { ...config, recoveryTimeoutMs: 200 }, provider });
  await expect(session.fill('#old', 'Unwritten', { description: 'Name' })).rejects.toBeInstanceOf(HealingFailure);
  const before = session.snapshot();
  expect(calls).toBe(1); expect(before.events[0]).toMatchObject({ stopReason: 'time-limit', failure: 'budget', actionExecuted: false });
  expect(before.events[0]!.attempts[0]!.observationRefresh!.outcome).toBe('time-limit');
  release(); await page.evaluate(() => Promise.resolve());
  expect(session.snapshot()).toEqual(before); await expect(page.locator('#name')).toHaveValue('');
});

test('HEAL-010 late provider answer after changed evidence cannot execute or alter settled accounting', async ({ page }) => {
  await page.setContent('<label>Name<input id="name"></label>');
  let calls = 0, release!: () => void;
  const provider: Provider = { kind: 'offline', async select() {
    calls++;
    if (calls === 1) { await page.locator('#name').evaluate(el => el.setAttribute('aria-label', 'Account name')); return response(null); }
    return new Promise(resolve => { release = () => resolve(response('#name')); });
  } };
  const session = createHealingSession(page, { config: { ...config, providerTimeoutMs: 100 }, provider });
  await expect(session.fill('#old', 'Unwritten', { description: 'Name' })).rejects.toBeInstanceOf(HealingFailure);
  const before = session.snapshot();
  expect(calls).toBe(2); expect(before.events[0]!.stopReason).toBe('provider-failure');
  expect(before.events[0]!.attempts[0]!.usage).toEqual({ inputTokens: 11, outputTokens: 3 });
  expect(before.events[0]!.attempts[1]!.usage).toBeNull();
  release(); await page.evaluate(() => Promise.resolve());
  expect(session.snapshot()).toEqual(before); await expect(page.locator('#name')).toHaveValue('');
});

test('HEAL-010 every retained observation is re-redacted when a later fill marks a value private', async ({ page }) => {
  const future = 'Future sample & detail';
  await page.setContent('<main><button id="continue">Continue</button><input id="actual"></main>');
  let calls = 0;
  const provider: Provider = { kind: 'offline', async select() {
    calls++;
    if (calls === 1) { await page.locator('#continue').evaluate((el, label) => el.setAttribute('aria-label', label), future); return response(null); }
    return response('#continue');
  } };
  const session = createHealingSession(page, { config, provider });
  await session.click('#old', { description: 'Continue' });
  const before = session.snapshot().events[0]!;
  expect(JSON.stringify(before.attempts[0]!.observationRefresh!.context)).toContain(future);
  expect(JSON.stringify(before.attempts[1]!.inputContext)).toContain(future);
  await session.fill('#actual', future, { description: 'Actual field' });
  const after = session.snapshot();
  expect(JSON.stringify(after)).not.toContain(future); expect(JSON.stringify(after)).not.toContain('Future sample &amp; detail');
  expect(after.events[0]!.attempts.map(a => a.inputSha256)).toEqual(before.attempts.map(a => a.inputSha256));
  expect(after.events[0]!.attempts[0]!.observationRefresh!.refreshedSha256).toBe(before.attempts[0]!.observationRefresh!.refreshedSha256);
});


test('HEAL-010 changes omitted by the same feedback budget cannot trigger an identical-input retry', async ({ page }) => {
  await page.setContent(Array.from({ length: 10 }, (_, i) => `<label>Field ${i}<input id="field-${i}"></label>`).join(''));
  const small = validateConfig({ ...config, domMaxChars: 1800, payloadMaxChars: 2700 });
  const inputs: Context[] = [];
  const provider: Provider = { kind: 'offline', async select(context) {
    inputs.push(structuredClone(context));
    if (inputs.length === 1) return response('#' + 'absent'.repeat(84));
    if (inputs.length === 2) {
      const visible = new Set(context.candidates.map(c => c.selector));
      const omitted = inputs[0]!.candidates.find(c => !visible.has(c.selector));
      expect(omitted).toBeDefined();
      await page.locator(omitted!.selector).evaluate(el => el.setAttribute('title', 'Updated metadata'));
    }
    return response(null);
  } };
  const session = createHealingSession(page, { config: small, provider });
  await expect(session.fill('#old', 'Unwritten', { description: 'Field' })).rejects.toBeInstanceOf(HealingFailure);
  const event = session.snapshot().events[0]!;
  expect(inputs).toHaveLength(2);
  expect(event.attempts[1]!.observationRefresh!.outcome).toBe('unchanged');
  expect(event.attempts[1]!.observationRefresh!.context!.candidates).toEqual(inputs[1]!.candidates);
  expect(event.attempts[1]!.observationRefresh!.context!.feedback).toEqual(inputs[1]!.feedback);
  expect(event.stopReason).toBe('abstained');
});
