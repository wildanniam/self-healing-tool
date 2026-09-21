import type { Action, Candidate, CandidateFeatures } from './types.js';
import type { SpecEvidence } from './spec.js';

type InspectionOptions = { action?: Action; specMode?: boolean; evidenceOnly?: boolean };

/** Self-contained browser function, shared by the ranked snapshot and fresh admission evidence. */
export function inspectDom(root: Element, options: InspectionOptions) {
  const blocked = 'script,style,svg,head,noscript,iframe,canvas,[data-oracle],[data-evaluator],[data-healing-evaluator]';
  const controls = 'input,textarea,select,[contenteditable="true"]';
  const semantic = 'tr,li,article,fieldset,form,nav,aside,section,dialog,[role="dialog"],[role="listitem"],[role="complementary"],[role="navigation"],[role="group"]';
  const attributes = ['id','name','type','placeholder','role','aria-label','data-testid','data-test','data-cy','title'];
  let scanTruncated = false;
  const compact = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
  const styles = new WeakMap<Element, CSSStyleDeclaration>();
  const style = (e: Element) => { let s = styles.get(e); if (!s) { s = getComputedStyle(e); styles.set(e, s); } return s; };
  const treeHidden = (e: Element) => {
    let depth = 0;
    for (let p: Element | null = e; p; p = p.parentElement) {
      if (++depth > 80) { scanTruncated = true; return true; }
      if (p.matches('[hidden],[aria-hidden="true"],[inert],dialog:not([open])')) return true;
      const s = style(p);
      if (s.display === 'none' || s.opacity === '0' || s.contentVisibility === 'hidden') return true;
    }
    return false;
  };
  const hidden = (e: Element) => treeHidden(e) || ['hidden','collapse'].includes(style(e).visibility);
  // Clone while observing the live source. Detached clones cannot report CSS visibility.
  const cloneClean = (e: Element, omitControls = false, accessibleReference = false, omitActions = false, maxNodes = 2000): Element | null => {
    let remaining = maxNodes, charsRemaining = 64000;
    const visit = (e: Element, depth: number): Element | null => {
    if (--remaining < 0 || depth > 80 || charsRemaining <= 0) { scanTruncated = true; return null; }
    if (e.closest(blocked) || !accessibleReference && treeHidden(e) || omitControls && e.matches(controls) || omitActions && e.matches('button,a,[role="button"],[role="link"]')) return null;
    const clone = e.cloneNode(false) as Element;
    for (const child of e.childNodes) {
      if (remaining <= 0 || charsRemaining <= 0) { scanTruncated = true; break; }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const next = visit(child as Element, depth + 1);
        if (next) clone.append(next);
      } else if (child.nodeType === Node.TEXT_NODE && (accessibleReference || !hidden(e))) {
        remaining--;
        const raw = child.textContent ?? '', value = raw.slice(0, charsRemaining);
        if (value.length < raw.length) scanTruncated = true;
        charsRemaining -= value.length; clone.append(document.createTextNode(value));
      }
    }
    // A visibility override can expose descendants of a hidden wrapper; retain only those descendants.
    if (!accessibleReference && ['hidden','collapse'].includes(style(e).visibility)) {
      if (!clone.childNodes.length) return null;
      for (const a of [...clone.attributes]) clone.removeAttribute(a.name);
    }
    return clone;
    };
    return visit(e, 0);
  };
  const textCache = new WeakMap<Element, Map<string, string>>();
  const text = (e: Element | null, limit = 500, accessibleReference = false, omitActions = false, joined = true) => {
    if (!e) return '';
    const key = `${limit}:${accessibleReference}:${omitActions}:${joined}`, cached = textCache.get(e)?.get(key);
    if (cached !== undefined) return cached;
    const clone = cloneClean(e, true, accessibleReference, omitActions);
    if (!clone) return '';
    let value = compact(clone.textContent);
    if (joined) {
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT), parts: string[] = [];
      while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? '');
      value = compact(parts.join(' '));
    }
    if (value.length > limit) scanTruncated = true;
    const result = value.slice(0, limit), cache = textCache.get(e) ?? new Map<string, string>();
    cache.set(key, result); textCache.set(e, cache); return result;
  };
  const firstHeading = (e: Element) => {
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT), limit = 2000;
    for (let visits = 0; visits < limit; visits++) {
      const next = walker.nextNode() as Element | null;
      if (!next) return null;
      if (next.matches('h1,h2,h3,h4,h5,h6,legend,td,th') && !next.closest(blocked) && !hidden(next) && text(next, 160)) return next;
    }
    scanTruncated = true; return null;
  };
  const path = (raw: string | null) => {
    if (!raw) return '';
    try { const u = new URL(raw, /^https?:/.test(document.baseURI) ? document.baseURI : 'http://localhost/'); return ['http:','https:'].includes(u.protocol) ? u.pathname : ''; } catch { return ''; }
  };
  const containerFor = (e: Element) => {
    let depth = 0;
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      if (++depth > 80) { scanTruncated = true; break; }
      if (p.matches(semantic)) return p;
      if (firstHeading(p)) {
        let similar = 0, visited = 0;
        for (const sibling of p.parentElement?.children ?? []) {
          if (++visited > 2000) { scanTruncated = true; break; }
          if (sibling.tagName === p.tagName && firstHeading(sibling)) similar++;
          if (similar > 1) return p;
        }
      }
    }
    return e.closest('label');
  };
  const groupText = (e: Element | null) => {
    if (!e) return '';
    const accessibleName = e.getAttribute('aria-label') || compact((e.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id => text(document.getElementById(id), 80, true)).join(' '));
    return compact([accessibleName, text(e)].filter(Boolean).join(' ')).slice(0, 500);
  };
  const describe = (e: Element) => {
    const attr = (name: string) => e.getAttribute(name) ?? '';
    const tag = e.tagName.toLowerCase(), type = attr('type').toLowerCase();
    const classes = [...e.classList].filter(c => c.length < 30 && !/^css-/.test(c)).slice(0, 5);
    const nativeLabels = 'labels' in e ? [...((e as HTMLInputElement).labels ?? [])] : [];
    const labels = nativeLabels.length ? nativeLabels.map(n => text(n, 80, true)).join(' ') : text(e.closest('label'), 80, true);
    const ariaRefs = compact(attr('aria-labelledby').split(/\s+/).map(id => text(document.getElementById(id), 80, true)).join(' '));
    const ownText = e.matches(controls) ? '' : text(e, 80, false, false, false);
    const container = containerFor(e), row = e.closest('tr');
    const rowContext = row ? [...row.querySelectorAll('td,th')].slice(0, 6).map(cell => text(cell, 160, false, true)).filter(Boolean).join(' | ').slice(0, 160) : '';
    // Semantic parent identity survives purely structural wrappers.
    const parent = container ?? e.parentElement;
    const parentContext = parent ? parent.tagName.toLowerCase() + (parent.id ? '#' + parent.id : '') + [...parent.classList].filter(c => c.length < 20).slice(0, 2).map(c => '.' + c).join('') : '';
    const form = 'form' in e ? (e as HTMLInputElement).form : e.closest('form');
    const evidence = {
      label: attr('aria-label') || ariaRefs || labels || attr('placeholder') || ownText,
      tag, type, id: attr('id'), name: attr('name'), placeholder: attr('placeholder'), role: attr('role'), ariaLabel: attr('aria-label'),
      dataTestId: attr('data-testid'), dataTest: attr('data-test'), dataCy: attr('data-cy'), title: attr('title'), classes,
      text: ownText, nearestLabel: labels || ariaRefs, rowContext, parentContext,
      containerContext: groupText(container), container: groupText(container), href: path(attr('href')), formAction: path(attr('formaction') || form?.getAttribute('action') || null),
    } satisfies SpecEvidence;
    return { evidence, container, nativeLabels };
  };
  if (options.evidenceOnly) return { evidence: root.isConnected && !root.closest(blocked) && !hidden(root) ? describe(root).evidence : {} as SpecEvidence, nodes: [], candidates: [], cleanedDom: '', scanTruncated: false, scanned: 0, ineligible: 0 };

  const candidateQuery = 'input,textarea,button,a,select,[role],[aria-label],[placeholder],[name],[data-testid],[data-test],[data-cy],[contenteditable="true"]';
  const nodes: Element[] = [], walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT, { acceptNode: e => (e as Element).matches(blocked) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let visited = 0;
  for (let e = walker.nextNode() as Element | null; e; e = walker.nextNode() as Element | null) {
    if (++visited > 20000 || nodes.length >= 5000) { scanTruncated = true; break; }
    if (e.matches(candidateQuery)) nodes.push(e);
  }
  const candidates: Candidate[] = [];
  let ineligible = 0;
  for (const [order, e] of nodes.slice(0, 5000).entries()) {
    if (e.closest(blocked)) continue;
    const tag = e.tagName.toLowerCase(), type = e.getAttribute('type')?.toLowerCase() ?? '', role = e.getAttribute('role') ?? '';
    const fillable = tag === 'textarea' || e.getAttribute('contenteditable') === 'true' || tag === 'input' && !['hidden','button','submit','reset','checkbox','radio','file','image','range','color'].includes(type);
    const clickable = ['button','a','input','select'].includes(tag) || ['button','link','tab','menuitem','option','checkbox','radio','switch'].includes(role);
    if (options.action === 'fill' ? !fillable : !clickable) continue;
    const rect = e.getBoundingClientRect();
    const visible = !hidden(e) && rect.width > 0 && rect.height > 0;
    const disabled = e.matches(':disabled') || !!e.closest('[aria-disabled="true"]') || options.action === 'fill' && (e.hasAttribute('readonly') || e.getAttribute('aria-readonly') === 'true');
    if (type === 'hidden' || !visible || disabled) { ineligible++; continue; }
    const { evidence, container } = describe(e);
    const { label, container: containerText, tag: _tag, type: _type, ...rawFeatures } = evidence;
    const features: CandidateFeatures = { ...rawFeatures, visible: true, disabled: false };
    if (!options.specMode) { delete features.href; delete features.formAction; }
    const q = (s: string) => JSON.stringify(s);
    const stable: string[] = [];
    const addAttributes = (node: Element) => {
      const result: string[] = [];
      if (node.id) result.push('#' + CSS.escape(node.id));
      for (const a of ['data-testid','data-test','data-cy','name','aria-label','placeholder']) {
        const value = node.getAttribute(a); if (value) result.push(`[${a}=${q(value)}]`);
      }
      return result;
    };
    stable.push(...addAttributes(e));
    const scopes: string[] = [];
    if (container && container !== e) {
      scopes.push(...addAttributes(container));
      // Descendant headings survive wrappers; candidates remain distinct even with equal text.
      const heading = firstHeading(container);
      if (heading) {
        const identity = text(heading, 160, false, false, false);
        // Prefer an exact text-bearing node, retaining the path back to its semantic host.
        let anchor = heading;
        while (anchor.children.length === 1 && text(anchor.children[0]!, 160, false, false, false) === identity) anchor = anchor.children[0]!;
        const exactPath = [`${anchor.tagName.toLowerCase()}:text-is(${q(identity)})`];
        for (let p = anchor.parentElement; p && p !== container; p = p.parentElement) exactPath.unshift(p.tagName.toLowerCase());
        scopes.push(`${container.tagName.toLowerCase()}:has(> ${exactPath.join(' > ')})`);
        const headingPath = [`${heading.tagName.toLowerCase()}:has-text(${q(identity)})`];
        for (let p = heading.parentElement; p && p !== container; p = p.parentElement) headingPath.unshift(p.tagName.toLowerCase());
        scopes.push(`${container.tagName.toLowerCase()}:has(> ${headingPath.join(' > ')})`);
      }
      const groupLabel = container.getAttribute('aria-label');
      if (groupLabel) scopes.push(`${container.tagName.toLowerCase()}[aria-label=${q(groupLabel)}]`);
    }
    const hostText: string[] = [];
    if (features.text) hostText.push(`${tag}:has-text(${q(features.text)})`);
    const labelText = String(features.nearestLabel ?? '');
    if (labelText) hostText.push(`label:has-text(${q(labelText)}) ${tag}`);
    const classes = (features.classes ?? []).map(c => `${tag}.${CSS.escape(c)}`);
    const withScopes = (bases: string[]) => [...bases, ...bases.map(s => `${s}:visible`), ...scopes.flatMap(scope => bases.map(base => `${scope} ${base}:visible`))];
    // Advertised suggestions are filtered later with Playwright, including exact originating-node identity.
    const suggestedLocators = [...new Set([...withScopes(stable), ...withScopes(hostText), ...withScopes(classes)])];
    candidates.push({ selector: '', tag, type, label: String(label ?? ''), container: String(containerText ?? ''), containerKind: container?.tagName.toLowerCase() ?? 'none', order, score: 0, features, suggestedLocators });
  }
  const clone = cloneClean(document.documentElement, false, false, false, 10000) ?? document.createElement('html');
  for (const e of [clone, ...clone.querySelectorAll('*')]) {
    if (e.matches('textarea,select,[contenteditable="true"]')) e.textContent = '';
    for (const a of [...e.attributes]) if (!attributes.includes(a.name) && !['class','for','aria-labelledby'].includes(a.name)) e.removeAttribute(a.name);
  }
  return { evidence: {} as SpecEvidence, nodes, candidates, cleanedDom: clone.outerHTML, scanTruncated, scanned: nodes.length, ineligible };
}
