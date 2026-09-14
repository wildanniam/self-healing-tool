import { test, expect } from '@playwright/test';
import type { Page } from 'playwright';
import type { Candidate } from '../dist/index.js';
import { collectContext, collectSpecEvidence, fitContext, rankerSelection } from '../dist/context.js';
import { normalizeSelectors } from '../dist/selectors.js';
import { serializeCandidates, serializeRequest } from '../dist/provider.js';
import { validateConfig } from '../dist/index.js';

const config = validateConfig({ domMaxChars: 16000, payloadMaxChars: 24000 });
const nodeQuery = 'input,textarea,button,a,select,[role],[aria-label],[placeholder],[name],[data-testid],[data-test],[data-cy],[contenteditable="true"]';
async function verifyOrigins(page: Page, candidates: Candidate[]) {
  const origins = await page.locator(nodeQuery).elementHandles();
  try {
    for (const c of candidates) {
      expect(c.suggestedLocators?.length ?? 0).toBeLessThanOrEqual(1);
      for (const selector of c.suggestedLocators ?? []) {
        expect(selector).not.toMatch(/nth|data-oracle|data-evaluator/);
        expect(await page.locator(selector).evaluateAll((matches, origin) => matches.length === 1 && matches[0] === origin, origins[c.order]!)).toBe(true);
      }
    }
  } finally { await Promise.all(origins.map(h => h.dispose())); }
}

test.beforeEach(async ({ page }) => { await page.route('**/*', route => route.abort()); });

test('CTX-007 nested navigation text resolves the host despite hidden and visible duplicates', async ({ page }) => {
  await page.setContent(`<nav aria-label="Primary"><div><a><span>Open workspace</span></a></div></nav>
    <nav aria-label="Secondary"><div><a><span>Open workspace</span></a></div></nav>
    <nav hidden><a><span>Open workspace</span></a></nav><input type="hidden" name="state">`);
  const c = await collectContext(page, 'click', { description: 'Open workspace', scope: 'Primary' }, config, []);
  expect(c.candidates).toHaveLength(2);
  expect(c.coverage).toMatchObject({ discovered: 2, ineligible: 2, locatorCheckedCandidates: 2, unaddressable: 0 });
  for (const item of c.candidates) {
    expect(item.tag).toBe('a'); expect(item.suggestedLocators?.length).toBeGreaterThan(0);
    expect(item.suggestedLocators!.every(s => s.includes('a:has-text'))).toBe(true);
  }
  await verifyOrigins(page, c.candidates);
});

test('CTX-007 CSS hidden and closed-dialog content is excluded from candidates, entity text and fallback', async ({ page }) => {
  await page.setContent(`<style>.off { display:none }.invisible { visibility:hidden }</style><form><h2>Inventory</h2>
    <button><span>Archive item</span></button><dialog><h3>CLOSED_SECRET</h3><button>Archive item</button></dialog>
    <div class="off">CSS_SECRET<button>Archive item</button></div><div class="invisible" id="VISIBILITY_ATTRIBUTE_SECRET">VISIBILITY_SECRET<button>Archive item</button></div>
    <button disabled>DISABLED_ACTION</button><div aria-disabled="true"><button>INHERITED_DISABLED</button></div></form>`);
  const c = await collectContext(page, 'click', { description: 'Archive item' }, config, []);
  expect(c.candidates).toHaveLength(1); expect(c.coverage.ineligible).toBe(5);
  for (const token of ['CLOSED_SECRET', 'CSS_SECRET', 'VISIBILITY_SECRET', 'VISIBILITY_ATTRIBUTE_SECRET']) expect(JSON.stringify(c)).not.toContain(token);
  expect(c.candidates[0]!.containerKind).toBe('form');
  expect(c.candidates[0]!.selector).toContain('button:has-text');
  await verifyOrigins(page, c.candidates);
});

