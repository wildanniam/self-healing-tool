import {test,expect} from '@playwright/test';
import {collectContext,fitContext} from '../dist/context.js';
import {rankThesis} from '../dist/ranking.js';
import {serializeRequest} from '../dist/provider.js';
import {createHealingSession,validateConfig,HealingFailure} from '../dist/index.js';
import type {Context,Provider} from '../dist/index.js';
const config=validateConfig({mode:'full',actionTimeoutMs:100,providerTimeoutMs:1000,recoveryTimeoutMs:5000});

test('D25 old locator and stable attribute signals are restored with explicit weights',async({page})=>{
 await page.setContent('<label>Value<input name="invoice-total"></label><label>Value<input name="delivery-date"></label>');
 const c=await collectContext(page,'fill',{description:'Fill value'},config,[], '[name="invoice-total-old"]');
 expect(c.candidates[0]!.features?.name).toBe('invoice-total');
 expect(c.failure?.originalSelector).toBe('[name="invoice-total-old"]');
 expect(c.candidates[0]!.suggestedLocators).toContain('[name="invoice-total"]');
 expect(JSON.stringify(c.candidates)).not.toContain('nth-of-type');
 const base={selector:'#x',tag:'input',type:'text',label:'',container:'',containerKind:'none',order:0,score:0,features:{id:'invoice',visible:true}};
 const score=rankThesis([base],'fill',{description:''},'#invoice')[0]!.score;
 expect(score).toBe(77); // old 15 + tag 5 + stable ID 4 + visible 3 + exact ID 50
 const hidden=rankThesis([{...base,features:{...base.features,visible:false,disabled:true}}],'fill',{description:''},'#invoice')[0]!.score;
 expect(hidden).toBe(34);
});

test('D25 cleaned sparse fallback and candidate path exclude noise, values and oracle metadata',async({page})=>{
 await page.setContent('<script>window.secret="SCRIPT_SECRET"</script><style>STYLE_SECRET</style><svg><text>SVG_SECRET</text></svg><div data-oracle>ORACLE_SECRET</div><label>Account<input name="account" value="FORM_SECRET" data-answer-selector="ANSWER_SECRET"></label><textarea>TEXTAREA_SECRET</textarea><article contenteditable="true">EDITABLE_SECRET</article><p hidden>HIDDEN_SECRET</p><p>person@example.com token=TOKEN_SECRET</p>');
 const c=await collectContext(page,'fill',{description:'Account'},config,[],'[name="old-account"]');
 expect(c.cleanedDom).toBeDefined();expect(c.cleanedDom).toContain('Account');
 const body=serializeRequest(c,config);
 for(const secret of ['SCRIPT_SECRET','STYLE_SECRET','SVG_SECRET','ORACLE_SECRET','FORM_SECRET','TEXTAREA_SECRET','EDITABLE_SECRET','HIDDEN_SECRET','ANSWER_SECRET','person@example.com','TOKEN_SECRET'])expect(body).not.toContain(secret);
 await page.setContent('<main><h1>No controls</h1><script>RAW_SECRET</script></main>');
 const empty=await collectContext(page,'fill',{description:'Account'},config,[],'#old');
 expect(empty.candidates).toHaveLength(0);expect(empty.cleanedDom).toContain('No controls');expect(empty.cleanedDom).not.toContain('RAW_SECRET');
});

test('D25 row identity and duplicate penalty remain available without positional locators',async({page})=>{
 await page.setContent('<table><tr><td>Mira</td><td><button>Open</button></td></tr><tr><td>Niko</td><td><button>Open</button></td></tr></table>');
 const c=await collectContext(page,'click',{description:'Open',scope:'Niko'},config,[],'#old');
 expect(c.candidates[0]!.features?.rowContext).toContain('Niko');expect(c.candidates[0]!.duplicateCount).toBeGreaterThan(1);
 await page.locator(c.candidates[0]!.selector).click();
 expect(await page.locator(c.candidates[0]!.selector).count()).toBe(1);
});

