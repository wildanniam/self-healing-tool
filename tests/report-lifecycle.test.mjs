import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSuite } from '../dist/suite-report.js';
import { shouldOpen } from '../dist/report-open.js';
import HealingReporter from '../dist/reporter.js';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('local opener policy never opens in CI and respects all policies', () => {
  for (const policy of ['always','on-failure','never']) for (const failed of [true,false]) assert.equal(shouldOpen(policy,failed,'true'),false);
  assert.equal(shouldOpen('always',false,''),true);
  assert.equal(shouldOpen('on-failure',false,''),false);
  assert.equal(shouldOpen('on-failure',true,''),true);
  assert.equal(shouldOpen('never',true,''),false);
});
test('suite index escapes metadata, refuses unsafe report links and retains retry/status identity', () => {
  const row={testId:'one',title:'<script>alert(1)</script>',file:'a.spec.ts',project:'chrome',retry:1,status:'passed',expectedStatus:'passed',durationMs:5,outcome:'flaky',report:'javascript:alert(1)',reportError:null};
  const html=renderSuite({status:'passed',createdAt:'now',rows:[row]},'id');
  assert(!html.includes('<script>alert(1)</script>'));
  assert(!html.includes('href="javascript:'));
  assert(html.includes('lulus setelah retry'));
  assert(html.includes('data-en="Recorded attempts"'));
});
test('reporter waits for report copying and keeps final test status separate from action HTML', async t => {
  const temp=await mkdtemp(join(tmpdir(),'healing-reporter-'));t.after(()=>rm(temp,{recursive:true,force:true}));
  const source=join(temp,'source');await mkdir(source);
  await writeFile(join(source,'report.html'),'<body><!--playwright-test-status-->Action completed; correctness unassessed</body>');
  await writeFile(join(source,'report.json'),'{}');
  const reporter=new HealingReporter({outputDir:join(temp,'reports'),open:'never'});
  const testcase={id:'test',titlePath:()=>['root','<test>'],location:{file:join(temp,'test.spec.ts')},parent:{project:()=>({name:'chromium'})},expectedStatus:'passed',outcome:()=> 'unexpected'};
  reporter.onBegin({rootDir:temp},{allTests:()=>[testcase]});
  reporter.onTestEnd(testcase,{status:'failed',retry:0,duration:42,attachments:[{name:'self-healing-result',body:Buffer.from(JSON.stringify({schemaVersion:1,directory:source}))}]});
  await reporter.onEnd({status:'failed'});
  const {readdir}=await import('node:fs/promises');const run=(await readdir(join(temp,'reports')))[0];
  const data=JSON.parse(await readFile(join(temp,'reports',run,'results.json'),'utf8'));
  assert.equal(data.rows[0].status,'failed');assert.equal(data.rows[0].outcome,'unexpected');
  const html=await readFile(join(temp,'reports',run,data.rows[0].report),'utf8');
  assert(html.includes('<strong>failed</strong>'));assert(html.includes('correctness unassessed'));assert(!html.includes('<test>'));
});
test('reporter I/O failure does not throw or change the suite exit status', async t => {
  const temp=await mkdtemp(join(tmpdir(),'healing-reporter-error-'));t.after(()=>rm(temp,{recursive:true,force:true}));
  const file=join(temp,'not-a-directory');await writeFile(file,'x');
  const reporter=new HealingReporter({outputDir:file,open:'never'});
  reporter.onBegin({rootDir:temp},{allTests:()=>[]});
  assert.equal(await reporter.onEnd({status:'failed'}),undefined);
});
