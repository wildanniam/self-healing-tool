import { createHash } from 'node:crypto';
import { inspectorClient, INSPECTOR_CSS } from './report-inspector.js';
import { UI_TEXT, languageClient } from './report-language.js';
import { BRAND, ICONS, THEME_CSS, languageSwitch } from './report-theme.js';
const embed = (value) =>
  JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
export function renderLibraryReport(view, data, initial = 'en') {
  const script = `const language=(${languageClient.toString()})(${embed(UI_TEXT)},${embed(initial)});language.bindStatic(document.documentElement);(${libraryClient.toString()})(${embed(view)},${embed(data)},${inspectorClient.toString()},language,${embed(ICONS)});`;
  const hash = createHash('sha256').update(script).digest('base64');
  return (
    `<!doctype html><html lang="${initial === 'id' ? 'id' : 'en'}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">` +
    `<title>Locator recovery report</title><style>${THEME_CSS}${INSPECTOR_CSS}${BASE_CSS}</style></head><body>` +
    `<header class="topbar"><div class="topbar-in">${BRAND}<nav class="crumbs" aria-label="Breadcrumb">` +
    `<!--playwright-test-crumbs--><b>Locator recovery report</b><!--/playwright-test-crumbs--></nav>` +
    `<div class="top-actions"><!--playwright-test-status--><button type="button" id="summary-download">${ICONS.download}<span>Evidence JSON</span></button>` +
    `${languageSwitch(initial)}</div></div></header>` +
    `<main id="inspector-root" class="page"></main>` +
    `<noscript><p class="page">This offline report needs JavaScript to display recorded evidence. The summary is also available in report.json.</p></noscript>` +
    `<script>${script}</script></body></html>`
  );
}
function libraryClient(view, data, createInspector, language, ICONS) {
  const inspector = createInspector(data, {
    ARMS: { run: { short: '', description: '' } },
    GROUPS: { library: 'Library' },
    CATEGORIES: { action: 'Action' },
    ICONS,
    language,
  });
  // Open the first action that needed recovery; a run of original actions opens its first action.
  const first = data.rows.find((r) => !(r.executed && !r.recovery)) ?? data.rows[0];
  if (first) inspector.open('library/' + first.caseId, { arm: 'run', repeat: 1 });
  else {
    const root = document.getElementById('inspector-root');
    const empty = () =>
      (root.innerHTML = `<p class="empty-run">${language.text('Tidak ada aksi self-healing yang direkam pada run ini.')}</p>`);
    language.subscribe(empty);
    empty();
  }
  document.getElementById('summary-download').onclick = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(view, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report-summary.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
const BASE_CSS = `
.empty-run {
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  color: var(--muted);
}
noscript .page {
  color: var(--muted);
}
`;
