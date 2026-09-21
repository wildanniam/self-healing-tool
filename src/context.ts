import type { Page } from 'playwright';
import type { Action, Candidate, Config, Context, Task } from './types.js';
import { cleanContextText } from './privacy.js';
import { serializeRequest } from './provider.js';

export async function collectContext(page: Page, action: Action, task: Task, config: Readonly<Config>, omitted: readonly string[]): Promise<Context> {
  const extracted = await page.evaluate(({ action }) => {
    const labelText = (element: Element): string => {
      if (element.closest('script,style,[hidden],[aria-hidden="true"],[data-oracle],[data-evaluator],[data-healing-evaluator]')) return '';
      const clone = element.cloneNode(true) as Element;
      clone.querySelectorAll('script,style,input,textarea,select,[hidden],[aria-hidden="true"],[data-oracle],[data-evaluator],[data-healing-evaluator]').forEach(n => n.remove());
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
      const chunks: string[] = [];
      while (walker.nextNode()) chunks.push(walker.currentNode.textContent ?? '');
      return chunks.join(' ').replace(/\s+/g, ' ').trim().slice(0, 600);
    };
    const all = [...document.querySelectorAll('input,textarea,button,a[href],select,[role="button"],[contenteditable="true"]')];
    const candidates: Omit<Candidate, 'score'>[] = [];
    for (const [order, element] of all.slice(0, 5000).entries()) {
      if (element.closest('[hidden],[aria-hidden="true"],[data-oracle],[data-evaluator],[data-healing-evaluator]')) continue;
      const tag = element.tagName.toLowerCase();
      const type = element.getAttribute('type')?.toLowerCase() ?? '';
      const inputTypes = ['', 'text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'time', 'datetime-local', 'month', 'week'];
      const fillable = (tag === 'input' && inputTypes.includes(type)) || tag === 'textarea' || element.getAttribute('contenteditable') === 'true';
      if (action === 'fill' && !fillable) continue;
      const style = getComputedStyle(element);
      if (!element.getClientRects().length || style.visibility === 'hidden' || style.display === 'none') continue;
      if (element.matches(':disabled,[aria-disabled="true"]') || (action === 'fill' && element.hasAttribute('readonly'))) continue;
      const labels = 'labels' in element ? [...((element as HTMLInputElement).labels ?? [])].map(labelText).join(' ') : '';
      const labelledBy = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id => document.getElementById(id)).filter((x): x is HTMLElement => !!x).map(labelText).join(' ');
      const label = element.getAttribute('aria-label') || labelledBy || labels || element.getAttribute('placeholder') || (tag === 'input' || tag === 'textarea' ? '' : labelText(element));
      let container = element.closest('tr,li,article,dialog,[role="dialog"],[role="listitem"]');
      if (!container) {
        for (let parent = element.parentElement, depth = 0; parent && depth < 5; parent = parent.parentElement, depth++) {
          const siblings = [...(parent.parentElement?.children ?? [])];
          if (siblings.filter(s => s.tagName === parent!.tagName && s.querySelector('button,input,textarea,[role="button"]')).length > 1) { container = parent; break; }
        }
      }
      const parts: string[] = [];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const name = node.tagName.toLowerCase();
        const siblings = [...(node.parentElement?.children ?? [])].filter(n => n.tagName === node!.tagName);
        parts.unshift(`${name}:nth-of-type(${siblings.indexOf(node) + 1 || 1})`);
        if (name === 'html') break;
      }
      // Structural paths contain no test-id or evaluator annotation. No raw DOM fallback.
      candidates.push({ selector: parts.join(' > '), tag, type, label,
        container: container ? labelText(container) : '',
        containerKind: container ? container.tagName.toLowerCase() : 'none', order });
    }
    return { candidates, scanTruncated: all.length > 5000 };
  }, { action });
  const cleanTask: Task = { description: cleanContextText(task.description, omitted) };
  if (task.scope) cleanTask.scope = cleanContextText(task.scope, omitted);
  const tokens = (s: string) => [...new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
  const wanted = tokens(`${cleanTask.description} ${cleanTask.scope ?? ''}`);
  const scopeTokens = tokens(cleanTask.scope ?? '');
  const ranked: Candidate[] = extracted.candidates.map(candidate => {
    const label = cleanContextText(candidate.label, omitted);
    const container = cleanContextText(candidate.container, omitted);
    const labelTokens = new Set(tokens(label));
    const contextTokens = new Set(tokens(container));
    const score = wanted.reduce((sum, token) => sum + (labelTokens.has(token) ? 3 : 0) + (contextTokens.has(token) ? 1 : 0), 0)
      + scopeTokens.reduce((sum, token) => sum + (contextTokens.has(token) ? 3 : 0), 0);
    return { ...candidate, label, container, score };
  }).sort((a, b) => b.score - a.score || a.order - b.order);
  const context: Context = { action, task: cleanTask, candidates: ranked.slice(0, config.maxCandidates), coverage: {
    discovered: ranked.length, included: 0, omitted: 0,
    textTruncated: extracted.scanTruncated || extracted.candidates.some(c => c.label.length >= 600 || c.container.length >= 600 || c.label.length > 500 || c.container.length > 500),
    domChars: 0, payloadChars: 0, domLimit: config.domMaxChars, payloadLimit: config.payloadMaxChars, candidateLimit: config.maxCandidates,
  } };
  function measure() {
    const coverage = context.coverage;
    coverage.included = context.candidates.length;
    coverage.omitted = ranked.length - context.candidates.length;
    coverage.domChars = JSON.stringify(context.candidates).length;
    // Fixed point accounts for the digits in the payload-size field itself.
    for (let n = 0; n < 4; n++) coverage.payloadChars = serializeRequest(context, config).length;
  }
  measure();
  while (context.candidates.length && (context.coverage.domChars > config.domMaxChars || context.coverage.payloadChars > config.payloadMaxChars)) {
    context.candidates.pop(); measure();
  }
  if (context.coverage.payloadChars > config.payloadMaxChars) throw new Error('context_budget_exhausted');
  return context;
}

export function rankerSelection(context: Readonly<Context>, rejected: ReadonlySet<string>): string | null {
  return context.candidates.find(c => c.score > 0 && !rejected.has(c.selector))?.selector ?? null;
}