test('D25 rejected count/reason reaches the next actual provider input within limits',async({page})=>{
 await page.setContent('<label>Name<input id="name"></label><label>Code<input id="code"></label>');
 const seen:Context[]=[];const provider:Provider={kind:'offline',async select(c){seen.push(structuredClone(c));return {output:JSON.stringify({selector:seen.length===1?'input':'#code'}),usage:null};}};
 const session=createHealingSession(page,{config,provider});
 const event=await session.fill('#old-code','test-value',{description:'Code'});
 expect(event.actionExecuted).toBe(true);expect(seen).toHaveLength(2);
 expect(seen[1]!.feedback).toContainEqual({selector:'input',count:2,reason:'ambiguous'});
 expect(event.attempts[0]!.validations).toContainEqual({selector:'input',count:2,reason:'ambiguous'});
 expect(event.attempts.every(a=>a.inputSha256?.length===64)).toBe(true);
 for(const c of seen){expect(serializeRequest(c,config).length).toBe(c.coverage.payloadChars);expect(c.coverage.payloadChars).toBeLessThanOrEqual(config.payloadMaxChars);}
 await expect(page.locator('#code')).toHaveValue('test-value');await expect(page.locator('#name')).toHaveValue('');
});

test('D25 unsupported text pseudo is normalized and live validated before clicking',async({page})=>{
 await page.setContent('<button>Continue</button><output></output><script>document.querySelector("button").onclick=()=>document.querySelector("output").textContent="done"</script>');
 const provider:Provider={kind:'offline',async select(){return {output:JSON.stringify({selector:'button:contains("Continue")'}),usage:null};}};
 const s=createHealingSession(page,{config,provider});const e=await s.click('#old',{description:'Continue'});
 expect(e.attempts[0]!.proposedSelector).toBe('button:contains("Continue")');expect(e.attempts[0]!.selector).toBe('button:text-is("Continue")');
 expect(e.attempts[0]!.validations?.length).toBeGreaterThan(0);await expect(page.locator('output')).toHaveText('done');
});

test('D25 large noisy page is bounded after cleaning and feedback cannot bypass the request cap',async({page})=>{
 await page.setContent('<script>'+ 'NOISE'.repeat(20000)+'</script>'+Array.from({length:70},(_,i)=>`<label>Field ${i}<input name="field-${i}"></label>`).join(''));
 const small=validateConfig({...config,domMaxChars:1200,payloadMaxChars:3000,maxCandidates:20});
 const c=await collectContext(page,'fill',{description:'Field 69'},small,[],'[name="field-69-old"]');
 expect(c.coverage.omitted).toBeGreaterThan(0);expect(c.coverage.payloadChars).toBeLessThanOrEqual(3000);expect(c.coverage.domChars).toBeLessThanOrEqual(1200);expect(serializeRequest(c,small)).not.toContain('NOISE');
 c.feedback=[{selector:'x'.repeat(4000),count:0,reason:'no_match'}];expect(()=>fitContext(c,small)).toThrow('context_budget_exhausted');
});

test('D25 positional output is not executed and provider errors remain fail-stop',async({page})=>{
 await page.setContent('<button>Go</button>');
 const s=createHealingSession(page,{config:{...config,maxAttempts:1},provider:{kind:'offline',async select(){return {output:JSON.stringify({selector:'button:nth-of-type(1)'}),usage:null};}}});
 await expect(s.click('#old',{description:'Go'})).rejects.toBeInstanceOf(HealingFailure);
 expect(s.snapshot().events[0]!.attempts[0]!.validations?.[0]!.reason).toBe('unsupported_positional_selector');
});


test('D29 explicitly supersedes D25 identical-null retries with one bounded observation refresh',async({page})=>{
 await page.setContent('<label>Name<input id="name"></label>');
 let calls=0;const provider:Provider={kind:'offline',async select(){calls++;return {output:JSON.stringify({selector:calls===1?null:'#name'}),usage:null};}};
 const session=createHealingSession(page,{config,provider});
 await expect(session.fill('#old','value',{description:'Name'})).rejects.toBeInstanceOf(HealingFailure);
 const event=session.snapshot().events[0]!;
 expect(calls).toBe(1);expect(event.attempts).toHaveLength(1);expect(event.attempts[0]!.failure).toBe('abstained');
 expect(event.attempts[0]!.observationRefresh).toMatchObject({policy:'null-refresh-once-v1',outcome:'unchanged'});
 expect(event.stopReason).toBe('abstained');await expect(page.locator('#name')).toHaveValue('');
});
