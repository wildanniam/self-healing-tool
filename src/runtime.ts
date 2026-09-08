import { randomUUID } from 'node:crypto';
import type { Page } from 'playwright';
import { ConfigurationError, validateConfig } from './config.js';
import { collectContext, rankerSelection } from './context.js';
import { cleanContextText, redact } from './privacy.js';
import { parseSelector, ProviderError, normalizeUsage } from './provider.js';
import type { Action, Assessment, Config, Event, Provider, Run, Task } from './types.js';

export class HealingFailure extends Error {
  constructor(readonly eventId: string, cause: unknown) { super(`Locator recovery failed; inspect event ${eventId}`, { cause }); this.name = 'HealingFailure'; }
}
async function within<T>(operation: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) throw new Error('time_budget_exhausted');
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('time_budget_exhausted')); }, ms); });
  try { return await Promise.race([operation(controller.signal), timeout]); }
  finally { clearTimeout(timer!); controller.abort(); }
}
export function createHealingSession(page: Page, options: {
  config?: Partial<Config>; provider?: Provider; repeatOf?: string; omitValues?: readonly string[];
} = {}) {
  const config = validateConfig(options.config);
  if (config.mode === 'full' && !options.provider) throw new ConfigurationError('full mode requires an explicit provider');
  if (options.provider && !['offline', 'openai'].includes(options.provider.kind)) throw new ConfigurationError('provider');
  if (config.mode === 'full' && options.provider?.kind === 'openai') {
    for (const field of ['model', 'maxTokens', 'temperature', 'payloadMaxChars'] as const) {
      if (options.provider.configuration?.[field] !== config[field]) throw new ConfigurationError(`provider/session ${field} mismatch`);
    }
  }
  const omitted = [...(options.omitValues ?? [])];
  const run: Run = { schemaVersion: 1, id: randomUUID(), repeatOf: options.repeatOf ?? null, createdAt: new Date().toISOString(), config,
    provider: config.mode === 'full' ? options.provider!.kind : 'none', events: [], assessments: [] };
  const diagnostics: { eventId: string; rawDom: string }[] = [];
  let active = false;
  function snapshot(): Run {
    // Never serialize browser/provider/options objects. Explicit records only.
    const copy = structuredClone(run);
    for (const event of copy.events) {
      event.originalSelector = redact(event.originalSelector, omitted);
      event.task = { description: cleanContextText(event.task.description, omitted), ...(event.task.scope ? { scope: cleanContextText(event.task.scope, omitted) } : {}) };
      for (const attempt of event.attempts) if (attempt.selector) attempt.selector = redact(attempt.selector, omitted);
    }
    return copy;
  }
  async function perform(action: Action, selector: string, value: string | undefined, task: Task): Promise<Event> {
    if (active) throw new Error('Use a separate session for concurrent actions');
    if (typeof selector !== 'string' || !selector.trim() || typeof task?.description !== 'string') throw new ConfigurationError('action descriptor');
    if (action === 'fill' && typeof value !== 'string') throw new ConfigurationError('fill value');
    active = true;
    if (value) omitted.push(value);
    const started = performance.now();
    const event: Event = { id: randomUUID(), action, originalSelector: selector, task: { description: task.description, scope: task.scope },
      originalFailure: null, recoveryTriggered: false, actionExecuted: false, stopReason: 'nonrecoverable', failure: 'none', originalMs: 0, internalMs: 0, retryMs: 0, totalMs: 0, context: null, attempts: [], semantic: 'unassessed' };
    run.events.push(event);
    let originalError: unknown; let initialCount: number | null = null;
    const invoke = (s: string, timeout: number) => action === 'fill' ? page.locator(s).fill(value!, { timeout }) : page.locator(s).click({ timeout });
    try {
      // A zero count after an unrelated error is insufficient to classify locator drift.
      try { initialCount = await within(() => page.locator(selector).count(), config.actionTimeoutMs); } catch { /* preserve native action's own error below */ }
      try {
        await invoke(selector, config.actionTimeoutMs);
        event.actionExecuted = true; event.stopReason = 'original-success'; event.originalMs = performance.now() - started;
        return structuredClone(event);
      } catch (error) {
        originalError = error; event.originalMs = performance.now() - started;
        const name = error instanceof Error ? error.name : 'Error';
        event.originalFailure = { name, classification: 'not-missing-locator' }; event.failure = 'original';
        const message = error instanceof Error ? error.message : '';
        const timeoutWaiting = name === 'TimeoutError' && /waiting for locator\(/i.test(message) && !/locator resolved to|strict mode violation|not enabled|not visible|intercepts pointer/i.test(message);
        let count: number | null = null;
        if (!page.isClosed() && timeoutWaiting && initialCount === 0) {
          try { count = await within(() => page.locator(selector).count(), config.actionTimeoutMs); } catch { /* original failure remains */ }
        }
        if (count !== 0 || !timeoutWaiting || page.isClosed()) throw originalError;
        event.originalFailure.classification = 'missing-locator';
      }
      event.recoveryTriggered = true; event.stopReason = 'attempt-limit';
      const recoveryStarted = performance.now(), deadline = recoveryStarted + config.recoveryTimeoutMs;
      const remaining = () => deadline - performance.now();
      const rejected = new Set<string>();
      try {
        event.context = await within(() => collectContext(page, action, task, config, omitted), remaining());
      } catch {
        event.failure = remaining() <= 0 ? 'budget' : 'context';
        event.stopReason = remaining() <= 0 ? 'time-limit' : 'context-failure';
        throw new HealingFailure(event.id, originalError);
      }
      for (let number = 1; number <= config.maxAttempts && remaining() > 0; number++) {
        const attemptStarted = performance.now();
        const attempt: Event['attempts'][number] = { id: randomUUID(), number, selector: null, candidateAccepted: false, actionExecuted: false,
          failure: 'none', reason: '', usage: config.mode === 'ranker-only' ? { inputTokens: 0, outputTokens: 0 } : null,
          providerCalled: false, transportAttempted: run.provider === 'openai' ? null : false, durationMs: 0, providerMs: 0, actionMs: 0 };
        event.attempts.push(attempt);
        try {
          if (config.mode === 'full') {
            attempt.providerCalled = true; const providerStarted = performance.now();
            let response;
            try { response = await within(signal => options.provider!.select(structuredClone(event.context!), signal), Math.min(config.providerTimeoutMs, remaining())); }
            catch (error) { attempt.failure = 'provider'; attempt.reason = error instanceof ProviderError && /^(provider_(?:http_\d{3}|aborted|empty_response|response_limit|missing_output|transport_failure|payload_limit|budget_locked|budget_unreconciled|budget_cost_limit)|request_limit_exhausted)$/.test(error.message) ? error.message : 'provider_timeout_or_failure'; if (error instanceof ProviderError) { attempt.usage = normalizeUsage(error.usage); attempt.transportAttempted = run.provider === 'openai' ? error.transportAttempted : false; } continue; }
            finally { attempt.providerMs = performance.now() - providerStarted; }
            attempt.usage = normalizeUsage(response.usage);
            attempt.transportAttempted = run.provider === 'openai' ? response.transportAttempted ?? null : false;
            try { attempt.selector = parseSelector(response.output); }
            catch { attempt.failure = 'parse'; attempt.reason = 'unsupported_selector_output'; continue; }
          } else { attempt.selector = rankerSelection(event.context!, rejected); }
          if (remaining() <= 0) { attempt.failure = 'budget'; attempt.reason = 'recovery_time_exhausted'; break; }
          if (!attempt.selector) { event.stopReason = 'abstained'; attempt.failure = 'abstained'; attempt.reason = 'no_candidate_selected'; break; }
          const s = attempt.selector; rejected.add(s);
          try {
            const locator = page.locator(s);
            const compatible = await within(async () => {
              if (await locator.count() !== 1 || !await locator.isVisible() || !await locator.isEnabled()) return false;
              if (action === 'fill' && !await locator.isEditable()) return false;
              return event.context!.candidates.some(c => c.selector === s);
            }, remaining());
            if (!compatible) { attempt.failure = 'validation'; attempt.reason = 'not_unique_compatible_candidate'; continue; }
          } catch { attempt.failure = 'validation'; attempt.reason = 'selector_validation_failed'; continue; }
          attempt.candidateAccepted = true;
          if (remaining() <= 0) { attempt.failure = 'budget'; attempt.reason = 'recovery_time_exhausted'; break; }
          const retryStarted = performance.now();
          try {
            await invoke(s, Math.max(1, Math.min(config.actionTimeoutMs, Math.floor(remaining()))));
            attempt.actionExecuted = true; event.actionExecuted = true; event.failure = 'none'; event.stopReason = 'recovered';
          } catch { attempt.failure = 'action'; attempt.reason = 'retry_action_failed'; }
          finally { attempt.actionMs = performance.now() - retryStarted; event.retryMs += attempt.actionMs; }
          if (attempt.actionExecuted) break;
        } finally { attempt.durationMs = performance.now() - attemptStarted; }
      }
      event.internalMs = performance.now() - recoveryStarted - event.retryMs;
      if (!event.actionExecuted) {
        event.failure = remaining() <= 0 ? 'budget' : event.attempts.at(-1)?.failure ?? 'budget';
        if (remaining() <= 0) event.stopReason = 'time-limit';
        throw new HealingFailure(event.id, originalError);
      }
      return structuredClone(event);
    } finally {
      event.totalMs = performance.now() - started;
      if (event.recoveryTriggered) event.internalMs = Math.max(0, event.totalMs - event.originalMs - event.retryMs);
      active = false;
    }
  }
  return Object.freeze({
    id: run.id,
    async click(selector: string, task: Task): Promise<Event> { const event = await perform('click', selector, undefined, task); return snapshot().events.find(e => e.id === event.id)!; },
    async fill(selector: string, value: string, task: Task): Promise<Event> { const event = await perform('fill', selector, value, task); return snapshot().events.find(e => e.id === event.id)!; },
    snapshot,
    /** Independent assessment is append-only and never feeds candidate selection. */
    assess(input: Assessment): void {
      if (active) throw new Error('Assess only after the action has completed');
      const event = run.events.find(e => e.id === input.eventId);
      if (!event || (input.attemptId && !event.attempts.some(a => a.id === input.attemptId))) throw new Error('Unknown event or attempt');
      if (!['unassessed', 'correct', 'incorrect'].includes(input.semantic) || typeof input.wrongEffect !== 'boolean') throw new Error('Invalid assessment');
      run.assessments.push({ eventId: input.eventId, ...(input.attemptId ? { attemptId: input.attemptId } : {}), semantic: input.semantic, wrongEffect: input.wrongEffect,
        ...(typeof input.targetInCandidates === 'boolean' ? { targetInCandidates: input.targetInCandidates } : {}),
        ...(input.evidenceRef ? { evidenceRef: redact(input.evidenceRef, omitted) } : {}) });
      event.semantic = input.semantic;
    },
    async captureDiagnostics(eventId: string): Promise<void> {
      if (!run.events.some(e => e.id === eventId)) throw new Error('Unknown event');
      diagnostics.push({ eventId, rawDom: await page.content() });
    },
    diagnostics(): { eventId: string; rawDom: string }[] { return structuredClone(diagnostics); },
  });
}
