import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Run, SpecDecision, SpecEvent } from './types.js';
import { cleanContextText, escapeHtml, redact } from './privacy.js';
import { SPEC_EVIDENCE_SOURCES } from './spec.js';
import { normalizeProviderMetadata } from './provider.js';

export interface PriceAssumption { model: string; version: string; inputUsdPerMillion: number; outputUsdPerMillion: number }
export function summarize(run: Run, price?: PriceAssumption) {
  if (price && (price.model !== run.config.model || !price.version || ![price.inputUsdPerMillion, price.outputUsdPerMillion].every(n => Number.isFinite(n) && n >= 0))) throw new Error('Invalid price assumption');
  const attempts = run.events.flatMap(e => e.attempts);
  const invoked = run.provider === 'openai' ? attempts.filter(a => a.providerCalled) : [];
  const billed = invoked.filter(a => a.transportAttempted !== false);
  const unknownDispatchInvocations = billed.filter(a => a.transportAttempted === null).length;
  const unknownUsageRequests = billed.filter(a => a.usage === null).length;
  const inputTokens = billed.reduce((sum, a) => sum + (a.usage?.inputTokens ?? 0), 0);
  const outputTokens = billed.reduce((sum, a) => sum + (a.usage?.outputTokens ?? 0), 0);
  const observedCostUsd = billed.length === 0 ? 0 : price ? (inputTokens * price.inputUsdPerMillion + outputTokens * price.outputUsdPerMillion) / 1000000 : null;
  const correctRepairs = run.events.filter(e => e.recoveryTriggered && e.actionExecuted && e.semantic === 'correct' && !run.assessments.some(a => a.eventId === e.id && a.wrongEffect)).length;
  const specEvents=run.events.filter(e=>e.targetSpec);
  const accepted=specEvents.filter(e=>e.recoveryTriggered&&e.actionExecuted);
  const assessed=accepted.filter(e=>e.semantic!=='unassessed');
  const errors=assessed.filter(e=>e.semantic==='incorrect'||run.assessments.some(a=>a.eventId===e.id&&a.wrongEffect)).length;
  return { events: run.events.length, recoveries: run.events.filter(e => e.recoveryTriggered).length, correctRepairs,
    wrongEffects: new Set(run.assessments.filter(a => a.wrongEffect).map(a => a.eventId)).size,
    wrongEffectAttempts: new Set(run.assessments.filter(a => a.wrongEffect && a.attemptId).map(a => JSON.stringify([a.eventId, a.attemptId]))).size,
    wrongEffectAssessments: run.assessments.filter(a => a.wrongEffect).length,
    providerInvocations: invoked.length, providerRequests: billed.filter(a => a.transportAttempted === true).length, unknownDispatchInvocations, observedInputTokens: inputTokens, observedOutputTokens: outputTokens,
    unknownUsageRequests, observedCostUsd,
    totalCostUsd: unknownUsageRequests || unknownDispatchInvocations ? null : observedCostUsd,
    costPerCorrectRepairUsd: correctRepairs === 0 || unknownUsageRequests || unknownDispatchInvocations || observedCostUsd === null ? null : observedCostUsd / correctRepairs,
    priceAssumption: price ?? null,
    evidenceKind: run.provider === 'openai' ? 'live-provider-run' : 'offline-mechanism-check',
    ...(specEvents.length?{specAdmissions:specEvents.filter(e=>e.targetSpec?.decision?.outcome==='accepted').length,
      specRefusals:specEvents.filter(e=>e.stopReason==='spec-refused').length,specUnknown:specEvents.filter(e=>e.stopReason==='spec-unknown').length,
      acceptedRecoveryActions:accepted.length,assessedAcceptedRecoveryActions:assessed.length,acceptedRecoveryErrors:errors,
      acceptedErrorRisk:accepted.length>0&&assessed.length===accepted.length?errors/accepted.length:null}:{}),
  };
}
function specDecisionView(decision:SpecDecision):SpecDecision{
  return {outcome:decision.outcome,reason:cleanContextText(decision.reason),clauses:decision.clauses.map(c=>({index:c.index,matched:c.matched,source:c.source})),
    ...(decision.observed?{observed:Object.fromEntries(SPEC_EVIDENCE_SOURCES.filter(source=>decision.observed?.[source]!==undefined).map(source=>{
      const value=decision.observed![source]!;return [source,Array.isArray(value)?value.map(v=>cleanContextText(v)):cleanContextText(value)];
    }))}:{})};
}
function specEventView(spec:SpecEvent):SpecEvent{
  return {mode:spec.mode,requirementId:spec.requirementId?cleanContextText(spec.requirementId):null,revision:spec.revision?cleanContextText(spec.revision):null,
    expectedRevision:cleanContextText(spec.expectedRevision),applicability:spec.applicability,decision:spec.decision?specDecisionView(spec.decision):null,
    ...(spec.provenance?{provenance:{fileName:cleanContextText(spec.provenance.fileName),sha256:/^[a-f0-9]{64}$/.test(spec.provenance.sha256)?spec.provenance.sha256:''}}:{})};
}
/** Whitelist projection: deliberately excludes raw payloads, form values and browser/provider objects. */
export function reportView(run: Run, price?: PriceAssumption) {
  return { schemaVersion: 1, id: run.id, repeatOf: run.repeatOf, createdAt: run.createdAt,
    config: { mode: run.config.mode, model: run.config.model, maxTokens: run.config.maxTokens, temperature: run.config.temperature,
      maxAttempts: run.config.maxAttempts, actionTimeoutMs: run.config.actionTimeoutMs, recoveryTimeoutMs: run.config.recoveryTimeoutMs,
      providerTimeoutMs: run.config.providerTimeoutMs, domMaxChars: run.config.domMaxChars, payloadMaxChars: run.config.payloadMaxChars, maxCandidates: run.config.maxCandidates },
    provider: run.provider, summary: summarize(run, price),
    events: run.events.map(e => ({ id: e.id, action: e.action, originalSelector: redact(e.originalSelector),
      description: redact(e.task.description), recoveryTriggered: e.recoveryTriggered, originalFailure: e.originalFailure,
      actionExecuted: e.actionExecuted, stopReason: e.stopReason, semantic: e.semantic, failure: e.failure,
      timing: { originalMs: e.originalMs, internalMs: e.internalMs, retryMs: e.retryMs, totalMs: e.totalMs },
      contextCoverage: e.context?.coverage ?? null,
      ...(e.targetSpec?{targetSpec:specEventView(e.targetSpec)}:{}),
      attempts: e.attempts.map(a => ({ id: a.id, number: a.number, selector: a.selector ? redact(a.selector) : null,
        candidateAccepted: a.candidateAccepted, actionExecuted: a.actionExecuted, failure: a.failure, reason: a.reason,
        providerMetadata: normalizeProviderMetadata(a.providerMetadata),
        ...(a.specDecision?{specDecision:specDecisionView(a.specDecision)}:{}),
        proposedSelector: a.proposedSelector ? redact(a.proposedSelector) : null, validations: a.validations?.map(v => ({selector: redact(v.selector), count: v.count, reason: v.reason})) ?? [], inputSha256: a.inputSha256, inputCoverage: a.inputCoverage,
        ...(a.observationRefresh ? { observationRefresh: {
          policy: a.observationRefresh.policy, outcome: a.observationRefresh.outcome, durationMs: a.observationRefresh.durationMs,
          previousSha256: a.observationRefresh.previousSha256, refreshedSha256: a.observationRefresh.refreshedSha256,
        } } : {}),
        providerCalled: a.providerCalled, transportAttempted: a.transportAttempted, usage: a.usage, durationMs: a.durationMs, providerMs: a.providerMs, actionMs: a.actionMs })),
    })),
    assessments: run.assessments.map(a => ({ eventId: a.eventId, attemptId: a.attemptId, semantic: a.semantic,
      wrongEffect: a.wrongEffect, targetInCandidates: a.targetInCandidates, evidenceRef: a.evidenceRef ? redact(a.evidenceRef) : undefined })),
    limitations: 'Structural validation does not establish semantic correctness. Raw DOM and candidate payloads are omitted. Review this local report before sharing. Offline results are not model-effectiveness evidence.'+(run.events.some(e=>e.targetSpec)?' Target-contract matching requires independent behavioral assessment; acceptance is not semantic proof. Zero or incompletely assessed accepted actions have undefined accepted-error risk.':''),
  };
}
export function renderReport(run: Run, price?: PriceAssumption): string {
  const view = reportView(run, price);
  const text = (value: unknown) => escapeHtml(String(value ?? 'Not recorded'));
  const evidence = (title: string, value: unknown) => `<details class="evidence"><summary>${text(title)}</summary><pre>${text(JSON.stringify(value, null, 2))}</pre></details>`;
  const rows = view.events.map(e => {
    const wrong = view.assessments.some(a => a.eventId === e.id && a.wrongEffect);
    const result = wrong ? 'Wrong effect recorded' : e.semantic === 'unassessed' ? (e.actionExecuted ? 'Action completed; correctness unassessed' : 'Stopped; correctness unassessed') : e.semantic === 'correct' ? (e.actionExecuted ? e.recoveryTriggered ? 'Correct recovery' : 'Original action correct' : 'Stopped as expected; no recovery action') : 'Goal not achieved';
    const selected = e.attempts.find(a => a.actionExecuted)?.selector;
    return `<article><div class="event-heading"><h2>${text(e.action)} · ${text(e.description)}</h2><strong class="verdict ${wrong ? 'wrong' : ''}">${text(result)}</strong></div>
      <p class="locators"><code>${text(e.originalSelector)}</code>${e.recoveryTriggered ? ` → <code>${text(selected ?? 'No replacement action')}</code>` : ''}</p>
      <p class="metadata">${text(e.stopReason)} · ${e.attempts.length} recovery attempts · total ${(e.timing.totalMs / 1000).toFixed(3)} s</p>
      <details class="process"><summary>1 · DOM context</summary><p>${e.recoveryTriggered ? 'Recorded coverage for context selection. Raw DOM and candidates are omitted from this safe report.' : 'Skipped: the original action did not require recovery.'}</p>${evidence('Original failure and selection coverage', { originalFailure: e.originalFailure, coverage: e.contextCoverage })}</details>
      <details class="process"><summary>2 · AI input and output</summary>${e.attempts.length ? e.attempts.map(a => `<section><h3>Attempt ${a.number}</h3><p>${a.providerCalled ? 'Provider invoked. Exact request and raw response are not included in this report; the value below is the recorded parsed proposal.' : 'AI not called on this attempt.'}</p><p>Parsed proposal: <code>${text(a.proposedSelector ?? (a.failure === 'abstained' ? 'No candidate selected' : 'No parsed locator recorded'))}</code></p>${evidence('Input identity, coverage, response metadata and usage', { inputSha256: a.inputSha256, inputCoverage: a.inputCoverage, providerCalled: a.providerCalled, transportAttempted: a.transportAttempted, returnedModel: a.providerMetadata, usage: a.usage, observationRefresh: a.observationRefresh })}</section>`).join('') : '<p>AI not called. No request or response to display.</p>'}</details>
      <details class="process"><summary>3 · Checks</summary>${e.attempts.length ? e.attempts.map(a => `<section><h3>Attempt ${a.number}</h3><p>Technical acceptance: ${a.candidateAccepted ? 'yes' : 'no'} · action executed: ${a.actionExecuted ? 'yes' : 'no'}</p><p>${text(a.reason)}</p>${evidence('Locator checks and target-rule decision', { proposed: a.proposedSelector, selected: a.selector, validations: a.validations, specDecision: a.specDecision ?? null })}</section>`).join('') : '<p>Replacement checks skipped; no recovery attempt.</p>'}${evidence('Target-rule configuration, if enabled', e.targetSpec ?? null)}</details>
      <details class="process"><summary>4 · Action outcome</summary><p>${text(result)}. Locator acceptance and action completion do not establish semantic correctness.</p>${evidence('Independent assessments and timing', { semantic: e.semantic, actionExecuted: e.actionExecuted, assessments: view.assessments.filter(a => a.eventId === e.id), timing: e.timing })}</details></article>`;
  }).join('');
  const stopped = view.events.filter(e => !e.actionExecuted).length;
  const unassessed = view.events.filter(e => e.semantic === 'unassessed').length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Locator recovery report</title><style>
  *{box-sizing:border-box}body{font:15px/1.6 system-ui,sans-serif;max-width:1100px;margin:auto;padding:28px;color:#18352f;background:#f7f8f5}h1{font-size:28px;margin-bottom:6px}h2{font-size:19px;margin:0}h3{font-size:15px}header{border-bottom:1px solid #d7dfd8;padding-bottom:20px}.metadata{font-size:12px;color:#52675f;overflow-wrap:anywhere}.stats{display:flex;flex-wrap:wrap;gap:18px;margin-top:18px}.stats strong{display:block;font-size:24px}.stats span{font-size:12px}article{background:#fff;border:1px solid #d7dfd8;border-radius:8px;padding:22px;margin:24px 0}.event-heading{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px}.verdict{font-size:14px}.wrong{color:#a03828}.locators{font-size:13px}.process{border-top:1px solid #d7dfd8;padding:12px 0}.process:last-child{padding-bottom:0}summary{cursor:pointer;min-height:32px;display:list-item}summary:focus-visible{outline:3px solid #437bb2;outline-offset:3px}.evidence{margin:12px 0;color:#40574d}.evidence summary{font-size:13px}pre,code{font:12px/1.7 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}pre{padding:16px;background:#f0f3ed;max-height:430px;overflow:auto}section+section{border-top:1px solid #d7dfd8;padding-top:10px}@media(max-width:600px){body{padding:18px 14px}article{padding:16px}h1{font-size:25px}.stats{gap:14px}summary{min-height:44px}}
  </style></head><body><header><h1>Locator recovery report</h1><p class="metadata">Run ${text(view.id)} · ${text(view.summary.evidenceKind)} · ${text(view.createdAt)}</p><div class="stats">${[['Actions',view.summary.events],['Correct recoveries',view.summary.correctRepairs],['Wrong effects',view.summary.wrongEffects],['Stopped',stopped],['Unassessed',unassessed]].map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong></div>`).join('')}</div></header>${rows || '<p>No actions recorded.</p>'}<details><summary>Evidence, configuration and limitations</summary><p>${text(view.limitations)}</p>${evidence('Full safe report projection',view)}</details></body></html>`;
}
export async function writeReport(run: Run, options: { directory: string; price?: PriceAssumption; diagnostics?: readonly { eventId: string; rawDom: string }[] }): Promise<string> {
  if (!/^[a-f0-9-]{36}$/.test(run.id)) throw new Error('Invalid run ID');
  await mkdir(options.directory, { recursive: true, mode: 0o700 });
  const directory = join(options.directory, run.id);
  await mkdir(directory, { mode: 0o700 }); // EEXIST deliberately prevents evidence overwrite.
  await writeFile(join(directory, 'report.json'), JSON.stringify(reportView(run, options.price), null, 2), { flag: 'wx', mode: 0o600 });
  await writeFile(join(directory, 'report.html'), renderReport(run, options.price), { flag: 'wx', mode: 0o600 });
  if (options.diagnostics?.length) await writeFile(join(directory, 'SENSITIVE-local-diagnostics.json'), JSON.stringify({ warning: 'May contain private DOM; local review required before any sharing.', entries: options.diagnostics }, null, 2), { flag: 'wx', mode: 0o600 });
  return directory;
}
