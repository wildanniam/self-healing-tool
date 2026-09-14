import type { Action, Candidate, CandidateFeatures, Task } from './types.js';

/** D27 keeps the additive thesis signals but counts each intent token once. */
const words = (value = '') => [...new Set(value.toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ').split(/[\s_-]+/).filter(w => w.length > 1))];
const overlap = (left: string[], right: string[]) => { const tokens = new Set(right); return left.filter(w => tokens.has(w)).length; };
const structural = new Set('html body main section article header footer aside nav form fieldset legend label input textarea select option button a div span p ul ol li table thead tbody tfoot tr th td img svg path h1 h2 h3 h4 h5 h6 dialog'.split(' '));
const selectorSyntax = new Set(['nth', 'child', 'type', 'first', 'last', 'of', 'has', 'text', 'exact', 'contains', 'normalize', 'space', 'css', 'xpath']);

/** Literal values and CSS identities remain meaningful even when they name a tag. */
function locatorWords(selector: string): string[] {
  const identity: string[] = [];
  const syntax = selector.replace(/(['"])(.*?)\1/g, (_match, _quote, value: string) => { identity.push(value); return ' '; })
    .replace(/:(?:nth-(?:last-)?(?:child|of-type))\([^)]*\)/gi, ' ')
    .replace(/[#.]([\w-]+)/g, (_match, value: string) => { identity.push(value); return ' '; });
  return [...new Set([...words(identity.join(' ')), ...words(syntax).filter(w => !structural.has(w) && !selectorSyntax.has(w))])];
}

/** The immediate parent's bare tag is layout, not the task's identity. */
const parentWords = (value = '') => words(value.replace(/^\s*[a-z][\w-]*(?=\s|$)/i, match => structural.has(match.trim().toLowerCase()) ? '' : match));
const clickTags = ['button', 'a', 'div', 'span', 'li', 'img'];
const roles = { fill: ['textbox', 'combobox', 'searchbox', 'spinbutton'], click: ['button', 'link', 'menuitem', 'tab', 'option', 'checkbox', 'radio', 'switch'] };
const generic = new Set(['info-circle', 'question-circle', 'close-circle', 'search', 'filter', 'down', 'ellipsis', 'more', 'clock-circle', 'calendar']);
const stableFields = ['id', 'dataTestId', 'dataTest', 'dataCy', 'name'] as const;
const stableSignatures = (c: Candidate) => stableFields.flatMap(key => c.features?.[key] ? [`${key}:${c.features[key]}`] : []);
const labelSignatures = (c: Candidate) => [...new Set([c.features?.text, c.features?.ariaLabel, c.label].filter((v): v is string => !!v?.trim()).map(v => 'label:' + v.toLowerCase().trim()))];

export function rankThesis(candidates: Candidate[], action: Action, task: Task, oldSelector = ''): Candidate[] {
  const old = locatorWords(oldSelector), step = words(`${task.description} ${task.scope ?? ''}`);
  const frequency = new Map<string, number>();
  for (const c of candidates) for (const key of [...stableSignatures(c), ...labelSignatures(c)]) frequency.set(key, (frequency.get(key) ?? 0) + 1);
  return candidates.map(c => {
    const f = c.features ?? {}, parent = parentWords(f.parentContext);
    const all = words([f.id, f.name, f.placeholder, f.ariaLabel, f.text, f.nearestLabel, f.dataTestId, f.dataTest, f.dataCy, f.title, f.rowContext, f.containerContext, ...parent, ...(f.classes ?? [])].filter(Boolean).join(' '));
    const a = overlap(old, all), b = overlap(step, all), stable = stableSignatures(c);
    // A common class or label cannot make an independently unique stable field a duplicate.
    // Candidates remain separate nodes, including equal labels in different entity rows.
    const dup = stable.length ? Math.min(...stable.map(s => frequency.get(s) ?? 1)) : Math.max(1, ...labelSignatures(c).map(s => frequency.get(s) ?? 1));
    let score = a * 15 + b * 10;
    if ((action === 'fill' ? ['input', 'textarea'] : clickTags).includes(c.tag)) score += 5;
    if (roles[action].includes(f.role ?? '')) score += 8;
    for (const [key, bonus] of Object.entries({ dataTestId: 6, dataTest: 5, dataCy: 5, id: 4, name: 4, ariaLabel: 3, placeholder: 2 })) if (f[key as keyof typeof f]) score += bonus;
    if (f.visible === true) score += 3; if (f.visible === false) score -= 20; if (f.disabled) score -= 20;
    if (dup > 1) {
      score -= Math.min(dup * 2, 20);
      if (a === 0 && b === 0 && f.ariaLabel && (!f.text || f.text.toLowerCase() === f.ariaLabel.toLowerCase()) && (f.role === 'img' || generic.has(f.ariaLabel.toLowerCase()))) score -= 30;
    }
    const id = oldSelector.match(/^#([\w-]+)$/); if (id && f.id === id[1]) score += 50;
    const fields: Record<string, keyof CandidateFeatures> = { name: 'name', 'data-testid': 'dataTestId', 'data-test': 'dataTest', 'data-cy': 'dataCy', placeholder: 'placeholder' };
    const matched = new Set<string>();
    for (const attr of oldSelector.matchAll(/\[([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*\]/g)) {
      const name = attr[1]!, key = fields[name], value = attr[2] ?? attr[3] ?? attr[4];
      if (key && !matched.has(name) && f[key] === value) { score += name === 'placeholder' ? 25 : 30; matched.add(name); }
    }
    const ot = overlap(old, words(f.text)), st = overlap(step, words(f.text)); score += ot * 8 + st * 6 + (ot >= 2 || st >= 2 ? 12 : 0);
    score += overlap(old, words(f.rowContext)) * 8 + overlap(step, words(f.rowContext)) * 12;
    score += (overlap(old, parent) + overlap(step, parent)) * 5;
    score += overlap(step, words(f.containerContext)) * 8;
    return { ...c, score, duplicateCount: dup };
  }).sort((a, b) => b.score - a.score || a.order - b.order);
}
