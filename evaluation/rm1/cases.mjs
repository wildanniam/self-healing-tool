import { isDeepStrictEqual } from 'node:util';
import { inspectDom } from '../../dist/dom-context.js';
import { renderedControlId, warehouseMarkup, shipmentMarkup } from './fixtures.mjs';

const counts = Object.freeze({U:8,D:16,L:80});
const mainLargePositions = Object.freeze({'W-A':8,'W-S':24,'S-A':48,'S-S':64});
const mainOwner = Object.freeze({W:{key:'harbor',title:'Harbor warehouse'},S:{key:'cn804',shipmentId:'CN-804'}});
const pilotOwner = Object.freeze({W:{key:'dockside',title:'Dockside warehouse'},S:{key:'px217',shipmentId:'PX-217'}});
const refs = new WeakMap();
const records = new WeakMap();

async function assertLocal(page) {
  const url = new URL(page.url());
  if (!['http:','https:'].includes(url.protocol) || !['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new Error('RM1 fixture requires a runner-provided loopback URL');
}

function ownersFor(family, count, owner, targetPosition, phase) {
  const owners = Array.from({length:count/2},(_,index) => family === 'W'
    ? {key:`${phase}-warehouse-${String(index+1).padStart(2,'0')}`,title:`Warehouse ${phase === 'pilot' ? 'P' : 'M'}${String(index+1).padStart(2,'0')}`,reorderLevel:8+index,targetStock:80+index}
    : {key:`${phase}-shipment-${String(index+1).padStart(2,'0')}`,shipmentId:`${phase === 'pilot' ? 'PD' : 'MD'}-${String(index+1).padStart(3,'0')}`,route:`Depot ${index+1} to district ${index+1}`,origin:`Depot ${index+1}`,destination:`${100+index} Market Street`});
  owners[targetPosition/2] = family === 'W' ? {...owner,reorderLevel:12,targetStock:80} : {...owner,route:'North depot to Seabrook',origin:'North depot',destination:'18 Quay Street'};
  return owners;
}

function buildCase({id,phase,family,mutation,profile,targetPosition}) {
  const expectedCandidateCount = counts[profile];
  const owner = (phase === 'pilot' ? pilotOwner : mainOwner)[family];
  const owners = ownersFor(family,expectedCandidateCount,owner,targetPosition,phase);
  const options = {mutation,profile,pristine:false};
  const renderer = family === 'W' ? warehouseMarkup : shipmentMarkup;
  const setup = async page => {await assertLocal(page);await page.setContent(renderer(owners,options),{waitUntil:'load'});};
  const setupPristine = async page => {await assertLocal(page);await page.setContent(renderer(owners,{...options,pristine:true}),{waitUntil:'load'});};
  const field = family === 'W' ? 'reorder_level' : 'destination';
  const oldId = renderedControlId(family,owner,field,targetPosition,{...options,pristine:true});
  const originalSelector = mutation === 'A' ? `#${oldId}` : family === 'W'
    ? `fieldset:has(> legend:text-is(${JSON.stringify(owner.title)})) > div.fields > label > input[name="reorder_level"]`
    : `article:has(> h2:text-is(${JSON.stringify('Shipment '+owner.shipmentId)})) > div.actions > button[name="destination"]`;
  const intended = '#'+renderedControlId(family,owner,field,targetPosition,options);
  // Wrong same-field action on another real entity; no mutation changes its handler.
  const wrongPosition = targetPosition === 0 ? 2 : 0;
  const wrongOwner = owners[wrongPosition/2];
  const wrong = '#'+renderedControlId(family,wrongOwner,field,wrongPosition,options);
  const wrongField = '#'+renderedControlId(family,owner,family === 'W' ? 'target_stock' : 'origin',targetPosition+1,options);
  const item = {
    id,phase,family,group:family === 'W' ? 'warehouse-inventory' : 'shipment-destination',mutation,
    kind:mutation === 'A' ? 'attribute-drift' : 'structure-drift',profile,expectedCandidateCount,targetCandidatePosition:targetPosition,targetCandidatePositionBasis:'zero-based-eligible-order',
    action:family === 'W' ? 'fill' : 'click',originalSelector,
    ...(family === 'W' ? {value:'731',fillValue:'731'} : {}),
    task:{description:family === 'W'
      ? `Set the reorder level for ${owner.title} to 731. Preserve target stock and every other warehouse setting.`
      : `Open the destination editor for shipment ${owner.shipmentId}. Do not open an origin editor or another shipment.`},
    setup,reset:setup,setupPristine,
    ...(family === 'W' ? {afterAction:async (page,event) => {
      if (event && event.actionExecuted !== true) return;
      await page.getByRole('button',{name:'Save warehouse settings',exact:true}).click();
    }} : {}),
    assess:async page => {
      if (family === 'W') {
        const state = await page.evaluate(()=>window.warehouseApp.snapshot());
        const initial = Object.fromEntries(owners.map(row=>[row.key,{reorderLevel:row.reorderLevel,targetStock:row.targetStock}]));
        const expected = structuredClone(initial);expected[owner.key].reorderLevel=731;
        const inputs = state.history.filter(event=>event.type==='input');
        const wrongEffects = inputs.filter(event=>event.warehouse!==owner.key || event.field!=='reorderLevel' || event.value!==731);
        const stateMatches = isDeepStrictEqual(state.stored,expected) && isDeepStrictEqual(state.draft,expected);
        const correctEffect = stateMatches && inputs.some(event=>event.warehouse===owner.key && event.field==='reorderLevel' && event.value===731);
        return {semantic:correctEffect && wrongEffects.length===0 ? 'correct':'incorrect',correctEffect,wrongEffect:wrongEffects.length>0,wrongEffects,goalExpected:'action',intendedRecoverable:true,inputCount:inputs.length,actionCount:inputs.length,stateMatches,expectedState:{stored:expected,draft:expected},initialState:initial,state};
      }
      const state = await page.evaluate(()=>window.dispatchBoard.snapshot());
      const expectedScreen = {kind:'editor',shipmentId:owner.shipmentId,section:'destination'};
      const expectedShipments = owners.map(({shipmentId,origin,destination})=>({shipmentId,origin,destination}));
      const intendedAction = event=>isDeepStrictEqual(event,expectedScreen);
      const wrongEffects = state.journal.filter(event=>!intendedAction(event));
      const stateMatches = isDeepStrictEqual(state.screen,expectedScreen) && isDeepStrictEqual(state.shipments,expectedShipments);
      const correctEffect = stateMatches && state.journal.some(intendedAction);
      return {semantic:correctEffect && wrongEffects.length===0 ? 'correct':'incorrect',correctEffect,wrongEffect:wrongEffects.length>0,wrongEffects,goalExpected:'action',intendedRecoverable:true,actionCount:state.journal.length,stateMatches,expectedState:{screen:expectedScreen,shipments:expectedShipments},state};
    },
  };
  refs.set(item,Object.freeze({intended,wrong,wrongField,pristine:originalSelector}));
  records.set(item,Object.freeze({id,phase,family,group:item.group,mutation,profile,expectedCandidateCount,targetCandidatePosition:targetPosition,targetCandidatePositionBasis:item.targetCandidatePositionBasis,owner:structuredClone(owner),owners:structuredClone(owners),action:item.action,originalSelector,...(item.value ? {value:item.value} : {}),task:structuredClone(item.task),native:refs.get(item),lineage:'New controlled variants of the two existing synthetic mini-application families; not independent applications or unseen-app validation.'}));
  return Object.freeze(item);
}

/** Main is the default; pilot conditions are never included in main denominators. */
export function createCases({phase='main'}={}) {
  if (!['main','pilot','all'].includes(phase)) throw new Error('Unknown RM1 phase');
  const cases=[];
  if (phase!=='pilot') for (const profile of ['U','D','L']) for (const family of ['W','S']) for (const mutation of ['A','S']) {
    const targetPosition=profile==='L' ? mainLargePositions[`${family}-${mutation}`] : profile==='D' ? (family==='W'?10:6) : (family==='W'?2:4);
    cases.push(buildCase({id:`${family}-${mutation}-${profile}`,phase:'main',family,mutation,profile,targetPosition}));
  }
  if (phase!=='main') {
    cases.push(buildCase({id:'P-W-A-U',phase:'pilot',family:'W',mutation:'A',profile:'U',targetPosition:4}));
    cases.push(buildCase({id:'P-S-S-D',phase:'pilot',family:'S',mutation:'S',profile:'D',targetPosition:10}));
    cases.push(buildCase({id:'P-W-S-L',phase:'pilot',family:'W',mutation:'S',profile:'L',targetPosition:40}));
  }
  return cases;
}

export function nativeReferences(item) {
  if (!refs.has(item)) throw new Error('Not an RM1 case created by createCases');
  return structuredClone(refs.get(item));
}

/** Evaluator-only metadata: never spread this object into a model task or request. */
export function fixtureRecord(item) {
  if (!records.has(item)) throw new Error('Not an RM1 case created by createCases');
  return structuredClone(records.get(item));
}

/** Actual-node equality maps gold into extractor order without altering DOM or payload. */
export async function inspectTargetMapping(page,item) {
  const target=await page.locator(nativeReferences(item).intended).elementHandle();
  if (!target) throw new Error(`Missing evaluator target for ${item.id}`);
  const snapshot=await page.locator('html').evaluateHandle(inspectDom,{action:item.action});
  try {
    const nodes=await snapshot.getProperty('nodes');
    try {
      const targetOrder=await nodes.evaluate((nodes,target)=>nodes.indexOf(target),target);
      const extracted=await snapshot.evaluate(({candidates,scanned,scanTruncated,ineligible})=>({candidateOrders:candidates.map(candidate=>candidate.order),scanned,scanTruncated,ineligible}));
      const targetIdentity=await target.evaluate(element=>({tag:element.tagName.toLowerCase(),attributes:Object.fromEntries([...element.attributes].map(attribute=>[attribute.name,attribute.value])),outerHTML:element.outerHTML}));
      return {targetOrder,targetCandidateIndex:extracted.candidateOrders.indexOf(targetOrder),targetExtracted:extracted.candidateOrders.includes(targetOrder),eligibleCount:extracted.candidateOrders.length,...extracted,targetIdentity};
    } finally {await nodes.dispose();}
  } finally {await snapshot.dispose();await target.dispose();}
}
