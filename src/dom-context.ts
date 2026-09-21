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
  // Identity is a relationship to a bounded owner node, not arbitrary nearby prose.
  const strongOwner = 'tr,li,article,fieldset,form,nav,dialog,[role="dialog"],[role="listitem"],[role="navigation"]';
  const headingQuery = 'h1,h2,h3,h4,h5,h6,legend';
  const rawHeadings = new WeakMap<Element, Element | null>();
  const firstOwnedHeading = (host: Element, excludeCards = true): Element | null => {
    if (!excludeCards && rawHeadings.has(host)) return rawHeadings.get(host)!;
    let visits = 0;
    const walk = (parent: Element, depth: number): Element | null => {
      for (const child of parent.children) {
        if (++visits > 2000 || depth > 80) { scanTruncated = true; return null; }
        if (child.closest(blocked) || hidden(child) || child.matches(controls + ',button,a,[role="button"],[role="link"]')) continue;
        // A nested semantic entity owns its headings. Transparent div/header wrappers do not.
        if (child.matches(semantic) || excludeCards && repeatedCard(child)) continue;
        if (child.matches(headingQuery) && text(child, 160)) return child;
        const nested = walk(child, depth + 1);
        if (nested) return nested;
      }
      return null;
    };
    const result = walk(host, 0);
    if (!excludeCards) rawHeadings.set(host, result);
    return result;
  };
  const ownControlsCache = new WeakMap<Element, boolean>();
  const hasOwnedControls = (host: Element) => {
    const cached = ownControlsCache.get(host);
    if (cached !== undefined) return cached;
    let visits = 0;
    const walk = (node: Element, depth: number): boolean => {
      if (++visits > 2000 || depth > 80) { scanTruncated = true; return false; }
      if (node.closest(blocked) || hidden(node)) return false;
      // Wrapping controls in an unnamed section/aside does not transfer them to another entity.
      if (node !== host && node.matches(strongOwner)) return false;
      if (node.matches('button,a,input:not([type="hidden"]),textarea,select,[contenteditable="true"],[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="checkbox"],[role="radio"],[role="switch"]')) return true;
      for (const child of node.children) if (walk(child, depth + 1)) return true;
      return false;
    };
    const result = walk(host, 0); ownControlsCache.set(host, result); return result;
  };
  const cardCache = new WeakMap<Element, boolean>();
  const repeatedCard = (host: Element): boolean => {
    const cached = cardCache.get(host);
    if (cached !== undefined) return cached;
    if (!host.matches('div,section,aside') || !hasOwnedControls(host)) { cardCache.set(host, false); return false; }
    // Membership is structural, including a peer whose heading disappeared. Requiring every
    // peer to have a heading would make both peers borrow a broader owner after that mutation.
    let count = 0, named = false, visits = 0;
    const peers: Element[] = [];
    for (const sibling of host.parentElement?.children ?? []) {
      if (++visits > 2000) { scanTruncated = true; break; }
      if (sibling.tagName !== host.tagName || !hasOwnedControls(sibling)) continue;
      peers.push(sibling); count++;
      named ||= !!firstOwnedHeading(sibling, false);
    }
    const result = count > 1 && named;
    for (const peer of peers) cardCache.set(peer, result);
    cardCache.set(host, result); return result;
  };
  const accessibleName = (e: Element) => {
    const literal = compact(e.getAttribute('aria-label'));
    if (literal.length > 160) scanTruncated = true;
    if (literal) return { value: literal.slice(0, 160), source: 'aria-label' };
    const ids = compact(e.getAttribute('aria-labelledby')).split(/\s+/).filter(Boolean);
    if (ids.length > 8) scanTruncated = true;
    const value = compact(ids.slice(0, 8).map(id => text(document.getElementById(id), 80, true)).join(' '));
    if (value.length > 160) scanTruncated = true;
    return value ? { value: value.slice(0, 160), source: 'aria-labelledby' } : null;
  };
  const ownedIdentityText = (host: Element) => {
    const parts: string[] = [];
    let visits = 0, remaining = 160;
    const walk = (node: Element, depth: number) => {
      if (++visits > 2000 || depth > 80 || remaining <= 0) { scanTruncated = true; return; }
      if (node.closest(blocked) || hidden(node) || node.matches(controls + ',button,a,[role="button"],[role="link"]')) return;
      if (node !== host && (node.matches(semantic) || repeatedCard(node))) return;
      for (const child of node.childNodes) {
        if (remaining <= 0 || visits > 2000) { scanTruncated = true; break; }
        if (child.nodeType === Node.TEXT_NODE) {
          const value = compact(child.textContent); parts.push(value.slice(0, remaining)); remaining -= value.length;
        } else if (child.nodeType === Node.ELEMENT_NODE) walk(child as Element, depth + 1);
      }
    };
    walk(host, 0); return compact(parts.join(' ')).slice(0, 160);
  };
  type Identity = { value: string; sources: string[]; heading: Element | null };
  const identities = new WeakMap<Element, Identity>();
  const identityFor = (host: Element): Identity => {
    const cached = identities.get(host);
    if (cached) return cached;
    const explicit = accessibleName(host);
    const heading = firstOwnedHeading(host);
    let result: Identity = { value: '', sources: [], heading };
    if (explicit) result = { value: explicit.value, sources: [explicit.source], heading };
    else if (host.matches('tr')) {
      if (host.children.length > 2000) scanTruncated = true;
      const cells = [...host.children].slice(0, 2000).filter(e => e.matches('td,th') && !hidden(e));
      // A row header declares identity. Fallback to the first non-action data cell, never concatenate notes.
      const header = cells.find(e => e.matches('th[scope="row"],[role="rowheader"]'));
      const cell = header ?? cells.find(e => !e.querySelector(controls + ',button,a,[role="button"],[role="link"]') && ownedIdentityText(e));
      if (cell) result = { value: ownedIdentityText(cell), sources: [header ? 'row-header' : 'row-identity-cell'], heading: cell };
    } else if (heading) result = { value: ownedIdentityText(heading), sources: [heading.matches('legend') ? 'legend' : 'heading'], heading };
    identities.set(host, result); return result;
  };
  type Owner = { node: Element | null; identity: Identity; status: 'identified' | 'missing' | 'ambiguous' };
  const emptyIdentity = (): Identity => ({ value: '', sources: [], heading: null });
  const ownerFor = (e: Element): Owner => {
    let pending: { node: Element; identity: Identity } | null = null, depth = 0;
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      if (++depth > 80) { scanTruncated = true; return { node: null, identity: emptyIdentity(), status: 'missing' }; }
      if (hidden(p) || p.closest(blocked)) continue;
      const strong = p.matches(strongOwner) || repeatedCard(p);
      if (!strong && !p.matches(semantic)) continue;
      const identity = identityFor(p);
      if (strong) {
        // Missing nested owners are barriers: their controls cannot inherit a different outer entity.
        if (!identity.value) return { node: null, identity: emptyIdentity(), status: pending ? 'ambiguous' : 'missing' };
        if (pending && pending.identity.value !== identity.value) return { node: null, identity: emptyIdentity(), status: 'ambiguous' };
        return pending ? { ...pending, status: 'identified' } : { node: p, identity, status: 'identified' };
      }
      if (!identity.value) continue; // Unnamed aside/section/group wrappers are transparent.
      if (pending && pending.identity.value !== identity.value) return { node: null, identity: emptyIdentity(), status: 'ambiguous' };
      pending ??= { node: p, identity };
    }
    return pending ? { ...pending, status: 'identified' } : { node: null, identity: emptyIdentity(), status: 'missing' };
  };
  const localActionFor = (e: Element) => {
    let depth = 0;
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      if (++depth > 80) { scanTruncated = true; break; }
      if (!p.matches(semantic)) continue;
      let visits = 0, remaining = 320;
      const parts: string[] = [];
      const walk = (node: Element, level: number) => {
        if (++visits > 500 || level > 80 || remaining <= 0) { scanTruncated = true; return; }
        if (node.closest(blocked) || hidden(node) || node.matches(controls)) return;
        if (node !== p && (node.matches(semantic) || repeatedCard(node))) return;
        for (const child of node.childNodes) {
          if (remaining <= 0 || visits > 500) { scanTruncated = true; break; }
          if (child.nodeType === Node.TEXT_NODE) {
            const value = compact(child.textContent); parts.push(value.slice(0, remaining)); remaining -= value.length;
          } else if (child.nodeType === Node.ELEMENT_NODE) walk(child as Element, level + 1);
        }
      };
      walk(p, 0);
      // Action labels remain available but are not promoted to owner evidence.
      const value = compact([accessibleName(p)?.value, parts.join(' ')].filter(Boolean).join(' '));
      if (value.length > 320) scanTruncated = true;
      return value.slice(0, 320);
    }
    return '';
  };
  const path = (raw: string | null) => {
    if (!raw) return '';
    try { const u = new URL(raw, /^https?:/.test(document.baseURI) ? document.baseURI : 'http://localhost/'); return ['http:','https:'].includes(u.protocol) ? u.pathname : ''; } catch { return ''; }
  };
  const describe = (e: Element) => {
    const attr = (name: string) => e.getAttribute(name) ?? '';
    const tag = e.tagName.toLowerCase(), type = attr('type').toLowerCase();
    const classes = [...e.classList].filter(c => c.length < 30 && !/^css-/.test(c)).slice(0, 5);
    const nativeLabels = 'labels' in e ? [...((e as HTMLInputElement).labels ?? [])] : [];
    const labels = nativeLabels.length ? nativeLabels.map(n => text(n, 80, true)).join(' ') : text(e.closest('label'), 80, true);
    const ariaRefs = compact(attr('aria-labelledby').split(/\s+/).map(id => text(document.getElementById(id), 80, true)).join(' '));
    const ownText = e.matches(controls) ? '' : text(e, 80, false, false, false);
    const owner = ownerFor(e), container = owner.node;
    const rowContext = container?.matches('tr') ? owner.identity.value : '';
    // Parent metadata is structural identity only, never a fallback to an unrelated parent.
    const parent = container;
    const parentContext = parent ? parent.tagName.toLowerCase() + (parent.id ? '#' + parent.id : '') + [...parent.classList].filter(c => c.length < 20).slice(0, 2).map(c => '.' + c).join('') : '';
    const form = 'form' in e ? (e as HTMLInputElement).form : e.closest('form');
    const evidence = {
      label: attr('aria-label') || ariaRefs || labels || attr('placeholder') || ownText,
      tag, type, id: attr('id'), name: attr('name'), placeholder: attr('placeholder'), role: attr('role'), ariaLabel: attr('aria-label'),
      dataTestId: attr('data-testid'), dataTest: attr('data-test'), dataCy: attr('data-cy'), title: attr('title'), classes,
      text: ownText, nearestLabel: labels || ariaRefs, rowContext, parentContext,
      containerContext: owner.identity.value, container: owner.identity.value,
      ownerContext: owner.identity.value, ownerStatus: owner.status, ownerSources: owner.identity.sources, localActionContext: localActionFor(e), href: path(attr('href')), formAction: path(attr('formaction') || form?.getAttribute('action') || null),
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
      const heading = identityFor(container).heading;
      if (heading) {
        const identity = ownedIdentityText(heading);
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
