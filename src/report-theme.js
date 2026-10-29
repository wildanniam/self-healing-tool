/** Shared visual system for the suite index, action reports and the evaluation explorer. */
const svg = (body, size = 16, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;

/** Inline icons; every use sits next to a text label. */
export const ICONS = {
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 14, ' stroke-width="2.6"'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 18),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', 18),
  warning: svg('<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.5h.01"/>', 22),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>', 13, ' stroke-width="2.4"'),
  cross: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', 13, ' stroke-width="2.6"'),
};

export const BRAND_MARK =
  '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<circle cx="12" cy="12" r="8.5" fill="none" stroke="#5EEAD4" stroke-width="1.7"/>' +
  '<path d="M12 1.8v4M12 18.2v4M1.8 12h4M18.2 12h4" stroke="#5EEAD4" stroke-width="1.7" stroke-linecap="round"/>' +
  '<path d="M8.6 12.2l2.3 2.3 4.6-4.8" fill="none" stroke="#E8F0F2" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export const BRAND = `<span class="brand">${BRAND_MARK}<span>Self-Healing</span><em>Report</em></span>`;

/** EN|ID switch. The language client and the suite script both look for #report-language. */
export const languageSwitch = (initial = 'en') =>
  '<div class="seg" id="report-language" role="group" aria-label="Language / Bahasa">' +
  `<button type="button" data-language="en" lang="en" title="English" aria-pressed="${initial !== 'id'}">EN</button>` +
  `<button type="button" data-language="id" lang="id" title="Bahasa Indonesia" aria-pressed="${initial === 'id'}">ID</button></div>`;

