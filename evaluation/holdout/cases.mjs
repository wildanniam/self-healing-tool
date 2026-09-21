import { fileURLToPath } from 'node:url';
import { warehouseMarkup } from './warehouse-app.mjs';
import { shipmentMarkup } from './shipment-app.mjs';

const local = (path) => fileURLToPath(new URL(path, import.meta.url));
const warehouseSpec = local('./products/warehouse/openspec/specs/replenishment/spec.md');
const shipmentSpec = local('./products/shipment/openspec/specs/destination/spec.md');
const conditions = ['control','attribute-drift','structure-drift','semantic-paraphrase','ambiguity-distractor','target-absent','explicitly-retired','quality'];
const warehouseInitial = {harbor:{reorderLevel:12,targetStock:80},upland:{reorderLevel:8,targetStock:55}};

function viewFor(kind) {
  return {original:kind === 'control',attribute:kind === 'attribute-drift',structure:kind === 'structure-drift',paraphrase:kind === 'semantic-paraphrase',ambiguous:kind === 'ambiguity-distractor',available:!['target-absent','explicitly-retired'].includes(kind)};
}

async function assertLocal(page) {
  const url = new URL(page.url());
  if (!['http:','https:'].includes(url.protocol) || !['127.0.0.1','localhost','[::1]'].includes(url.hostname)) throw new Error('Holdout setup requires a runner-provided loopback URL.');
}

/** @returns {import('./interface.mjs').HoldoutCase[]} */
export function createCases() {
  const cases = [];
  for (const kind of conditions) {
    const view = viewFor(kind);
    const expectedAction = view.available;
    const setup = async (page) => {await assertLocal(page);await page.setContent(warehouseMarkup(view),{waitUntil:'load'});};
    cases.push({
      id:`h1-${String(cases.length + 1).padStart(2,'0')}`,
      group:'warehouse-inventory',kind:kind === 'quality' ? 'missing-spec' : kind,
      expectation:{goalExpected:expectedAction ? 'action' : 'refusal',intendedRecoverable:expectedAction,specApplicable:!['quality','explicitly-retired'].includes(kind),recoveryExpected:kind !== 'control'},
      action:'fill',originalSelector:'#harbor-reorder-level',value:'19',
      task:{description:'Set the reorder level for Harbor warehouse to 19. Preserve target stock and every other warehouse setting.'},
      contractPath:kind === 'quality' ? null : kind === 'explicitly-retired' ? local('./products/warehouse/openspec/specs/replenishment/retired.md') : warehouseSpec,
      expectedRevision:kind === 'explicitly-retired' ? 'inventory-2026-10' : 'inventory-2026-09',
      setup,reset:setup,
      afterAction:async (page,event) => {if(event && event.actionExecuted !== true)return;await page.getByRole('button',{name:'Save warehouse settings',exact:true}).click();},
      assess:async (page) => {
        const state = await page.evaluate(() => window.warehouseApp.snapshot());
        const inputs = state.history.filter(event => event.type === 'input');
        const wrongEffect = inputs.some(event => !expectedAction || event.warehouse !== 'harbor' || event.field !== 'reorderLevel' || event.value !== 19);
        const expected = structuredClone(warehouseInitial);
        if (expectedAction) expected.harbor.reorderLevel = 19;
        const matches = JSON.stringify(state.stored) === JSON.stringify(expected);
        return {semantic:matches && !wrongEffect ? 'correct' : 'incorrect',wrongEffect,goalExpected:expectedAction ? 'action' : 'refusal',intendedRecoverable:expectedAction,expectedAdmission:kind === 'quality' ? 'unknown' : null,expectedDisposition:expectedAction ? 'perform-intended-action' : 'preserve-state',taskApplicable:kind !== 'explicitly-retired',requirementSatisfied:kind !== 'target-absent',contractQuality:kind === 'quality' ? 'missing' : 'applicable',inputCount:inputs.length,state};
      },
    });
  }
  let index = 0;
  for (const kind of conditions) {
    const view = viewFor(kind);
    const expectedAction = view.available;
    const setup = async (page) => {await assertLocal(page);await page.setContent(shipmentMarkup(view),{waitUntil:'load'});};
    cases.push({
      id:`h2-${String(++index).padStart(2,'0')}`,
      group:'shipment-destination',kind:kind === 'quality' ? 'stale-spec' : kind,
      expectation:{goalExpected:expectedAction ? 'action' : 'refusal',intendedRecoverable:expectedAction,specApplicable:!['quality','explicitly-retired'].includes(kind),recoveryExpected:kind !== 'control'},
      action:'click',originalSelector:'#edit-destination-cn804',
      task:{description:'Open the destination editor for shipment CN-804. Do not open a preview, origin editor, or another shipment.'},
      contractPath:kind === 'quality' ? local('./products/shipment/openspec/specs/destination/previous.md') : kind === 'explicitly-retired' ? local('./products/shipment/openspec/specs/destination/retired.md') : shipmentSpec,
      expectedRevision:kind === 'explicitly-retired' ? 'dispatch-2026-10' : 'dispatch-2026-09',
      setup,reset:setup,
      assess:async (page) => {
        const state = await page.evaluate(() => window.dispatchBoard.snapshot());
        const intended = item => item.kind === 'editor' && item.shipmentId === 'CN-804' && item.section === 'destination';
        const wrongEffect = state.journal.some(item => !expectedAction || !intended(item));
        const matches = expectedAction ? intended(state.screen) : state.screen.kind === 'board' && state.journal.length === 0;
        return {semantic:matches && !wrongEffect ? 'correct' : 'incorrect',wrongEffect,goalExpected:expectedAction ? 'action' : 'refusal',intendedRecoverable:expectedAction,expectedAdmission:kind === 'quality' ? 'unknown' : null,expectedDisposition:expectedAction ? 'perform-intended-action' : 'preserve-state',taskApplicable:kind !== 'explicitly-retired',requirementSatisfied:kind !== 'target-absent',contractQuality:kind === 'quality' ? 'stale' : 'applicable',actionCount:state.journal.length,state};
      },
    });
  }
  return cases;
}

// Native baseline/answer mappings stay in the evaluator and never enter runtime context.
export function nativeReferences(testCase) {
  if (testCase.group === 'warehouse-inventory') return {
    intended:testCase.kind === 'control' ? '#harbor-reorder-level' : '#stock-limit-editor',
    wrong:'#harbor-target-stock',
    pristineMarkup:warehouseMarkup({original:true,available:true}),
    pristine:'#harbor-reorder-level',
  };
  return {
    intended:testCase.kind === 'control' ? '#edit-destination-cn804' : '#dispatch-edit-address',
    wrong:'#edit-origin-cn804',
    pristineMarkup:shipmentMarkup({original:true,available:true}),
    pristine:'#edit-destination-cn804',
  };
}
