import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { collectContext } from '../dist/context.js';
import { rankCandidates, rankThesis } from '../dist/ranking.js';
import { serializeCandidates, serializeRequest } from '../dist/provider.js';
import { createHealingSession, HealingFailure, validateConfig } from '../dist/index.js';
import type { Context, ContextCollectionAudit, Provider, RankingExperiment } from '../dist/index.js';

const arms: RankingExperiment[] = ['lexical-jaccard', 'thesis-no-relations', 'thesis-full'];
const task = { description: 'Fill quantity', scope: 'Warehouse amber' };
// Entity identity is only in a legitimate fieldset legend; every control shares the local label.
const markup = () => '<main>' + Array.from({ length: 40 }, (_, i) => `<fieldset><legend>${i === 24 ? 'Warehouse amber' : `Depot violet ${i}`}</legend><div><label>Quantity<input id="control-${i}" type="text"></label></div></fieldset>`).join('') + '</main>';

test('CTX-010 all arms rank the same universe before top-k and retain detached full audit snapshots', async ({ page }) => {
  await page.setContent(markup());
  const records: ContextCollectionAudit[] = [], selected: Context[] = [];
  for (const arm of arms) {
    const config = validateConfig({ rankingExperiment: arm, maxCandidates: 3 });
    const context = await collectContext(page, 'fill', task, config, [], '#quantity-old', undefined, record => {
      records.push(structuredClone(record));
      // A consumer can modify its copy, never the object about to drive selection.
      record.preRank[0]!.features!.text = 'callback-only'; record.ranked.reverse(); record.context.candidates.length = 0;
    });
    selected.push(context);
    const audit = records.at(-1)!;
    expect(audit.preRank).toHaveLength(40); expect(audit.ranked).toHaveLength(40);
    expect(audit.preRank.every(c => c.score === 0)).toBe(true);
    expect(audit.ranked.map(c => c.order)).toEqual(rankCandidates(audit.preRank, 'fill', task, '#quantity-old', arm).map(c => c.order));
    expect(context.candidates.map(c => c.order)).toEqual(audit.ranked.slice(0, context.candidates.length).map(c => c.order));
    expect(context.candidates.length).toBeGreaterThan(0); expect(context.candidates.length).toBeLessThanOrEqual(3);
    expect(context).toEqual(audit.context);
    expect(audit.preRank[0]!.selector).toBe(''); expect(audit.ranked.every(c => c.selector === '')).toBe(true);
    expect(context.candidates.every(c => c.selector.length > 0)).toBe(true);
    expect(JSON.stringify(context)).not.toContain('callback-only');
    expect(Object.values(audit.timingsMs).every(ms => Number.isFinite(ms) && ms >= 0)).toBe(true);
    expect(audit.context.coverage.payloadChars).toBe(serializeRequest(context, config).length);
    expect(audit.context.coverage.domChars).toBe(serializeCandidates(context.candidates, config).length + (context.cleanedDom?.length ?? 0));
  }
  expect(records[0]!.preRank).toEqual(records[1]!.preRank); expect(records[1]!.preRank).toEqual(records[2]!.preRank);
  expect(records[0]!.cleanedDom).toEqual(records[2]!.cleanedDom);
  expect(selected.map(context => context.candidates[0]!.order)).toEqual([24, 0, 24]);
  const metadata = records.map(record => record.ranked.toSorted((a, b) => a.order - b.order).map(({ score: _score, ...candidate }) => candidate));
  expect(metadata[0]).toEqual(metadata[1]); expect(metadata[1]).toEqual(metadata[2]);
  const defaultContext = await collectContext(page, 'fill', task, validateConfig({ maxCandidates: 3 }), [], '#quantity-old');
  expect(defaultContext.candidates.map(c => c.order)).toEqual(rankThesis(records[2]!.preRank, 'fill', task, '#quantity-old').slice(0, defaultContext.candidates.length).map(c => c.order));
  expect(JSON.parse(JSON.parse(serializeRequest(defaultContext, validateConfig())).messages[1].content).candidates.every((c: object) => Object.hasOwn(c, 'score'))).toBe(true);
});

for (const arm of arms) test(`CTX-010 ${arm} persists through null refresh with exact score-free attempt payloads`, async ({ page }) => {
  await page.setContent(markup());
  const config = validateConfig({ mode: 'full', rankingExperiment: arm, maxCandidates: 3, actionTimeoutMs: 1000, providerTimeoutMs: 5000, recoveryTimeoutMs: 15000 });
  const inputs: Context[] = [], audits: ContextCollectionAudit[] = [];
  const provider: Provider = { kind: 'offline', async select(context) {
    inputs.push(structuredClone(context));
    if (inputs.length === 1) await page.locator('input').evaluateAll(nodes => { for (const node of nodes) node.setAttribute('title', 'fresh metadata'); });
    return { output: '{"selector":null}', usage: { inputTokens: 5, outputTokens: 2 } };
  } };
  const session = createHealingSession(page, { config, provider, onContextAudit(record) { audits.push(record); } });
  await expect(session.fill('#quantity-old', 'private amount', task)).rejects.toBeInstanceOf(HealingFailure);
  const event = session.snapshot().events[0]!;
  expect(inputs).toHaveLength(2); expect(audits).toHaveLength(2);
  expect(event.stopReason).toBe('abstained'); expect(event.attempts[0]!.observationRefresh!.outcome).toBe('changed');
  expect(audits.map(record => record.rankingExperiment)).toEqual([arm, arm]);
  for (let i = 0; i < 2; i++) {
    const input = inputs[i]!, audit = audits[i]!;
    const expected = rankCandidates(audit.preRank, 'fill', task, '#quantity-old', arm);
    expect(input.candidates.map(c => c.order)).toEqual(expected.slice(0, input.candidates.length).map(c => c.order));
    expect(input.candidates[0]!.order).toBe(arm === 'thesis-no-relations' ? 0 : 24);
    const request = serializeRequest(input, config), wire = JSON.parse(JSON.parse(request).messages[1].content);
    expect(wire.candidates.every((c: object) => !Object.hasOwn(c, 'score'))).toBe(true);
    expect(request).not.toContain(arm); expect(request).not.toContain('timingsMs'); expect(request).not.toContain('private amount');
    expect(event.attempts[i]!.inputSha256).toBe(createHash('sha256').update(request).digest('hex'));
    expect(event.attempts[i]!.inputCoverage!.payloadChars).toBe(request.length);
  }
  expect(event.attempts[0]!.inputSha256).not.toBe(event.attempts[1]!.inputSha256);
});

test('CTX-010 an audit failure is an explicit context failure before any provider dispatch', async ({ page }) => {
  await page.setContent('<label>Quantity<input id="quantity"></label>');
  let dispatched = 0;
  const provider: Provider = { kind: 'offline', async select() { dispatched++; return { output: '{"selector":"#quantity"}', usage: null }; } };
  const session = createHealingSession(page, { config: { mode: 'full', rankingExperiment: 'thesis-full', actionTimeoutMs: 1000 }, provider,
    onContextAudit() { throw new Error('audit storage unavailable'); },
  });
  await expect(session.fill('#old', 'private amount', { description: 'Quantity' })).rejects.toBeInstanceOf(HealingFailure);
  expect(dispatched).toBe(0); expect(session.snapshot().events[0]).toMatchObject({ stopReason: 'context-failure', failure: 'context', actionExecuted: false });
  await expect(page.locator('#quantity')).toHaveValue('');
});
