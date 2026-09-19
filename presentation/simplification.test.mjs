import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {normalizeRanking,loadRankingEvidence,RANKING_ARMS} from './ranking-data.mjs';
import {loadReportSnapshot} from './snapshot.mjs';
import {renderReport} from './report.mjs';
import {renderReport as libraryReport} from '../dist/report.js';
import {validateConfig} from '../dist/config.js';
const saved=JSON.parse(await readFile(new URL('./data/d30-synthetic.json',import.meta.url),'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
// Deliberately constructed adapter fixture, not additional research evidence.
function fixture(){
  const input={action:'click',task:{description:'ADAPTER_FIXTURE_ONLY'},candidates:[],coverage:{included:0}};
  const payload=JSON.stringify({model:'offline-test',messages:[{role:'user',content:JSON.stringify(input)}]});
  return {phase:'main',caseId:'S-S-L',arm:'R1',repeat:2,status:'complete',wrapperMs:42,rawDom:'<button>ADAPTER_FIXTURE_ONLY</button>',
    assessment:{correctEffect:false,wrongEffect:false,semantic:'incorrect'},audits:[{coverageStages:{rank:33,extracted:true,top30:false,afterBudget:false},ranked:[],cleanedDom:'<button>fixture</button>'}],
    requests:[{ordinal:1,payload,sha256:hash(payload),coverage:{targetPresent:false,finalCandidateCount:0},response:{output:'{"selector":null}'}}],
    run:{config:{},events:[{action:'click',task:input.task,originalSelector:'#old',recoveryTriggered:true,actionExecuted:false,stopReason:'abstained',context:input,
      attempts:[{number:1,providerCalled:true,transportAttempted:true,usage:{inputTokens:10,outputTokens:4},inputContext:input,inputSha256:hash(payload),proposedSelector:null,candidateAccepted:false,actionExecuted:false}]}],assessments:[]}};
}
test('D33 adapter retains actual raw/parsed evidence, marks incomplete input and excludes pilot',async()=>{
  const f=fixture(),row=normalizeRanking(f,{file:'fixture.json',sha256:'a'.repeat(64)});
  assert.equal(row.ranking.rank,33);assert.equal(row.ranking.targetPresent,false);assert.equal(row.audit.attempts[0].response.text,'{"selector":null}');
  assert.equal(row.audit.attempts[0].request.integrity,'verified');assert.equal(row.audit.dom.raw,f.rawDom);
  assert.throws(()=>normalizeRanking({...f,phase:'pilot'}),/Invalid/);
  const dir=await mkdtemp(join(tmpdir(),'d34-ranking-'));
  await writeFile(join(dir,'continuation-v1-main-S-S-L-R1-r2.json'),JSON.stringify(f));
  await writeFile(join(dir,'pilot.json'),JSON.stringify({...f,phase:'pilot'}));
  const loaded=await loadRankingEvidence(dir);assert.equal(loaded.rows.length,1);assert.match(loaded.coverage[0],/1\/108/);
});
test('snapshot reopens separate studies and strips private diagnostics unless explicitly selected',async()=>{
  const data=structuredClone(saved);data.rows[0].audit.privateHost=true;data.rows[0].audit.secretFixture='PRIVATE_DIAGNOSTIC';
  const dir=await mkdtemp(join(tmpdir(),'d34-snapshot-')),file=join(dir,'results.json');
  await writeFile(file,JSON.stringify({schemaVersion:2,studies:[{...data,studyId:'rm2'}]}));
  assert.doesNotMatch(JSON.stringify(await loadReportSnapshot(file)),/PRIVATE_DIAGNOSTIC/);
  assert.match(JSON.stringify(await loadReportSnapshot(file,{includePrivateAudit:true})),/PRIVATE_DIAGNOSTIC/);
  await writeFile(file,JSON.stringify({schemaVersion:2,studies:[data,data]}));
  await assert.rejects(loadReportSnapshot(file),/Duplicate/);
});
test('four-group UI preserves selected identity, filtered exports, study isolation and keyboard return',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'d34-ui-')),file=join(dir,'report.html');
  const rm1={schemaVersion:1,evidenceKind:'historical-d33',evaluationDate:'2026-09-18',studyId:'rm1',arms:RANKING_ARMS,coverage:['Adapter fixture only'],rows:[normalizeRanking(fixture(),{file:'fixture.json'})]};
  const d30=structuredClone(saved);d30.rows[0].audit.privateHost=true;d30.rows[0].audit.privateMarker='PRIVATE_DIAGNOSTIC';
  await writeFile(file,renderReport({schemaVersion:2,createdAt:'2026-09-18',studies:[rm1,{...d30,studyId:'rm2'}]}));
  const browser=await chromium.launch();try{
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('http**://**/*',r=>r.abort());await page.goto(pathToFileURL(file).href);assert.equal(await page.locator('html').getAttribute('lang'),'en');await page.locator('#report-language').selectOption('id');
    assert.equal(await page.locator('#stats strong').first().textContent(),'1');
    const opener=page.getByRole('button',{name:/S-S-L R1 ulangan 2:/});await opener.click();
    assert.equal(await page.locator('#audit-repeat').inputValue(),'2');assert.equal(await page.locator('#audit-arm-R1').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.stage-nav button').count(),4);assert.match(await page.locator('.target-proof').innerText(),/Tidak/);
    await page.locator('#stage-ai').click();assert.match(await page.locator('.stage-panel').innerText(),/"selector":null/);
    assert.equal(await page.locator('#stage-ai').getAttribute('aria-current'),'step');
    await page.keyboard.press('Escape');assert.equal(await opener.evaluate(el=>document.activeElement===el),true);
    await page.locator('#study').selectOption('rm2');assert.equal(await page.locator('#stats strong').first().textContent(),'198');
    await page.locator('#view-comparison').click();assert.match(await page.locator('#metrics').innerText(),/Label menyesatkan/);assert.doesNotMatch(await page.locator('#metrics').innerText(),/Target pada input pertama/);
    await page.locator('#view-results').click();await page.locator('#search').fill('h1-01');
    let dl=page.waitForEvent('download');await page.locator('#download').click();const download=await dl;const exported=JSON.parse(await readFile(await download.path(),'utf8'));
    assert.equal(exported.rows.length,9);assert.equal(exported.selection.sourceSlots,198);assert.match(exported.coverage.join(' '),/9 dari 198/);assert.equal(exported.evaluationDate,d30.evaluationDate);assert.deepEqual(exported.price,d30.price);assert.ok(exported.rows.every(r=>r.caseId==='h1-01'));assert.doesNotMatch(JSON.stringify(exported),/PRIVATE_DIAGNOSTIC/);
    dl=page.waitForEvent('download');await page.locator('#csv').click();const csv=await dl;assert.equal((await readFile(await csv.path(),'utf8')).trim().split('\n').length,10);
    await page.locator('#search').fill('nonexistent');assert.match(await page.locator('#case-rows').innerText(),/Tidak ada kasus/);
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
test('generic library report stays collapsed, private-safe and honest about unassessed actions',async()=>{
  const run={schemaVersion:1,id:'fixture',createdAt:'2026-09-18',repeatOf:null,config:validateConfig({}),provider:'offline',assessments:[],events:[{
    id:'event',action:'click',originalSelector:'#old',task:{description:'<img src=x onerror="window.__bad=1">'},recoveryTriggered:true,
    originalFailure:null,actionExecuted:true,stopReason:'recovered',semantic:'unassessed',failure:'none',originalMs:1,internalMs:2,retryMs:3,totalMs:6,
    context:{cleanedDom:'PRIVATE_RAW'},attempts:[]}]};
  const html=libraryReport(run);assert.doesNotMatch(html,/PRIVATE_RAW/);assert.match(html,/correctness unassessed/);assert.ok(html.includes('\\u003cimg'));
  const browser=await chromium.launch();try{
    const page=await browser.newPage({viewport:{width:390,height:844}});await page.setContent(html);
    assert.equal(await page.locator('details[open]').count(),0);await page.getByRole('button',{name:'Inspect action'}).click();assert.equal(await page.locator('.stage-nav button').count(),4);
    await page.locator('#stage-ai').click();assert.match(await page.locator('.stage-panel').innerText(),/provider was not called/i);assert.equal(await page.locator('img').count(),0);
    assert.equal(await page.evaluate(()=>window.__bad),undefined);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await browser.close();}
});
