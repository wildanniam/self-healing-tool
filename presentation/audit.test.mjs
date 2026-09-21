import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {buildAudit,requestEvidence,withoutPrivateAudit} from './audit.mjs';
import {renderReport} from './report.mjs';
import {loadEvidence} from './data.mjs';

const saved=JSON.parse(await readFile(new URL('./data/d30-synthetic.json',import.meta.url),'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
test('all retained independent request bytes verify, while parsed-only responses are not invented',()=>{
  let requests=0;
  for(const row of saved.rows){
    assert.ok(row.audit);
    for(const attempt of row.audit.attempts){
      if(!attempt.providerCalled)continue;
      requests++;assert.equal(attempt.request.integrity,'verified');
      assert.equal(hash(attempt.request.body),attempt.request.sha256);
      assert.equal(attempt.response.status,'parsed-only');assert.equal(attempt.response.text,null);
    }
    if(!row.recovery)assert.equal(row.audit.attempts.length,0);
  }
  assert.equal(requests,180); // 198 independent slots; controls do not call the model.
  for(const r of saved.rows.filter(r=>r.arm==='B'&&r.audit.attempts.length)){
    const c=saved.rows.find(x=>x.caseId===r.caseId&&x.repeat===r.repeat&&x.arm==='C');
    assert.equal(r.audit.attempts[0].request.sha256,c.audit.attempts[0].request.sha256);
  }
});
test('mismatched hashes, malformed input and secret-shaped request bodies are not called exact verified evidence',()=>{
  const payload=JSON.stringify({model:'example',messages:[{role:'system',content:'instructions'}]});
  assert.equal(requestEvidence({payload,sha256:'bad'},null).integrity,'mismatch');
  assert.equal(requestEvidence({payload,sha256:hash(payload)},'wrong-attempt').integrity,'mismatch');
  assert.equal(requestEvidence({payload:'not json'}).status,'invalid');
  assert.equal(requestEvidence({payload:'{"messages":[null]}'}).status,'withheld');
  const withHeader=JSON.stringify({messages:[],headers:{authorization:'PRIVATE_HEADER'}});
  assert.equal(requestEvidence({payload:withHeader}).body,null);
  const secret=JSON.stringify({messages:[{role:'user',content:'Bearer abcdefghijklmnopqrstuvwxyz'}]});
  const redacted=requestEvidence({payload:secret,sha256:hash(secret)});
  assert.equal(redacted.status,'redacted');assert.doesNotMatch(redacted.body,/abcdefghijklmnopqrstuvwxyz/);
  const audit=buildAudit({run:{events:[{attempts:[{number:1,providerCalled:true,inputSha256:hash(payload)},{number:2,providerCalled:true,inputSha256:hash(payload)}]}]},requestPayloads:[{ordinal:2,payload,sha256:hash(payload),output:'second response'}]});
  assert.equal(audit.attempts[0].request.status,'missing');
  assert.equal(audit.attempts[0].response.text,null);
  assert.equal(audit.attempts[1].request.integrity,'verified');
  assert.equal(audit.attempts[1].response.text,'second response');
});
test('local private audit is explicit and ordinary exports strip its diagnostic contents',async()=>{
  const audit=buildAudit({event:{action:'fill',task:{description:'PRIVATE_TASK'},attempts:[]},calls:[{headers:{authorization:'SECRET_HEADER'},effects:[{kind:'fill',value:'test value',password:'SECRET_PASSWORD'}]}],oracleCorrect:true,guardUnchanged:true},{privateHost:true});
  assert.match(JSON.stringify(audit),/PRIVATE_TASK/);assert.doesNotMatch(JSON.stringify(audit),/SECRET_HEADER|SECRET_PASSWORD/);
  const data=structuredClone(saved);data.rows[0].audit=audit;data.privateAudit=true;
  assert.doesNotMatch(JSON.stringify(withoutPrivateAudit(data)),/PRIVATE_TASK/);
  const dir=await mkdtemp(join(tmpdir(),'audit-snapshot-')),file=join(dir,'snapshot.json');await writeFile(file,JSON.stringify(data));
  assert.equal((await loadEvidence({snapshot:file})).rows[0].audit,undefined);
  assert.equal((await loadEvidence({snapshot:file,includePrivateAudit:true})).rows[0].audit.privateHost,true);
});
test('inspector explains controls, B context, C decisions and real input with accessible single-run navigation',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'inspector-browser-')),file=join(dir,'report.html');
  const data=structuredClone(saved);
  // A deliberate HTML payload in evidence must remain inert, including in prompts.
  data.rows.find(r=>r.caseId==='h1-02'&&r.arm==='C'&&r.repeat===1).audit.event.task.description='<img src=x onerror="window.__auditInjected=1">';
  await writeFile(file,renderReport(data));
  const browser=await chromium.launch();try{
    const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('http**://**/*',r=>r.abort());await page.goto(pathToFileURL(file).href);assert.equal(await page.locator('html').getAttribute('lang'),'en');await page.locator('#report-language').selectOption('id');
    await page.locator('#search').fill('h1-01');await page.getByRole('button',{name:/ C ulangan 1:/}).click();
    assert.match(await page.locator('.run-verdict').innerText(),/Tidak ada DOM recovery/);
    await page.locator('#stage-ai').click();assert.match(await page.locator('.stage-panel').innerText(),/Tahap ini dilewati/);
    assert.equal(await page.locator('#audit-attempt').isDisabled(),true);
    await page.locator('#stage-outcome').click();assert.match(await page.locator('.stage-panel').innerText(),/penilaian sesudah aksi|evaluator menilai/);
    await page.locator('#audit-case').selectOption('warehouse/h1-02');
    await page.locator('#stage-context').click();assert.ok(await page.locator('.candidate-list>details').count()>0);
    await page.locator('#stage-ai').click();assert.match(await page.locator('.stage-panel').innerText(),/SHA-256 cocok/);
    const original=data.rows.find(r=>r.caseId==='h1-02'&&r.arm==='C'&&r.repeat===1).audit.attempts[0].request.body;
    const download=page.waitForEvent('download');await page.locator('#audit-request-download').click();const dl=await download;
    assert.equal(await readFile(await dl.path(),'utf8'),original);
    await page.locator('#audit-arm-B').click();await page.locator('#stage-checks').click();assert.match(await page.locator('.stage-panel').innerText(),/Tidak ada keputusan pemeriksa kode/);
    await page.locator('#audit-arm-C').click();assert.match(await page.locator('.rule-list').innerText(),/Cocok/);
    await page.locator('#audit-case').selectOption('warehouse/h1-06');assert.match(await page.locator('.rule-list').innerText(),/Belum cocok/);
    await page.locator('#audit-repeat').selectOption('2');assert.equal(await page.locator('#audit-repeat').inputValue(),'2');
    await page.locator('#stage-ai').click();assert.match(await page.locator('.stage-panel').innerText(),/Respons mentah tidak direkam/);
    await page.locator('#audit-case').selectOption('warehouse/h1-05');await page.locator('#stage-outcome').click();assert.match(await page.locator('.stage-panel').innerText(),/Evaluator mencatat efek yang salah/);
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#stage-context').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#stage-context').getAttribute('aria-current'),'step');
    await page.screenshot({path:join(dir,'mobile-inspector.png'),fullPage:true});
    await page.keyboard.press('Escape');assert.equal(await page.locator('#overview-view').isVisible(),true);
    assert.equal(await page.locator('#stats strong').first().textContent(),'198');
    assert.equal(await page.evaluate(()=>window.__auditInjected),undefined);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
test('multiple attempts stay separate and changing an attempt selects its own input and feedback',async()=>{
  const data=structuredClone(saved),row=data.rows.find(r=>r.caseId==='h1-02'&&r.arm==='C'&&r.repeat===1);
  const a=structuredClone(row.audit.attempts[0]);a.number=2;a.inputContext.feedback=[{selector:'#first',reason:'ambiguous',count:2}];
  a.request.body=JSON.stringify({model:'offline-fixture',messages:[{role:'user',content:JSON.stringify({feedback:a.inputContext.feedback,task:{description:'SECOND_ATTEMPT_ONLY'}})}]});
  a.request.sha256=hash(a.request.body);a.request.declaredSha256=a.request.sha256;a.request.attemptSha256=a.request.sha256;
  a.response={status:'recorded',text:'SECOND_ATTEMPT_RESPONSE'};
  row.audit.attempts.push(a);
  const dir=await mkdtemp(join(tmpdir(),'attempt-browser-')),file=join(dir,'report.html');await writeFile(file,renderReport(data));
  const browser=await chromium.launch();try{
    const page=await browser.newPage();await page.goto(pathToFileURL(file).href);assert.equal(await page.locator('html').getAttribute('lang'),'en');await page.locator('#report-language').selectOption('id');
    await page.locator('#search').fill('h1-02');await page.getByRole('button',{name:/ C ulangan 1:/}).click();await page.locator('#stage-ai').click();
    assert.doesNotMatch(await page.locator('.stage-panel').innerText(),/SECOND_ATTEMPT_ONLY/);
    await page.locator('#audit-attempt').selectOption('2');
    await page.getByText('user · pesan 1 lengkap',{exact:true}).click();
    assert.match(await page.locator('.stage-panel').innerText(),/SECOND_ATTEMPT_ONLY/);
    assert.match(await page.locator('.stage-panel').innerText(),/SECOND_ATTEMPT_RESPONSE/);
    assert.match(await page.locator('.stage-panel').innerText(),/ambiguous/);
    await page.locator('#audit-repeat').selectOption('2');assert.equal(await page.locator('#audit-attempt option').count(),1);assert.doesNotMatch(await page.locator('.stage-panel').innerText(),/SECOND_ATTEMPT_RESPONSE/);
  }finally{await browser.close();}
});

test('OBS-012 English/Indonesian share exact request evidence and preserve selection and filters',async()=>{
 const data=structuredClone(saved),before=JSON.stringify(data);
 const dir=await mkdtemp(join(tmpdir(),'bilingual-report-')),file=join(dir,'report.html');await writeFile(file,renderReport(data));assert.equal(JSON.stringify(data),before);
 const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(file).href);
 await page.locator('#search').fill('h1-02');await page.getByRole('button',{name:/ C repeat 2:/}).click();await page.locator('#stage-ai').click();
 const original=data.rows.find(r=>r.caseId==='h1-02'&&r.arm==='C'&&r.repeat===2).audit.attempts[0].request.body;
 await page.locator('.paired-block').first().locator('details').nth(1).locator('summary').click();
 const beforeText=await page.locator('.paired-block').first().locator('pre').nth(1).textContent();
 await page.locator('#report-language').selectOption('id');assert.equal(await page.locator('#audit-repeat').inputValue(),'2');assert.equal(await page.locator('#stage-title').innerText(),'Input dan jawaban AI');assert.equal(await page.locator('.paired-block').first().locator('pre').nth(1).textContent(),beforeText);assert.equal(await page.locator('.paired-block').first().locator('details').nth(1).getAttribute('open'),'');
 await page.locator('#report-language').selectOption('en');assert.equal(await page.locator('#stage-title').innerText(),'AI input and output');
 const next=page.waitForEvent('download');await page.locator('#audit-request-download').click();assert.equal(await readFile(await(await next).path(),'utf8'),original);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#search').inputValue(),'h1-02');assert.equal(await page.locator('#stats strong').first().innerText(),'198');assert.deepEqual(errors,[]);
 await page.screenshot({path:'output/d35-study-desktop.png',fullPage:true});
 }finally{await browser.close();}
});
