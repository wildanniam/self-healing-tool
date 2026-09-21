import {createCases as knownCases,nativeReferences as knownReferences} from './holdout/cases.mjs';

// Prespecified evaluator-only mutations. No outcome or answer is given to the healer.
export const scopeOf = item => item.fresh ? 'ordinary-new' : item.kind==='control' ? 'control' : item.kind==='ambiguity-distractor' ? 'misleading-label-stress' : ['missing-spec','stale-spec'].includes(item.kind) ? 'contract-quality' : ['target-absent','explicitly-retired'].includes(item.kind) ? 'negative' : 'ordinary-known';

export function createCases(){
  const known=knownCases();
  const fresh=[];
  for(const [prefix,group] of [['h1','warehouse-inventory'],['h2','shipment-destination']]){
    for(const [index,kind] of ['attribute-drift','structure-drift','semantic-paraphrase'].entries()){
      const base=known.find(c=>c.group===group&&c.kind===kind);
      const ref=knownReferences(base);
      const setup=async page=>{
        await base.setup(page);
        await page.locator(ref.intended).evaluate((target,{kind,warehouse})=>{
          if(kind==='attribute-drift'){
            // Preserve explicit label relationships and already attached event handlers.
            const id=warehouse?'inventory-replenishment-value':'delivery-address-action';
            for(const label of target.labels??[])label.htmlFor=id;
            target.id=id;
            target.className='updated-control';
            if(warehouse)target.setAttribute('name','minimum_inventory_amount');
          }else if(kind==='structure-drift'){
            const wrapper=document.createElement('div');
            wrapper.className='settings-control-wrapper';
            target.replaceWith(wrapper);wrapper.append(target);
            // Ordinary control ordering changes do not alter its function or owner.
            if(!warehouse)wrapper.parentElement.append(wrapper);
          }else if(warehouse){
            for(const label of target.labels??[])label.textContent='Replenishment threshold';
          }else{
            target.textContent='Update delivery address';
          }
        },{kind,warehouse:prefix==='h1'});
      };
      fresh.push({...base,id:`${prefix==='h1'?'n1':'n2'}-0${index+1}`,fresh:true,sourceCaseId:base.id,setup,reset:setup});
    }
  }
  return [...known,...fresh].map(item=>({...item,scope:scopeOf(item)}));
}

export function nativeReferences(item){
  const refs=knownReferences(item);
  if(item.fresh&&item.kind==='attribute-drift')return {...refs,intended:item.group==='warehouse-inventory'?'#inventory-replenishment-value':'#delivery-address-action'};
  return refs;
}
