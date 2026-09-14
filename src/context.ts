import type { Page, ElementHandle, JSHandle } from 'playwright';
import type { Action, CandidateFeatures, Config, Context, SpecContext, Task } from './types.js';
import type { SpecEvidence } from './spec.js';
import { cleanContextText, cleanDomText } from './privacy.js';
import { serializeCandidates, serializeRequest } from './provider.js';
import { rankThesis } from './ranking.js';
import { inspectDom } from './dom-context.js';

/** Applied after all context/feedback changes; counts the actual complete request. */
export function fitContext(context: Context, config: Readonly<Config>): Context {
  const measure = () => {
    const v = context.coverage;
    v.included = context.candidates.length; v.omitted = v.discovered - v.included;
    if (v.beforeBudget !== undefined) v.budgetOmitted = v.beforeBudget - v.included;
    v.domChars = serializeCandidates(context.candidates).length + (context.cleanedDom?.length ?? 0);
    for (let i = 0; i < 6; i++) v.payloadChars = serializeRequest(context, config).length;
  };
  measure();
  while (context.coverage.domChars > config.domMaxChars || context.coverage.payloadChars > config.payloadMaxChars) {
    if (context.cleanedDom) { context.cleanedDom = context.cleanedDom.slice(0, Math.max(0, context.cleanedDom.length - 256)); context.coverage.textTruncated = true; }
    else if (context.candidates.length) context.candidates.pop();
    else throw new Error('context_budget_exhausted');
    measure();
  }
  return context;
}

/** Identity/uniqueness is checked with the same selector engine used for actions, never native CSS alone. */
async function verifiedLocators(page: Page, origins: JSHandle<Element[]>, order: number, suggestions: readonly string[], cache: Map<string, Promise<number>>): Promise<string[]> {
  const accepted: string[] = [];
  for (const selector of suggestions) {
    try {
      let match = cache.get(selector);
      if (!match) {
        match = page.locator(selector).evaluateAll((matches, nodes) => matches.length === 1 && matches[0]!.isConnected ? nodes.indexOf(matches[0]!) : -1, origins);
        cache.set(selector, match);
      }
      if (await match === order) accepted.push(selector);
    } catch (error) {
      if (page.isClosed()) throw error;
      // An unsupported or obsolete suggestion is not a usable candidate locator.
    }
    // One verified best suggestion is enough; avoid spending the recovery budget on synonymous locators.
    if (accepted.length === 1) break;
  }
  return accepted;
}

export async function collectContext(page: Page, action: Action, task: Task, config: Readonly<Config>, omitted: readonly string[], originalSelector = '', targetSpec?: SpecContext): Promise<Context> {
  // Node handles remain private to this call: no marker attributes or positional selectors enter the DOM/payload.
  const snapshot = await page.locator('html').evaluateHandle(inspectDom, { action, specMode: targetSpec !== undefined });
  try {
    const extracted = await snapshot.evaluate(({ candidates, cleanedDom, scanTruncated, scanned, ineligible }) => ({ candidates, cleanedDom, scanTruncated, scanned, ineligible }));
    const clean = (s: string) => cleanContextText(s, omitted);
    const safeSelector = (s: string) => { const safe = clean(s); return safe === s && !/\[redacted/.test(s) ? safe : ''; };
    const candidates = extracted.candidates.map(c => {
      const f: CandidateFeatures = {};
      for (const [key, value] of Object.entries(c.features ?? {})) {
        if (typeof value === 'boolean') Object.assign(f, { [key]: value });
        else if (Array.isArray(value)) Object.assign(f, { [key]: value.map(clean).filter(Boolean) });
        else if (typeof value === 'string') Object.assign(f, { [key]: clean(value) });
      }
      return { ...c, label: clean(c.label), container: clean(c.container), type: clean(c.type), features: f,
        suggestedLocators: (c.suggestedLocators ?? []).map(safeSelector).filter(Boolean) };
    });
    const cleanTask = { description: clean(task.description), ...(task.scope ? { scope: clean(task.scope) } : {}) };
    const failed = safeSelector(originalSelector);
    const ranked = rankThesis(candidates, action, cleanTask, failed);
    const selected = ranked.slice(0, config.maxCandidates);
    const nodes = await snapshot.getProperty('nodes');
    const locatorCache = new Map<string, Promise<number>>();
    try {
      await Promise.all(selected.map(async candidate => {
        candidate.suggestedLocators = await verifiedLocators(page, nodes, candidate.order, candidate.suggestedLocators ?? [], locatorCache);
        candidate.selector = candidate.suggestedLocators[0] ?? '';
      }));
    } finally { await nodes.dispose(); }
    const cleaned = cleanDomText(extracted.cleanedDom, omitted);
    const context: Context = { action, task: cleanTask, method: 'candidate-corrected-d27-v1', failure: { originalSelector: failed, classification: 'missing-locator' }, candidates: selected,
      ...(selected.length < 5 ? { cleanedDom: cleaned.slice(0, selected.length ? Math.floor(config.domMaxChars / 2) : config.domMaxChars) } : {}),
      coverage: { scanned: extracted.scanned, ineligible: extracted.ineligible, discovered: ranked.length,
        locatorCheckedCandidates: selected.length, unaddressable: selected.filter(c => !c.suggestedLocators?.length).length,
        beforeBudget: selected.length, budgetOmitted: 0, included: 0, omitted: 0,
        textTruncated: extracted.scanTruncated || cleaned.length > config.domMaxChars || extracted.candidates.some(c => c.container.length >= 500 || (c.features?.text?.length ?? 0) >= 80),
        domChars: 0, payloadChars: 0, domLimit: config.domMaxChars, payloadLimit: config.payloadMaxChars, candidateLimit: config.maxCandidates } };
    if (targetSpec !== undefined) context.targetSpec = structuredClone(targetSpec);
    fitContext(context, config);
    if (context.candidates.length < 5 && context.cleanedDom === undefined) {
      context.cleanedDom = cleaned.slice(0, context.candidates.length ? Math.floor(config.domMaxChars / 2) : config.domMaxChars);
      if (context.cleanedDom.length < cleaned.length) context.coverage.textTruncated = true;
      fitContext(context, config);
    }
    return context;
  } finally { await snapshot.dispose(); }
}

/** Fresh evidence from the exact node about to receive the action, using the same semantic extraction. */
export async function collectSpecEvidence(handle: ElementHandle<Element>, omitted: readonly string[]): Promise<SpecEvidence> {
  const { evidence } = await handle.evaluate(inspectDom, { evidenceOnly: true });
  return Object.fromEntries(Object.entries(evidence).map(([key, value]) => [key, Array.isArray(value) ? value.map(v => cleanContextText(v, omitted)) : cleanContextText(value as string, omitted)]));
}

export function rankerSelection(context: Readonly<Context>, rejected: ReadonlySet<string>): string | null {
  for (const c of context.candidates) if (c.score > 0) for (const s of c.suggestedLocators?.length ? c.suggestedLocators : [c.selector]) if (s && !rejected.has(s)) return s;
  return null;
}
