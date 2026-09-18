import assert from 'node:assert/strict';
import test from 'node:test';
import { createCases, fixtureRecord, nativeReferences } from '../evaluation/rm1/cases.mjs';
import { warehouseMarkup, shipmentMarkup } from '../evaluation/rm1/fixtures.mjs';

test('RM1 manifest separates pilot and main, freezes crowd positions, and contains no answer in task input',()=>{
  const main=createCases();const pilot=createCases({phase:'pilot'});
  assert.equal(main.length,12);assert.equal(pilot.length,3);
  assert.equal(new Set([...main,...pilot].map(item=>item.id)).size,15);
  assert.deepEqual(main.filter(item=>item.profile==='L').map(item=>[item.id,item.targetCandidatePosition]),[['W-A-L',8],['W-S-L',24],['S-A-L',48],['S-S-L',64]]);
  for(const item of [...main,...pilot]) {
    const native=nativeReferences(item);
    assert.notEqual(native.intended,native.wrong);assert.notEqual(native.intended,native.wrongField);
    assert.equal(item.task.description.includes(native.intended),false);
    assert.equal(item.task.description.includes(item.id),false);
    if(item.action==='fill')assert.equal(item.value,'731');
    const record=fixtureRecord(item);
    const renderer=item.family==='W'?warehouseMarkup:shipmentMarkup;
    const html=renderer(record.owners,{profile:item.profile,mutation:item.mutation,pristine:false});
    assert.equal(html.includes(item.id),false);
    assert.equal(html.includes('data-oracle'),false);
    // Filled values are omitted by runtime privacy. They must not accidentally
    // redact normal locator IDs, owners, or initial application values.
    if(item.action==='fill')assert.equal(html.includes(item.value),false);
  }
  assert.throws(()=>createCases({phase:'heldout'}),/Unknown RM1 phase/);
});

test('returned evaluator metadata cannot mutate case or renderer state',()=>{
  const item=createCases()[0];
  const before=fixtureRecord(item);
  const copy=fixtureRecord(item);copy.owners[0].key='injected';copy.task.description='injected';
  const native=nativeReferences(item);native.intended='#injected';
  assert.deepEqual(fixtureRecord(item),before);
  assert.notEqual(nativeReferences(item).intended,'#injected');
});
