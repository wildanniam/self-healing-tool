# Automatic Playwright reports

Use the optional fixture and reporter when running tests with **Playwright Test 1.62.1**. Keep the core API for other runners. Configure the integration once: it creates a healing session for each test, saves an action report during teardown, and builds one suite index after the run.

## 1. Install

Until public distribution is approved, run `npm pack` in the tool repository and install its generated archive in your project:

```sh
npm install /absolute/path/to/self-healing-tool-0.0.8.tgz playwright@1.62.1
npm install --save-dev @playwright/test@1.62.1
npx playwright install chromium
```

Use Node.js 24/25 and an ESM project. The plain `self-healing-tool` import does not load Playwright Test; the runner is an optional peer for the `/playwright` entry point.

## 2. Configure once

Save this as `playwright.config.ts`. This first configuration runs without AI:

```ts
import { defineConfig } from '@playwright/test';
import type { HealingFixtures } from 'self-healing-tool/playwright';

export default defineConfig<HealingFixtures>({
  reporter: [
    ['list'],
    ['self-healing-tool/reporter', {
      outputDir: 'output/healing',
      open: 'always',
      language: 'en',
    }],
  ],
  use: {
    healingOptions: {
      config: { mode: 'ranker-only' },
      audit: true,
    },
  },
});
```

Detailed capture is explicitly enabled with `audit: true`. Omit it or set `false` to keep the report without raw request/output evidence. `open` accepts `always`, `on-failure`, or `never`; a set `CI` environment variable always disables browser opening. Report directories are relative to the command's working directory. Each invocation has a separate directory; previous evidence is not overwritten.

## 3. Use the fixture

Import `test` and `expect` from the library's Playwright entry point. Start your application and use its URL, selectors and assertions:

```ts
import { test, expect } from 'self-healing-tool/playwright';

test('update profile', async ({ page, healing }) => {
  await page.goto('http://127.0.0.1:3100');
  await healing.fill('#previous-display-name', 'Taylor', {
    description: 'Fill display name',
  });
  await healing.click('#save-profile', { description: 'Save profile' });
  await expect(page.getByRole('status')).toHaveText('Saved: Taylor');
});
```

```sh
npx playwright test
```

There is no per-test `finally` or report-writing call. The fixture saves evidence during teardown, including after assertion or recovery failure. The suite reporter prints the index path and opens it once locally if enabled. Parallel tests and retries retain separate identities and report folders. Skipped tests or setup failures without a fixture report remain explicitly unavailable. Forced process termination cannot guarantee final report generation.

Reports are also attached to the Playwright test result. To include Playwright's own HTML report, add `['html', { open: 'never' }]` alongside the healing reporter. The healing report explains recovery; Playwright's report supplies the broader runner diagnostics.

## 4. Enable LLM-assisted recovery

Replace `healingOptions` in the configuration with the following. Load the API key into your process environment before running; the library does not automatically read `.env` files.

```ts
import { validateConfig, createOpenAIProvider } from 'self-healing-tool';

const config = validateConfig({ mode: 'full' });
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error('OPENAI_API_KEY is required for full mode');
const provider = createOpenAIProvider({ apiKey: key, config, maxRequests: 3 });
// Inside defineConfig:
// use: { healingOptions: { config, provider, audit: true } }
```

This makes real, billable API requests only when eligible recovery calls the provider. The cap belongs to a provider instance, not the whole suite across workers/restarts. For a persistent shared request budget use the [budgeted adapter](integration.md#optional-persisted-live-request-budget). Original-locator success makes no model call. The first runnable example below uses one worker and no test retries.

## A complete local example

From the tool repository:

```sh
npm ci
npx playwright install chromium
npx playwright test --config examples/playwright/playwright.config.ts
```

The example starts and stops its own loopback profile app. It fills a field through a deliberately outdated locator, clicks Save, and checks the displayed result. Default execution uses ranker-only recovery without API calls. Its report still shows candidates/checks and explicitly labels the absence of AI evidence.

To deliberately run the same example with the real provider, set your key locally, then run:

```sh
HEALING_EXAMPLE_LIVE=1 npx playwright test --config examples/playwright/playwright.config.ts
```

The example permits at most three requests per provider instance. It is a usage demonstration, not a new research experiment.

## Read the results

The suite index shows the **final Playwright test status**, project, file and retry number. A failed first attempt and a passing retry both remain visible. A test failure after successful recovery stays failed.

Inside an action report, the summary counts original actions completed, recovery actions completed, stopped actions and failed actions. Independent correctness assessments remain separate. A passing assertion does not automatically mark every healed action correct. Use `healing.assess(...)` only with genuinely observed effects; see [assessment](integration.md#evidence-reports-and-independent-assessment).

Both the suite index and the action inspector support English and Indonesian. Detailed capture preserves the source language and exact available attempt records; unavailable records are never reconstructed.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No action report | Import `test` from `self-healing-tool/playwright`; a skipped test or failed setup may never start the fixture. |
| No suite index | Configure `self-healing-tool/reporter`, and check that its output directory is writable. |
| Empty AI input/output | Original action succeeded, ranker-only mode is selected, capture was disabled, or a custom provider omitted the capture hook. |
| Browser did not open | Check `open`, `CI`, and OS opener availability. Open the printed `index.html` path manually if needed. |
| Report write failed | Fix permissions or a file blocking the output directory. The original test outcome remains intact; report unavailability is shown separately. |
| Action completed but correctness unassessed | No independent `healing.assess` result was supplied. This is not an execution failure. |

Keep `output/` and test artifacts out of Git. Detailed reports may contain application context; only share reviewed artifacts. The reporter preserves its standalone HTML copies before the runner cleans temporary outputs. Report failure is a warning and does not turn a passing test into a failure or replace an existing failure.
