// Evaluation explorer layout; tokens and shared components come from the packaged report theme.
export const CSS = `
.report-navigation {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
  margin-bottom: 16px;
}
.report-navigation label {
  display: grid;
  gap: 4px;
}
.view-switch {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}
.view-switch button[aria-pressed='true'] {
  background: var(--navy);
  border-color: var(--navy);
  color: var(--on-navy);
}
#coverage {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}
#coverage:empty {
  display: none;
}
.scope-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 4px solid var(--ai-fill);
  border-radius: var(--r);
  color: var(--ink-2);
  font-size: 14.5px;
}
.scope-card svg {
  flex: none;
  margin-top: 2px;
  color: var(--ai);
}
.scope-card p {
  margin: 0;
}
.notice {
  margin: 0;
  padding: 10px 14px;
  border-left: 3px solid var(--amber-fill);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  background: var(--amber-bg);
  color: #6e3504;
  font-size: 14px;
}
.caption {
  margin: 8px 0;
  color: var(--muted);
  font-size: 14px;
  overflow-wrap: anywhere;
}
#scope {
  margin: 0 0 16px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
  margin: 8px 0 16px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
}
.filters label {
  display: grid;
  gap: 4px;
}
.search-label {
  flex: 1 1 260px;
}
input[type='search'] {
  min-height: 44px;
  width: 100%;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
}
.filters .check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: var(--ink-2);
  font-size: 14px;
}
.check input {
  width: 18px;
  height: 18px;
}
.section-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.table-wrap {
  overflow-x: auto;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th,
td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line-2);
  text-align: left;
  vertical-align: middle;
}
thead th {
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}
tbody tr:last-child > * {
  border-bottom: 0;
}
.cases td:first-child {
  min-width: 260px;
}
.cases td:first-child b {
  display: block;
}
.case-title {
  display: block;
  overflow-wrap: anywhere;
}
.cases small {
  display: block;
  color: var(--muted);
  font-size: 13px;
}
.repeat-results {
  display: flex;
  gap: 6px;
}
.result-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 44px;
  padding: 0 8px;
  border-radius: var(--r-sm);
  font-weight: 700;
  font-size: 13px;
}
.result-chip.good {
  background: var(--teal-bg);
  border-color: var(--teal-line);
  color: var(--teal);
}
.result-chip.bad {
  background: var(--red-bg);
  border-color: var(--red-line);
  color: var(--red);
}
.result-chip.warn {
  background: var(--amber-bg);
  border-color: var(--amber-line);
  color: var(--amber);
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
#comparison h2 {
  margin: 8px 0;
  font-size: 20px;
}
#comparison details,
.provenance {
  margin-top: 12px;
  padding: 0 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
}
#comparison summary,
.provenance summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  color: var(--ink-2);
  font-weight: 600;
  list-style: none;
}
#comparison summary::-webkit-details-marker,
.provenance summary::-webkit-details-marker {
  display: none;
}
#comparison summary::before,
.provenance summary::before {
  content: '';
  flex: none;
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--muted);
  border-bottom: 2px solid var(--muted);
  transform: rotate(-45deg);
}
#comparison details[open] > summary::before,
.provenance[open] > summary::before {
  transform: rotate(45deg);
}
#arms p,
#resources p {
  margin: 0 0 12px;
  color: var(--ink-2);
  font-size: 14px;
}
.provenance {
  margin-top: 24px;
}
.provenance pre {
  overflow: auto;
  padding: 12px;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  font-size: 12.5px;
}
footer {
  margin: 20px 0 8px;
  color: var(--muted);
  font-size: 13.5px;
}
@media (max-width: 760px) {
  .filters {
    padding: 12px;
  }
  .filters label,
  .filters .check {
    flex: 1 1 100%;
  }
  .filters select {
    width: 100%;
  }
  th,
  td {
    padding: 10px 12px;
  }
  .cases td:first-child {
    min-width: 200px;
  }
}
@media print {
  .filters,
  .section-heading button,
  .pagination,
  #inspector-root {
    display: none !important;
  }
  .table-wrap {
    overflow: visible;
    border: 0;
  }
  body {
    background: #fff;
  }
}
`;
