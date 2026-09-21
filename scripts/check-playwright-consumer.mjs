import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const directory=mkdtempSync(join(tmpdir(),'healing-playwright-consumer-'));
const env={...Object.fromEntries(['PATH','HOME','TMPDIR','PLAYWRIGHT_BROWSERS_PATH','npm_config_cache'].filter(k=>process.env[k]).map(k=>[k,process.env[k]])),CI:'1'};
try {
 const packed=JSON.parse(execFileSync('npm',['pack','--json','--ignore-scripts','--pack-destination',directory],{cwd:root,env,encoding:'utf8'}))[0];
 const consumer=join(directory,'consumer');mkdirSync(consumer);
 writeFileSync(join(consumer,'package.json'),JSON.stringify({name:'playwright-consumer-check',version:'1.0.0',private:true,type:'module'}));
 execFileSync('npm',['install','--prefer-offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',join(directory,packed.filename),'playwright@1.62.1','@playwright/test@1.62.1'],{cwd:consumer,env,stdio:'pipe'});
 writeFileSync(join(consumer,'playwright.config.ts'),`import {defineConfig} from '@playwright/test';
export default defineConfig({projects:[{name:'chromium'}],preserveOutput:'failures-only',testDir:'.',testMatch:'flow.spec.ts',workers:2,fullyParallel:true,retries:1,timeout:10000,reporter:[['json',{outputFile:'playwright-results.json'}],['self-healing-tool/reporter',{outputDir:'reports',open:'always'}]]});`);
 writeFileSync(join(consumer,'flow.spec.ts'),`import {test,expect} from 'self-healing-tool/playwright';
import {validateConfig,serializeRequest,ProviderError} from 'self-healing-tool';
import {writeFile} from 'node:fs/promises';
const config=validateConfig({mode:'full',actionTimeoutMs:100,providerTimeoutMs:1000,recoveryTimeoutMs:4000});
const provider={kind:'offline' as const,async select(context,signal,audit){audit?.request(serializeRequest(context,config));return {output:JSON.stringify({selector:'#current'}),usage:null};}};
test.use({healingOptions:{config,provider,audit:true}});
const content='<label>Display name<input id="current"></label>';
test('normal action',async({page,healing})=>{await page.setContent(content);await healing.fill('#current','normal',{description:'Display name'});await expect(page.locator('#current')).toHaveValue('normal');});
test('recovered action',async({page,healing})=>{await page.setContent(content);await healing.fill('#old','recovered',{description:'Display name'});await expect(page.locator('#current')).toHaveValue('recovered');});
test('assertion failure after recovery',async({page,healing})=>{await page.setContent(content);await healing.fill('#old','value',{description:'Display name'});expect('actual','ORIGINAL_ASSERTION_AFTER_RECOVERY').toBe('wrong');});
test('retry retains both attempts',async({page,healing},info)=>{await page.setContent(content);await healing.fill('#old','value',{description:'Display name'});expect(info.retry,'FIRST_RETRY_FAILS').toBe(1);});
test('writer failure preserves assertion',async({page,healing},info)=>{await page.setContent(content);await healing.fill('#current','value',{description:'Display name'});await writeFile(info.outputPath('healing'),'file blocks report directory');expect(1,'ORIGINAL_ASSERTION_WRITER_FAILURE').toBe(2);});
test('writer failure leaves passing test intact',async({page,healing},info)=>{await page.setContent(content);await healing.fill('#current','value',{description:'Display name'});await writeFile(info.outputPath('healing'),'file blocks report directory');});
test('attachment failure preserves assertion',async({page,healing},info)=>{await page.setContent(content);await healing.fill('#current','value',{description:'Display name'});info.attach=async()=>{throw new Error('SIMULATED_ATTACHMENT_FAILURE');};expect(1,'ORIGINAL_ASSERTION_ATTACHMENT_FAILURE').toBe(2);});
test('timeout keeps partial report',async({page,healing})=>{test.setTimeout(800);await page.setContent(content);await healing.fill('#current','value',{description:'Display name'});await new Promise(resolve=>setTimeout(resolve,2000));});
test.skip('skipped test',async()=>{});
test.describe('audit off',()=>{test.use({healingOptions:{config,provider,audit:false}});test('recovered without payload capture',async({page,healing})=>{await page.setContent(content);await healing.fill('#old','value',{description:'Display name'});});});
test.describe('refusal',()=>{test.use({healingOptions:{config,provider:{kind:'offline',async select(){return {output:'{"selector":null}',usage:null};}},audit:true}});test('null stops recovery',async({page,healing})=>{await page.setContent(content);await healing.fill('#old','value',{description:'Display name'});});});
test.describe('provider failure',()=>{test.use({healingOptions:{config,provider:{kind:'offline',async select(){throw new ProviderError('http',true);}},audit:true}});test('provider stops recovery',async({page,healing})=>{await page.setContent(content);await healing.fill('#old','value',{description:'Display name'});});});
`);
 const run=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test'],{cwd:consumer,env,encoding:'utf8',timeout:120000});
 assert.equal(run.status,1,run.stderr+run.stdout); // Intentional assertion/provider failures.
 assert(existsSync(join(consumer,'reports')),run.stderr+run.stdout);
 const runs=readdirSync(join(consumer,'reports'));assert.equal(runs.length,1);
 const reportDirectory=join(consumer,'reports',runs[0]);const results=JSON.parse(readFileSync(join(reportDirectory,'results.json'),'utf8'));
 const find=title=>results.rows.filter(r=>r.title.includes(title));
 assert.equal(new Set(results.rows.map(r=>r.testId)).size,12);
 assert.equal(find('retry retains both').length,2);assert(find('retry retains both').every(r=>r.outcome==='flaky'));
 const normal=find('normal action')[0];assert.equal(normal.status,'passed');assert.equal(normal.project,'chromium');assert(normal.report);
 assert.equal(find('writer failure leaves')[0].status,'passed');assert.equal(find('writer failure leaves')[0].report,null);
 assert(find('writer failure preserves').every(r=>r.status==='failed'&&r.reportError.includes('EEXIST')));
 assert.equal(find('skipped test')[0].status,'skipped');assert.equal(find('skipped test')[0].report,null);
 for(const row of results.rows.filter(r=>r.report)) {
  const summary=JSON.parse(readFileSync(join(reportDirectory,row.report.replace('report.html','report.json')),'utf8'));
  assert(summary.events.every(e=>e.semantic==='unassessed'));assert.equal(summary.summary.correctRepairs,0);
  if(row.title.includes('normal action')){assert.equal(summary.events[0].recoveryTriggered,false);assert.equal(summary.events[0].attempts.length,0);}
  if(row.title.includes('null stops'))assert.equal(summary.events[0].failure,'abstained');
  if(row.title.includes('provider stops'))assert.equal(summary.events[0].failure,'provider');
 }
 assert(find('attachment failure preserves').every(r=>r.status==='failed'&&!r.report));
 assert(find('timeout keeps').every(r=>r.status==='timedOut'&&r.report));
 const pw=JSON.parse(readFileSync(join(consumer,'playwright-results.json'),'utf8'));
 function specs(suites){return suites.flatMap(s=>[...(s.specs??[]),...specs(s.suites??[])]);}
 const failures=specs(pw.suites).find(s=>s.title==='writer failure preserves assertion').tests[0].results;
 assert(failures.every(r=>r.errors.some(e=>e.message.includes('ORIGINAL_ASSERTION_WRITER_FAILURE'))));
 const attachmentFailures=specs(pw.suites).find(s=>s.title==='attachment failure preserves assertion').tests[0].results;
 assert(attachmentFailures.every(r=>r.errors.some(e=>e.message.includes('ORIGINAL_ASSERTION_ATTACHMENT_FAILURE'))));
 const require=createRequire(join(consumer,'package.json'));const {chromium}=require('playwright');const browser=await chromium.launch();
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(join(reportDirectory,'index.html')).href);
  await page.getByRole('heading',{name:'Test results',exact:true}).waitFor();
  await page.locator('#language').selectOption('id');await page.getByRole('heading',{name:'Hasil tes',exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:1440,height:900});await page.locator('#language').selectOption('en');
  const recovered=find('recovered action')[0];await page.locator('a[href="'+recovered.report+'"]').click();
  assert((await page.locator('body').innerText()).includes('Playwright: passed'));
  await page.getByRole('button',{name:'Inspect action'}).click();await page.locator('#stage-ai').click();
  assert((await page.locator('.stage-panel').innerText()).includes('SHA-256 matches'));
  const off=find('recovered without payload')[0];
  const html=readFileSync(join(reportDirectory,off.report),'utf8');assert(html.includes('"localAudit":false'));
  const failed=find('assertion failure after')[0];await page.goto(pathToFileURL(join(reportDirectory,failed.report)).href);
  assert((await page.locator('body').innerText()).includes('Playwright: failed'));
  assert((await page.locator('.stats').innerText()).includes('Recovery actions completed\n1'));
  assert((await page.locator('body').innerText()).includes('correctness unassessed'));
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#report-language').selectOption('id');
  assert((await page.locator('.stats').innerText()).includes('Aksi pemulihan selesai'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(process.env.HEALING_REVIEW_OUTPUT)await page.screenshot({path:join(resolve(process.env.HEALING_REVIEW_OUTPUT),'action-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  if(process.env.HEALING_REVIEW_OUTPUT){const {cpSync}=await import('node:fs');cpSync(reportDirectory,resolve(process.env.HEALING_REVIEW_OUTPUT),{recursive:true});await page.goto(pathToFileURL(join(reportDirectory,'index.html')).href);await page.screenshot({path:join(resolve(process.env.HEALING_REVIEW_OUTPUT),'suite-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:join(resolve(process.env.HEALING_REVIEW_OUTPUT),'suite-desktop.png'),fullPage:true});}
 } finally {await browser.close();}
 console.log(JSON.stringify({result:'pass',tests:12,attempts:results.rows.length,checks:['installed fixture/reporter','parallel and retry identities','normal/recovery/refusal/provider failure','original assertion preserved after writer failure','audit off','CI opener suppressed by policy','EN/ID and mobile layout','final status separate from correctness']}));
} finally {rmSync(directory,{recursive:true,force:true});}
