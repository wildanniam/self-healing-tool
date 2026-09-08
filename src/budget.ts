import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ConfigurationError, validateConfig } from './config.js';
import { createOpenAIProvider, normalizeUsage, ProviderError, serializeRequest } from './provider.js';
import type { Config, Context, Provider, Usage } from './types.js';

export interface LiveBudgetPlan {
  id: string; model: Config['model']; maxRequests: number; maxCostUsd: number;
  phases: Record<string, number>;
  price: { version: string; inputUsdPerMillion: number; outputUsdPerMillion: number };
}
interface Reservation {
  id: string; phase: string; createdAt: string; reservedUsd: number; payloadBytes: number;
  status: 'pending' | 'complete' | 'failed'; usage: Usage | null; actualCostUsd: number | null;
  transportAttempted: boolean | null; failure: string | null;
}
export interface LiveBudgetLedger { version: 1; plan: LiveBudgetPlan; requests: Reservation[]; halted: string | null }
function validatePlan(plan: LiveBudgetPlan) {
  validateConfig({ model: plan.model });
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(plan.id) || !Number.isSafeInteger(plan.maxRequests) || plan.maxRequests < 1 || plan.maxRequests > 1000 || !Number.isFinite(plan.maxCostUsd) || plan.maxCostUsd <= 0) throw new ConfigurationError('live budget plan');
  const entries = Object.entries(plan.phases);
  if (!entries.length || entries.some(([k,v]) => !/^[a-zA-Z0-9_-]{1,50}$/.test(k) || !Number.isSafeInteger(v) || v < 1 || v > plan.maxRequests)) throw new ConfigurationError('live budget phases');
  if (!plan.price.version || ![plan.price.inputUsdPerMillion, plan.price.outputUsdPerMillion].every(v => Number.isFinite(v) && v > 0)) throw new ConfigurationError('live budget price');
}
function safePath(path: string) {
  if (!isAbsolute(path) || (existsSync(path) && !lstatSync(path).isFile())) throw new ConfigurationError('live budget path');
}
export function readLiveBudget(path: string): LiveBudgetLedger {
  safePath(path);
  const ledger = JSON.parse(readFileSync(path, 'utf8')) as LiveBudgetLedger;
  validatePlan(ledger.plan);
  if (ledger.version !== 1 || !Array.isArray(ledger.requests) || ledger.requests.some(r => !Number.isFinite(r.reservedUsd) || r.reservedUsd < 0 || !['pending','complete','failed'].includes(r.status))) throw new ConfigurationError('live budget ledger');
  return ledger;
}
export function createLiveBudget(path: string, plan: LiveBudgetPlan): void {
  safePath(path); validatePlan(plan); mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify({ version: 1, plan, requests: [], halted: null }, null, 2), { flag: 'wx', mode: 0o600 });
}
function update<T>(path: string, edit: (ledger: LiveBudgetLedger) => T): T {
  const lock = `${path}.lock`;
  let fd: number;
  try { fd = openSync(lock, 'wx', 0o600); } catch { throw new ProviderError('provider_budget_locked', null, false); }
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const ledger = readLiveBudget(path); const result = edit(ledger);
    writeFileSync(temporary, JSON.stringify(ledger, null, 2), { flag: 'wx', mode: 0o600 });
    renameSync(temporary, path); return result;
  } finally { if (existsSync(temporary)) unlinkSync(temporary); closeSync(fd); unlinkSync(lock); }
}
function cost(plan: LiveBudgetPlan, usage: Usage): number {
  return (usage.inputTokens * plan.price.inputUsdPerMillion + usage.outputTokens * plan.price.outputUsdPerMillion) / 1e6;
}
/** Opt-in owner-controlled ledger; reservations survive restarts and are never refunded/reused. */
export function createBudgetedOpenAIProvider(options: { apiKey: string; config: Readonly<Config>; ledgerPath: string; phase: string }): Provider {
  const config = validateConfig(options.config); const { ledgerPath, phase } = options;
  const initial = readLiveBudget(ledgerPath);
  if (initial.plan.model !== config.model || !Object.hasOwn(initial.plan.phases, phase)) throw new ConfigurationError('budget model/phase');
  const originalPlan = JSON.stringify(initial.plan);
  const provider = createOpenAIProvider({ apiKey: options.apiKey, config, maxRequests: initial.plan.maxRequests });
  return Object.freeze({ kind: 'openai' as const, configuration: config,
    async select(context: Readonly<Context>, signal: AbortSignal) {
      if (signal.aborted) throw new ProviderError('provider_aborted', null, false);
      const payload = serializeRequest(context, config);
      if (payload.length > config.payloadMaxChars) throw new ProviderError('provider_payload_limit', null, false);
      const payloadBytes = Buffer.byteLength(payload, 'utf8');
      const id = update(ledgerPath, ledger => {
        if (JSON.stringify(ledger.plan) !== originalPlan) throw new ConfigurationError('budget plan changed');
        if (ledger.halted || ledger.requests.some(r => r.status === 'pending')) throw new ProviderError('provider_budget_unreconciled', null, false);
        if (ledger.requests.length >= ledger.plan.maxRequests || ledger.requests.filter(r => r.phase === phase).length >= ledger.plan.phases[phase]!) throw new ProviderError('request_limit_exhausted', null, false);
        // Conservative text reservation: UTF-8 bytes upper-bound content token count,
        // with a separate 1024-token allowance for message framing. Not a billing guarantee.
        const reservedUsd = cost(ledger.plan, { inputTokens: payloadBytes + 1024, outputTokens: config.maxTokens });
        if (ledger.requests.reduce((s,r) => s + r.reservedUsd, 0) + reservedUsd > ledger.plan.maxCostUsd) throw new ProviderError('provider_budget_cost_limit', null, false);
        const id = randomUUID();
        ledger.requests.push({ id, phase, createdAt: new Date().toISOString(), reservedUsd, payloadBytes, status: 'pending', usage: null, actualCostUsd: null, transportAttempted: null, failure: null });
        return id;
      });
      let response;
      try { response = await provider.select(context, signal); }
      catch (error) {
        update(ledgerPath, ledger => {
          const r = ledger.requests.find(r => r.id === id)!;
          r.status = 'failed'; r.usage = error instanceof ProviderError ? normalizeUsage(error.usage) : null;
          r.transportAttempted = error instanceof ProviderError ? error.transportAttempted : null;
          r.failure = error instanceof ProviderError && /^provider_[a-z0-9_]+$/.test(error.message) ? error.message : 'provider_failure';
          r.actualCostUsd = r.usage ? cost(ledger.plan, r.usage) : r.transportAttempted === false ? 0 : null;
          if (r.actualCostUsd === null || r.actualCostUsd > r.reservedUsd) ledger.halted = 'unreconciled_usage';
        });
        throw error;
      }
      update(ledgerPath, ledger => {
        const r = ledger.requests.find(r => r.id === id)!;
        r.status = 'complete'; r.usage = normalizeUsage(response.usage); r.transportAttempted = response.transportAttempted ?? null;
        r.actualCostUsd = r.usage ? cost(ledger.plan, r.usage) : null;
        if (r.actualCostUsd === null || r.actualCostUsd > r.reservedUsd) ledger.halted = 'unreconciled_usage';
      });
      return response;
    },
  });
}
