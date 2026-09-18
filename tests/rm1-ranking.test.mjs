import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { rankCandidates, rankThesis } from '../dist/ranking.js';
import { projectCandidates, serializeCandidates, serializeRequest, createOpenAIProvider } from '../dist/provider.js';
import { validateConfig } from '../dist/config.js';
import { fitContext } from '../dist/context.js';
import { createHealingSession } from '../dist/runtime.js';

const arms = ['lexical-jaccard', 'thesis-no-relations', 'thesis-full'];
const candidate = (overrides = {}) => ({ selector: '', tag: 'input', type: 'text', label: '', container: '', containerKind: 'none', order: 0, score: 0, features: {}, ...overrides });
const corpus = () => Array.from({ length: 48 }, (_, i) => ({ selector: `#c${i}`, tag: ['input', 'button', 'div', 'textarea'][i % 4], type: 'text', label: i % 3 ? 'Open' : 'Value', container: '', containerKind: 'none', order: i, score: 0,
  features: { id: i % 3 ? `c${i}` : '', name: i % 5 ? 'common' : 'invoice', text: i % 2 ? 'Open parcel' : 'Value', ariaLabel: i % 6 ? '' : 'search', role: i % 2 ? 'button' : 'textbox', rowContext: i % 3 ? 'Dispatch Rowan' : 'Warehouse Imani', parentContext: i % 2 ? 'div invoice' : 'span', containerContext: i % 4 ? 'Batch parcel' : 'Inventory', visible: i % 7 !== 0, disabled: i % 11 === 0, classes: ['control', i % 2 ? 'parcel' : 'field'], placeholder: i % 5 ? 'Value' : 'invoice', dataTestId: i % 7 ? '' : 'record', dataTest: i % 4 ? '' : 'open', dataCy: i % 9 ? '' : 'dispatch', nearestLabel: i % 2 ? 'Quantity' : 'Open', title: i % 3 ? '' : 'invoice' } }));

test('CTX-010 default and R2 preserve the pre-edit D30 ranking corpus exactly', () => {
  const inputs = corpus(), before = structuredClone(inputs), outputs = [];
  for (const action of ['fill', 'click']) for (const description of ['Open Imani parcel', 'invoice value', 'Warehouse dispatch', '']) for (const old of ['#invoice', 'form > div > input[name="invoice"]', 'button[data-testid="record"]', 'div:nth-child(3) > .parcel']) {
    const task = { description, scope: 'Batch Rowan' };
    const ranked = rankThesis(inputs, action, task, old);
    assert.deepEqual(rankCandidates(inputs, action, task, old), ranked);
    assert.deepEqual(rankCandidates(inputs, action, task, old, 'thesis-full'), ranked);
    outputs.push(ranked);
  }
  // Captured from D30 12f6b2e / 0.0.8 dist/ranking.js before RM1 edits (1,536 scored records).
  assert.equal(createHash('sha256').update(JSON.stringify(outputs)).digest('hex'), '0a98b252ae0b815769cbee9fcc4fb0f5666add552d763fece105f70e87be3bbc');
  assert.deepEqual(inputs, before);
});

test('CTX-010 R0 computes unique-token Jaccard, strips selector syntax, and breaks ties by DOM order', () => {
  const values = [candidate({ order: 4, features: { text: 'alpha beta gamma' } }), candidate({ order: 2, features: { text: 'alpha alpha beta gamma gamma' } }), candidate({ order: 1, features: { rowContext: 'beta gamma' } })];
  const ranked = rankCandidates(values, 'fill', { description: 'ALPHA alpha', scope: 'beta beta' }, 'form > div:nth-child(3) > input.alpha.alpha', 'lexical-jaccard');
  assert.deepEqual(ranked.map(c => [c.order, c.score]), [[2, 2 / 3], [4, 2 / 3], [1, 1 / 3]]);
  const empty = rankCandidates([candidate({ order: 2 }), candidate({ order: 1 })], 'fill', { description: '' }, 'div > input', 'lexical-jaccard');
  assert.deepEqual(empty.map(c => [c.order, c.score]), [[1, 0], [2, 0]]);
  const quoted = rankCandidates([candidate({ features: { name: 'section' } })], 'fill', { description: '' }, '[name="section"]', 'lexical-jaccard');
  // 'name' is retained by the existing locator tokenizer, while quoted tag identities survive.
  assert.equal(quoted[0].score, 1 / 2);
});

