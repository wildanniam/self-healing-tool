import { createHash } from 'node:crypto';
import { BRAND, ICONS, THEME_CSS, languageSwitch } from './report-theme.js';
export interface SuiteRow {
  testId: string;
  title: string;
  file: string;
  project: string;
  retry: number;
  status: string;
  expectedStatus: string;
  durationMs: number;
  outcome: string;
  report: string | null;
  reportError: string | null;
}
/** One wrapped action on the index. Derived from the copied report.json; never stored in results.json. */
export interface ActionSummary {
  action: string;
  description: string;
  state: 'recovered' | 'original' | 'stopped' | 'failed';
  originalSelector: string;
  selector: string | null;
  requests: number;
  ranker: boolean;
  totalMs: number | null;
}
interface ReportAttempt {
  selector?: string | null;
  proposedSelector?: string | null;
  actionExecuted?: boolean;
  providerCalled?: boolean;
  transportAttempted?: boolean | null;
}
interface ReportEvent {
  action?: string;
  description?: string;
  originalSelector?: string;
  recoveryTriggered?: boolean;
  actionExecuted?: boolean;
  stopReason?: string;
  timing?: { totalMs?: number };
  attempts?: ReportAttempt[];
}
export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const STOPS = ['abstained', 'spec-refused', 'spec-unknown'];
export function summarizeActions(view: unknown): ActionSummary[] {
  const report = view as { config?: { mode?: string }; events?: ReportEvent[] } | null;
  if (!report || !Array.isArray(report.events)) return [];
  const ranker = report.config?.mode === 'ranker-only';
  return report.events.map((e) => {
    const attempts = Array.isArray(e.attempts) ? e.attempts : [];
    const last = attempts[attempts.length - 1];
    const state = e.actionExecuted
      ? e.recoveryTriggered
        ? 'recovered'
        : 'original'
      : STOPS.includes(e.stopReason ?? '')
        ? 'stopped'
        : 'failed';
    return {
      action: String(e.action ?? ''),
      description: String(e.description ?? ''),
      state,
      originalSelector: String(e.originalSelector ?? ''),
      selector:
        state === 'recovered'
          ? (attempts.find((a) => a.actionExecuted)?.selector ?? null)
          : state === 'stopped'
            ? (last?.proposedSelector ?? last?.selector ?? null)
            : null,
      requests: attempts.filter((a) => a.providerCalled && a.transportAttempted === true).length,
      ranker: ranker && e.recoveryTriggered === true,
      totalMs: typeof e.timing?.totalMs === 'number' ? e.timing.totalMs : null,
    };
  });
}
const SUITE_CSS = `
.test-list {
  display: grid;
  gap: 16px;
}
.test-card {
  overflow: hidden;
}
.tc-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 24px;
}
.tc-head:not(:last-child) {
  border-bottom: 1px solid var(--line-2);
}
.tc-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  margin-top: 1px;
  border-radius: 50%;
}
.tc-icon.is-pass {
  background: var(--teal-bg);
  color: var(--teal);
}
.tc-icon.is-fail {
  background: var(--red-bg);
  color: var(--red);
}
.tc-icon.is-other {
  background: var(--slate-bg);
  color: var(--slate);
}
.tc-main {
  min-width: 0;
  flex: 1;
}
.tc-main h2 {
  margin: 0;
  font-size: 18px;
  overflow-wrap: anywhere;
}
.tc-main .file {
  margin: 2px 0 0;
  color: var(--muted);
  font: 13px/1.5 var(--mono);
  overflow-wrap: anywhere;
}
.tc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.tc-head .btn {
  flex: none;
  align-self: center;
}
.tc-missing {
  margin: 0;
  max-width: 320px;
  align-self: center;
  color: var(--muted);
  font-size: 13px;
}
.act-row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1.1fr) minmax(0, 2fr) auto;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
}
.act-row + .act-row {
  border-top: 1px solid var(--line-2);
}
.act-row .badge {
  justify-self: start;
}
.a-title b {
  display: block;
  font-size: 15px;
  overflow-wrap: anywhere;
}
.a-title span {
  color: var(--muted);
  font-size: 13px;
}
.flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
  color: var(--muted);
}
.flow code {
  font-size: 14px;
  overflow-wrap: anywhere;
}
.flow .from {
  color: var(--red);
  text-decoration: line-through;
  text-decoration-color: rgba(180, 35, 24, 0.45);
}
.flow .to {
  color: var(--teal);
  font-weight: 700;
}
.flow .proposed {
  color: var(--amber);
  font-weight: 700;
}
.flow .same {
  color: var(--ink-2);
}
.flow-note {
  font-size: 13px;
}
.a-stats {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  color: var(--muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.empty-actions {
  margin: 0;
  padding: 14px 24px;
  color: var(--muted);
  font-size: 14px;
}
.suite-note {
  margin: 20px 0 0;
}
.missing-note {
  margin: 0 0 20px;
  color: var(--amber);
}
@media (max-width: 760px) {
  .tc-head {
    flex-wrap: wrap;
    padding: 16px;
  }
  .tc-head .btn {
    width: 100%;
  }
  .act-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 14px 16px;
  }
  .a-stats {
    justify-content: flex-start;
  }
}
`;

