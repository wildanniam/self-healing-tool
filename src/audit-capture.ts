import { createHash } from 'node:crypto';
import { redact } from './privacy.js';
import type { AuditText, RunAudit, ProviderAuditSink } from './types.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const missing = (): AuditText => ({ status: 'missing', text: null, sha256: null });
/** Retain valid JSON when applying omissions inside encoded message content. */
export function redactAuditText(text: string, omitted: readonly string[]): string {
  function clean(value: unknown, depth = 0): unknown {
    if (depth > 64) return '[redacted: nesting limit]';
    if (typeof value === 'string') {
      if (/^\s*[\[{]/.test(value)) {
        try { const parsed = JSON.parse(value); const next = clean(parsed, depth + 1); return JSON.stringify(next) === JSON.stringify(parsed) ? value : JSON.stringify(next); } catch { /* Returned text need not be JSON. */ }
      }
      return redact(value, omitted);
    }
    if (Array.isArray(value)) return value.map(v => clean(v, depth + 1));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, /^(?:authorization|cookie|cookies|set-cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|password|storageState|headers|environment|env)$/i.test(key) ? '[redacted]' : clean(v, depth + 1)]));
    return value;
  }
  return clean(text) as string;
}
export function isRequestBody(text: string): boolean {
  try {
    const p = JSON.parse(text);
    return p && !Array.isArray(p) && Object.keys(p).every(k => ['model', 'max_tokens', 'temperature', 'response_format', 'store', 'messages'].includes(k)) &&
      Array.isArray(p.messages) && p.messages.every((m: Record<string, unknown>) => m && !Array.isArray(m) && Object.keys(m).every(k => ['role', 'content'].includes(k)) &&
        ['system', 'user', 'assistant'].includes(String(m.role)) && typeof m.content === 'string');
  } catch { return false; }
}
/** Fixed bounds prevent diagnostic retention from growing with arbitrary provider text. */
export function createAuditCapture(runId: string) {
  const data: RunAudit = { schemaVersion: 1, runId, entries: [] };
  let retainedChars = 0;
  const capture = (text: unknown, request: boolean): AuditText => {
    if (typeof text !== 'string') return missing();
    if (text.length > 128000 || retainedChars + text.length > 4000000 || (request && !isRequestBody(text)))
      return { status: 'withheld', text: null, sha256: null, reason: 'capture-limit-or-unsupported-body' };
    retainedChars += text.length;
    return { status: 'recorded', text, sha256: digest(text) };
  };
  return {
    attempt(eventId: string, attemptId: string) {
      const entry = { eventId, attemptId, request: missing(), response: missing() };
      data.entries.push(entry); let open = true, requested = false;
      return {
        sink: { request(body: string) { if (open && !requested) { requested = true; entry.request = capture(body, true); } } } satisfies ProviderAuditSink,
        response(text: string) { if (open) entry.response = capture(text, false); },
        close() { open = false; },
      };
    },
    snapshot(omitted: readonly string[]): RunAudit {
      const copy = structuredClone(data);
      for (const entry of copy.entries) for (const field of ['request', 'response'] as const) {
        const value = entry[field];
        if (value.text !== null) { const next = redactAuditText(value.text, omitted); if (next !== value.text) value.status = 'redacted'; value.text = next; }
      }
      return copy;
    },
  };
}
