import { test, expect } from '@playwright/test';
import { collectContext, collectSpecEvidence } from '../dist/context.js';
import { validateConfig } from '../dist/index.js';
import { buildSpecContext, evaluateSpecAdmission } from '../dist/spec.js';
import { serializeRequest } from '../dist/provider.js';
import type { TargetContract } from '../dist/index.js';

const config = validateConfig({ domMaxChars: 16000, payloadMaxChars: 24000 });
const contract = (identity: string): TargetContract => ({ schemaVersion: 1, requirementId: 'customer-address', revision: 'r1',
  intent: `Edit delivery address for ${identity}`, action: 'click', status: 'active',
  allOf: [{ sources: ['text'], anyOf: ['Edit address'] }, { sources: ['containerContext', 'rowContext'], anyOf: [identity] }] });
const spec = buildSpecContext({ mode: 'enforce', contract: contract('Customer Juniper'), expectedRevision: 'r1' }, 'click', []);

test.beforeEach(async ({ page }) => { await page.route('**/*', route => route.abort()); });

test('CTX-009 unnamed semantic wrappers preserve customer ownership and exact-node evidence', async ({ page }) => {
  for (const wrapper of ['<div>CONTROL</div>', '<aside><div>CONTROL</div></aside>', '<section><aside><div role="group">CONTROL</div></aside></section>']) {
    await page.setContent(['Juniper', 'Cypress'].map(name => `<article aria-label="Customer ${name}"><h2>Customer ${name}</h2>${wrapper.replace('CONTROL', `<button id="${name}">Edit address</button>`)}</article>`).join(''));
    const context = await collectContext(page, 'click', { description: 'Edit address', scope: 'Customer Juniper' }, config, [], '#old', spec);
    for (const candidate of context.candidates) {
      const expected = `Customer ${candidate.features?.id}`;
      expect(candidate.container).toBe(expected); expect(candidate.features?.ownerContext).toBe(expected);
      expect(candidate.features?.ownerStatus).toBe('identified'); expect(candidate.features?.ownerSources).toEqual(['aria-label']);
      const node = await page.locator(candidate.selector).elementHandle();
      try {
        const evidence = await collectSpecEvidence(node!, []);
        for (const key of ['ownerContext', 'ownerStatus', 'ownerSources', 'containerContext', 'rowContext', 'localActionContext'] as const) expect(evidence[key]).toEqual(candidate.features?.[key]);
        expect(evaluateSpecAdmission(spec, evidence).outcome).toBe(candidate.features?.id === 'Juniper' ? 'accepted' : 'unknown');
      } finally { await node?.dispose(); }
    }
  }
});

test('CTX-009 neighboring mentions do not become ownership and headingless regions remain missing', async ({ page }) => {
  await page.setContent(`<section><h2>Customer Juniper</h2><button id="right">Edit address</button></section>
    <section><h2>Customer Cypress</h2><aside><p>Compare with Customer Juniper</p></aside><button id="wrong">Edit address</button></section>
    <section><p>Customer Juniper appears in this unrelated note</p><button id="missing">Edit address</button></section>`);
  const context = await collectContext(page, 'click', { description: 'Edit address', scope: 'Customer Juniper' }, config, [], '#old', spec);
  const wrong = context.candidates.find(c => c.features?.id === 'wrong')!;
  expect(wrong.container).toBe('Customer Cypress'); expect(wrong.features?.ownerSources).toEqual(['heading']);
  const missing = context.candidates.find(c => c.features?.id === 'missing')!;
  expect(missing.container).toBe(''); expect(missing.features?.ownerStatus).toBe('missing');
  for (const id of ['wrong', 'missing']) {
    const node = await page.locator(`#${id}`).elementHandle();
    try { expect(evaluateSpecAdmission(spec, await collectSpecEvidence(node!, [])).outcome).toBe('unknown'); }
    finally { await node?.dispose(); }
  }
});