test('CTX-010 R1 excludes pooled and dedicated relations without stripping any prompt evidence', () => {
  const base = candidate({ features: { name: 'quantity', text: 'Quantity', role: 'textbox', visible: true } });
  const related = { ...base, features: { ...base.features, rowContext: 'delta warehouse', parentContext: 'div delta', containerContext: 'warehouse alpha' } };
  const before = structuredClone(related), task = { description: 'warehouse', scope: 'alpha' };
  const stripped = rankThesis([base], 'fill', task, '#delta')[0];
  const ablated = rankCandidates([related], 'fill', task, '#delta', 'thesis-no-relations')[0];
  assert.equal(stripped.score, 20);
  assert.equal(ablated.score, stripped.score);
  assert.ok(rankThesis([related], 'fill', task, '#delta')[0].score > ablated.score);
  assert.deepEqual(ablated.features, related.features);
  assert.deepEqual(related, before);
  const wire = projectCandidates([ablated], { rankingExperiment: 'thesis-no-relations' })[0];
  assert.equal(wire.features.rowContext, 'delta warehouse');
  assert.equal(wire.features.parentContext, 'div delta');
  assert.equal(wire.features.containerContext, 'warehouse alpha');
});

test('CTX-010 every arm preserves duplicate metadata and all non-score candidate fields', () => {
  const inputs = corpus(), task = { description: 'Dispatch', scope: 'Rowan' };
  const full = rankThesis(inputs, 'click', task);
  for (const arm of arms) for (const value of rankCandidates(inputs, 'click', task, '', arm)) {
    const baseline = full.find(c => c.order === value.order);
    const { score: _valueScore, ...remaining } = value, { score: _baselineScore, ...expected } = baseline;
    assert.deepEqual(remaining, expected);
  }
});

function boundedContext(config) {
  return { action: 'fill', task: { description: 'Quantity' }, candidates: Array.from({ length: 30 }, (_, i) => candidate({ selector: `#field-${i}`, order: i, score: i * 100,
    features: { text: 'Quantity', rowContext: `Warehouse ${i}`, parentContext: 'div quantity', visible: true }, suggestedLocators: [`#field-${i}`] })), cleanedDom: '<main>Fallback</main>'.repeat(100),
  coverage: { discovered: 38, beforeBudget: 30, included: 30, omitted: 8, budgetOmitted: 0, textTruncated: false, domChars: 0, payloadChars: 0, domLimit: config.domMaxChars, payloadLimit: config.payloadMaxChars, candidateLimit: config.maxCandidates } };
}

test('CTX-010 score-free fitting uses the exact wire projection for every arm and after feedback', () => {
  const payloads = [];
  for (const arm of arms) {
    const config = validateConfig({ rankingExperiment: arm, domMaxChars: 1800, payloadMaxChars: 3000 });
    const context = boundedContext(config);
    for (const feedback of [undefined, [{ selector: '#missing'.repeat(20), count: 0, reason: 'no_match' }]]) {
      if (feedback) context.feedback = feedback;
      fitContext(context, config);
      const request = serializeRequest(context, config), wire = JSON.parse(JSON.parse(request).messages[1].content);
      assert.equal(JSON.stringify(wire.candidates), serializeCandidates(context.candidates, config));
      assert.equal(context.coverage.domChars, serializeCandidates(context.candidates, config).length + (context.cleanedDom?.length ?? 0));
      assert.equal(context.coverage.payloadChars, request.length);
      assert.ok(request.length <= config.payloadMaxChars && context.coverage.domChars <= config.domMaxChars);
      assert.ok(wire.candidates.every(c => !Object.hasOwn(c, 'score') && !Object.hasOwn(c, 'order')));
      assert.ok(!request.includes('rankingExperiment') && !request.includes(arm));
      assert.ok(context.candidates.some(c => c.score > 0));
      payloads.push(request);
    }
  }
  assert.equal(payloads[0], payloads[2]); assert.equal(payloads[2], payloads[4]);
  assert.equal(payloads[1], payloads[3]); assert.equal(payloads[3], payloads[5]);
  assert.ok(Object.hasOwn(projectCandidates([candidate()])[0], 'score'));
});

test('CTX-010 OpenAI transport sends the metered score-free request and enforces matching session config', async () => {
  const config = validateConfig({ mode: 'full', rankingExperiment: 'lexical-jaccard' });
  const context = fitContext(boundedContext(config), config), expected = serializeRequest(context, config);
  const originalFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (_url, options) => { sent = options.body; return new Response(JSON.stringify({ model: config.model, choices: [{ message: { content: '{"selector":null}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 4 } })); };
  try {
    const provider = createOpenAIProvider({ apiKey: 'test-only-key', config, maxRequests: 1 });
    await provider.select(context, new AbortController().signal);
    assert.equal(sent, expected);
    assert.throws(() => createHealingSession({}, { config: { ...config, rankingExperiment: 'thesis-full' }, provider }), /rankingExperiment mismatch/);
  } finally { globalThis.fetch = originalFetch; }
});

test('CTX-010 optional experiment configuration is explicit and allowlisted', () => {
  assert.ok(!Object.hasOwn(validateConfig(), 'rankingExperiment'));
  for (const arm of arms) assert.equal(validateConfig({ rankingExperiment: arm }).rankingExperiment, arm);
  for (const value of ['', 'invalid', null, {}, true]) assert.throws(() => validateConfig({ rankingExperiment: value }), /rankingExperiment/);
});
