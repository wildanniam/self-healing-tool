// Synthetic application implementation. It imports no healer or evaluator oracle.
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

export function warehouseMarkup(view = {}) {
  const rows = [
    { key: 'harbor', title: 'Harbor warehouse', reorderLevel: 12, targetStock: 80 },
    { key: 'upland', title: 'Upland warehouse', reorderLevel: 8, targetStock: 55 },
  ];
  const bindings = [];
  const field = (row, key, label, id, name) => {
    bindings.push({ id, warehouse: row.key, field: key });
    const input = `<label for="${id}">${escape(label)}</label><input id="${id}" name="${name}" type="number" value="${row[key]}" min="0" aria-describedby="${row.key}-hint">`;
    return view.structure ? `<div class="setting"><div class="setting-control">${input}</div></div>` : input;
  };
  const rowsHtml = rows.map((row) => {
    const primary = row.key === 'harbor';
    let reorder = '';
    if (!primary || view.available !== false) {
      const id = primary ? (view.original ? 'harbor-reorder-level' : 'stock-limit-editor') : 'upland-reorder-level';
      const name = primary && view.attribute ? 'stock_trigger_value' : 'reorder_level';
      const label = primary && view.paraphrase ? 'Minimum stock before replenishment' : 'Reorder level';
      reorder = field(row, 'reorderLevel', label, id, view.ambiguous && primary ? 'quantity_b' : name);
    } else {
      reorder = `<p>Reorder level: <output>${row.reorderLevel}</output></p>`;
    }
    const other = field(row, 'targetStock', primary && view.ambiguous ? 'Reorder level' : 'Target stock', primary ? 'harbor-target-stock' : 'upland-target-stock', primary && view.ambiguous ? 'quantity_a' : 'target_stock');
    const controls = primary && view.ambiguous ? other + reorder : reorder + other;
    if (view.structure) return `<fieldset aria-label="${row.title}"><legend>${row.title}</legend><p id="${row.key}-hint">Units held at this warehouse</p><div class="settings-grid">${controls}</div></fieldset>`;
    return `<tr aria-label="${row.title}"><th scope="row">${row.title}<small id="${row.key}-hint">Units held at this warehouse</small></th><td>${controls}</td></tr>`;
  }).join('');
  const settings = view.structure ? `<section class="warehouse-settings">${rowsHtml}</section>` : `<table><caption>Warehouse replenishment settings</caption><tbody>${rowsHtml}</tbody></table>`;
  const initial = Object.fromEntries(rows.map(({ key, reorderLevel, targetStock }) => [key, { reorderLevel, targetStock }]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Warehouse inventory</title><style>body{font:16px system-ui;margin:24px;color:#152330;background:#f2f5f7}main{max-width:920px;margin:auto}table{width:100%;border-collapse:collapse;background:white}th,td{padding:18px;text-align:left;border-bottom:1px solid #b5c0c9}small{display:block;font-weight:400}label{display:block;margin-top:12px}input{font:inherit;padding:8px;width:190px}button{font:inherit;margin-top:18px;padding:10px 22px}fieldset{margin:18px 0;background:white;padding:20px}.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}output{font-weight:bold}</style></head><body><main><h1>Inventory replenishment</h1><p>Manage replenishment settings independently for each warehouse.</p><form id="inventory-settings">${settings}<button type="submit">Save warehouse settings</button><p role="status" id="save-status"></p></form></main><script>
(() => {
  let stored = ${JSON.stringify(initial)};
  let draft = structuredClone(stored);
  const history = [];
  const bindings = ${JSON.stringify(bindings)};
  for (const binding of bindings) {
    document.getElementById(binding.id).addEventListener('input', (event) => {
      const value = Number(event.currentTarget.value);
      draft[binding.warehouse][binding.field] = value;
      history.push({type:'input', warehouse:binding.warehouse, field:binding.field, value});
    });
  }
  document.getElementById('inventory-settings').addEventListener('submit', (event) => {
    event.preventDefault();
    stored = structuredClone(draft);
    history.push({type:'save'});
    document.getElementById('save-status').textContent = 'Warehouse settings saved';
  });
  Object.defineProperty(window, 'warehouseApp', {configurable:true,value:Object.freeze({snapshot:()=>structuredClone({stored,draft,history})})});
})();
</script></body></html>`;
}
