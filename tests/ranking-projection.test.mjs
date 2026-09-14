import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankThesis } from '../dist/ranking.js';
import { parseSelector, projectCandidates, serializeCandidates, serializeRequest, SYSTEM_PROMPT } from '../dist/provider.js';
import { validateConfig } from '../dist/config.js';
import { fitContext } from '../dist/context.js';

const candidate = (overrides = {}) => ({
  selector: '#parcel', tag: 'input', type: 'text', label: '', container: '', containerKind: 'none',
  order: 0, score: 0, features: { id: 'parcel', visible: true }, ...overrides,
});
const score = (value, task = '', selector = '') => rankThesis([value], 'fill', { description: task }, selector)[0].score;

test('CTX-008 structural repetition and neutral parent wrappers cannot multiply intent scores', () => {
  const field = candidate({ features: { name: 'parcel', visible: true, parentContext: 'div', containerContext: 'Dispatch parcel' } });
  const single = 'form > div > input.parcel';
  const repeated = 'form > div > div:nth-child(2) > div:nth-of-type(3) > input.parcel.parcel';
  assert.equal(score(field, 'Dispatch parcel', single), score(field, 'Dispatch parcel', repeated));
  assert.equal(score(field, 'Dispatch parcel', repeated), score({ ...field, features: { ...field.features, parentContext: 'span' } }, 'Dispatch parcel', repeated));
  assert.equal(score(field, 'Dispatch parcel parcel', repeated), score(field, 'Dispatch parcel', repeated));
  const unrelated = candidate({ selector: '#other', order: 1, features: { name: 'other', visible: true, parentContext: 'div' } });
  assert.equal(rankThesis([unrelated, field], 'fill', { description: 'Dispatch parcel' }, repeated)[0].selector, '#parcel');
});

test('CTX-008 literal tag words and semantic parent identities retain their evidence', () => {
  const field = candidate({ features: { name: 'section', visible: true, parentContext: 'div shipment-details' } });
  assert.ok(score(field, '', '[name="section"]') > score(field, '', 'section > input'));
  assert.equal(score(field, 'shipment details'), score({ ...field, features: { ...field.features, parentContext: 'span shipment-details' } }, 'shipment details'));
  assert.ok(score(field, 'shipment details') > score({ ...field, features: { ...field.features, parentContext: 'span' } }, 'shipment details'));
});

test('CTX-008 unique stable identity is not penalized for a shared class or label', () => {
  const target = candidate({ label: 'Value', features: { name: 'parcel', text: 'Value', classes: ['control'], visible: true }, suggestedLocators: ['[name="parcel"]', '.control'] });
  const duplicates = Array.from({ length: 8 }, (_, i) => candidate({ selector: '.control', order: i + 1, label: 'Value', features: { name: 'duplicate', text: 'Value', classes: ['control'], visible: true }, suggestedLocators: ['.control'] }));
  const ranked = rankThesis([target, ...duplicates], 'fill', { description: '' });
  assert.equal(ranked.find(c => c.selector === target.selector).duplicateCount, 1);
  assert.equal(ranked.find(c => c.selector === target.selector).score, score(target));
  assert.ok(ranked.filter(c => c.selector === '.control').every(c => c.duplicateCount === 8));
  assert.equal(ranked.length, 9);
});

test('CTX-008 equal labels in separate entity rows stay distinct and scope breaks the tie', () => {
  const rows = ['Rowan', 'Imani'].map((person, i) => candidate({
    selector: `tr:has-text("${person}") button`, tag: 'button', type: 'button', label: 'Open', order: i,
    container: person, containerKind: 'row', features: { text: 'Open', rowContext: person, visible: true },
  }));
  const ranked = rankThesis(rows, 'click', { description: 'Open Imani' }, 'button');
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].container, 'Imani');
  assert.ok(ranked.every(c => c.duplicateCount === 2));
  assert.equal(new Set(projectCandidates(ranked).map(c => c.selector)).size, 2);
});

test('CTX-008 exact stable attributes after unrelated brackets are recognized once', () => {
  const field = candidate({ features: { name: 'x', visible: true } });
  const plain = score(field, '', '[name="x"]');
  assert.equal(score(field, '', 'form[method="get"] input[name="x"]'), plain);
  assert.equal(score(field, '', 'form[method="get"] input[name="x"][name="x"]'), plain);
  assert.equal(plain - score(field), 30);
  assert.equal(score(candidate({ features: { id: 'invoice', visible: true } }), '', '#invoice'), 77);
  assert.equal(score(candidate({ features: { id: 'invoice', visible: false, disabled: true } }), '', '#invoice'), 34);
});

test('CTX-008 compact projection preserves evidence names, false facts, primary preference and canonical candidates', () => {
  const value = candidate({
    type: '', label: 'Dispatch', container: 'Dispatch', containerKind: 'form', duplicateCount: 1,
    features: { id: 'parcel', name: '', placeholder: '', text: 'Dispatch', nearestLabel: 'Dispatch', containerContext: 'Dispatch', visible: false, disabled: false, classes: ['control', '', 'control'], href: '/dispatch', formAction: '/dispatch', inputValue: 'PRIVATE_VALUE', rawHtml: 'PRIVATE_HTML' },
    suggestedLocators: ['#parcel', '#parcel', '[name="parcel"]'], rawHtml: 'PRIVATE_OUTER',
  });
  const before = structuredClone(value);
  const wire = projectCandidates([value])[0];
  assert.equal(wire.label, 'Dispatch'); assert.equal(wire.container, 'Dispatch');
  for (const source of ['text', 'nearestLabel', 'containerContext']) assert.equal(wire.features[source], 'Dispatch');
  assert.equal(wire.features.visible, false); assert.equal(wire.features.disabled, false);
  assert.equal(wire.features.href, '/dispatch'); assert.equal(wire.features.formAction, '/dispatch');
  assert.deepEqual(wire.features.classes, ['control']);
  assert.deepEqual(wire.suggestedLocators, ['#parcel', '[name="parcel"]']);
  assert.ok(!('order' in wire) && !('type' in wire) && !('duplicateCount' in wire));
  assert.ok(!('name' in wire.features) && !('placeholder' in wire.features));
  assert.ok(!serializeCandidates([value]).includes('PRIVATE_'));
  assert.deepEqual(value, before);
  assert.ok(serializeCandidates([value]).length < JSON.stringify([value]).length);
});

