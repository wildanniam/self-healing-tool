import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,join,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const historicalRoot=resolve(process.env.D29_HISTORICAL_ROOT ?? '/Users/wildanniam/Development/project-ta/self-healing-tool/output/d27');
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const walk=directory=>readdirSync(directory).sort().flatMap(name=>{const path=join(directory,name);return statSync(path).isDirectory()?walk(path):[path];});
export function historicalProvenance(){
 const freezePath=join(historicalRoot,'synthetic-v1/freeze.json');
 const freeze=JSON.parse(readFileSync(freezePath,'utf8'));
 const oldRoot=freeze.inputs.find(item=>item.path.endsWith('/src/index.ts')).path.slice(0,-'/src/index.ts'.length);
 const files=freeze.inputs.map(item=>{
  const path=relative(oldRoot,item.path);assert(!path.startsWith('..'),'D27 input outside declared root');
  const archived=join(historicalRoot,'frozen-inputs',path);
  assert.equal(sha(readFileSync(archived)),item.sha256,`D27 archive changed: ${path}`);
  return {path,sha256:item.sha256};
 });
 const fixtureFiles=walk(join(root,'evaluation/holdout')).map(path=>({path:relative(root,path),sha256:sha(readFileSync(path))}));
 for(const item of fixtureFiles){const frozen=files.find(entry=>entry.path===item.path);assert(frozen,`Fixture not in D27 freeze: ${item.path}`);assert.equal(item.sha256,frozen.sha256,`Frozen fixture changed: ${item.path}`);}
 const artifacts=['synthetic-v1/freeze.json','synthetic-v1/results.json','synthetic-v1/summary.json','budget.json'].map(path=>({path,sha256:sha(readFileSync(join(historicalRoot,path)))}));
 return {historicalRoot,sourceFreezeSha256:sha(readFileSync(freezePath)),files,fixtureFiles,artifacts};
}
export function reservation(study,payload){
 const payloadBytes=Buffer.byteLength(payload,'utf8');
 return {payloadBytes,reservedUsd:((payloadBytes+1024)*study.price.inputUsdPerMillion+study.config.maxTokens*study.price.outputUsdPerMillion)/1e6};
}
export function assertCleanPayload(payload){
 assert(!/D29_PRIVATE_SENTINEL|D29_ORACLE_SENTINEL|D29_HIDDEN_SENTINEL|eval[_ -]?sentinel/i.test(payload),'Sensitive/evaluator sentinel in provider payload');
 const body=JSON.parse(payload),input=JSON.parse(body.messages[1].content);
 assert(!['assessment','expectation','nativeReferences','caseId','arm','repeat','oracle','groundTruth','expectedSelector'].some(key=>Object.hasOwn(input,key)),'Evaluator-only key leaked to provider input');
 assert.equal(body.store,false,'Provider must not request storage');
 return input;
}
