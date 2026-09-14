import { test, expect } from '@playwright/test';
import { createHealingSession, HealingFailure, reportView, summarize, serializeRequest, validateConfig } from '../dist/index.js';
import { collectContext } from '../dist/context.js';
import type { TargetContract, TargetSpecOptions, Context, Provider } from '../dist/index.js';

const config=validateConfig({mode:'full',actionTimeoutMs:700,recoveryTimeoutMs:8000,providerTimeoutMs:2000});
const contract=(extra:Partial<TargetContract>={}):TargetContract=>({schemaVersion:1,requirementId:'REQ-CONTACT',revision:'r1',intent:'Update billing contact',action:'fill',status:'active',allOf:[{sources:['label'],anyOf:['Billing contact']}],...extra});
const html='<label>Billing contact<input id="billing"></label><label>Shipping contact<input id="shipping"></label>';
function fake(selector:string, before?:(context:Readonly<Context>)=>Promise<void>){
  const inputs:string[]=[];
  const provider:Provider={kind:'offline',async select(c){inputs.push(serializeRequest(c,config));await before?.(c);return {output:JSON.stringify({selector}),usage:null};}};
  return {provider,inputs};
}

test('INT-006 invalid contract fails before even an otherwise successful original action', async({page})=>{
  await page.setContent(html);
  expect(()=>createHealingSession(page,{config,provider:fake('#billing').provider,targetSpec:{mode:'enforce',contract:{...contract(),allOf:[]} as TargetContract,expectedRevision:'r1'}})).toThrow();
  await expect(page.locator('#billing')).toHaveValue('');
});

test('INT-006 original success stays outside recovery admission even with retired contract',async({page})=>{
  await page.setContent(html);const f=fake('#billing');
  const session=createHealingSession(page,{config,provider:f.provider,targetSpec:{mode:'enforce',contract:contract({status:'retired',allOf:[]}),expectedRevision:'r1'}});
  const event=await session.fill('#billing','Entered value',{description:'Billing contact'});
  expect(event.stopReason).toBe('original-success');expect(event.recoveryTriggered).toBe(false);expect(event.targetSpec?.decision).toBeNull();expect(f.inputs).toHaveLength(0);
});

test('CTX-006 B/C receive identical payload while only C blocks a structurally valid wrong target',async({page})=>{
  const inputs:string[]=[];
  for(const mode of ['context','enforce'] as const){
    await page.setContent(html);const f=fake('#shipping');
    const session=createHealingSession(page,{config,provider:f.provider,targetSpec:{mode,contract:contract(),expectedRevision:'r1'}});
    const action=session.fill('#old-billing','New value',{description:'Billing contact'});
    if(mode==='enforce')await expect(action).rejects.toBeInstanceOf(HealingFailure);else await action;
    expect(f.inputs).toHaveLength(1);inputs.push(f.inputs[0]!);
    const event=session.snapshot().events[0]!;
    expect(event.attempts).toHaveLength(1);expect(event.attempts[0]!.candidateAccepted).toBe(true);
    await expect(page.locator('#shipping')).toHaveValue(mode==='context'?'New value':'');
    if(mode==='enforce'){
      expect(event.stopReason).toBe('spec-unknown');expect(event.failure).toBe('spec');expect(event.targetSpec?.decision?.observed).toEqual({label:'Shipping contact'});
      expect(summarize(session.snapshot()).acceptedErrorRisk).toBeNull();
    }
  }
  expect(inputs[0]).toBe(inputs[1]);
});

test('HEAL-008 accepted recovery still needs independent assessment and reports bounded fresh evidence',async({page})=>{
  await page.setContent(html);const f=fake('#billing');
  const session=createHealingSession(page,{config,provider:f.provider,targetSpec:{mode:'enforce',contract:contract(),expectedRevision:'r1'}});
  const event=await session.fill('#old','New value',{description:'Billing contact'});
  expect(event.semantic).toBe('unassessed');expect(event.targetSpec?.decision?.outcome).toBe('accepted');
  expect(summarize(session.snapshot()).acceptedErrorRisk).toBeNull();
  session.assess({eventId:event.id,semantic:'incorrect',wrongEffect:true});
  expect(summarize(session.snapshot()).acceptedErrorRisk).toBe(1);
  const view=reportView(session.snapshot());expect(view.events[0]!.targetSpec?.decision?.observed).toEqual({label:'Billing contact'});
  expect(JSON.stringify(view)).not.toContain('New value');expect('context' in view.events[0]!).toBe(false);
});

