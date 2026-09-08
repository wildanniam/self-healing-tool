/** Reserved evaluator metadata is never legitimate task context. Keep answers out of the runtime API. */
const evaluatorLine = /(?:oracle|ground[\s_-]?truth|expected[\s_-]?(?:locator|selector|result|outcome)|answer[\s_-]?(?:locator|selector)|mutation[\s_-]?(?:id|answer)|eval[\s_-]?sentinel)/i;
export function redact(text: string, omitted: readonly string[] = []): string {
  let value = text;
  for (const secret of omitted) if (secret) value = value.split(secret).join('[redacted]');
  return value.replace(/\bsk-[\w-]+/g, '[redacted-key]')
    .replace(/\bBearer\s+\S+/gi, '[redacted-authorization]')
    .replace(/(?:authorization|cookie|password|session|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '[redacted-secret]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted-url]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]');
}
export function cleanContextText(text: string, omitted: readonly string[] = []): string {
  return redact(text.split(/\r?\n/).filter(line => !evaluatorLine.test(line)).join(' '), omitted).replace(/\s+/g, ' ').trim().slice(0, 500);
}
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
