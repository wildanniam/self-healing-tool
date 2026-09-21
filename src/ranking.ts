import type { Action, Candidate, Task } from './types.js';
/** The thesis's published additive signals, independently expressed for click/fill. */
const words = (value = '') => value.toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ').split(/[\s_-]+/).filter(w => w.length > 1);
const overlap = (left: string[], right: string[]) => left.filter(w => new Set(right).has(w)).length;
const clickTags = ['button','a','div','span','li','img'];
const roles = {fill:['textbox','combobox','searchbox','spinbutton'],click:['button','link','menuitem','tab','option','checkbox','radio','switch']};
const generic = new Set(['info-circle','question-circle','close-circle','search','filter','down','ellipsis','more','clock-circle','calendar']);
export function rankThesis(candidates: Candidate[], action: Action, task: Task, oldSelector = ''): Candidate[] {
  const old = words(oldSelector.replace(/[#.\[\]='":>~+()]/g,' ')), step = words(`${task.description} ${task.scope ?? ''}`);
  const frequency = new Map<string,number>();
  const signatures = (c: Candidate) => [c.features?.text ? 'text:'+c.features.text.toLowerCase().trim() : '', c.features?.ariaLabel ? 'aria:'+c.features.ariaLabel.toLowerCase().trim() : '', ...(c.suggestedLocators ?? []).map(s=>'locator:'+s)].filter(Boolean);
  for (const c of candidates) for (const key of signatures(c)) frequency.set(key,(frequency.get(key)??0)+1);
  return candidates.map(c => {
    const f=c.features??{}, all=words([f.id,f.name,f.placeholder,f.ariaLabel,f.text,f.nearestLabel,f.dataTestId,f.dataTest,f.dataCy,f.title,f.rowContext,f.parentContext,f.containerContext,...(f.classes??[])].filter(Boolean).join(' '));
    const a=overlap(old,all),b=overlap(step,all),dup=Math.max(1,...signatures(c).map(s=>frequency.get(s)??1));
    let score=a*15+b*10;
    if((action==='fill'?['input','textarea']:clickTags).includes(c.tag))score+=5;
    if(roles[action].includes(f.role??''))score+=8;
    for(const [key,bonus] of Object.entries({dataTestId:6,dataTest:5,dataCy:5,id:4,name:4,ariaLabel:3,placeholder:2}))if(f[key as keyof typeof f])score+=bonus;
    if(f.visible===true)score+=3;if(f.visible===false)score-=20;if(f.disabled)score-=20;
    if(dup>1){score-=Math.min(dup*2,20);if(a===0&&b===0&&f.ariaLabel&&(!f.text||f.text.toLowerCase()===f.ariaLabel.toLowerCase())&&(f.role==='img'||generic.has(f.ariaLabel.toLowerCase())))score-=30;}
    const id=oldSelector.match(/^#([\w-]+)$/);if(id&&f.id===id[1])score+=50;
    const attr=oldSelector.match(/\[(\w[\w-]*)=['"]?([^'"\]]+)['"]?\]/);
    if(attr){const fields:Record<string,string>={name:'name','data-testid':'dataTestId','data-test':'dataTest','data-cy':'dataCy',placeholder:'placeholder'};const key=fields[attr[1]!];if(key&&f[key as keyof typeof f]===attr[2])score+=attr[1]==='placeholder'?25:30;}
    const ot=overlap(old,words(f.text)),st=overlap(step,words(f.text));score+=ot*8+st*6+(ot>=2||st>=2?12:0);
    score+=overlap(old,words(f.rowContext))*8+overlap(step,words(f.rowContext))*12;
    score+=(overlap(old,words(f.parentContext))+overlap(step,words(f.parentContext)))*5;
    score+=overlap(step,words(f.containerContext))*8;
    return {...c,score,duplicateCount:dup};
  }).sort((a,b)=>b.score-a.score||a.order-b.order);
}
