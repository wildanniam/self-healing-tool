// Independent board/reducer application, not a renamed inventory form.
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

export function shipmentMarkup(view = {}) {
  const shipments = [
    { id: 'CN-804', route: 'North depot → Seabrook', destination: '18 Quay Street', origin: 'North depot' },
    { id: 'CN-912', route: 'East depot → Meadowgate', destination: '42 Orchard Lane', origin: 'East depot' },
  ];
  const bindings = [];
  const button = (shipment, operation, id, label) => {
    bindings.push({id, shipmentId:shipment.id, operation});
    return `<button id="${id}" type="button">${escape(label)}</button>`;
  };
  const cards = shipments.map((shipment) => {
    const primary = shipment.id === 'CN-804';
    const editId = primary ? (view.original ? 'edit-destination-cn804' : 'dispatch-edit-address') : 'edit-destination-cn912';
    const label = primary && view.paraphrase ? 'Change delivery address' : 'Edit destination';
    const editor = !primary || view.available !== false ? button(shipment, 'edit-destination', editId, label) : '';
    const origin = button(shipment, 'edit-origin', primary ? 'edit-origin-cn804' : 'edit-origin-cn912', primary && view.ambiguous ? 'Edit destination' : 'Edit origin');
    const preview = button(shipment, 'preview', primary ? 'preview-cn804' : 'preview-cn912', 'Preview shipment');
    const actions = primary && view.ambiguous ? origin + editor + preview : editor + origin + preview;
    if (view.structure) return `<section class="dispatch-lane" aria-label="Shipment ${shipment.id}"><header><h2>Shipment ${shipment.id}</h2><p>${escape(shipment.route)}</p></header><aside class="actions"><div class="action-stack">${actions}</div></aside><p>Delivery: ${escape(shipment.destination)}</p></section>`;
    return `<article aria-label="Shipment ${shipment.id}"><h2>Shipment ${shipment.id}</h2><p>${escape(shipment.route)}</p><p>Delivery: ${escape(shipment.destination)}</p><div class="actions">${actions}</div></article>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Dispatch board</title><style>body{font:16px Georgia,serif;margin:0;background:#f9f5ec;color:#25211c}header.board{background:#283c37;color:white;padding:24px}main{padding:24px;max-width:1080px;margin:auto}.board-grid{display:flex;gap:24px;align-items:start}article,.dispatch-lane{background:white;border:1px solid #b9b4a8;padding:22px;flex:1}button{font:15px system-ui;padding:9px;margin:6px;border:1px solid #48685e;background:#e5efe9}.dispatch-lane{display:grid;grid-template-columns:1fr 1fr;margin-bottom:20px}.action-stack{display:flex;flex-direction:column}dialog{border:2px solid #48685e;padding:26px;min-width:280px}.editor-value{font-family:system-ui}</style></head><body><header class="board"><h1>Outbound dispatch</h1></header><main><div class="${view.structure ? 'lanes' : 'board-grid'}">${cards}</div><dialog id="shipment-panel"><h2 id="panel-title"></h2><p class="editor-value" id="panel-value"></p><button type="button" id="close-panel">Close panel</button></dialog></main><script>
(() => {
  const shipments = ${JSON.stringify(shipments)};
  let screen = {kind:'board',shipmentId:null,section:null};
  const journal = [];
  const actions = ${JSON.stringify(bindings)};
  function dispatch(action) {
    const shipment = shipments.find(item => item.id === action.shipmentId);
    screen = {kind:action.operation === 'preview' ? 'preview' : 'editor',shipmentId:shipment.id,section:action.operation === 'edit-destination' ? 'destination' : action.operation === 'edit-origin' ? 'origin' : null};
    journal.push(structuredClone(screen));
    document.getElementById('panel-title').textContent = screen.kind === 'preview' ? 'Shipment preview · ' + shipment.id : 'Edit ' + screen.section + ' · ' + shipment.id;
    document.getElementById('panel-value').textContent = screen.section === 'origin' ? shipment.origin : shipment.destination;
    document.getElementById('shipment-panel').showModal();
  }
  for (const action of actions) document.getElementById(action.id).addEventListener('click', () => dispatch(action));
  document.getElementById('close-panel').addEventListener('click', () => {document.getElementById('shipment-panel').close();screen={kind:'board',shipmentId:null,section:null};});
  Object.defineProperty(window, 'dispatchBoard', {configurable:true,value:Object.freeze({snapshot:()=>structuredClone({shipments,screen,journal})})});
})();
</script></body></html>`;
}