test('CTX-007 repeated entities remain distinct and wrapped headings scope nested host text', async ({ page }) => {
  await page.setContent(['Amber', 'Cobalt'].map(name => `<form><div><div><h3><span>${name}</span></h3></div></div><div><button class="group"><span>Deactivate item</span></button></div><dialog><button class="group">Deactivate item</button></dialog></form>`).join(''));
  const c = await collectContext(page, 'click', { description: 'Deactivate item', scope: 'Cobalt' }, config, []);
  expect(c.candidates).toHaveLength(2); expect(new Set(c.candidates.map(x => x.order)).size).toBe(2);
  expect(c.candidates[0]!.container).toContain('Cobalt'); expect(c.candidates[0]!.container).not.toContain('Amber');
  expect(c.candidates[0]!.selector).toContain('form:has(> div > div > h3 > span:text-is');
  for (const item of c.candidates) expect(item.suggestedLocators?.length).toBeGreaterThan(0);
  await verifyOrigins(page, c.candidates);
});

test('CTX-007 labels and fieldset legend survive wrappers and agree with fresh gate evidence', async ({ page }) => {
  await page.setContent(`<style>.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}</style>
    <form><fieldset><legend><span>Delivery details</span></legend><div><div><label for="city" class="sr-only">Delivery city</label><div><input id="city" name="city"></div></div></div>
    <span id="postal-label" class="sr-only">Postal area</span><div><input id="postal" aria-labelledby="postal-label"></div>
    <input type="hidden" name="state"><input readonly name="locked"><input disabled name="disabled"></fieldset></form>`);
  const c = await collectContext(page, 'fill', { description: 'Delivery city' }, config, []);
  expect(c.candidates).toHaveLength(2); expect(c.coverage.ineligible).toBe(2);
  const city = c.candidates.find(x => x.features?.id === 'city')!;
  expect(city.label).toBe('Delivery city'); expect(city.containerKind).toBe('fieldset');
  expect(city.features?.parentContext).toBe('fieldset'); expect(city.container).toContain('Delivery details');
  expect(c.candidates.find(x => x.features?.id === 'postal')!.label).toBe('Postal area');
  const origin = await page.locator('#city').elementHandle();
  try {
    const evidence = await collectSpecEvidence(origin!, []);
    for (const key of ['text', 'nearestLabel', 'rowContext', 'parentContext', 'containerContext'] as const) expect(evidence[key]).toEqual(city.features?.[key]);
    expect(evidence.label).toBe(city.label); expect(evidence.container).toBe(city.container);
  } finally { await origin!.dispose(); }
  await verifyOrigins(page, c.candidates);
});

