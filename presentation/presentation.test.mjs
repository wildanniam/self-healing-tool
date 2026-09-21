import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {loadEvidence,validateRows,usageOf,summarize,normalizePrivate} from './data.mjs';
import {renderReport} from './report.mjs';
import {parseArgs,saveReport} from './cli.mjs';
import {replayProvider} from './walkthrough.mjs';
import {validateConfig} from '../dist/index.js';

const source=new URL('./data/d30-synthetic.json',import.meta.url);
const saved=JSON.parse(await readFile(source,'utf8'));

test('retained independent evidence preserves all 198 slots and known D30 outcomes',()=>{
  const rows=validateRows(saved.rows);assert.equal(rows.length,198);
  for(const arm of ['A','B','C']){
    const rs=rows.filter(r=>r.arm===arm);
    assert.equal(summarize(rs.filter(r=>r.category==='ordinary')).correct,30);
    assert.equal(summarize(rs.filter(r=>r.category==='ordinary')).planned,36);
    assert.equal(summarize(rs.filter(r=>r.category==='stress')).wrong,6);
    assert.equal(summarize(rs.filter(r=>r.category==='negative')).wrong,{A:6,B:3,C:0}[arm]);
  }
});
test('duplicate identities and contradictory outcomes are rejected',()=>{
  assert.throws(()=>validateRows([...saved.rows,saved.rows[0]]),/Duplicate/);
  assert.throws(()=>validateRows([{...saved.rows[0],correct:true,wrong:true}]),/Contradictory/);
});
test('missing provider usage is unknown, while no provider call is observed zero',()=>{
  assert.deepEqual(usageOf({attempts:[]}),{requests:0,unknown:false,input:0,output:0});
  const result=usageOf({attempts:[{providerCalled:true,transportAttempted:true,usage:null}]});
  assert.equal(result.requests,1);assert.equal(result.input,null);assert.equal(result.unknown,true);
});
test('private projection excludes original locator, raw context and request payload',()=>{
  const r=normalizePrivate({caseId:'F-N01',method:'C',repeat:1,caseClass:'negative',status:'completed',correct:true,event:{action:'fill',originalSelector:'PRIVATE-SELECTOR',task:{description:'PRIVATE-TASK'},context:{dom:'PRIVATE-DOM'},attempts:[{number:1,proposedSelector:'PRIVATE-PROPOSAL',inputContext:{text:'PRIVATE-CONTEXT'}}]},requests:[{payload:'PRIVATE-REQUEST'}]});
  assert.doesNotMatch(JSON.stringify(r),/PRIVATE-/);assert.equal(r.detail.privateHost,true);
});
test('snapshot loading labels private source absence, and missing configured source fails',async()=>{
  const data=await loadEvidence({snapshot:source});assert.match(data.coverage.join(),/private-host/);
  await assert.rejects(loadEvidence({snapshot:source,privateDirectory:'/nonexistent-presentation-source'}),/ENOENT/);
});
test('explicit modes reject accidental live or credential loading',()=>{
  assert.equal(parseArgs([]).live,false);assert.equal(parseArgs([]).open,true);
  assert.throws(()=>parseArgs(['--live']),/requires/);
  assert.throws(()=>parseArgs(['--env-file','example.env']),/explicit --live/);
  assert.throws(()=>parseArgs(['--pause','-1']),/0–10000/);
});
test('live mode without key fails before a server or model call',()=>{
  const env={...process.env};delete env.OPENAI_API_KEY;
  const r=spawnSync(process.execPath,['presentation/cli.mjs','--walkthrough','--live','--headless','--no-open'],{cwd:new URL('../',import.meta.url),env,encoding:'utf8',timeout:10000});
  assert.equal(r.status,1);assert.match(r.stderr,/OPENAI_API_KEY/);
});
test('a mismatched replay request cannot consume a stored decision as if it matched',async()=>{
  const provider=replayProvider({decisions:[{inputSha256:'not-the-request',selector:'#wrong'}]},validateConfig({mode:'full'}));
  await assert.rejects(provider.select({action:'click',task:{description:'test'},candidates:[],method:'test'}));
});
test('saved report refuses overwriting prior output',async()=>{
  const path=await mkdtemp(join(tmpdir(),'report-write-'));
  await saveReport(saved,path);await assert.rejects(saveReport(saved,path),/EEXIST/);
});
test('offline report renders, filters, opens detail, downloads and escapes hostile content',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'report-browser-'));
  const data=structuredClone(saved);data.rows[0].title='</script><img src=x onerror="window.__injected=1">';
  const file=join(dir,'report.html');await writeFile(file,renderReport(data));
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('http**://**/*',route=>route.abort());
    await page.goto(pathToFileURL(file).href);
    assert.equal(await page.locator('#stats strong').first().textContent(),'198');
    assert.equal(await page.locator('#case-rows tr').count(),12);await page.locator('#next').click();assert.equal(await page.locator('#case-rows tr').count(),10);await page.locator('#previous').click();
    await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));assert.equal(await page.locator('#case-rows tr').count(),22);
    await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));assert.equal(await page.locator('#case-rows tr').count(),12);
    await page.locator('#search').fill('h1-06');assert.equal(await page.locator('#case-rows tr').count(),1);
    await page.getByRole('button',{name:'Detail ↗'}).click();assert.equal(await page.locator('dialog[open]').count(),1);
    assert.match(await page.locator('#detail-body').innerText(),/Salah sasaran/);
    assert.match(await page.locator('#detail-body').innerText(),/Berhenti tepat/);
    await page.getByRole('button',{name:'Tutup ×'}).click();
    const download=page.waitForEvent('download');await page.locator('#download').click();assert.equal((await download).suggestedFilename(),'self-healing-results.json');
    await page.locator('#search').fill('');await page.locator('#category').selectOption('stress');assert.equal(await page.locator('#case-rows tr').count(),2);
    assert.equal(await page.evaluate(()=>window.__injected),undefined);assert.deepEqual(errors,[]);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await page.screenshot({path:join(dir,'mobile.png'),fullPage:true});
  }finally{await browser.close();}
});