test('CTX-009 nested named and missing structural entities cannot borrow outer identity', async ({ page }) => {
  await page.setContent(`<article aria-label="Customer Juniper"><h2>Customer Juniper</h2><button id="outer">Edit address</button>
    <article aria-label="Customer Cypress"><h3>Customer Cypress</h3><aside><button id="inner">Edit address</button></aside></article>
    <article><aside><button id="unidentified">Edit address</button></aside></article></article>`);
  const context = await collectContext(page, 'click', { description: 'Edit address' }, config, []);
  expect(context.candidates.find(c => c.features?.id === 'outer')!.container).toBe('Customer Juniper');
  expect(context.candidates.find(c => c.features?.id === 'inner')!.container).toBe('Customer Cypress');
  const unidentified = context.candidates.find(c => c.features?.id === 'unidentified')!;
  expect(unidentified.container).toBe(''); expect(unidentified.features?.ownerStatus).toBe('missing');
  expect(unidentified.features?.parentContext).toBe('');
  await page.setContent('<article><button><h2>Customer Juniper</h2></button><button id="target">Edit address</button></article>');
  const controlHeading = await collectContext(page, 'click', { description: 'Edit address' }, config, []);
  expect(controlHeading.candidates.find(c => c.features?.id === 'target')!.features?.ownerStatus).toBe('missing');
});

test('CTX-009 repeated generic cards retain their own heading instead of a board or sibling identity', async ({ page }) => {
  await page.setContent(`<section aria-label="Approvals"><div>${['Juniper', 'Cypress'].map(name => `<div><header><h3><span>Customer ${name}</span></h3></header><div><button>Edit address</button></div></div>`).join('')}</div></section>`);
  const context = await collectContext(page, 'click', { description: 'Edit address', scope: 'Customer Juniper' }, config, []);
  expect(context.coverage.unaddressable).toBe(0); expect(context.candidates).toHaveLength(2);
  expect(context.candidates[0]!.container).toBe('Customer Juniper');
  for (const candidate of context.candidates) {
    expect(candidate.features?.ownerSources).toEqual(['heading']);
    expect(await page.locator(candidate.selector).count()).toBe(1);
    expect(await page.locator(candidate.selector).evaluate(e => e.closest('div')?.parentElement?.querySelector('h3')?.textContent)).toBe(candidate.container);
  }
});

test('CTX-009 explicit form identity outranks unrelated inner headings and fieldset legend survives wrappers', async ({ page }) => {
  await page.setContent(`<form aria-label="Customer Juniper"><div><h2>Address controls</h2><button id="form-action">Edit address</button></div>
    <fieldset><legend><span>Invoice recipient</span></legend><div><div><label for="recipient">Recipient name</label><input id="recipient"></div></div></fieldset></form>`);
  const click = await collectContext(page, 'click', { description: 'Edit address' }, config, []);
  expect(click.candidates[0]!.container).toBe('Customer Juniper'); expect(click.candidates[0]!.features?.ownerSources).toEqual(['aria-label']);
  const fill = await collectContext(page, 'fill', { description: 'Recipient name' }, config, []);
  expect(fill.candidates[0]!.container).toBe('Invoice recipient'); expect(fill.candidates[0]!.containerKind).toBe('fieldset');
  expect(fill.candidates[0]!.features?.ownerSources).toEqual(['legend']);
});

test('CTX-009 ambiguous named functional hierarchy stays explicit instead of guessing a business owner', async ({ page }) => {
  await page.setContent(`<article aria-label="Customer Juniper"><h2>Customer Juniper</h2><section aria-label="Address actions"><aside><button id="edit">Edit address</button></aside></section></article>`);
  const context = await collectContext(page, 'click', { description: 'Edit address' }, config, [], '#old', spec);
  expect(context.candidates[0]!.features?.ownerStatus).toBe('ambiguous');
  expect(context.candidates[0]!.container).toBe(''); expect(context.candidates[0]!.features?.ownerSources).toEqual([]);
  const node = await page.locator('#edit').elementHandle();
  try { expect(evaluateSpecAdmission(spec, await collectSpecEvidence(node!, [])).outcome).toBe('unknown'); }
  finally { await node?.dispose(); }
});

