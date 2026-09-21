import type { Config } from './types.js';
export class ConfigurationError extends Error {
  constructor(field: string) { super(`Invalid configuration: ${field}`); this.name = 'ConfigurationError'; }
}
export const DEFAULT_CONFIG: Readonly<Config> = Object.freeze({
  mode: 'ranker-only', model: 'gpt-4o-mini', maxTokens: 500, temperature: 0,
  maxAttempts: 3, actionTimeoutMs: 1000, recoveryTimeoutMs: 15000,
  providerTimeoutMs: 5000, domMaxChars: 8000, payloadMaxChars: 12000, maxCandidates: 30,
});
export function validateConfig(input: Partial<Config> = {}): Readonly<Config> {
  for (const key of Object.keys(input)) if (!Object.hasOwn(DEFAULT_CONFIG, key) && key !== 'rankingExperiment') throw new ConfigurationError(key);
  const c = { ...DEFAULT_CONFIG, ...input };
  if (c.rankingExperiment !== undefined && !['lexical-jaccard', 'thesis-no-relations', 'thesis-full'].includes(c.rankingExperiment)) throw new ConfigurationError('rankingExperiment');
  if (!['ranker-only', 'full'].includes(c.mode)) throw new ConfigurationError('mode');
  if (!['gpt-4o-mini', 'gpt-4o-mini-2024-07-18'].includes(c.model)) throw new ConfigurationError('model');
  const limits: [keyof Config, number, number][] = [
    ['maxTokens', 1, 4096], ['maxAttempts', 1, 10], ['actionTimeoutMs', 1, 60000],
    ['recoveryTimeoutMs', 1, 120000], ['providerTimeoutMs', 1, 60000],
    ['domMaxChars', 256, 64000], ['payloadMaxChars', 1024, 96000], ['maxCandidates', 1, 200],
  ];
  for (const [key, min, max] of limits) {
    const value = c[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new ConfigurationError(key);
  }
  if (!Number.isFinite(c.temperature) || c.temperature < 0 || c.temperature > 2) throw new ConfigurationError('temperature');
  if (c.domMaxChars >= c.payloadMaxChars) throw new ConfigurationError('payloadMaxChars must exceed domMaxChars');
  return Object.freeze(c);
}
/** Explicit allowlisted environment reader. Does not read files, keys or ambient process.env. */
export function configFromEnv(env: Readonly<Record<string, string | undefined>>, overrides: Partial<Config> = {}): Readonly<Config> {
  const values: Partial<Config> = {};
  if (env.OPENAI_MODEL !== undefined) values.model = env.OPENAI_MODEL as Config['model'];
  const numeric = {
    OPENAI_MAX_TOKENS: 'maxTokens', OPENAI_TEMPERATURE: 'temperature', HEALING_MAX_RETRIES: 'maxAttempts',
    HEALING_DOM_MAX_CHARS: 'domMaxChars', HEALING_ACTION_TIMEOUT_MS: 'actionTimeoutMs',
    HEALING_RECOVERY_TIMEOUT_MS: 'recoveryTimeoutMs', HEALING_PROVIDER_TIMEOUT_MS: 'providerTimeoutMs',
    HEALING_PAYLOAD_MAX_CHARS: 'payloadMaxChars', HEALING_MAX_CANDIDATES: 'maxCandidates',
  } as const;
  for (const [name, key] of Object.entries(numeric)) {
    const raw = env[name];
    if (raw !== undefined) values[key] = raw.trim() === '' ? NaN : Number(raw);
  }
  return validateConfig({ ...values, ...overrides });
}
