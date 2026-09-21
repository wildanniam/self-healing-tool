import { test as base, expect } from '@playwright/test';
import { createHealingSession } from './runtime.js';
import { writeReport } from './report.js';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

export type HealingOptions = Parameters<typeof createHealingSession>[1];
export type HealingSession = ReturnType<typeof createHealingSession>;
export interface HealingFixtures { healing: HealingSession; healingOptions: HealingOptions }

/** Optional Playwright Test entry point. Core imports do not load the test runner. */
export const test = base.extend<HealingFixtures>({
  healingOptions: [{}, { option: true }],
  healing: [async ({ page, healingOptions }, use, testInfo) => {
    const session = createHealingSession(page, healingOptions);
    try {
      await use(session);
    } finally {
      // Playwright owns test status. Do not turn passing assertions into semantic assessments.
      let directory: string | undefined;
      let reportError: string | undefined;
      try {
        directory = await writeReport(session.snapshot(), {
          directory: testInfo.outputPath('healing'),
          ...(healingOptions?.audit ? { audit: session.audit() } : {}),
        });
      } catch (error) {
        reportError = diagnosticCode(error);
        console.warn(`[self-healing] Report unavailable (${reportError}); test outcome is unchanged.`);
      }
      try {
        await testInfo.attach('self-healing-result', {
          body: Buffer.from(JSON.stringify({ schemaVersion: 1, directory, reportError })),
          contentType: 'application/json',
        });
        if (directory) {
          // Bodies survive Playwright preserveOutput='failures-only' cleanup of successful tests.
          await testInfo.attach('self-healing-report', { body: await readFile(join(directory, 'report.html')), contentType: 'text/html' });
          await testInfo.attach('self-healing-summary', { body: await readFile(join(directory, 'report.json')), contentType: 'application/json' });
        }
      } catch {
        console.warn('[self-healing] Report attachment unavailable; test outcome is unchanged.');
      }
    }
  }, { auto: true }],
});
export { expect };
function diagnosticCode(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  return typeof code === 'string' && /^[A-Z0-9_]{1,40}$/.test(code) ? code : 'REPORT_WRITE_FAILED';
}