export function renderSuite(
  data: { status: string; rows: SuiteRow[]; createdAt: string },
  initial: 'en' | 'id' = 'en',
  actions: Record<string, ActionSummary[]> = {},
): string {
  const e = escapeHtml;
  const text = (en: string, id: string) =>
    `<span data-en="${e(en)}" data-id="${e(id)}">${e(initial === 'en' ? en : id)}</span>`;
  const STATUS: Record<string, [string, string]> = {
    passed: ['Passed', 'Lulus'],
    failed: ['Failed', 'Gagal'],
    timedOut: ['Timed out', 'Batas waktu'],
    interrupted: ['Interrupted', 'Terhenti'],
    skipped: ['Skipped', 'Dilewati'],
    'not-run': ['Not run', 'Belum dijalankan'],
  };
  const SUITE: Record<string, [string, string]> = {
    passed: ['Suite passed', 'Suite lulus'],
    failed: ['Suite failed', 'Suite gagal'],
    timedout: ['Suite timed out', 'Suite melewati batas waktu'],
    interrupted: ['Suite interrupted', 'Suite terhenti'],
  };
  const STATE: Record<ActionSummary['state'], [string, string, string, string]> = {
    recovered: ['Recovered', 'Pulih', 'b-teal', ICONS.check],
    original: ['Original', 'Locator asli', 'b-slate', ''],
    stopped: ['Stopped', 'Berhenti', 'b-amber', ICONS.stop],
    failed: ['Failed', 'Gagal', 'b-red', ICONS.cross],
  };
  const label = (map: Record<string, [string, string]>, key: string) =>
    map[key] ? text(...map[key]) : e(key);
  const when = (locale: string) => {
    const date = new Date(data.createdAt);
    return Number.isNaN(date.getTime())
      ? data.createdAt
      : new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'shortOffset',
        }).format(date);
  };
  const seconds = (ms: number | null, digits = 2) =>
    ms === null ? '—' : `${(ms / 1000).toFixed(digits)} s`;
  const plural = (n: number, en: string, enMany: string, id: string) =>
    text(`${n} ${n === 1 ? en : enMany}`, `${n} ${id}`);
  // Playwright's title path starts with the spec file, which the card already shows.
  const heading = (title: string) => {
    const parts = title.split(' › ');
    return parts.length > 1 && /\.[cm]?[jt]sx?$/.test(parts[0]!)
      ? parts.slice(1).join(' › ')
      : title;
  };
  const safeLink = (row: SuiteRow) =>
    row.report && /^actions\/[a-f0-9-]+\/report\.html$/.test(row.report) ? row.report : null;
  const listed = data.rows.flatMap((row) => (row.report ? (actions[row.report] ?? []) : []));
  const count = (state: ActionSummary['state']) => listed.filter((a) => a.state === state).length;
  const requests = listed.reduce((sum, a) => sum + a.requests, 0);
  const finals = new Map<string, SuiteRow>();
  for (const row of data.rows)
    if (!finals.has(row.testId) || finals.get(row.testId)!.retry <= row.retry)
      finals.set(row.testId, row);
  const passed = [...finals.values()].filter((row) => row.status === 'passed').length;
  const flaky = [...finals.values()].filter((row) => row.outcome === 'flaky').length;
  const missing = data.rows.filter((row) => !row.report).length;
  const recovered = count('recovered'),
    stopped = count('stopped'),
    failed = count('failed');
  const kpi = (tone: string, title: string, value: string, sub: string) =>
    `<div class="kpi ${tone}">${title}<strong>${value}</strong><small>${sub}</small></div>`;
  const actionRow = (a: ActionSummary, index: number) => {
    const [en, id, tone, icon] = STATE[a.state];
    const from = `<code class="${a.state === 'original' ? 'same' : 'from'}">${e(a.originalSelector)}</code>`;
    const flow =
      a.state === 'original'
        ? `${from}<span class="flow-note">${text('worked as written', 'berhasil tanpa diganti')}</span>`
        : a.state === 'recovered'
          ? `${from}<span class="sr-only">${text('replaced by', 'diganti dengan')}</span>${ICONS.arrow}<code class="to">${e(a.selector)}</code>`
          : a.state === 'stopped' && a.selector
            ? `${from}${ICONS.arrow}<code class="proposed">${e(a.selector)}</code><span class="flow-note">${text('not executed', 'tidak dijalankan')}</span>`
            : `${from}<span class="flow-note">${a.state === 'stopped' ? text('no locator selected', 'tidak ada locator dipilih') : text('no replacement', 'tanpa pengganti')}</span>`;
    const source =
      a.state === 'original'
        ? text('no AI', 'tanpa AI')
        : a.requests > 0
          ? `<span class="chip c-ai">AI</span>`
          : a.ranker
            ? `<span class="chip c-neutral">Ranker</span>`
            : '';
    return (
      `<div class="act-row"><span class="badge ${tone}">${icon}${text(en, id)}</span>` +
      `<div class="a-title"><b>${e(a.description)}</b><span>${e(a.action)} · ${text('action', 'aksi')} ${String(index + 1).padStart(2, '0')}</span></div>` +
      `<div class="flow">${flow}</div><div class="a-stats">${source}<span>${seconds(a.totalMs)}</span></div></div>`
    );
  };
  const card = (row: SuiteRow) => {
    const link = safeLink(row),
      list = row.report ? actions[row.report] : undefined;
    const [icon, badge, mark] =
      row.status === 'passed'
        ? ['is-pass', 'b-teal', ICONS.check]
        : ['failed', 'timedOut', 'interrupted'].includes(row.status)
          ? ['is-fail', 'b-red', ICONS.cross]
          : ['is-other', 'b-slate', ''];
    return (
      `<article class="test-card card"><div class="tc-head"><span class="tc-icon ${icon}">${mark}</span>` +
      `<div class="tc-main"><h2>${e(heading(row.title))}</h2><p class="file">${e(row.file)}</p><div class="tc-meta">` +
      `<span class="badge ${badge}">${label(STATUS, row.status)}</span>` +
      (row.outcome === 'flaky'
        ? `<span class="chip c-warn">${text('Passed after retry', 'Lulus setelah retry')}</span>`
        : '') +
      (row.status !== row.expectedStatus && row.status !== 'not-run'
        ? `<span class="chip c-neutral"><span>${text('Expected', 'Diharapkan')}: ${label(STATUS, row.expectedStatus)}</span></span>`
        : '') +
      `<span class="chip c-neutral"><span>${text('project', 'proyek')}: ${e(row.project || 'default')}</span></span>` +
      `<span class="chip c-neutral"><span>${text('retry', 'ulangan')} ${row.retry}</span></span>` +
      `<span class="chip c-neutral">${seconds(row.durationMs, 1)}</span></div></div>` +
      (link
        ? `<a class="btn primary" href="${e(link)}">${text('Open report', 'Buka report')}${ICONS.arrow}</a>`
        : `<p class="tc-missing">${text('Report unavailable', 'Report tidak tersedia')}: ${e(row.reportError ?? '')}</p>`) +
      `</div>` +
      (list?.length
        ? list.map(actionRow).join('')
        : link
          ? `<p class="empty-actions">${text('No action summary in this report. Open it for details.', 'Ringkasan aksi tidak tersedia. Buka report untuk detailnya.')}</p>`
          : '') +
      `</article>`
    );
  };
  const script = `const s=document.querySelectorAll('#report-language [data-language]');s.forEach(b=>b.addEventListener('click',()=>{const l=b.dataset.language;document.documentElement.lang=l;s.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('[data-en]').forEach(el=>el.textContent=el.dataset[l]);}));`;
  const hash = createHash('sha256').update(script).digest('base64');
  const suiteTone = data.status === 'passed' ? 'is-pass' : SUITE[data.status] ? 'is-fail' : '';
  return (
    `<!doctype html><html lang="${initial}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">` +
    `<title>Self-healing · Test results</title><style>${THEME_CSS}${SUITE_CSS}</style></head><body>` +
    `<header class="topbar"><div class="topbar-in">${BRAND}<nav class="crumbs" aria-label="Breadcrumb"><b>${text('Test results', 'Hasil tes')}</b></nav>` +
    `<div class="top-actions"><span class="status-pill ${suiteTone}">${label(SUITE, data.status)}</span>${languageSwitch(initial)}</div></div></header>` +
    `<main class="page"><div class="title-row"><div><h1>${text('Test results', 'Hasil tes')}</h1>` +
    `<p class="meta">${text(when('en-GB'), when('id-ID'))} · ${plural(finals.size, 'test', 'tests', 'tes')}` +
    (data.rows.length > finals.size
      ? ` · ${plural(data.rows.length, 'attempt', 'attempts', 'percobaan')}`
      : '') +
    `</p></div><a class="btn" href="results.json">${ICONS.download}${text('Summary JSON', 'Ringkasan JSON')}</a></div>` +
    `<div class="kpis">` +
    kpi(
      'k-teal',
      text('Tests passed', 'Tes lulus'),
      `${passed}<small> / ${finals.size}</small>`,
      flaky
        ? plural(flaky, 'passed after retry', 'passed after retry', 'lulus setelah retry')
        : text('Playwright status', 'Status Playwright'),
    ) +
    kpi(
      'k-teal',
      text('Locators recovered', 'Locator dipulihkan'),
      String(recovered),
      requests
        ? plural(requests, 'AI request', 'AI requests', 'request AI')
        : text('No AI requests', 'Tanpa request AI'),
    ) +
    kpi(
      'k-amber',
      text('Stopped before acting', 'Berhenti sebelum aksi'),
      String(stopped),
      stopped ? text('No action was taken', 'Aksi tidak dijalankan') : text('None', 'Tidak ada'),
    ) +
    kpi(
      'k-red',
      text('Failed actions', 'Aksi gagal'),
      String(failed),
      failed
        ? text('Open the report for the cause', 'Buka report untuk penyebabnya')
        : text('None', 'Tidak ada'),
    ) +
    `</div>` +
    (missing
      ? `<p class="info-note missing-note">${ICONS.info}<span>${plural(missing, 'test attempt has no healing report.', 'test attempts have no healing report.', 'percobaan tes tanpa report healing.')}</span></p>`
      : '') +
    `<div class="test-list">${data.rows.map(card).join('') || `<p class="card empty-actions">${text('No tests recorded.', 'Belum ada tes yang direkam.')}</p>`}</div>` +
    `<p class="info-note suite-note">${ICONS.info}<span>${text('Playwright decides whether a test passes. Whether each recovery reached the intended target is assessed separately, inside the report.', 'Playwright menentukan apakah tes lulus. Apakah setiap pemulihan mengenai sasaran yang dimaksud dinilai terpisah di dalam report.')}</span></p>` +
    `</main><script>${script}</script></body></html>`
  );
}