test('CTX-009 row evidence uses declared header or first identity cell and excludes adjacent references', async ({ page }) => {
  await page.setContent(`<table><tr><th scope="row">Customer Cypress<article><h3>Customer Juniper</h3></article></th><td>Compared with Customer Juniper</td><td><button id="header">Edit address</button></td></tr>
    <tr><td>Customer Cypress</td><td>Compared with Customer Juniper</td><td><button id="fallback">Edit address</button></td></tr></table>`);
  const context = await collectContext(page, 'click', { description: 'Edit address', scope: 'Customer Juniper' }, config, []);
  for (const candidate of context.candidates) {
    expect(candidate.container).toBe('Customer Cypress'); expect(candidate.features?.rowContext).toBe('Customer Cypress');
    expect(candidate.container).not.toContain('Juniper');
  }
  expect(context.candidates.find(c => c.features?.id === 'header')!.features?.ownerSources).toEqual(['row-header']);
  expect(context.candidates.find(c => c.features?.id === 'fallback')!.features?.ownerSources).toEqual(['row-identity-cell']);
});

test('CTX-009 explicit accessible references are bounded and existing privacy filters cover new owner fields', async ({ page }) => {
  await page.setContent(`<span hidden id="owner">Customer Juniper person@example.com</span><span hidden>HIDDEN_NEIGHBOR</span>
    <form aria-labelledby="owner"><div data-oracle><h2>ORACLE_SECRET</h2></div><aside hidden><h2>HIDDEN_SECRET</h2></aside><button id="edit">Edit address</button><input value="PRIVATE_VALUE"></form>`);
  const context = await collectContext(page, 'click', { description: 'Edit address' }, config, []);
  expect(context.candidates[0]!.features?.ownerSources).toEqual(['aria-labelledby']);
  expect(context.candidates[0]!.container).toContain('Customer Juniper');
  const wire = serializeRequest(context, config);
  for (const secret of ['person@example.com', 'HIDDEN_NEIGHBOR', 'ORACLE_SECRET', 'HIDDEN_SECRET', 'PRIVATE_VALUE']) expect(wire).not.toContain(secret);
});


test('CTX-009 removing one peer heading preserves the other identity and makes the missing peer a barrier', async ({ page }) => {
  for (const wrapper of ['CONTROL', '<div><aside><div role="group">CONTROL</div></aside></div>']) {
    for (const secondHeading of ['<header><h3>Customer Willow</h3></header>', '']) {
      await page.setContent(`<article aria-label="Customer Juniper"><div><header><h3>Customer Cypress</h3></header>${wrapper.replace('CONTROL', '<button id="cypress">Edit address</button>')}</div>
        <div>${secondHeading}${wrapper.replace('CONTROL', '<button id="second">Edit address</button>')}</div></article>`);
      const context = await collectContext(page, 'click', { description: 'Edit address', scope: 'Customer Juniper' }, config, [], '#old', spec);
      const first = context.candidates.find(c => c.features?.id === 'cypress')!;
      const second = context.candidates.find(c => c.features?.id === 'second')!;
      expect(first.container).toBe('Customer Cypress'); expect(first.features?.ownerStatus).toBe('identified');
      expect(second.container).toBe(secondHeading ? 'Customer Willow' : '');
      expect(second.features?.ownerStatus).toBe(secondHeading ? 'identified' : 'missing');
      for (const candidate of [first, second]) {
        const node = await page.locator(candidate.selector).elementHandle();
        try { expect(evaluateSpecAdmission(spec, await collectSpecEvidence(node!, [])).outcome).toBe('unknown'); }
        finally { await node?.dispose(); }
      }
    }
  }
});

test('CTX-009 a title-only div beside controls does not manufacture a repeated entity family', async ({ page }) => {
  await page.setContent(`<article aria-label="Customer Juniper"><div><h3>Address tools</h3></div><div><button id="edit">Edit address</button></div></article>
    <article aria-label="Customer Willow"><div><article aria-label="Customer Cypress"><h3>Customer Cypress</h3><button id="nested">Edit address</button></article></div><div><button id="owner">Edit address</button></div></article>`);
  const context = await collectContext(page, 'click', { description: 'Edit address' }, config, []);
  expect(context.candidates.find(c => c.features?.id === 'edit')!.container).toBe('Customer Juniper');
  expect(context.candidates.find(c => c.features?.id === 'owner')!.container).toBe('Customer Willow');
  expect(context.candidates.find(c => c.features?.id === 'nested')!.container).toBe('Customer Cypress');
});