export const THEME_CSS = `
:root {
  --bg: #f5f7f8;
  --surface: #ffffff;
  --surface-2: #f9fbfb;
  --line: #e2e8eb;
  --line-2: #edf1f3;
  --ink: #0f2530;
  --ink-2: #2e4a57;
  --muted: #5b6f7a;
  --navy: #0e2a36;
  --navy-2: #173b4a;
  --on-navy: #e8f0f2;
  --on-navy-muted: #a9bfc6;
  --teal: #0f766e;
  --teal-bg: #e3f4f0;
  --teal-line: #a7dccf;
  --teal-fill: #14b8a6;
  --amber: #9a4a06;
  --amber-bg: #fdf1df;
  --amber-line: #f3cf98;
  --amber-fill: #f59e0b;
  --red: #b42318;
  --red-bg: #fdecea;
  --red-line: #f4b7af;
  --red-fill: #f97066;
  --slate: #475569;
  --slate-bg: #edf1f4;
  --slate-line: #d3dce3;
  --slate-fill: #94a3b8;
  --ai: #3446b8;
  --ai-bg: #eaedfc;
  --ai-line: #c3cbf5;
  --ai-fill: #6172e0;
  --code-bg: #0e1b24;
  --code-ink: #d5e1e6;
  --code-muted: #8fa5b0;
  --focus: #2563eb;
  --r-lg: 16px;
  --r: 12px;
  --r-sm: 8px;
  --shadow: 0 1px 2px rgba(14, 42, 54, 0.06), 0 8px 24px rgba(14, 42, 54, 0.06);
  --font: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
}
* {
  box-sizing: border-box;
}
html {
  background: var(--bg);
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 15px/1.5 var(--font);
  -webkit-font-smoothing: antialiased;
}
[hidden] {
  display: none !important;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
h1,
h2,
h3 {
  color: var(--ink);
  line-height: 1.25;
}
a {
  color: var(--teal);
  text-underline-offset: 3px;
}
code,
pre {
  font-family: var(--mono);
}
button,
select,
input {
  font: inherit;
  color: inherit;
}
button,
summary {
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}
button,
select {
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink-2);
  padding: 0 14px;
}
select {
  padding: 0 34px 0 12px;
}
button:hover:not(:disabled) {
  background: var(--surface-2);
  border-color: var(--slate-line);
}
label {
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}
.topbar {
  background: var(--navy);
  color: var(--on-navy);
  --focus: #7dd3fc;
}
.topbar-in {
  max-width: 1240px;
  margin: 0 auto;
  min-height: 64px;
  padding: 10px 32px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 20px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  white-space: nowrap;
}
.brand em {
  font-style: normal;
  font-weight: 500;
  color: var(--on-navy-muted);
}
.crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 240px;
  color: var(--on-navy-muted);
  font-size: 14px;
}
.crumbs a {
  color: var(--on-navy-muted);
  white-space: nowrap;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}
.crumbs a:hover {
  color: var(--on-navy);
  text-decoration: underline;
}
.crumbs b {
  color: var(--on-navy);
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crumbs .sep {
  opacity: 0.55;
}
.top-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  padding: 2px 12px;
  border-radius: 999px;
  background: rgba(169, 191, 198, 0.16);
  color: var(--on-navy);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.status-pill::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--slate-fill);
}
.status-pill.is-pass {
  background: rgba(20, 184, 166, 0.16);
  color: #7ee8d8;
}
.status-pill.is-pass::before {
  background: #2dd4bf;
}
.status-pill.is-fail {
  background: rgba(249, 112, 102, 0.18);
  color: #ffb9b0;
}
.status-pill.is-fail::before {
  background: #f97066;
}
.status-pill.is-archive {
  background: rgba(245, 158, 11, 0.16);
  color: #fbcb7a;
}
.status-pill.is-archive::before {
  background: #f59e0b;
}
.topbar button,
.top-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(232, 240, 242, 0.24);
  background: transparent;
  color: var(--on-navy);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  padding: 0 12px;
  min-height: 44px;
  border-radius: var(--r-sm);
}
.topbar button:hover:not(:disabled) {
  background: var(--navy-2);
  border-color: rgba(232, 240, 242, 0.36);
}
.seg {
  display: inline-flex;
  border-radius: 999px;
  background: var(--navy-2);
}
.topbar .seg button {
  border: 0;
  border-radius: 999px;
  min-width: 48px;
  justify-content: center;
  color: var(--on-navy-muted);
  font-weight: 700;
}
.topbar .seg button[aria-pressed='true'] {
  background: var(--on-navy);
  color: var(--navy);
}
.page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px;
}
.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 24px;
}
.title-row h1 {
  font-size: 32px;
  line-height: 1.15;
  margin: 0;
  letter-spacing: -0.4px;
}
.title-row .meta {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 14px;
}
.title-row > :last-child:not(:first-child) {
  margin-left: auto;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.btn:hover {
  background: var(--surface-2);
  border-color: var(--slate-line);
}
.btn.primary,
button.primary {
  background: var(--navy);
  border-color: var(--navy);
  color: var(--on-navy);
}
.btn.primary:hover,
button.primary:hover:not(:disabled) {
  background: var(--navy-2);
  border-color: var(--navy-2);
}
.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.kpi {
  position: relative;
  overflow: hidden;
  padding: 16px 18px 16px 22px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
}
.kpi::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--slate-line);
}
.kpi.k-teal::before {
  background: var(--teal-fill);
}
.kpi.k-amber::before {
  background: var(--amber-fill);
}
.kpi.k-red::before {
  background: var(--red-fill);
}
.kpi > span {
  display: block;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}
.kpi strong {
  display: block;
  margin-top: 4px;
  font-size: 30px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.kpi strong small {
  color: var(--muted);
  font-size: 16px;
  font-weight: 600;
}
.kpi > small {
  display: block;
  color: var(--muted);
  font-size: 13px;
}
.badge,
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 2px 10px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}
.b-teal {
  color: var(--teal);
  background: var(--teal-bg);
  border-color: var(--teal-line);
}
.b-slate {
  color: var(--slate);
  background: var(--slate-bg);
  border-color: var(--slate-line);
}
.b-amber {
  color: var(--amber);
  background: var(--amber-bg);
  border-color: var(--amber-line);
}
.b-red {
  color: var(--red);
  background: var(--red-bg);
  border-color: var(--red-line);
}
.c-ai {
  color: var(--ai);
  background: var(--ai-bg);
  border-color: var(--ai-line);
}
.c-ok {
  color: var(--teal);
  background: var(--surface);
  border-color: var(--teal-line);
}
.c-warn {
  color: var(--amber);
  background: var(--surface);
  border-color: var(--amber-line);
}
.c-bad {
  color: var(--red);
  background: var(--surface);
  border-color: var(--red-line);
}
.c-neutral {
  color: var(--muted);
  background: var(--surface);
  border-color: var(--line);
}
.tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--slate-bg);
  color: var(--slate);
  font: 600 12.5px/1.4 var(--mono);
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
}
.info-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--muted);
  font-size: 14px;
}
.info-note svg {
  flex: none;
  margin-top: 1px;
}
.sec-label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 24px 0 10px;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.sec-label .chip {
  text-transform: none;
  letter-spacing: 0;
}
.codebox {
  overflow: hidden;
  background: var(--code-bg);
  border-radius: var(--r);
}
.code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 4px 4px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--code-muted);
  font-size: 13px;
}
.code-head button {
  border-color: rgba(255, 255, 255, 0.2);
  background: transparent;
  color: var(--code-ink);
  font-size: 13px;
  font-weight: 600;
}
.code-head button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.32);
}
.codebox pre {
  margin: 0;
  max-height: 420px;
  overflow: auto;
  padding: 14px 16px;
  background: transparent;
  color: var(--code-ink);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: no-preference) {
  button,
  .btn,
  summary {
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }
}
@media (max-width: 760px) {
  .topbar-in {
    padding: 8px 16px;
    gap: 6px 12px;
  }
  .brand em {
    display: none;
  }
  .crumbs {
    order: 3;
    flex-basis: 100%;
    font-size: 13px;
  }
  .page {
    padding: 16px;
  }
  .title-row h1 {
    font-size: 26px;
  }
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .kpi {
    padding: 12px 14px 12px 18px;
  }
  .kpi strong {
    font-size: 26px;
  }
  .badge,
  .chip {
    white-space: normal;
  }
}
@media print {
  .topbar {
    background: none;
    color: var(--ink);
  }
  .seg,
  .top-actions button {
    display: none;
  }
}
`;
