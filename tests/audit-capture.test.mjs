import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAuditCapture} from '../dist/audit-capture.js';
import {createOpenAIProvider,validateConfig,serializeRequest} from '../dist/index.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const body=(text='hello')=>JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:JSON.stringify({task:{description:text}})}]});
test('OBS-012 captured bytes, attempt identity, redaction and late capture stay explicit',()=>{
 const cap=createAuditCapture('run'),one=cap.attempt('event','one'),two=cap.attempt('event','two');
 const payload=body('a "quoted" future fill');one.sink.request(payload);one.response('{"selector":"#one"}');one.close();one.sink.request(body('late'));one.response('late');
 two.response('invalid model output');two.close();
 let snap=cap.snapshot([]);assert.equal(snap.entries[0].request.text,payload);assert.equal(snap.entries[0].request.sha256,hash(payload));assert.equal(snap.entries[1].request.status,'missing');
 snap=cap.snapshot(['a "quoted" future fill']);assert.equal(snap.entries[0].request.status,'redacted');assert.equal(JSON.parse(JSON.parse(snap.entries[0].request.text).messages[0].content).task.description,'[redacted]');assert.equal(snap.entries[0].request.sha256,hash(payload));
 snap.entries[1].response.text='mutated';assert.equal(cap.snapshot([]).entries[1].response.text,'invalid model output');
});
test('OBS-012 rejects request envelopes and bounds output retention without truncating into fake exact text',()=>{
 const cap=createAuditCapture('run'),a=cap.attempt('e','a');a.sink.request(JSON.stringify({headers:{Authorization:'private'},messages:[]}));a.response('x'.repeat(128001));a.close();
 assert.equal(cap.snapshot([]).entries[0].request.status,'withheld');assert.equal(cap.snapshot([]).entries[0].response.text,null);
 const b=cap.attempt('e','b');b.sink.request(body());b.sink.request(body('duplicate'));assert.equal(cap.snapshot([]).entries[1].request.text,body());
});
test('OBS-012 OpenAI adapter captures the body dispatched, independent of sink failures',async()=>{
 const config=validateConfig({mode:'full'}),provider=createOpenAIProvider({apiKey:'offline-fixture-key',config,maxRequests:2});
 const context={action:'click',task:{description:'Open'},candidates:[],coverage:{}};
 const original=globalThis.fetch;const sent=[];let captured;
 globalThis.fetch=async(url,options)=>{sent.push(options.body);return new Response(JSON.stringify({choices:[{message:{content:'{"selector":null}'},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:1}}));};
 try{
 await provider.select(context,new AbortController().signal,{request(x){captured=x;}});
 assert.equal(captured,sent[0]);assert.equal(captured,serializeRequest(context,config));
 await provider.select(context,new AbortController().signal,{request(){throw new Error('diagnostic-only');}});assert.equal(sent.length,2);
 }finally{globalThis.fetch=original;}
});
