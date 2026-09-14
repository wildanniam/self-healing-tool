import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createCases, nativeReferences } from './holdout/cases.mjs';

const root = fileURLToPath(new URL('./holdout/', import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const startedAt = new Date().toISOString();
const checks = [];
const check = (name, condition, caseId = null) => {assert.ok(condition, name);checks.push({name,caseId,passed:true});};
const cases = createCases();
const contracts = new Map();
const normalSources = new Set(['label','text','nearestLabel','placeholder','ariaLabel','name','title','role','tag','type','id','dataTestId','dataTest','dataCy','classes','rowContext','parentContext','containerContext','container','href','formAction']);
const manifest = JSON.parse(await readFile(new URL('./holdout/evidence/contract-authorship.json',import.meta.url),'utf8'));

check('sixteen conditions',cases.length === 16);
check('two independent groups',new Set(cases.map(item=>item.group)).size === 2);
for (const group of new Set(cases.map(item=>item.group))) check('eight conditions per group',cases.filter(item=>item.group===group).length === 8);
for (const record of manifest.files) {
  check('preauthored contract unchanged',sha(await readFile(new URL('../' + record.path,import.meta.url))) === record.sha256);
}
for (const path of new Set(cases.map(item=>item.contractPath).filter(Boolean))) {
  const markdown = await readFile(path,'utf8');
  const blocks = [...markdown.matchAll(/```self-healing-contract\s*\n([\s\S]*?)\n```/g)];
  check('one data-only contract fence',blocks.length === 1);
  const contract = JSON.parse(blocks[0][1]);
  contracts.set(path,contract);
  check('schema version one',contract.schemaVersion === 1);
  check('generic contract keys',Object.keys(contract).every(key=>['schemaVersion','requirementId','revision','intent','action','status','allOf'].includes(key)));
  check('allowlisted feature sources',contract.allOf.every(clause=>clause.sources.every(source=>normalSources.has(source))));
  check('nonempty phrase clauses',contract.allOf.every(clause=>clause.sources.length && clause.anyOf.length && clause.anyOf.every(phrase=>typeof phrase==='string' && phrase.trim())));
  check('no evaluator identifiers in contract',cases.every(item=>!JSON.stringify(contract).includes(item.id)));
  check('no answer selectors in contract',cases.every(item=>![nativeReferences(item).intended,nativeReferences(item).wrong].some(selector=>JSON.stringify(contract).includes(selector))));
}
for (const group of new Set(cases.map(item=>item.group))) {
  const behavioralVariants = cases.filter(item=>item.group===group && !['explicitly-retired','missing-spec','stale-spec'].includes(item.kind));
  check('unchanged requirements share one contract',new Set(behavioralVariants.map(item=>item.contractPath)).size === 1);
}

const server = createServer((request,response)=>{response.writeHead(200,{'content-type':'text/html'});response.end('<!doctype html><title>Local fixture host</title>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
let failure = null;
let networkRequests = 0;
try {
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext();
  const port = server.address().port;
  await context.route('**/*',async route=>{
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) throw new Error('Fixture attempted a non-host request');
    networkRequests++;
    await route.continue();
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  const act = async (item,selector) => {
    if (item.action === 'fill') await page.locator(selector).fill(item.value);
    else await page.locator(selector).click();
    if (item.afterAction) await item.afterAction(page);
  };
  for (const item of cases.filter(item=>item.kind==='control')) {
    await page.setContent(nativeReferences(item).pristineMarkup);
    await act(item,nativeReferences(item).pristine);
    const assessment = await item.assess(page);
    check('pristine mapping reaches business outcome',assessment.semantic==='correct' && !assessment.wrongEffect,item.id);
  }
  for (const item of cases) {
    const refs = nativeReferences(item);
    await item.setup(page);
    const baseline = await item.assess(page);
    const contract = contracts.get(item.contractPath);
    check('planned goal matches independent oracle',item.expectation.goalExpected === baseline.goalExpected,item.id);
    check('planned recoverability matches independent oracle',item.expectation.intendedRecoverable === baseline.intendedRecoverable,item.id);
    check('planned spec availability matches parsed contract',item.expectation.specApplicable === Boolean(contract && contract.status === 'active' && contract.revision === item.expectedRevision),item.id);
    check('planned recovery trigger matches actual original locator',item.expectation.recoveryExpected === ((await page.locator(item.originalSelector).count()) === 0),item.id);
    check('original locator control or zero-match mutation',(await page.locator(item.originalSelector).count()) === (item.kind==='control' ? 1 : 0),item.id);
    check('setup has no prior wrong effects',!baseline.wrongEffect,item.id);
    const recoverable = baseline.intendedRecoverable;
    check('native target presence matches requirement condition',(await page.locator(refs.intended).count()) === (recoverable ? 1 : 0),item.id);
    if (recoverable) {
      await act(item,refs.intended);
      const result = await item.assess(page);
      check('native action reaches independent business outcome',result.semantic==='correct' && !result.wrongEffect,item.id);
    } else {
      check('no action preserves state in negative condition',baseline.semantic==='correct',item.id);
    }
    await item.reset(page);
    await act(item,refs.wrong);
    const wrong = await item.assess(page);
    check('deliberate wrong action is detected',wrong.semantic==='incorrect' && wrong.wrongEffect,item.id);
    if (recoverable) {
      if (item.action==='fill') {
        await page.locator(refs.wrong).fill('80');
      } else {
        await page.getByRole('button',{name:'Close panel',exact:true}).click();
      }
      await act(item,refs.intended);
      const later = await item.assess(page);
      check('later success retains previous wrong effect',later.semantic==='incorrect' && later.wrongEffect,item.id);
    }
    await item.reset(page);
    const reset = await item.assess(page);
    check('reset is independent and complete',!reset.wrongEffect && (reset.inputCount ?? reset.actionCount)===0,item.id);
  }
  check('fixtures request no resources after local bootstrap',networkRequests===1);
  check('application scripts do not raise browser errors',pageErrors.length===0);
  await context.close();
} catch (error) {
  failure = {name:error.name,message:error.message,stack:error.stack};
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}

async function collect(directory) {
  const files=[];
  for (const item of await readdir(directory,{withFileTypes:true})) {
    if (item.name === 'evidence' || item.name === 'preflight-status.json') continue;
    const path=directory+item.name;
    if (item.isDirectory()) files.push(...await collect(path+'/'));
    else files.push({path:path.slice(root.length),sha256:sha(await readFile(path))});
  }
  return files.sort((a,b)=>a.path.localeCompare(b.path));
}
const files=await collect(root);
const report={kind:'native-preflight-only',startedAt,finishedAt:new Date().toISOString(),node:process.version,cases:cases.length,groups:new Set(cases.map(item=>item.group)).size,checks:checks.length,passed:!failure,providerCalls:0,healerRuns:0,networkRequests,fixtureBundleSha256:sha(JSON.stringify(files)),contractAuthorshipSha256:sha(await readFile(new URL('./holdout/evidence/contract-authorship.json',import.meta.url))),files,checkResults:checks,failure};
const reportName='native-preflight-'+startedAt.replaceAll(':','-')+'.json';
const reportText = JSON.stringify(report,null,2)+'\n';
await mkdir(new URL('../output/d27/native/',import.meta.url),{recursive:true,mode:0o700});
await writeFile(new URL('../output/d27/native/'+reportName,import.meta.url),reportText,{flag:'wx',mode:0o600});
await writeFile(new URL('../output/d27/native/preflight-status.json',import.meta.url),JSON.stringify({passed:report.passed,checks:report.checks,report:'output/d27/native/'+reportName,reportSha256:sha(reportText),bundleSha256:report.fixtureBundleSha256,providerCalls:0,healerRuns:0},null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,cases:report.cases,groups:report.groups,checks:report.checks,providerCalls:0,healerRuns:0,fixtureBundleSha256:report.fixtureBundleSha256,contractAuthorshipSha256:report.contractAuthorshipSha256,report:'output/d27/native/'+reportName},null,2));
if(failure){console.error(failure.message);process.exitCode=1;}
