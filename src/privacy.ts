/** Reserved evaluator metadata is never legitimate task context. Keep answers out of the runtime API. */
const evaluatorLine = /(?:oracle|ground[\s_-]?truth|expected[\s_-]?(?:locator|selector|result|outcome)|answer[\s_-]?(?:locator|selector)|mutation[\s_-]?(?:id|answer)|eval[\s_-]?sentinel)/i;
const withoutEvaluatorLines = (text: string) => text.split(/\r?\n/).filter(line => !evaluatorLine.test(line)).join('\n');

/** Only encodings produced by selector JSON and DOM text/attribute serialization. */
function omittedForms(secret: string): string[] {
  const html = (value: string, attribute: boolean, escapeBrackets: boolean) => value.replace(/[&<>"\u00a0]/g, char => {
    if (char === '&') return '&amp;';
    if (char === '\u00a0') return '&nbsp;';
    if (char === '"') return attribute ? '&quot;' : char;
    if (!escapeBrackets) return char;
    return char === '<' ? '&lt;' : '&gt;';
  });
  // DOM evidence compacts whitespace before crossing the browser boundary.
  return [...new Set([secret, secret.replace(/\s+/g, ' ').trim()])].filter(Boolean).flatMap(value =>
    [value, JSON.stringify(value).slice(1, -1), html(value, false, true), html(value, true, false), html(value, true, true)]);
}

export function redact(text: string, omitted: readonly string[] = []): string {
  let value = text;
  const forms = [...new Set(omitted.filter(Boolean).flatMap(omittedForms))]
    .filter(form => form.length <= text.length).sort((a, b) => b.length - a.length);
  // One pass, longest first: replacements never become input to a later omission.
  if (forms.length) value = value.replace(new RegExp(forms.map(form => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g'), '[redacted]');
  return value.replace(/\bsk-[\w-]+/g, '[redacted-key]')
    .replace(/\bBearer\s+\S+/gi, '[redacted-authorization]')
    .replace(/(?:authorization|cookie|password|session|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '[redacted-secret]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted-url]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]');
}
export function cleanContextText(text: string, omitted: readonly string[] = []): string {
  return cleanDomText(text, omitted).slice(0, 500);
}
/** Fallback HTML follows the same privacy policy; fitContext applies its own size cap. */
export function cleanDomText(text: string, omitted: readonly string[] = []): string {
  return redact(withoutEvaluatorLines(text), omitted).replace(/\s+/g, ' ').trim();
}
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