test('CTX-007 offscreen scrollable targets remain eligible and native click can reach them', async ({ page }) => {
  await page.setContent('<div style="height:1800px"></div><button id="bottom"><span>Continue work</span></button>');
  const c = await collectContext(page, 'click', { description: 'Continue work' }, config, []);
  expect(c.candidates).toHaveLength(1); expect(c.candidates[0]!.features?.visible).toBe(true);
  expect(await page.locator('#bottom').evaluate(e => e.getBoundingClientRect().top > innerHeight)).toBe(true);
  await page.locator(c.candidates[0]!.selector).click();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test('CTX-007 unsupported identity remains two unaddressable descriptors instead of positional guesses', async ({ page }) => {
  await page.setContent('<button><span>Run</span></button><button><span>Run</span></button>');
  const c = await collectContext(page, 'click', { description: 'Run' }, config, []);
  expect(c.candidates).toHaveLength(2); expect(c.coverage.unaddressable).toBe(2);
  expect(c.candidates.every(x => x.selector === '' && x.suggestedLocators?.length === 0)).toBe(true);
  expect(rankerSelection(c, new Set())).toBeNull();
});

test('CTX-007 exact originating node check rejects an otherwise unique label suggestion for another input', async ({ page }) => {
  await page.setContent('<label for="target">Contact<input name="different"></label><input id="target">');
  const c = await collectContext(page, 'fill', { description: 'Contact' }, config, []);
  const target = c.candidates.find(x => x.features?.id === 'target')!;
  expect(target.label).toBe('Contact'); expect(target.selector).toBe('#target');
  expect(target.suggestedLocators).not.toContain('label:has-text("Contact") input');
  await verifyOrigins(page, c.candidates);
});

test('CTX-007 stable attributes precede host-text and inline text fragments are not split artificially', async ({ page }) => {
  await page.setContent('<button data-testid="proceed"><span>Con</span><span>tinue</span></button>');
  const c = await collectContext(page, 'click', { description: 'Continue' }, config, []);
  expect(c.candidates[0]!.label).toBe('Continue');
  expect(c.candidates[0]!.selector).toBe('[data-testid="proceed"]');
  expect(c.candidates[0]!.suggestedLocators).toEqual(['[data-testid="proceed"]']);
  await verifyOrigins(page, c.candidates);
});

test('CTX-007 explicitly referenced accessible labels survive hidden presentation without importing hidden neighbors', async ({ page }) => {
  await page.setContent('<span id="name" hidden>Accessible heading</span><span hidden>HIDDEN_NEIGHBOR</span><input aria-labelledby="name" name="field">');
  const c = await collectContext(page, 'fill', { description: 'Accessible heading' }, config, []);
  expect(c.candidates[0]!.label).toBe('Accessible heading');
  expect(JSON.stringify(c)).not.toContain('HIDDEN_NEIGHBOR');
});

test('CTX-007 repeated generic cards keep local identity inside a broader semantic region', async ({ page }) => {
  await page.setContent('<section><h1>Work queue</h1><div><div><h2>Amber</h2><div><button>Review</button></div></div><div><h2>Cobalt</h2><div><button>Review</button></div></div></div></section>');
  const c = await collectContext(page, 'click', { description: 'Review', scope: 'Cobalt' }, config, []);
  expect(c.candidates).toHaveLength(2); expect(c.candidates[0]!.container).toBe('Cobalt Review');
  expect(c.candidates[0]!.container).not.toContain('Amber');
  expect(c.coverage.unaddressable).toBe(0); await verifyOrigins(page, c.candidates);
});

test('CTX-007 visible descendants of a visibility-hidden wrapper remain available', async ({ page }) => {
  await page.setContent('<div style="visibility:hidden" id="HIDDEN_WRAPPER_SECRET">HIDDEN_TEXT<button style="visibility:visible" id="visible">Proceed</button><button>HIDDEN_BUTTON</button></div>');
  const c = await collectContext(page, 'click', { description: 'Proceed' }, config, []);
  expect(c.candidates).toHaveLength(1); expect(c.candidates[0]!.label).toBe('Proceed');
  expect(c.cleanedDom).not.toContain('HIDDEN_TEXT'); expect(c.cleanedDom).not.toContain('HIDDEN_BUTTON'); expect(c.cleanedDom).not.toContain('HIDDEN_WRAPPER_SECRET');
});

test('CTX-008 shortlist and budget counts describe distinct stages and use the actual wire projection', async ({ page }) => {
  await page.setContent(Array.from({ length: 12 }, (_, i) => `<label>Field ${i}<input name="field-${i}"></label>`).join(''));
  const small = validateConfig({ maxCandidates: 8, domMaxChars: 1100, payloadMaxChars: 2200 });
  const c = await collectContext(page, 'fill', { description: 'Field' }, small, []);
  expect(c.coverage).toMatchObject({ discovered: 12, beforeBudget: 8, locatorCheckedCandidates: 8, unaddressable: 0 });
  expect(c.coverage.budgetOmitted).toBe(8 - c.candidates.length);
  expect(c.coverage.omitted).toBe(12 - c.candidates.length);
  expect(c.coverage.domChars).toBe(serializeCandidates(c.candidates).length + (c.cleanedDom?.length ?? 0));
  expect(c.coverage.domChars).toBeLessThanOrEqual(small.domMaxChars);
  expect(c.coverage.payloadChars).toBe(serializeRequest(c, small).length);
  expect(c.coverage.payloadChars).toBeLessThanOrEqual(small.payloadMaxChars);
  const before = c.coverage.beforeBudget;
  c.feedback = [{ selector: 'x'.repeat(120), count: 0, reason: 'no_match' }]; fitContext(c, small);
  expect(c.coverage.beforeBudget).toBe(before); expect(c.coverage.budgetOmitted).toBe(before! - c.candidates.length);
});

test('HEAL-009 defensive normalization has no literal null candidate', () => {
  for (const value of [null, 'null', ' null ', '']) expect(normalizeSelectors(value)).toEqual([]);
  expect(normalizeSelectors('#null')).toEqual(['#null']);
  for (const selector of ['//button[2]', 'xpath=//button[position()=2]', 'button:nth-last-child(1)', 'button:first-child', 'button:last-of-type']) expect(normalizeSelectors(selector)).toEqual([]);
  for (const selector of ['[name="lines[2].title"]', 'button:text-is("Preview last()")', '[aria-label="Bob\\\"s last()"]']) expect(normalizeSelectors(selector)).toEqual([selector]);
});

test('CTX-003 sparse fallback applies all reserved evaluator-text exclusions', async ({ page }) => {
  for (const marker of ['expected-outcome', 'expected-result', 'answer-selector', 'answer-locator', 'mutation-id', 'mutation-answer']) {
    await page.setContent(`<main><label>Public field<input name="field"></label><p>${marker}: PRIVATE_SENTINEL</p></main>`);
    const c = await collectContext(page, 'fill', { description: 'Public field' }, config, []);
    expect(serializeRequest(c, config)).not.toContain(marker); expect(serializeRequest(c, config)).not.toContain('PRIVATE_SENTINEL');
  }
});

test('CTX-007 oversized DOM traversal records truncation without claiming a late target was preserved', async ({ page }) => {
  await page.setContent('<main>' + '<div></div>'.repeat(21000) + '<input name="late-field"></main>');
  const c = await collectContext(page, 'fill', { description: 'Late field' }, config, []);
  expect(c.coverage.textTruncated).toBe(true); expect(c.candidates).toHaveLength(0);
  expect(c.coverage.payloadChars).toBeLessThanOrEqual(config.payloadMaxChars);
});

test('CTX-007 hundreds of repeated controls use a bounded verified shortlist', async ({ page }) => {
  test.setTimeout(45000);
  await page.setContent(Array.from({ length: 300 }, (_, i) => `<form><div><h3>Work item ${i}</h3></div><label>Note<input name="note-${i}"></label><div><button class="shared"><span>Inspect item</span></button></div><dialog><button class="shared">Inspect item</button></dialog><input type="hidden" name="state-${i}"></form>`).join(''));
  const started = performance.now();
  const c = await collectContext(page, 'click', { description: 'Inspect item', scope: 'Work item 299' }, config, []);
  const elapsedMs = Math.round(performance.now() - started);
  expect(c.coverage).toMatchObject({ scanned: 1200, discovered: 600, ineligible: 600, locatorCheckedCandidates: 30, beforeBudget: 30 });
  expect(c.candidates.length).toBeLessThanOrEqual(30); expect(c.coverage.payloadChars).toBeLessThanOrEqual(config.payloadMaxChars);
  expect(c.candidates.every(x => x.features?.visible === true && x.features.disabled === false)).toBe(true);
  console.info(JSON.stringify({ probe: 'synthetic-300-entities', scanned: c.coverage.scanned, verified: c.coverage.locatorCheckedCandidates, included: c.coverage.included, unaddressable: c.coverage.unaddressable, elapsedMs }));
});
