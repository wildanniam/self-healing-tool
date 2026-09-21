// Independent synthetic application renderers. Neither renderer receives a target,
// oracle selector, expected result, case ID, arm, or ranking strategy.
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const js = value => JSON.stringify(value).replaceAll('<', '\\u003c');

function controlId(family, owner, field, index, options) {
  if (options.mutation === 'A' && options.pristine) return `${owner.key}-${field.replaceAll('_', '-')}`;
  return `${family}-control-${String(index + 1).padStart(3, '0')}`;
}

export function warehouseMarkup(owners, options) {
  const bindings = [];
  const rows = owners.map((owner, ownerIndex) => {
    const controls = [['reorder_level', 'Reorder level', 'reorderLevel'], ['target_stock', 'Target stock', 'targetStock']].map(([name, label, field], fieldIndex) => {
      const id = controlId('inventory', owner, name, ownerIndex * 2 + fieldIndex, options);
      bindings.push({ id, warehouse: owner.key, field });
      const text = options.profile === 'U' ? `${owner.title}: ${label}` : label;
      const control = `<label for="${id}">${escape(text)}<input id="${id}" name="${name}" type="number" value="${owner[field]}" min="0"></label>`;
      return options.mutation === 'S' && !options.pristine ? `<div class="setting-wrapper"><div class="setting-control">${control}</div></div>` : control;
    }).join('');
    return `<fieldset class="warehouse-card"><legend>${escape(owner.title)}</legend><div class="fields">${controls}</div></fieldset>`;
  }).join('');
  const initial = Object.fromEntries(owners.map(owner => [owner.key, { reorderLevel: owner.reorderLevel, targetStock: owner.targetStock }]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Warehouse inventory</title><style>body{font:16px system-ui;margin:20px;color:#152330}main{max-width:900px;margin:auto}fieldset{margin:16px 0;padding:14px}label{display:block;margin:8px}input{display:block;font:inherit;padding:6px}.fields{display:flex;gap:20px}button{font:inherit;padding:8px}</style></head><body><main><h1>Warehouse replenishment</h1><p>Manage each warehouse independently.</p><form id="warehouse-settings">${rows}<button type="submit">Save warehouse settings</button><p role="status" id="save-status"></p></form></main><script>
(() => {
  let stored = ${js(initial)};
  let draft = structuredClone(stored);
  const history = [];
  for (const binding of ${js(bindings)}) {
    document.getElementById(binding.id).addEventListener('input', event => {
      const value = Number(event.currentTarget.value);
      draft[binding.warehouse][binding.field] = value;
      history.push({type:'input', warehouse:binding.warehouse, field:binding.field, value});
    });
  }
  document.getElementById('warehouse-settings').addEventListener('submit', event => {
    event.preventDefault(); stored = structuredClone(draft); history.push({type:'save'});
    document.getElementById('save-status').textContent = 'Warehouse settings saved';
  });
  Object.defineProperty(window, 'warehouseApp', {configurable:true, value:Object.freeze({snapshot:()=>structuredClone({stored,draft,history})})});
})();
</script></body></html>`;
}

export function shipmentMarkup(owners, options) {
  const bindings = [];
  const rows = owners.map((owner, ownerIndex) => {
    const controls = [['destination', 'Edit destination'], ['origin', 'Edit origin']].map(([section, label], fieldIndex) => {
      const id = controlId('dispatch', owner, section, ownerIndex * 2 + fieldIndex, options);
      bindings.push({ id, shipmentId: owner.shipmentId, section });
      const text = options.profile === 'U' ? `${label} ${owner.shipmentId}` : label;
      const control = `<button id="${id}" name="${section}" type="button">${escape(text)}</button>`;
      return options.mutation === 'S' && !options.pristine ? `<div class="action-wrapper"><div class="action-control">${control}</div></div>` : control;
    }).join('');
    return `<article class="shipment-card"><h2>Shipment ${escape(owner.shipmentId)}</h2><p>${escape(owner.route)}</p><div class="actions">${controls}</div></article>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Shipment dispatch</title><style>body{font:16px system-ui;margin:20px;color:#25211c}main{max-width:900px;margin:auto}article{margin:16px 0;border:1px solid #aaa;padding:14px}.actions{display:flex;gap:14px}button{font:inherit;padding:8px}dialog{padding:25px;min-width:280px}</style></head><body><main><h1>Outbound dispatch</h1>${rows}<dialog id="shipment-panel"><h2 id="panel-title"></h2><p id="panel-value"></p><button id="close-panel" type="button">Close editor</button></dialog></main><script>
(() => {
  const shipments = ${js(owners.map(({shipmentId,origin,destination})=>({shipmentId,origin,destination})))};
  let screen = {kind:'board',shipmentId:null,section:null};
  const journal = [];
  for (const binding of ${js(bindings)}) {
    document.getElementById(binding.id).addEventListener('click', () => {
      const shipment = shipments.find(item => item.shipmentId === binding.shipmentId);
      screen = {kind:'editor',shipmentId:shipment.shipmentId,section:binding.section};
      journal.push(structuredClone(screen));
      document.getElementById('panel-title').textContent = 'Edit ' + binding.section + ' · ' + shipment.shipmentId;
      document.getElementById('panel-value').textContent = shipment[binding.section];
      document.getElementById('shipment-panel').showModal();
    });
  }
  document.getElementById('close-panel').addEventListener('click',()=>{
    document.getElementById('shipment-panel').close(); screen={kind:'board',shipmentId:null,section:null};
  });
  Object.defineProperty(window,'dispatchBoard',{configurable:true,value:Object.freeze({snapshot:()=>structuredClone({shipments,screen,journal})})});
})();
</script></body></html>`;
}

// Renderer-side IDs are uniform application bindings, never oracle markers.
export function renderedControlId(family, owner, field, index, options) {
  return controlId(family === 'W' ? 'inventory' : 'dispatch', owner, field, index, options);
}