test('CTX-008 candidates without verified locators remain described without invented selectors', () => {
  const wire = projectCandidates([candidate({ selector: '', suggestedLocators: [], features: { text: 'Open', rowContext: 'Rowan' } })]);
  assert.equal(wire.length, 1); assert.equal(wire[0].selector, '');
  assert.equal(wire[0].features.rowContext, 'Rowan');
  assert.ok(!('suggestedLocators' in wire[0]));
});

test('CTX-008 candidate measurement uses the actual wire projection and preserves request protocol', () => {
  const candidates = [candidate(), candidate({ selector: '#second', order: 1, features: { name: 'second', disabled: false } })];
  const context = { action: 'fill', task: { description: 'Parcel' }, candidates, coverage: {} };
  const config = validateConfig();
  const request = JSON.parse(serializeRequest(context, config));
  const payload = JSON.parse(request.messages[1].content);
  assert.equal(JSON.stringify(payload.candidates), serializeCandidates(candidates));
  assert.equal(request.messages[0].content, SYSTEM_PROMPT);
  assert.equal(request.model, config.model); assert.equal(request.temperature, 0); assert.equal(request.max_tokens, 500);
  assert.deepEqual(request.response_format, { type: 'json_object' }); assert.equal(request.store, false);
  const empty = { ...context, candidates: [] };
  assert.equal(JSON.parse(serializeRequest(empty, config)).messages[1].content, JSON.stringify(empty));
  const spec = { contract: null, expectedRevision: 'r1', applicability: 'missing', policy: 'all-clauses-positive-token-phrase-v1' };
  const b = { ...context, targetSpec: spec }, c = structuredClone(b);
  assert.equal(serializeRequest(b, config), serializeRequest(c, config));
  assert.deepEqual(JSON.parse(JSON.parse(serializeRequest(b, config)).messages[1].content).candidates, payload.candidates);
});

test('HEAL-009 supported literal null selections abstain without broadening the output protocol', () => {
  for (const selection of [null, 'null', ' null ', '\nnull\t']) assert.equal(parseSelector(JSON.stringify({ selector: selection })), null);
  assert.equal(parseSelector('{"selector":"[name=\\"null\\"]"}'), '[name="null"]');
  for (const response of ['null', '"null"', '{"selector":""}', '{"selector":false}', '{"selector":"null","action":"click"}', '{"selector":"function(){}"}']) assert.throws(() => parseSelector(response));
});

test('CTX-008 integrated fitting measures compact candidates and the complete escaped request exactly', () => {
  for (const limits of [{}, { domMaxChars: 1200, payloadMaxChars: 3000 }]) {
    const config = validateConfig(limits);
    const candidates = Array.from({ length: 30 }, (_, i) => candidate({
      selector: `button:has-text("Parcel ${i}")`, order: i, label: `Parcel ${i}`,
      features: { id: '', name: '', placeholder: '', text: `Parcel ${i}`, nearestLabel: '', rowContext: 'Dispatch '.repeat(40), visible: true, disabled: false },
      suggestedLocators: [`button:has-text("Parcel ${i}")`],
    }));
    const context = { action: 'click', task: { description: 'Open parcel' }, candidates: structuredClone(candidates), cleanedDom: '<section>Fallback</section>'.repeat(400),
      coverage: { discovered: 38, beforeBudget: 30, included: 30, omitted: 8, budgetOmitted: 0, textTruncated: false, domChars: 0, payloadChars: 0, domLimit: config.domMaxChars, payloadLimit: config.payloadMaxChars, candidateLimit: 30 } };
    fitContext(context, config);
    assert.ok(context.candidates.length > 0 && context.candidates.length < candidates.length);
    assert.equal(context.coverage.domChars, serializeCandidates(context.candidates).length + context.cleanedDom.length);
    assert.equal(context.coverage.payloadChars, serializeRequest(context, config).length);
    assert.ok(context.coverage.domChars <= config.domMaxChars);
    assert.ok(context.coverage.payloadChars <= config.payloadMaxChars);
    assert.equal(context.coverage.included, context.candidates.length);
    assert.equal(context.coverage.omitted, 38 - context.candidates.length);
    assert.equal(context.coverage.budgetOmitted, 30 - context.candidates.length);
    assert.equal(context.coverage.textTruncated, true);
    assert.deepEqual(context.candidates[0], candidates[0]);
    const serialized = JSON.parse(JSON.parse(serializeRequest(context, config)).messages[1].content);
    assert.equal(JSON.stringify(serialized.candidates), serializeCandidates(context.candidates));
    assert.ok(serializeCandidates(context.candidates).length < JSON.stringify(context.candidates).length);
  }
});
