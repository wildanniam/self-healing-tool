import type { Page, ElementHandle } from 'playwright';
import type { Action, Candidate, CandidateFeatures, Config, Context, SpecContext, Task } from './types.js';
import type { SpecEvidence } from './spec.js';
import { cleanContextText, redact } from './privacy.js';
import { serializeRequest } from './provider.js';
import { rankThesis } from './ranking.js';

/** Applied after all context/feedback changes; counts the actual complete request. */
export function fitContext(context: Context, config: Readonly<Config>): Context {
  const measure=()=>{
    const v=context.coverage;v.included=context.candidates.length;v.omitted=v.discovered-v.included;
    v.domChars=JSON.stringify(context.candidates).length+(context.cleanedDom?.length??0);
    for(let i=0;i<6;i++)v.payloadChars=serializeRequest(context,config).length;
  };
  measure();
  while(context.coverage.domChars>config.domMaxChars||context.coverage.payloadChars>config.payloadMaxChars){
    if(context.cleanedDom){context.cleanedDom=context.cleanedDom.slice(0,Math.max(0,context.cleanedDom.length-256));context.coverage.textTruncated=true;}
    else if(context.candidates.length)context.candidates.pop();
    else throw new Error('context_budget_exhausted');
    measure();
  }
  return context;
}
export async function collectContext(page: Page, action: Action, task: Task, config: Readonly<Config>, omitted: readonly string[], originalSelector='', targetSpec?: SpecContext): Promise<Context> {
  const extracted=await page.evaluate(({action,specMode})=>{
    const blocked='script,style,svg,head,noscript,iframe,canvas,[data-oracle],[data-evaluator],[data-healing-evaluator]';
    const compact=(s:string|null)=> (s??'').replace(/\s+/g,' ').trim();
    const text=(e:Element|null,limit=500)=>{
      if(!e||e.closest(blocked+', [hidden], [aria-hidden="true"]')||e.matches('input,textarea,select,[contenteditable="true"]'))return '';
      const clone=e.cloneNode(true) as Element;
      clone.querySelectorAll(blocked+',input,textarea,select,[contenteditable="true"],[hidden],[aria-hidden="true"]').forEach(n=>n.remove());
      const walker=document.createTreeWalker(clone,NodeFilter.SHOW_TEXT);const parts:string[]=[];while(walker.nextNode())parts.push(walker.currentNode.textContent??'');
      return compact(parts.join(' ')).slice(0,limit);
    };
    const q=(s:string)=>JSON.stringify(s);
    const attributes=['id','name','type','placeholder','role','aria-label','data-testid','data-test','data-cy','title'];
    const nodes=[...document.querySelectorAll('input,textarea,button,a,select,[role],[aria-label],[placeholder],[name],[data-testid],[data-test],[data-cy],[contenteditable="true"]')];
    const candidates:Candidate[]=[];
    for(const [order,e] of nodes.slice(0,5000).entries()){
      if(e.closest(blocked))continue;
      const tag=e.tagName.toLowerCase(),type=e.getAttribute('type')?.toLowerCase()??'',role=e.getAttribute('role')??'';
      const fillable=tag==='textarea'||e.getAttribute('contenteditable')==='true'||tag==='input'&&!['hidden','button','submit','reset','checkbox','radio','file','image','range','color'].includes(type);
      const clickable=['button','a','input','select'].includes(tag)||['button','link','tab','menuitem','option','checkbox','radio','switch'].includes(role);
      if(action==='fill'?!fillable:!clickable)continue;
      const style=getComputedStyle(e);
      const visible=!!e.getClientRects().length&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&!e.closest('[hidden],[aria-hidden="true"]');
      const disabled=e.matches(':disabled,[aria-disabled="true"]')||action==='fill'&&e.hasAttribute('readonly');
      const attr=Object.fromEntries(attributes.map(a=>[a,e.getAttribute(a)??'']));
      const classes=[...e.classList].filter(c=>c.length<30&&!/^css-/.test(c)).slice(0,5);
      const labels='labels' in e?[...((e as HTMLInputElement).labels??[])].map(n=>text(n,60)).join(' '):text(e.closest('label'),60);
      const ariaRefs=(e.getAttribute('aria-labelledby')??'').split(/\s+/).map(id=>text(document.getElementById(id),80)).join(' ').trim();
      const ownText=['input','textarea','select'].includes(tag)||e.getAttribute('contenteditable')==='true'?'':text(e,80);
      const label=attr['aria-label']||ariaRefs||labels||attr.placeholder||ownText||'';
      let container=e.closest('tr,li,article,dialog,[role="dialog"],[role="listitem"],[role="complementary"]');
      if(!container)for(let p=e.parentElement,depth=0;p&&depth<5;p=p.parentElement,depth++){
        const siblings=[...(p.parentElement?.children??[])];if(siblings.filter(s=>s.tagName===p!.tagName&&s.querySelector('button,input,textarea,[role="button"]')).length>1){container=p;break;}
      }
      const row=e.closest('tr');
      const rowContext=row?[...row.querySelectorAll('td,th')].slice(0,6).map(cell=>{const clone=cell.cloneNode(true) as Element;clone.querySelectorAll('button,a,input,textarea,select').forEach(n=>n.remove());return text(clone,160);}).filter(Boolean).join(' | ').slice(0,160):'';
      const parent=e.parentElement;
      const parentContext=parent?parent.tagName.toLowerCase()+(parent.id?'#'+parent.id:'')+[...parent.classList].filter(c=>c.length<20).slice(0,2).map(c=>'.'+c).join(''):'';
      const features:CandidateFeatures={id:attr.id,name:attr.name,placeholder:attr.placeholder,role,ariaLabel:attr['aria-label'],dataTestId:attr['data-testid'],dataTest:attr['data-test'],dataCy:attr['data-cy'],title:attr.title,classes,text:ownText,nearestLabel:labels||ariaRefs,rowContext,parentContext,containerContext:text(container),visible,disabled};
      if(specMode){
        const path=(raw:string|null)=>{if(!raw)return '';try{const u=new URL(raw,/^https?:/.test(document.baseURI)?document.baseURI:'http://localhost/');return ['http:','https:'].includes(u.protocol)?u.pathname:'';}catch{return '';}};
        const form='form' in e?(e as HTMLInputElement).form:e.closest('form');
        features.href=path(e.getAttribute('href'));features.formAction=path(e.getAttribute('formaction')??form?.getAttribute('action')??null);
      }
      const suggestions:string[]=[];
      if(attr.id)suggestions.push('#'+CSS.escape(attr.id));
      for(const a of ['data-testid','data-test','data-cy','name','aria-label','placeholder'])if(attr[a])suggestions.push(`[${a}=${q(attr[a]!)}]`);
      if(ownText)suggestions.push(`${tag}:text-is(${q(ownText)})`);
      if(labels)suggestions.push(`label:has-text(${q(labels)}) ${tag}`);
      for(const cls of classes)suggestions.push(`${tag}.${CSS.escape(cls)}`);
      // Generic heading/cell scope, never a business name or positional path.
      if(container&&container!==e){
        const heading=container.querySelector(':scope > h1,:scope > h2,:scope > h3,:scope > legend,:scope > td,:scope > th');
        const identity=text(heading,160);
        if(heading&&identity){const scope=container.tagName.toLowerCase()+`:has(> ${heading.tagName.toLowerCase()}:text-is(${q(identity)}))`;for(const base of [...suggestions])suggestions.push(`${scope} ${base}`);}
      }
      const unique=(s:string)=>{try{return document.querySelectorAll(s).length===1;}catch{return false;}};
      const ordered=[...suggestions.filter(unique),...suggestions.filter(s=>s.includes(':has(> ')),...suggestions];
      const suggestedLocators=[...new Set(ordered)].slice(0,16);
      candidates.push({selector:suggestedLocators[0]??tag,tag,type,label,container:text(container),containerKind:container?.tagName.toLowerCase()??'none',order,score:0,features,suggestedLocators});
    }
    const clone=document.documentElement.cloneNode(true) as Element;
    clone.querySelectorAll(blocked+', [hidden], [aria-hidden="true"]').forEach(n=>n.remove());
    clone.querySelectorAll('[contenteditable="true"]').forEach(n=>n.textContent='');
    for(const e of [clone,...clone.querySelectorAll('*')]){
      for(const a of [...e.attributes])if(!attributes.includes(a.name)&&!['class','for','aria-labelledby'].includes(a.name))e.removeAttribute(a.name);
      if(['textarea','select'].includes(e.tagName.toLowerCase()))e.textContent='';
    }
    const walker=document.createTreeWalker(clone,NodeFilter.SHOW_COMMENT);const comments:Node[]=[];while(walker.nextNode())comments.push(walker.currentNode);comments.forEach(n=>n.parentNode?.removeChild(n));
    return {candidates,cleanedDom:clone.outerHTML,scanTruncated:nodes.length>5000};
  },{action,specMode:targetSpec!==undefined});
  const clean=(s:string)=>cleanContextText(s,omitted);
  const safeSelector=(s:string)=>{const safe=clean(s);return safe===s&&!/\[redacted/.test(s)?safe:'';};
  const candidates=extracted.candidates.map(c=>{
    const f:CandidateFeatures={};
    for(const [key,value] of Object.entries(c.features??{})){
      if(typeof value==='boolean')Object.assign(f,{[key]:value});
      else if(Array.isArray(value))Object.assign(f,{[key]:value.map(clean).filter(Boolean)});
      else if(typeof value==='string')Object.assign(f,{[key]:clean(value)});
    }
    const suggestions=(c.suggestedLocators??[]).map(safeSelector).filter(Boolean);
    return {...c,label:clean(c.label),container:clean(c.container),type:clean(c.type),features:f,suggestedLocators:suggestions,selector:suggestions[0]??c.tag};
  });
  const cleanTask={description:clean(task.description),...(task.scope?{scope:clean(task.scope)}:{})};
  const failed=safeSelector(originalSelector);
  const ranked=rankThesis(candidates,action,cleanTask,failed);
  const selected=ranked.slice(0,config.maxCandidates);
  // Redaction also covers text/attribute values in the separately bounded fallback.
  const cleaned=redact(extracted.cleanedDom,omitted).split(/\r?\n/).filter(line=>!/(?:oracle|ground[\s_-]?truth|expected[\s_-]?(?:selector|locator)|eval[\s_-]?sentinel)/i.test(line)).join(' ').replace(/\s+/g,' ').trim();
  const context:Context={action,task:cleanTask,method:'thesis-aligned-v1',failure:{originalSelector:failed,classification:'missing-locator'},candidates:selected,
    ...(selected.length<5?{cleanedDom:cleaned.slice(0,selected.length?Math.floor(config.domMaxChars/2):config.domMaxChars)}:{}),
    coverage:{discovered:ranked.length,included:0,omitted:0,textTruncated:extracted.scanTruncated||cleaned.length>config.domMaxChars||extracted.candidates.some(c=>c.label.length>=500||c.container.length>=500||(c.features?.text?.length??0)>=80),domChars:0,payloadChars:0,domLimit:config.domMaxChars,payloadLimit:config.payloadMaxChars,candidateLimit:config.maxCandidates}};
  if(targetSpec!==undefined)context.targetSpec=structuredClone(targetSpec);
  fitContext(context,config);
  if(context.candidates.length<5&&context.cleanedDom===undefined){
    context.cleanedDom=cleaned.slice(0,context.candidates.length?Math.floor(config.domMaxChars/2):config.domMaxChars);
    fitContext(context,config);
  }
  return context;
}
/** Read only the resolved node about to receive the action, independently of the ranked snapshot. */
export async function collectSpecEvidence(handle: ElementHandle<Element>, omitted: readonly string[]): Promise<SpecEvidence> {
  const raw = await handle.evaluate(e => {
    const blocked='script,style,svg,head,noscript,iframe,canvas,[data-oracle],[data-evaluator],[data-healing-evaluator]';
    if(!e.isConnected||e.closest(blocked+', [hidden], [aria-hidden="true"]'))return {};
    const compact=(s:string|null)=>(s??'').replace(/\s+/g,' ').trim();
    const text=(node:Element|null,limit=500)=>{
      if(!node||node.closest(blocked+', [hidden], [aria-hidden="true"]')||node.matches('input,textarea,select,[contenteditable="true"]'))return '';
      const clone=node.cloneNode(true) as Element;
      clone.querySelectorAll(blocked+',input,textarea,select,[contenteditable="true"],[hidden],[aria-hidden="true"]').forEach(n=>n.remove());
      const walker=document.createTreeWalker(clone,NodeFilter.SHOW_TEXT),parts:string[]=[];
      while(walker.nextNode())parts.push(walker.currentNode.textContent??'');
      return compact(parts.join(' ')).slice(0,limit);
    };
    const attr=(name:string)=>e.getAttribute(name)??'';
    const tag=e.tagName.toLowerCase(),type=attr('type').toLowerCase();
    const classes=[...e.classList].filter(c=>c.length<30&&!/^css-/.test(c)).slice(0,5);
    const labels='labels' in e?[...((e as HTMLInputElement).labels??[])].map(n=>text(n,60)).join(' '):text(e.closest('label'),60);
    const ariaRefs=attr('aria-labelledby').split(/\s+/).map(id=>text(document.getElementById(id),80)).join(' ').trim();
    const ownText=['input','textarea','select'].includes(tag)||attr('contenteditable')==='true'?'':text(e,80);
    let container=e.closest('tr,li,article,dialog,[role="dialog"],[role="listitem"],[role="complementary"]');
    if(!container)for(let p=e.parentElement,depth=0;p&&depth<5;p=p.parentElement,depth++){
      const siblings=[...(p.parentElement?.children??[])];if(siblings.filter(s=>s.tagName===p!.tagName&&s.querySelector('button,input,textarea,[role="button"]')).length>1){container=p;break;}
    }
    const row=e.closest('tr');
    const rowContext=row?[...row.querySelectorAll('td,th')].slice(0,6).map(cell=>{const clone=cell.cloneNode(true) as Element;clone.querySelectorAll('button,a,input,textarea,select').forEach(n=>n.remove());return text(clone,160);}).filter(Boolean).join(' | ').slice(0,160):'';
    const parent=e.parentElement;
    const parentContext=parent?parent.tagName.toLowerCase()+(parent.id?'#'+parent.id:'')+[...parent.classList].filter(c=>c.length<20).slice(0,2).map(c=>'.'+c).join(''):'';
    const path=(value:string|null)=>{if(!value)return '';try{const u=new URL(value,/^https?:/.test(document.baseURI)?document.baseURI:'http://localhost/');return ['http:','https:'].includes(u.protocol)?u.pathname:'';}catch{return '';}};
    const form='form' in e?(e as HTMLInputElement).form:e.closest('form');
    return {label:attr('aria-label')||ariaRefs||labels||attr('placeholder')||ownText,tag,type,
      id:attr('id'),name:attr('name'),placeholder:attr('placeholder'),role:attr('role'),ariaLabel:attr('aria-label'),
      dataTestId:attr('data-testid'),dataTest:attr('data-test'),dataCy:attr('data-cy'),title:attr('title'),classes,
      text:ownText,nearestLabel:labels||ariaRefs,rowContext,parentContext,containerContext:text(container),container:text(container),
      href:path(e.getAttribute('href')),formAction:path(e.getAttribute('formaction')??form?.getAttribute('action')??null)};
  });
  return Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,Array.isArray(value)?value.map(v=>cleanContextText(v,omitted)):cleanContextText(value as string,omitted)]));
}
export function rankerSelection(context:Readonly<Context>,rejected:ReadonlySet<string>):string|null{
  for(const c of context.candidates)if(c.score>0)for(const s of c.suggestedLocators?.length?c.suggestedLocators:[c.selector])if(!rejected.has(s))return s;
  return null;
}
