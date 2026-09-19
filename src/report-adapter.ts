import { createHash } from 'node:crypto';
import { isRequestBody, redactAuditText } from './audit-capture.js';
import type { Run, RunAudit, AttemptAudit } from './types.js';
import type { reportView } from './report.js';

/** The presence of a matching audit explicitly opts into local context inspection. */
export function libraryInspection(run: Run, view: ReturnType<typeof reportView>, audit?: RunAudit) {
  const pairs = new Map<string, AttemptAudit>();
  if (audit) {
    if (audit.schemaVersion !== 1 || audit.runId !== run.id) throw new Error('Audit/run identity mismatch');
    for (const entry of audit.entries) {
      const key = entry.eventId + '/' + entry.attemptId;
      if (pairs.has(key) || !run.events.some(e => e.id === entry.eventId && e.attempts.some(a => a.id === entry.attemptId))) throw new Error('Unknown or duplicate audit attempt');
      pairs.set(key, entry);
    }
  }
  const digest = (value: string) => createHash('sha256').update(value).digest('hex');
  const rows = view.events.map((event, index) => {
    const original = run.events[index]!;
    const assessments = view.assessments.filter(a => a.eventId === event.id);
    const wrong = assessments.some(a => a.wrongEffect);
    const attempts = event.attempts.map(a => {
      const source = original.attempts.find(x => x.id === a.id)!;
      const capture = pairs.get(event.id + '/' + a.id);
      const retained = capture?.request;
      const body = typeof retained?.text === 'string' && isRequestBody(retained.text) ? redactAuditText(retained.text, []) : null;
      const response = capture?.response;
      const output = typeof response?.text === 'string' ? redactAuditText(response.text, []) : null;
      return { ...a,
        ...(audit ? { inputContext: source.inputContext ?? null, observationRefresh: source.observationRefresh } : {}),
        request: { body, status: body === null ? retained?.status === 'withheld' ? 'withheld' : 'missing' : retained?.status === 'redacted' || body !== retained?.text ? 'redacted' : 'recorded',
          sha256: retained?.sha256 ?? null, attemptSha256: a.inputSha256 ?? null,
          integrity: body === null ? 'unavailable' : retained?.status === 'redacted' || body !== retained?.text ? 'redacted' : digest(body) === retained?.sha256 && (a.inputSha256 === undefined || a.inputSha256 === digest(body)) ? 'verified' : 'mismatch',
          bytes: body === null ? null : Buffer.byteLength(body), reason: retained?.reason ?? null },
        response: { text: output, status: output === null ? response?.status === 'withheld' ? 'withheld' : 'missing' : response?.status === 'redacted' || output !== response?.text ? 'redacted' : 'recorded', sha256: response?.sha256 ?? null },
      };
    });
    return { id: event.id, caseId: String(index + 1).padStart(2, '0'), title: event.description, group: 'library', category: 'action', arm: 'run', repeat: 1,
      status: 'complete', evidenceKind: view.summary.evidenceKind, operational: ['provider', 'context', 'budget'].includes(event.failure),
      recovery: event.recoveryTriggered, correct: event.semantic === 'correct' && !wrong, wrong, executed: event.actionExecuted, assessed: event.semantic !== 'unassessed', totalMs: event.timing.totalMs,
      usage: { requests: attempts.filter(a => a.providerCalled && a.transportAttempted === true).length },
      audit: { version: 1, privateHost: false, mode: 'library', source: { runId: run.id, eventId: event.id, createdAt: run.createdAt, localAudit: !!audit },
        event: { ...event, task: { description: event.description }, ...event.timing }, attempts, initialContext: audit ? original.context : null, config: view.config,
        assessments, outcome: { assessment: { semantic: event.semantic, wrongEffect: wrong }, actionExecuted: event.actionExecuted },
        missing: [audit ? 'Raw DOM before cleaning and individual ranking contributions are not included in this library report.' : 'Detailed capture was not supplied. Full requests, returned text and candidate context are unavailable.',
          ...(attempts.some(a => a.providerCalled && !a.request.body) ? ['Some providers did not record an actual request body. No request is reconstructed.'] : [])],
      },
    };
  });
  return { library: true, evidenceKind: view.summary.evidenceKind, createdAt: run.createdAt, rows };
}
