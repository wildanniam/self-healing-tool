import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createCases, fixtureRecord, inspectTargetMapping, nativeReferences } from './cases.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceFiles=['evaluation/rm1/cases.mjs','evaluation/rm1/fixtures.mjs','evaluation/rm1/native-preflight.mjs','dist/dom-context.js'];
const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
const captureManifest=()=>Promise.all(sourceFiles.map(async path=>({path,sha256:sha(await readFile(resolve(projectRoot,path)))})));

export async function runNativePreflight({outputDir=resolve(projectRoot,'output/d33/native')}={}) {
  const startedAt=new Date().toISOString();
  const initialFiles=await captureManifest();
  const initialBundleSha256=sha(JSON.stringify(initialFiles));
  const checks=[];
  const observations=[];
  const check=(name,condition,caseId=null,details=undefined)=>{
    checks.push({name,caseId,passed:Boolean(condition),...(details===undefined?{}:{details})});
    assert.ok(condition,`${caseId??'manifest'}: ${name}`);
  };
  const cases=createCases({phase:'all'});
  const server=createServer((request,response)=>{response.writeHead(200,{'content-type':'text/html'});response.end('<!doctype html><title>RM1 local fixture host</title>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  let browser,failure=null,networkRequests=0,contexts=0;
  const pageErrors=[];
  try {
    check('twelve main conditions and three separate pilot conditions',cases.filter(item=>item.phase==='main').length===12&&cases.filter(item=>item.phase==='pilot').length===3);
    check('distinct case IDs',new Set(cases.map(item=>item.id)).size===15);
    check('main large target eligible positions frozen',JSON.stringify(cases.filter(item=>item.phase==='main'&&item.profile==='L').map(item=>item.targetCandidatePosition))==='[8,24,48,64]');
    check('pilot owners distinct from main owners',new Set(cases.filter(item=>item.phase==='pilot').map(item=>JSON.stringify(fixtureRecord(item).owner))).size===2 && cases.filter(item=>item.phase==='pilot').every(item=>!cases.filter(other=>other.phase==='main').some(other=>JSON.stringify(fixtureRecord(other).owner)===JSON.stringify(fixtureRecord(item).owner))));
    browser=await chromium.launch({headless:true});
    const withFreshPage=async callback=>{
      const context=await browser.newContext();contexts++;
      try {
        await context.route('**/*',async route=>{
          const url=new URL(route.request().url());
          if(url.hostname!=='127.0.0.1'||Number(url.port)!==port) {await route.abort();throw new Error('Fixture attempted a non-loopback-host request');}
          networkRequests++;
          await route.continue();
        });
        const page=await context.newPage();
        page.on('pageerror',error=>pageErrors.push(error.message));
        await page.goto(`http://127.0.0.1:${port}/`);
        await callback(page);
      } finally {await context.close();}
    };
    const act=async (page,item,selector)=>{
      if(item.action==='fill')await page.locator(selector).fill(item.value,{timeout:3000});
      else await page.locator(selector).click({timeout:3000});
      if(item.afterAction)await item.afterAction(page);
    };
    for(const item of cases) {
      const native=nativeReferences(item);
      let pristineState,pristineControl;
      await withFreshPage(async page=>{
        await item.setupPristine(page);
        check('old locator has exactly one pristine match',await page.locator(item.originalSelector).count()===1,item.id);
        pristineState=(await item.assess(page)).state;
        pristineControl=await page.locator(item.originalSelector).evaluate(element=>({attributes:Object.fromEntries([...element.attributes].map(attribute=>[attribute.name,attribute.value])),text:element.textContent,labels:[...(element.labels??[])].map(label=>label.textContent)}));
        await act(page,item,item.originalSelector);
        const result=await item.assess(page);
        check('old pristine action reaches full intended business state',result.semantic==='correct'&&!result.wrongEffect,item.id);
      });
      await withFreshPage(async page=>{
        await item.setup(page);
        const before=await item.assess(page);
        check('fresh mutated state has zero effects and is not already goal state',before.actionCount===0&&!before.wrongEffect&&!before.correctEffect,item.id);
        check('mutation preserves every initial business value',JSON.stringify(before.state)===JSON.stringify(pristineState),item.id);
        const mutatedControl=await page.locator(native.intended).evaluate(element=>({attributes:Object.fromEntries([...element.attributes].map(attribute=>[attribute.name,attribute.value])),text:element.textContent,labels:[...(element.labels??[])].map(label=>label.textContent)}));
        if(item.mutation==='S')check('structural mutation preserves all control attributes and label text',JSON.stringify(mutatedControl)===JSON.stringify(pristineControl),item.id);
        else {
          check('attribute mutation changes target ID',mutatedControl.attributes.id!==pristineControl.attributes.id,item.id);
          const withoutId=control=>({...control,attributes:Object.fromEntries(Object.entries(control.attributes).filter(([key])=>key!=='id'))});
          check('attribute mutation preserves all other target attributes and labels',JSON.stringify(withoutId(mutatedControl))===JSON.stringify(withoutId(pristineControl)),item.id);
        }
        check('old locator is absent after prescribed mutation',await page.locator(item.originalSelector).count()===0,item.id);
        let oldActionFailed=false;
        try {if(item.action==='fill')await page.locator(item.originalSelector).fill(item.value,{timeout:100});else await page.locator(item.originalSelector).click({timeout:100});}
        catch(error){oldActionFailed=error.name==='TimeoutError';}
        check('native old action actually fails with a timeout',oldActionFailed,item.id);
        const after=await item.assess(page);
        check('failed original action preserves all state and history',JSON.stringify(before.state)===JSON.stringify(after.state),item.id);
        const mapping=await inspectTargetMapping(page,item);
        observations.push({caseId:item.id,phase:item.phase,profile:item.profile,expectedCandidateCount:item.expectedCandidateCount,targetCandidatePosition:item.targetCandidatePosition,mapping});
        check('actual action-eligible candidate count matches prespecified profile',mapping.eligibleCount===item.expectedCandidateCount,item.id,{actual:mapping.eligibleCount,expected:item.expectedCandidateCount});
        check('target retained by extraction at prespecified eligible position',mapping.targetExtracted&&mapping.targetCandidateIndex===item.targetCandidatePosition,item.id);
        check('fixture does not reach extraction scan limit',mapping.scanTruncated===false,item.id);
        check('no evaluator marker is rendered',await page.locator('[data-oracle],[data-evaluator],[data-healing-evaluator]').count()===0,item.id);
        check('case ID is absent from rendered application',!(await page.content()).includes(item.id),item.id);
        const raw=await page.locator('html').evaluate(element=>element.outerHTML);
        check('model task carries no mutated answer selector',!JSON.stringify(item.task).includes(native.intended),item.id);
        check('all input/button IDs are unique',await page.locator('input,button').evaluateAll(elements=>new Set(elements.map(element=>element.id)).size===elements.length),item.id);
        // The HTML hash identifies the real application before any healing effect.
        observations.at(-1).rawDomSha256=sha(raw);
      });
      await withFreshPage(async page=>{
        await item.setup(page);
        check('native intended selector has exactly one match',await page.locator(native.intended).count()===1,item.id);
        await act(page,item,native.intended);
        const result=await item.assess(page);
        check('native intended action passes independent full-state oracle',result.semantic==='correct'&&!result.wrongEffect&&result.correctEffect,item.id);
      });
      for(const [kind,selector] of [['other-entity',native.wrong],['other-field',native.wrongField]]) {
        await withFreshPage(async page=>{
          await item.setup(page);
          check(`calibration ${kind} selector is unique`,await page.locator(selector).count()===1,item.id);
          await act(page,item,selector);
          const wrong=await item.assess(page);
          check(`calibration ${kind} wrong action is detected`,wrong.semantic==='incorrect'&&wrong.wrongEffect&&wrong.wrongEffects.length>0,item.id);
        });
      }
      await withFreshPage(async page=>{
        await item.setup(page);
        await act(page,item,native.wrong);
        if(item.action==='fill') {
          await page.locator(native.wrong).fill(await page.locator(native.wrong).getAttribute('value'));
          await item.afterAction(page);
        } else await page.getByRole('button',{name:'Close editor',exact:true}).click();
        await act(page,item,native.intended);
        const later=await item.assess(page);
        check('later correct state cannot erase earlier wrong effects',later.correctEffect&&later.wrongEffect&&later.semantic==='incorrect',item.id);
      });
      await withFreshPage(async page=>{
        await item.setup(page);
        const initial=await item.assess(page);
        await act(page,item,native.wrong);
        await item.reset(page);
        const reset=await item.assess(page);
        check('reset restores every entity and clears all effects',!reset.wrongEffect&&reset.actionCount===0&&JSON.stringify(initial.state)===JSON.stringify(reset.state),item.id);
      });
    }
    check('each fresh browser context makes only its loopback bootstrap request',networkRequests===contexts);
    check('application scripts have no page errors',pageErrors.length===0);
  } catch(error) {failure={name:error.name,message:error.message,stack:error.stack};}
  finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
  let files=[],manifestUnchanged=false;
  try {
    files=await captureManifest();
    manifestUnchanged=JSON.stringify(files)===JSON.stringify(initialFiles);
    check('fixture and mapper runtime manifests remain unchanged throughout native preflight',manifestUnchanged);
  } catch(error) {failure??={name:error.name,message:error.message,stack:error.stack};}
  const report={kind:'rm1-native-preflight-only',startedAt,finishedAt:new Date().toISOString(),passed:failure===null,node:process.version,cases:cases.length,mainCases:12,pilotCases:3,providerCalls:0,healerRuns:0,contexts,networkRequests,pageErrors,initialFiles,initialBundleSha256,manifestUnchanged,files,fixtureBundleSha256:sha(JSON.stringify(files)),checks:checks.length,checkResults:checks,observations,failure};
  await mkdir(outputDir,{recursive:true,mode:0o700});
  const path=resolve(outputDir,'native-preflight-'+startedAt.replaceAll(':','-')+'.json');
  const reportText=JSON.stringify(report,null,2)+'\n';
  await writeFile(path,reportText,{flag:'wx',mode:0o600});
  await writeFile(resolve(outputDir,'report.json'),reportText,{mode:0o600});
  await writeFile(resolve(outputDir,'status.json'),JSON.stringify({passed:report.passed,checks:report.checks,cases:report.cases,report:path,reportSha256:sha(reportText),fixtureBundleSha256:report.fixtureBundleSha256,providerCalls:0,healerRuns:0},null,2)+'\n',{mode:0o600});
  return {...report,reportPath:path};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const optionIndex=process.argv.indexOf('--output-dir');
  const result=await runNativePreflight(optionIndex<0?{}:{outputDir:resolve(process.argv[optionIndex+1])});
  console.log(JSON.stringify({passed:result.passed,cases:result.cases,checks:result.checks,contexts:result.contexts,providerCalls:0,healerRuns:0,report:result.reportPath},null,2));
  if(result.failure){console.error(result.failure.message);process.exitCode=1;}
}
