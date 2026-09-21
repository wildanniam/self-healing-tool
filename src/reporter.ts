import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { renderSuite, escapeHtml, type SuiteRow } from './suite-report.js';
import { openReport, shouldOpen, type OpenPolicy } from './report-open.js';
import { redact } from './privacy.js';

export interface HealingReporterOptions { outputDir?: string; open?: OpenPolicy; language?: 'en' | 'id' }
export default class HealingReporter implements Reporter {
  private rows: SuiteRow[] = [];
  private tests: TestCase[] = [];
  private root = '';
  private directory = '';
  private pending: Promise<void>[] = [];
  private options: Required<HealingReporterOptions>;
  constructor(options: HealingReporterOptions = {}) {
    this.options = { outputDir: 'output/healing', open: 'always', language: 'en', ...options };
    if (typeof this.options.outputDir !== 'string' || !this.options.outputDir.trim() || !['always', 'on-failure', 'never'].includes(this.options.open) || !['en', 'id'].includes(this.options.language)) throw new Error('Invalid healing reporter options');
  }
  onBegin(config: FullConfig, suite: Suite) {
    this.root = config.rootDir;
    this.directory = resolve(this.options.outputDir, `run-${Date.now()}-${randomUUID()}`);
    this.tests = suite.allTests();
    // The index is finalized in onEnd, after all tests and teardown complete.
  }
  onTestEnd(test: TestCase, result: TestResult) {
    const row: SuiteRow = {
      testId: test.id, title: redact(test.titlePath().slice(1).filter(Boolean).join(' › ')),
      file: redact(relative(this.root, test.location.file)), project: redact(test.parent.project()?.name ?? ''),
      retry: result.retry, status: result.status, expectedStatus: test.expectedStatus,
      durationMs: result.duration, outcome: 'pending', report: null, reportError: null,
    };
    this.rows.push(row);
    // Attachment metadata contains only a location/code; it is never an AI input.
    const item = result.attachments.find(a => a.name === 'self-healing-result');
    if (!item) { row.reportError = 'No healing report recorded (fixture unavailable or test skipped).'; return; }
    this.pending.push((async () => {
      try {
        const body = item.body ?? (item.path ? await readFile(item.path) : null);
        const record = body && JSON.parse(body.toString());
        if (record?.schemaVersion !== 1 || typeof record.directory !== 'string') {
          row.reportError = typeof record?.reportError === 'string' ? 'Report write failed: ' + record.reportError.replace(/[^A-Z0-9_]/g, '').slice(0, 40) : 'Report unavailable.';
          return;
        }
        const htmlAttachment = result.attachments.find(a => a.name === 'self-healing-report');
        const summaryAttachment = result.attachments.find(a => a.name === 'self-healing-summary');
        const html = htmlAttachment?.body?.toString('utf8') ?? await readFile(join(record.directory, 'report.html'), 'utf8');
        const summary = summaryAttachment?.body?.toString('utf8') ?? await readFile(join(record.directory, 'report.json'), 'utf8');
        const folder = `actions/${randomUUID()}`;
        await mkdir(join(this.directory, folder), { recursive: true, mode: 0o700 });
        const banner = `<aside style="padding:16px 32px;border-bottom:1px solid #d4ddd7"><a href="../../index.html">← <span>Test results</span></a><p data-evidence>${escapeHtml(row.title)}</p><p>Playwright: <strong>${escapeHtml(row.status)}</strong> · <span data-evidence>${escapeHtml(row.project || 'default')}</span> · retry ${row.retry}. <span>Test status is separate from action correctness.</span></p></aside>`;
        await writeFile(join(this.directory, folder, 'report.html'), html.replace('<!--playwright-test-status-->', banner), { flag: 'wx', mode: 0o600 });
        await writeFile(join(this.directory, folder, 'report.json'), summary, { flag: 'wx', mode: 0o600 });
        row.report = folder + '/report.html';
      } catch { row.reportError = 'Report files could not be read or copied.'; }
    })());
  }
  async onEnd(result: FullResult) {
    await Promise.all(this.pending);
    for (const test of this.tests) {
      const attempts = this.rows.filter(row => row.testId === test.id);
      if (!attempts.length) this.rows.push({ testId: test.id, title: redact(test.titlePath().slice(1).filter(Boolean).join(' › ')), file: redact(relative(this.root, test.location.file)), project: redact(test.parent.project()?.name ?? ''), retry: 0, status: 'not-run', expectedStatus: test.expectedStatus, durationMs: 0, outcome: test.outcome(), report: null, reportError: 'Test did not finish; no report recorded.' });
      else attempts.forEach(row => { row.outcome = test.outcome(); });
    }
    try {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const data = { schemaVersion: 1, status: result.status, createdAt: new Date().toISOString(), rows: this.rows };
      await writeFile(join(this.directory, 'results.json'), JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 });
      const index = join(this.directory, 'index.html');
      await writeFile(index, renderSuite(data, this.options.language), { flag: 'wx', mode: 0o600 });
      console.log(`\nSelf-healing report: ${index}`);
      if (shouldOpen(this.options.open, result.status !== 'passed')) await openReport(index);
    } catch { console.warn('[self-healing] Suite report could not be saved; test outcome is unchanged.'); }
  }
  printsToStdio() { return true; }
}
