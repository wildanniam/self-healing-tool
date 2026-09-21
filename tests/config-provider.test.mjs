import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configFromEnv, validateConfig, createOpenAIProvider, ConfigurationError } from '../dist/index.js';
import { parseSelector, serializeRequest } from '../dist/provider.js';
const context = { action: 'click', task: { description: 'Save' }, candidates: [], coverage: {} };

test('D18 settings are explicit and invalid settings never silently fall back', () => {
  const c = configFromEnv({ OPENAI_MODEL: 'gpt-4o-mini', OPENAI_MAX_TOKENS: '500', OPENAI_TEMPERATURE: '0', HEALING_MAX_RETRIES: '3', HEALING_DOM_MAX_CHARS: '8000', OPENAI_API_KEY: 'never-return-me' });
  assert.equal(c.model, 'gpt-4o-mini'); assert.equal(c.maxAttempts, 3); assert.equal(c.domMaxChars, 8000);
  assert.ok(!JSON.stringify(c).includes('never-return-me'));
  for (const overrides of [{ model: 'unknown' }, { maxAttempts: 0 }, { maxAttempts: 1.5 }, { providerTimeoutMs: Infinity }, { temperature: NaN }, { domMaxChars: 13000 }, { constructor: 'invalid' }, { unexpected: 1 }]) assert.throws(() => validateConfig(overrides), ConfigurationError);
  assert.throws(() => configFromEnv({ OPENAI_TEMPERATURE: '' }), ConfigurationError);
  assert.throws(() => createOpenAIProvider({ apiKey: '', config: c, maxRequests: 1 }), ConfigurationError);
  assert.throws(() => createOpenAIProvider({ apiKey: 'dummy', config: c, maxRequests: 0 }), ConfigurationError);
});

test('selector parser rejects code, extra instructions, primitives and malformed responses', () => {
  for (const output of ['process.exit()', '```json\n{}\n```', 'null', '[]', '{}', '{"selector":"button","skip":true}', '{"selector":"javascript:alert(1)"}']) assert.throws(() => parseSelector(output));
  assert.equal(parseSelector('{"selector":"button"}'), 'button');
  assert.equal(parseSelector('{"selector":null}'), null);
});

test('OpenAI transport uses explicit profile, bounds requests and strips non-usage provider metadata', async t => {
  const prior = globalThis.fetch; t.after(() => { globalThis.fetch = prior; });
  let count = 0;
  const config = validateConfig({ mode: 'full' });
  globalThis.fetch = async (url, options) => {
    count++;
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gpt-4o-mini'); assert.equal(body.max_tokens, 500); assert.equal(body.temperature, 0);
    assert.equal(body.store, false); assert.equal(body.messages[1].content, JSON.stringify(context));
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"selector":null}' } }], usage: { prompt_tokens: 123, completion_tokens: 4, credential: 'do-not-copy' } }), { status: 200 });
  };
  const provider = createOpenAIProvider({ apiKey: 'test-placeholder', config, maxRequests: 1 });
  const result = await provider.select(context, new AbortController().signal);
  assert.deepEqual(result, { output: '{"selector":null}', usage: { inputTokens: 123, outputTokens: 4 }, transportAttempted: true });
  await assert.rejects(provider.select(context, new AbortController().signal), /request_limit_exhausted/);
  assert.equal(count, 1);
  assert.ok(serializeRequest(context, config).length < config.payloadMaxChars);
});

test('provider HTTP and transport failures are sanitized and preserve unknown usage', async t => {
  const prior = globalThis.fetch; t.after(() => { globalThis.fetch = prior; });
  const provider = createOpenAIProvider({ apiKey: 'test-placeholder', config: validateConfig(), maxRequests: 2 });
  globalThis.fetch = async () => new Response('PRIVATE_RESPONSE', { status: 429 });
  await assert.rejects(provider.select(context, new AbortController().signal), e => e.message === 'provider_http_429' && e.usage === null);
  globalThis.fetch = async () => { throw new Error('PRIVATE_REQUEST'); };
  await assert.rejects(provider.select(context, new AbortController().signal), e => e.message === 'provider_transport_failure' && e.usage === null);
});

test('provider cannot dispatch an oversized payload or use an already aborted signal', async t => {
  const prior = globalThis.fetch; t.after(() => { globalThis.fetch = prior; });
  let calls = 0; globalThis.fetch = async () => { calls++; throw new Error('unexpected'); };
  const provider = createOpenAIProvider({ apiKey: 'test-placeholder', config: validateConfig(), maxRequests: 1 });
  await assert.rejects(provider.select({ ...context, task: { description: 'x'.repeat(14000) } }, new AbortController().signal), /provider_payload_limit/);
  const signal = AbortSignal.abort();
  await assert.rejects(provider.select(context, signal), /provider_aborted/);
  assert.equal(calls, 0);
});
