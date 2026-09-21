import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, validateConfig, reportView } from '../dist/index.js';
const price = { model: 'gpt-4o-mini', version: 'synthetic-test-price-not-a-quote', inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
function run() {
  return { config: validateConfig(), provider: 'openai', assessments: [], events: [
    { id: 'event', recoveryTriggered: true, actionExecuted: false, semantic: 'unassessed', attempts: [
      { providerCalled: true, transportAttempted: true, failure: 'parse', usage: { inputTokens: 100, outputTokens: 20 } },
      { providerCalled: true, transportAttempted: true, failure: 'provider', usage: null },
    ] },
  ] };
}
test('accounting retains failed-call cost, unknown usage and undefined zero-success denominator', () => {
  const result = summarize(run(), price);
  assert.equal(result.providerRequests, 2); assert.equal(result.unknownUsageRequests, 1);
  assert.equal(result.observedCostUsd, 0.00014); assert.equal(result.totalCostUsd, null);
  assert.equal(result.costPerCorrectRepairUsd, null);
});
test('later correct assessment never erases earlier wrong effects in the clean-repair count', () => {
  const data = run(); data.events[0].semantic = 'correct'; data.events[0].actionExecuted = true;
  data.assessments.push({ eventId: 'event', wrongEffect: true });
  assert.equal(summarize(data, price).correctRepairs, 0);
  assert.throws(() => summarize(data, { ...price, model: 'another-model' }));
});

test('a request rejected by the configured cap is an invocation, not a transport request or unknown bill', () => {
  const data = run(); data.events[0].attempts = [{ providerCalled: true, transportAttempted: false, usage: null }];
  const summary = summarize(data, price);
  assert.equal(summary.providerInvocations, 1); assert.equal(summary.providerRequests, 0);
  assert.equal(summary.totalCostUsd, 0); assert.equal(summary.unknownUsageRequests, 0);
});
