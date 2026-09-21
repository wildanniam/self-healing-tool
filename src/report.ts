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
        providerCalled: a.providerCalled, transportAttempted: a.transportAttempted, usage: a.usage, durationMs: a.durationMs, providerMs: a.providerMs, actionMs: a.actionMs })),
    })),
    assessments: run.assessments.map(a => ({ eventId: a.eventId, attemptId: a.attemptId, semantic: a.semantic,
      wrongEffect: a.wrongEffect, targetInCandidates: a.targetInCandidates, evidenceRef: a.evidenceRef ? redact(a.evidenceRef) : undefined })),
    limitations: 'Structural validation does not establish semantic correctness. Raw DOM and candidate payloads are omitted. Review this local report before sharing. Offline results are not model-effectiveness evidence.'+(run.events.some(e=>e.targetSpec)?' Target-contract matching requires independent behavioral assessment; acceptance is not semantic proof. Zero or incompletely assessed accepted actions have undefined accepted-error risk.':''),
  };
}
export function renderReport(run: Run, price?: PriceAssumption): string {
  const view = reportView(run, price);
  const rows = view.events.map(e => `<article><h2>${escapeHtml(e.action)}: ${escapeHtml(e.description)}</h2><p>Original: <code>${escapeHtml(e.originalSelector)}</code></p><p>Action: ${e.actionExecuted ? 'executed' : 'failed'} · Semantics: ${escapeHtml(e.semantic)} · Failure: ${escapeHtml(e.failure)}</p><table><thead><tr><th>Attempt</th><th>Proposed selector</th><th>Accepted</th><th>Executed</th><th>Outcome</th></tr></thead><tbody>${e.attempts.map(a => `<tr><td>${a.number}</td><td><code>${escapeHtml(a.selector ?? (a.failure === 'abstained' ? 'abstained' : 'no selector'))}</code></td><td>${a.candidateAccepted}</td><td>${a.actionExecuted}</td><td>${escapeHtml(a.failure)}: ${escapeHtml(a.reason)}</td></tr>`).join('')}</tbody></table><p>Total ${e.timing.totalMs.toFixed(1)} ms; original ${e.timing.originalMs.toFixed(1)} ms; internal ${e.timing.internalMs.toFixed(1)} ms; retry ${e.timing.retryMs.toFixed(1)} ms.</p></article>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Locator recovery report</title><style>body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:20px;color:#18252c;background:#f5f7f8}article{background:white;border:1px solid #ccd6dc;padding:24px;margin:24px 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd6dc;padding:8px;text-align:left}code,pre{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#465963}</style><h1>Locator recovery report</h1><small>Run ${escapeHtml(view.id)} · ${escapeHtml(view.summary.evidenceKind)}</small><p>${escapeHtml(view.limitations)}</p>${rows}<h2>Configuration, outcomes and independent assessments</h2><pre>${escapeHtml(JSON.stringify(view, null, 2))}</pre></html>`;
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