test('HEAL-008 admission reads the chosen fresh node, not a matching earlier ranked candidate',async({page})=>{
  await page.setContent(html);const f=fake('#billing',async()=>{await page.locator('#billing').evaluate(e=>e.closest('label')!.firstChild!.textContent='Shipping contact');});
  const session=createHealingSession(page,{config,provider:f.provider,targetSpec:{mode:'enforce',contract:contract(),expectedRevision:'r1'}});
  await expect(session.fill('#old','Never',{description:'Billing contact'})).rejects.toBeInstanceOf(HealingFailure);
  const event=session.snapshot().events[0]!;
  expect(event.context?.candidates.find(c=>c.selector==='#billing')?.label).toBe('Billing contact');
  expect(event.targetSpec?.decision?.observed).toEqual({label:'Shipping contact'});expect(f.inputs).toHaveLength(1);
  await expect(page.locator('#billing')).toHaveValue('');
});

for(const item of [
  {contract:null,revision:'r1',reason:'spec_missing'},
  {contract:contract({status:'retired',allOf:[]}),revision:'r1',reason:'spec_retired'},
  {contract:contract({status:'unknown',allOf:[]}),revision:'r1',reason:'spec_unknown'},
  {contract:contract(),revision:'r2',reason:'spec_revision_mismatch'},
  {contract:contract({action:'click'}),revision:'r1',reason:'spec_action_mismatch'},
])test(`HEAL-008 ${item.reason} is terminal without action or guessing`,async({page})=>{
  await page.setContent(html);const f=fake('#billing');
  const targetSpec:TargetSpecOptions={mode:'enforce',contract:item.contract,expectedRevision:item.revision};
  const session=createHealingSession(page,{config,provider:f.provider,targetSpec});
  await expect(session.fill('#old','Never',{description:'Billing contact'})).rejects.toBeInstanceOf(HealingFailure);
  expect(f.inputs).toHaveLength(1);const event=session.snapshot().events[0]!;
  expect(event.targetSpec?.decision?.reason).toBe(item.reason);expect(event.stopReason).toBe(item.reason==='spec_retired'?'spec-refused':'spec-unknown');
  expect(event.attempts).toHaveLength(1);await expect(page.locator('#billing')).toHaveValue('');
});

test('CTX-006 destination evidence is pathname-only, spec-only, and available to the gate',async({page})=>{
  await page.setContent('<a id="nav" href="https://private.example/billing/manage?token=SECRET#PRIVATE">Manage</a><form action="https://private.example/shipping/update?key=SECRET"><button id="submit">Save</button></form>');
  await page.locator('#nav').evaluate(e=>e.addEventListener('click',event=>event.preventDefault()));
  const plain=await collectContext(page,'click',{description:'Manage'},config,[],'#old');
  expect(plain.candidates.every(c=>c.features?.href===undefined&&c.features?.formAction===undefined)).toBe(true);
  const c=contract({action:'click',intent:'Manage billing',allOf:[{sources:['href'],anyOf:['billing manage']}]});
  const f=fake('#nav');const session=createHealingSession(page,{config,provider:f.provider,targetSpec:{mode:'enforce',contract:c,expectedRevision:'r1'}});
  const event=await session.click('#old',{description:'Manage'});
  expect(event.targetSpec?.decision?.observed).toEqual({href:'/billing/manage'});
  expect(event.context?.candidates.find(c=>c.selector==='#submit')?.features?.formAction).toBe('/shipping/update');
  for(const secret of ['private.example','SECRET','PRIVATE'])expect(f.inputs[0]).not.toContain(secret);
});

test('CTX-006 omitted fill value cannot become spec evidence or leak through payload or report',async({page})=>{
  await page.setContent(html);const f=fake('#billing');
  const session=createHealingSession(page,{config,provider:f.provider,targetSpec:{mode:'enforce',contract:contract(),expectedRevision:'r1'}});
  await expect(session.fill('#old','Billing contact',{description:'Billing contact'})).rejects.toBeInstanceOf(HealingFailure);
  expect(session.snapshot().events[0]?.targetSpec?.decision?.reason).toBe('spec_sanitized');
  expect(f.inputs[0]).not.toContain('Billing contact');expect(JSON.stringify(session.snapshot())).not.toContain('Billing contact');expect(JSON.stringify(reportView(session.snapshot()))).not.toContain('Billing contact');
});

test('CTX-006 contract overhead stays under the same payload cap or fails before provider invocation',async({page})=>{
  await page.setContent(html);const f=fake('#billing');
  const large=contract({allOf:Array.from({length:12},()=>({sources:['label'],anyOf:['a'.repeat(160)]}))});
  const session=createHealingSession(page,{config:{...config,domMaxChars:1000,payloadMaxChars:2000},provider:f.provider,targetSpec:{mode:'enforce',contract:large,expectedRevision:'r1'}});
  await expect(session.fill('#old','Never',{description:'Billing contact'})).rejects.toBeInstanceOf(HealingFailure);
  expect(f.inputs).toHaveLength(0);expect(session.snapshot().events[0]?.stopReason).toBe('context-failure');
});
