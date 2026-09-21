import test from 'node:test';
import assert from 'node:assert/strict';
import {resourceTotals,summarizeRows,reassessRecord,htmlHasTarget,phaseCompletionViolations} from './analyze.mjs';

const price={inputUsdPerMillion:0.15,outputUsdPerMillion:0.6};
const known={usage:{inputTokens:210,outputTokens:5},actualCostUsd:0.0000345,transportAttempted:true,reservedUsd:0.0003378};
const unknown={usage:null,actualCostUsd:null,transportAttempted:true,reservedUsd:0.00149685};

test('unknown historical usage remains null in combined effort while preserving known subtotals',()=>{
  const result=resourceTotals([unknown,known],price);
  assert.equal(result.requests,2);assert.equal(result.unknownUsageRequests,1);assert.equal(result.unknownCostRequests,1);
  assert.equal(result.inputTokens,null);assert.equal(result.outputTokens,null);assert.equal(result.costUsd,null);
  assert.equal(result.knownInputTokens,210);assert.equal(result.knownOutputTokens,5);assert.equal(result.knownCostUsd,0.0000345);
  assert(Math.abs(result.reservedUsd-0.00183465)<1e-12);
  assert.equal(resourceTotals([known],price).costUsd,0.0000345);
});

test('missing usage is not zero except when transport is explicitly unattempted',()=>{
  for(const request of [{},{usage:null,transportAttempted:null},{usage:{inputTokens:-1,outputTokens:2}}]) {
    assert.equal(resourceTotals([request],price).costUsd,null);
    assert.equal(resourceTotals([request],price).inputTokens,null);
  }
  const noAttempt=resourceTotals([{usage:null,transportAttempted:false,actualCostUsd:0}],price);
  assert.equal(noAttempt.costUsd,0);assert.equal(noAttempt.inputTokens,0);assert.equal(noAttempt.unknownCostRequests,0);
  assert.equal(resourceTotals([],price).costUsd,0);
});

test('arm summaries preserve planned unstarted denominator and null totals',()=>{
  const make=(id,category,resource)=>({id,category,recordPresent:category!=='unstarted',recordStatus:category==='unstarted'?'unstarted':'complete',firstCovered:category==='correct',anyCovered:category==='correct',rank:category==='correct'?1:null,...resource});
  const rows=[make('a','correct',resourceTotals([known],price)),make('b','infrastructure-failure',resourceTotals([unknown],price)),make('c','unstarted',resourceTotals([],price))];
  const result=summarizeRows(rows);
  assert.equal(result.n,3);assert.equal(result.correct,1);assert.equal(result.unstarted,1);assert.equal(result.completeRecords,2);
  assert.equal(result.requests,2);assert.equal(result.costUsd,null);assert.equal(result.knownCostUsd,0.0000345);
  assert.equal(result.correctWhenFirstCovered.denominator,1);assert.equal(result.correctWhenFirstCovered.correct,1);
});

test('independent warehouse oracle rejects wrong-before-correct history and altered non-target state',()=>{
  const fixture={family:'W',value:'731',owner:{key:'harbor'},owners:[{key:'harbor',reorderLevel:12,targetStock:80},{key:'other',reorderLevel:8,targetStock:80}]};
  const stored={harbor:{reorderLevel:731,targetStock:80},other:{reorderLevel:8,targetStock:80}};
  const correct={type:'input',warehouse:'harbor',field:'reorderLevel',value:731};
  const record={assessment:{state:{stored,draft:structuredClone(stored),history:[correct]}}};
  assert.deepEqual(reassessRecord(record,fixture),{semantic:'correct',wrongEffect:false,correctEffect:true});
  record.assessment.state.history.unshift({type:'input',warehouse:'other',field:'reorderLevel',value:731});
  assert.deepEqual(reassessRecord(record,fixture),{semantic:'incorrect',wrongEffect:true,correctEffect:true});
  record.assessment.state.history=[correct];record.assessment.state.stored.other.targetStock=99;
  assert.equal(reassessRecord(record,fixture).semantic,'incorrect');
});

test('independent shipment oracle rejects old wrong action despite correct final editor',()=>{
  const fixture={family:'S',owner:{shipmentId:'CN-804'},owners:[{shipmentId:'CN-804',origin:'North depot',destination:'18 Quay Street'}]};
  const goal={kind:'editor',shipmentId:'CN-804',section:'destination'};
  const state={shipments:fixture.owners,screen:goal,journal:[{...goal,section:'origin'},goal]};
  assert.deepEqual(reassessRecord({assessment:{state}},fixture),{semantic:'incorrect',wrongEffect:true,correctEffect:true});
});

test('HTML target coverage requires exact identity and a complete opening tag',()=>{
  const identity={id:'inventory-control-009',tag:'input',type:'number'};
  assert.equal(htmlHasTarget('<input id="inventory-control-009" type="number">',identity),true);
  assert.equal(htmlHasTarget('<input id="inventory-control-009" type="number"',identity),false);
  assert.equal(htmlHasTarget('<p>inventory-control-009</p>',identity),false);
  assert.equal(htmlHasTarget('<input id="inventory-control-0090" type="number">',identity),false);
  assert.equal(htmlHasTarget('<button id="inventory-control-009" type="number">',identity),false);
  assert.equal(htmlHasTarget('<input id="other" title="inventory-control-009" type="number">',identity),false);
  assert.equal(htmlHasTarget('<input id="inventory-control-009" title="a>b" type="number">',identity),true);
});


test('coherent unstarted or missing pilot records cannot pass phase acceptance',()=>{
  const complete={recordPresent:true,recordStatus:'complete',category:'correct'};
  const unstarted={recordPresent:false,recordStatus:'unstarted',category:'unstarted'};
  const completeCounts={complete:9,failed:0,started:0,unstarted:0};
  // Complete collection with refusals or method failures remains valid integrity
  // evidence; acceptance must not demand nine successful recoveries.
  const validRows=Array.from({length:9},(_,i)=>({...complete,category:i%2?'refusal':'execution-failure'}));
  assert.deepEqual(phaseCompletionViolations(9,completeCounts,validRows),[]);
  // Former false-PASS counterexample: internally coherent, empty ledger, all
  // nine scheduled slots unstarted and no records. This must block main freeze.
  assert(phaseCompletionViolations(9,{complete:0,failed:0,started:0,unstarted:9},Array.from({length:9},()=>({...unstarted}))).length>0);
  // A complete-looking index cannot hide a missing physical record.
  assert(phaseCompletionViolations(9,completeCounts,[...validRows.slice(0,8),unstarted]).length>0);
  // Nor can a truncated row array reduce the planned denominator.
  assert(phaseCompletionViolations(9,completeCounts,validRows.slice(0,8)).length>0);
});

test('failed and in-progress records remain retained but prevent phase acceptance',()=>{
  for(const status of ['failed','started']) {
    const rows=Array.from({length:9},(_,i)=>({recordPresent:true,recordStatus:i===0?status:'complete',category:i===0?'infrastructure-failure':'correct'}));
    const counts={complete:8,failed:0,started:0,unstarted:0,[status]:1};
    assert(phaseCompletionViolations(9,counts,rows).length>0);
    const summary=summarizeRows(rows);
    assert.equal(summary.n,9);assert.equal(summary['infrastructure-failure'],1);
  }
});
