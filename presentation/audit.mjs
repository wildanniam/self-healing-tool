import {createHash} from 'node:crypto';

const digest=value=>createHash('sha256').update(value).digest('hex');
const sensitiveKey=/^(?:authorization|cookie|cookies|set-cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|password|storageState|headers|environment|env)$/i;
function scrubText(value){
  return value.replace(/\bsk-(?:proj-)?[a-zA-Z0-9_-]{16,}/g,'[redacted-key]')
    .replace(/\bBearer\s+[a-zA-Z0-9._~+\/-]{8,}/gi,'Bearer [redacted]')
    .replace(/("(?:password|apiKey|accessToken|refreshToken|authorization|cookie)"\s*:\s*")[^"\r\n]*(")/gi,'$1[redacted]$2');
}
export function diagnosticData(value){
  if(typeof value==='string')return scrubText(value);
  if(Array.isArray(value))return value.map(diagnosticData);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!sensitiveKey.test(key)&&!['__proto__','constructor','prototype'].includes(key)).map(([k,v])=>[k,diagnosticData(v)]));
  return value??null;
}
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value?.[k]!==undefined).map(k=>[k,diagnosticData(value[k])]));
const eventKeys=['id','action','originalSelector','task','originalFailure','recoveryTriggered','actionExecuted','stopReason','failure','originalMs','internalMs','retryMs','totalMs','semantic','targetSpec'];
const attemptKeys=['id','number','selector','proposedSelector','candidateAccepted','actionExecuted','failure','reason','usage','validations','providerMetadata','providerCalled','transportAttempted','durationMs','providerMs','actionMs','inputContext','inputCoverage','inputSha256','specDecision','observationRefresh'];

/** No headers, environment, response envelopes, or private source files are accepted. */
export function requestEvidence(packet,attemptHash){
  if(typeof packet?.payload!=='string')return {status:'missing',body:null,sha256:null,integrity:'unavailable'};
  const raw=packet.payload, actual=digest(raw);
  let parsed;try{parsed=JSON.parse(raw);}catch{return {status:'invalid',body:null,sha256:actual,integrity:'invalid-json'};}
  const permitted=['model','temperature','max_tokens','response_format','store','messages'];
  const shape=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&Object.keys(parsed).every(k=>permitted.includes(k))&&Array.isArray(parsed.messages)&&parsed.messages.every(m=>m&&typeof m==='object'&&!Array.isArray(m)&&Object.keys(m).every(k=>['role','content'].includes(k))&&['system','user','assistant'].includes(m.role)&&typeof m.content==='string');
  if(!shape)return {status:'withheld',body:null,sha256:actual,integrity:'unsupported-body-fields'};
  const body=scrubText(raw), changed=body!==raw;
  const declared=packet.sha256??null;
  const matches=declared===actual&&(attemptHash==null||attemptHash===actual);
  return {status:changed?'redacted':'recorded',body,sha256:actual,declaredSha256:declared,attemptSha256:attemptHash??null,
    integrity:matches?'verified':declared==null?'unavailable':'mismatch',bytes:Buffer.byteLength(raw),ordinal:packet.ordinal??packet.number??null};
}

export function buildAudit(record,{privateHost=false,source=null,mode='historical-d30'}={}){
  const event=privateHost?record.event:record.run?.events?.[0];
  if(!event)return {version:1,privateHost,mode,source,event:null,attempts:[],missing:['Event runtime tidak tersedia.']};
  const packets=privateHost?record.requests??[]:record.requestPayloads??[];
  let ordinal=0;
  const numbered=packets.some(p=>p.ordinal!=null||p.number!=null);
  const attempts=(event.attempts??[]).map(attempt=>{
    if(attempt.providerCalled)ordinal++;
    const packet=attempt.providerCalled?(numbered?packets.find(p=>(p.ordinal??p.number)===ordinal):packets[ordinal-1]):null;
    const response=typeof packet?.output==='string'?{status:mode==='replay'?'replayed':'recorded',text:scrubText(packet.output)}
      :{status:'parsed-only',text:null};
    return {...pick(attempt,attemptKeys),request:requestEvidence(packet,attempt.inputSha256),response};
  });
  return {version:1,privateHost,mode,source,event:pick(event,eventKeys),initialContext:diagnosticData(event.context),attempts,
    config:pick(record.run?.config??record.config,['mode','model','maxTokens','temperature','maxAttempts','actionTimeoutMs','recoveryTimeoutMs','providerTimeoutMs','domMaxChars','payloadMaxChars','maxCandidates']),
    outcome:privateHost?pick(record,['correct','wrongEffect','oracleCorrect','guardUnchanged','correctRefusal','unnecessaryRefusal','controlInterference','outcome','operationalFailure']):{assessment:diagnosticData(record.assessment),expectation:diagnosticData(record.expectation)},
    assessments:diagnosticData(privateHost?record.assessments:record.run?.assessments),
    calls:privateHost?(record.calls??[]).map(c=>pick(c,['selector','action','effects','executed','startedAt','completedAt'])):null,
    missing:['DOM mentah sebelum cleansing dan daftar elemen yang dibuang tidak direkam.',
      'Rincian kontribusi setiap bobot ranking tidak direkam; skor akhir dan fitur kandidat tersedia jika recovery berjalan.',
      ...(attempts.some(a=>a.response.status==='parsed-only')?['Respons mentah AI tidak direkam untuk sebagian attempt; hanya locator hasil parsing tersedia.']:[])]};
}

/** Shareable summary is a projection, never a hidden copy of local diagnostics. */
export function withoutPrivateAudit(data){
  return {...data,privateAudit:false,rows:data.rows.map(row=>{if(!row.audit?.privateHost)return row;const {audit,...rest}=row;return rest;})};
}
