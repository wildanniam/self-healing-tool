import { randomUUID, createHash } from 'node:crypto';
import type { Page, ElementHandle } from 'playwright';
import { ConfigurationError, validateConfig } from './config.js';
import { collectContext, collectSpecEvidence, rankerSelection, fitContext } from './context.js';
import { buildSpecContext, evaluateSpecAdmission, validateTargetSpecOptions } from './spec.js';
import { cleanContextText, redact } from './privacy.js';
import { parseSelector, ProviderError, normalizeUsage, normalizeProviderMetadata, serializeRequest } from './provider.js';
import { normalizeSelectors } from './selectors.js';
import type { Action, Assessment, Config, Event, Provider, Run, Task, TargetSpecOptions } from './types.js';

export class HealingFailure extends Error {
  constructor(readonly eventId: string, cause: unknown) { super(`Locator recovery failed; inspect event ${eventId}`, { cause }); this.name = 'HealingFailure'; }
}
/** Only an observed change to the selected target can produce this admission unknown. */
class AdmissionTargetChanged extends Error {}
async function within<T>(operation: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) throw new Error('time_budget_exhausted');
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('time_budget_exhausted')); }, ms); });
  try { return await Promise.race([operation(controller.signal), timeout]); }
  finally { clearTimeout(timer!); controller.abort(); }
}
export function createHealingSession(page: Page, options: {
  config?: Partial<Config>; provider?: Provider; repeatOf?: string; omitValues?: readonly string[]; targetSpec?: TargetSpecOptions;
} = {}) {
  const config = validateConfig(options.config);
  const targetSpec = options.targetSpec === undefined ? undefined : validateTargetSpecOptions(options.targetSpec);
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
      if(event.targetSpec){
        // Values supplied by a later fill must also be omitted from earlier spec evidence.
        const clean=(value:string)=>cleanContextText(value,omitted);
        const cleanDecision=(decision:NonNullable<Event['targetSpec']>['decision'])=>{
          if(decision?.observed)decision.observed=Object.fromEntries(Object.entries(decision.observed).map(([key,value])=>[key,Array.isArray(value)?value.map(clean):clean(value)]));
        };
        if(event.targetSpec.requirementId)event.targetSpec.requirementId=clean(event.targetSpec.requirementId);
        if(event.targetSpec.revision)event.targetSpec.revision=clean(event.targetSpec.revision);
        event.targetSpec.expectedRevision=clean(event.targetSpec.expectedRevision);
        if(event.targetSpec.provenance)event.targetSpec.provenance.fileName=clean(event.targetSpec.provenance.fileName);
        cleanDecision(event.targetSpec.decision);
        const context=event.context?.targetSpec;
        if(context){
          context.expectedRevision=clean(context.expectedRevision);
          const c=context.contract;
          if(c){c.requirementId=clean(c.requirementId);c.revision=clean(c.revision);c.intent=clean(c.intent);c.allOf.forEach(clause=>{clause.anyOf=clause.anyOf.map(clean);});if(c.provenance)c.provenance.fileName=clean(c.provenance.fileName);}
        }
        for(const attempt of event.attempts)if(attempt.specDecision)cleanDecision(attempt.specDecision);
      }
      for (const attempt of event.attempts) {
        if (attempt.selector) attempt.selector = redact(attempt.selector, omitted);
        if (attempt.proposedSelector) attempt.proposedSelector = redact(attempt.proposedSelector, omitted);
        attempt.validations = attempt.validations?.map(v => ({ ...v, selector: redact(v.selector, omitted) }));
        const metadata = normalizeProviderMetadata(attempt.providerMetadata);
        attempt.providerMetadata = metadata ? normalizeProviderMetadata({ ...metadata, returnedModel: metadata.returnedModel ? redact(metadata.returnedModel, omitted) : null }) : null;
      }
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
    const specContext=targetSpec?buildSpecContext(targetSpec,action,omitted):undefined;
    if(specContext)event.targetSpec={mode:targetSpec!.mode,requirementId:specContext.contract?.requirementId??null,revision:specContext.contract?.revision??null,
      expectedRevision:specContext.expectedRevision,...(specContext.contract?.provenance?{provenance:specContext.contract.provenance}:{}),applicability:specContext.applicability,decision:null};
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
        event.context = await within(() => collectContext(page, action, task, config, omitted, selector, specContext), remaining());
      } catch {
        event.failure = remaining() <= 0 ? 'budget' : 'context';
        event.stopReason = remaining() <= 0 ? 'time-limit' : 'context-failure';
        throw new HealingFailure(event.id, originalError);
      }
      for (let number = 1; number <= config.maxAttempts && remaining() > 0; number++) {
        event.stopReason = 'attempt-limit';
        const attemptStarted = performance.now();
        const attempt: Event['attempts'][number] = { id: randomUUID(), number, selector: null, candidateAccepted: false, actionExecuted: false,
          failure: 'none', reason: '', usage: config.mode === 'ranker-only' ? { inputTokens: 0, outputTokens: 0 } : null,
          validations: [], proposedSelector: null, providerMetadata: null, providerCalled: false, transportAttempted: run.provider === 'openai' ? null : false, durationMs: 0, providerMs: 0, actionMs: 0 };
        event.attempts.push(attempt);
        try {
          if (config.mode === 'full') {
            let input;
            try {
              input = structuredClone(event.context!);
              const feedback = event.attempts.flatMap(a => a.validations ?? []).map(v => ({ ...v, selector: cleanContextText(v.selector, omitted) }));
              if (feedback.length) input.feedback = structuredClone(feedback);
              fitContext(input, config);
              attempt.inputCoverage = structuredClone(input.coverage);
              attempt.inputSha256 = createHash('sha256').update(serializeRequest(input, config)).digest('hex');
            } catch {
              attempt.failure = 'context'; attempt.reason = 'context_budget_exhausted'; event.stopReason = 'context-failure'; break;
            }
            attempt.providerCalled = true; const providerStarted = performance.now();
            let response;
            try { response = await within(signal => options.provider!.select(input, signal), Math.min(config.providerTimeoutMs, remaining())); }
            catch (error) {
              attempt.failure = 'provider';
              attempt.reason = error instanceof ProviderError && /^(provider_(?:http_\d{3}|aborted|empty_response|response_limit|missing_output|transport_failure|payload_limit|budget_locked|budget_unreconciled|budget_cost_limit)|request_limit_exhausted)$/.test(error.message) ? error.message : 'provider_timeout_or_failure';
              if (error instanceof ProviderError) {
                attempt.usage = normalizeUsage(error.usage);
                attempt.providerMetadata = normalizeProviderMetadata(error.metadata);
                attempt.transportAttempted = run.provider === 'openai' ? error.transportAttempted : false;
              }
              // Candidate-repair retries cannot repair transport/configuration/accounting failure.
              // A timeout may win before the adapter settles: retain unknown dispatch/usage.
              event.stopReason = 'provider-failure';
              break;
            }
            finally { attempt.providerMs = performance.now() - providerStarted; }
            attempt.usage = normalizeUsage(response.usage);
            attempt.providerMetadata = normalizeProviderMetadata(response.metadata);
            attempt.transportAttempted = run.provider === 'openai' ? response.transportAttempted ?? null : false;
            try { attempt.selector = parseSelector(response.output); }
            catch { attempt.failure = 'parse'; attempt.reason = 'unsupported_selector_output'; continue; }
          } else { attempt.selector = rankerSelection(event.context!, rejected); }
          if (remaining() <= 0) { attempt.failure = 'budget'; attempt.reason = 'recovery_time_exhausted'; break; }
          if (!attempt.selector) { event.stopReason = 'abstained'; attempt.failure = 'abstained'; attempt.reason = 'no_candidate_selected'; if (config.mode === 'full' && number < config.maxAttempts && remaining() > 0) continue; break; }
          attempt.proposedSelector = attempt.selector;
          const variants = normalizeSelectors(attempt.selector);
          let chosen: string | null = null;
          if (!variants.length) attempt.validations!.push({selector: attempt.selector, count: 0, reason: 'unsupported_positional_selector'});
          for (const variant of variants) {
            let count = 0, reason = '';
            try {
              const locator = page.locator(variant);
              await within(async () => {
                count = await locator.count();
                if (count !== 1) { reason = count ? 'ambiguous' : 'no_match'; return; }
                if (!await locator.isVisible()) { reason = 'not_visible'; return; }
                if (!await locator.isEnabled()) { reason = 'not_enabled'; return; }
                const compatible = await locator.evaluate((el, action) => {
                  const tag=el.tagName.toLowerCase(),role=el.getAttribute('role')??'';
                  return action==='fill' ? ['input','textarea'].includes(tag)||el.getAttribute('contenteditable')==='true' : ['button','a','div','span','li','img','input','select'].includes(tag)||['button','link','tab','menuitem','option','checkbox','radio','switch'].includes(role);
                }, action);
                if (!compatible || action === 'fill' && !await locator.isEditable()) reason = 'action_mismatch';
              }, remaining());
            } catch { reason = 'selector_validation_failed'; }
            if (reason) {
              const safe = redact(variant, omitted);
              attempt.validations!.push({selector: safe, count, reason}); rejected.add(variant);
            } else { chosen = variant; break; }
          }
          if (!chosen) { attempt.failure = 'validation'; attempt.reason = attempt.validations!.at(-1)?.reason ?? 'selector_validation_failed'; continue; }
          const s = chosen; attempt.selector = s; rejected.add(s);
          attempt.candidateAccepted = true;
          if (remaining() <= 0) { attempt.failure = 'budget'; attempt.reason = 'recovery_time_exhausted'; break; }
          let admittedHandle: ElementHandle<Element> | null = null;
          if(targetSpec?.mode==='enforce'){
            event.targetSpec!.decision=null;
            try {
              const admitted=await within(async signal => {
                const locator=page.locator(s);
                if(await locator.count()!==1)throw new AdmissionTargetChanged();
                const handle=await locator.elementHandle({timeout:Math.max(1,Math.floor(remaining()))}) as ElementHandle<Element>|null;
                try {
                  if(signal.aborted)throw new Error('time_budget_exhausted');
                  if(!handle||!await handle.isVisible()||!await handle.isEnabled()||action==='fill'&&!await handle.isEditable())throw new AdmissionTargetChanged();
                  const evidence=await collectSpecEvidence(handle,omitted);
                  if(signal.aborted)throw new Error('time_budget_exhausted');
                  return {handle,decision:evaluateSpecAdmission(specContext!,evidence)};
                } catch(error){if(handle)await handle.dispose().catch(()=>{});throw error;}
              },remaining());
              admittedHandle=admitted.handle;attempt.specDecision=admitted.decision;
            } catch(error) {
              if(remaining()<=0||error instanceof Error&&error.message==='time_budget_exhausted'){
                attempt.failure='budget';attempt.reason='recovery_time_exhausted';event.stopReason='time-limit';break;
              }
              if(page.isClosed()||!(error instanceof AdmissionTargetChanged)){
                attempt.failure='context';attempt.reason=page.isClosed()?'gate_page_closed':'gate_observation_failed';event.stopReason='context-failure';break;
              }
              attempt.specDecision={outcome:'unknown',reason:'spec_target_unavailable',clauses:[]};
            }
            event.targetSpec!.decision=attempt.specDecision!;
            if(attempt.specDecision!.outcome!=='accepted'){
              if(admittedHandle)await (admittedHandle as ElementHandle<Element>).dispose().catch(()=>{});
              attempt.failure='spec';attempt.reason=attempt.specDecision!.reason;
              event.stopReason=attempt.specDecision!.outcome==='refused'?'spec-refused':'spec-unknown';
              break;
            }
          }
          const retryStarted = performance.now();
          try {
            const timeout=Math.max(1, Math.min(config.actionTimeoutMs, Math.floor(remaining())));
            if(targetSpec?.mode==='enforce'){
              if(remaining()<=0)throw new Error('time_budget_exhausted');
              // Act on the admitted handle: a selector re-resolution could target a replacement node.
              if(action==='fill')await admittedHandle!.fill(value!,{timeout});else await admittedHandle!.click({timeout});
            } else await invoke(s, timeout);
            attempt.actionExecuted = true; event.actionExecuted = true; event.failure = 'none'; event.stopReason = 'recovered';
          } catch { attempt.failure = 'action'; attempt.reason = 'retry_action_failed'; }
          finally { attempt.actionMs = performance.now() - retryStarted; event.retryMs += attempt.actionMs;if(admittedHandle)await admittedHandle.dispose().catch(()=>{}); }
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
