import {test,expect} from '@playwright/test';
import {createHealingSession} from '../dist/index.js';
import type {Provider} from '../dist/index.js';

test('CTX-001/OBS later fill values are removed from earlier retained candidate and HTML evidence',async({page})=>{
  const value='Future sample & detail';
  await page.setContent('<main><p>Future sample &amp; detail</p><button id="continue" aria-label="Future sample &amp; detail">Continue</button><input id="actual"></main>');
  let calls=0;
  const provider:Provider={kind:'offline',async select(){calls++;return{output:JSON.stringify({selector:'#continue'}),usage:{inputTokens:1,outputTokens:1}};}};
  const session=createHealingSession(page,{config:{mode:'full',actionTimeoutMs:800,recoveryTimeoutMs:5000,providerTimeoutMs:1000},provider});
  await session.click('#missing',{description:'Continue'});
  const before=session.snapshot().events[0]!;
  expect(before.context?.candidates[0]?.features?.ariaLabel).toBe(value);
  expect(before.context?.cleanedDom).toContain('Future sample &amp; detail');
  await session.fill('#actual',value,{description:'Actual field'});
  const after=session.snapshot();
  expect(JSON.stringify(after)).not.toContain(value);
  expect(JSON.stringify(after)).not.toContain('Future sample &amp; detail');
  expect(after.events[0]!.context?.coverage).toEqual(before.context?.coverage);
  expect(after.events[0]!.attempts[0]!.inputSha256).toBe(before.attempts[0]!.inputSha256);
  expect(calls).toBe(1);
  await expect(page.locator('#actual')).toHaveValue(value);
});
