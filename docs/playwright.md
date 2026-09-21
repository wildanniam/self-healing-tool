# Playwright quick start

Run your first recovery test and open its HTML report. This guide starts from an empty directory and uses the optional Playwright fixture and reporter. The first example uses **ranker-only recovery**, so it needs no API key, external application or paid request.

## Prerequisites

- Git, npm and **Node.js 24 or 25** (`node --version`).
- Internet access to install the development package dependencies and Chromium.
- A terminal and editor. The commands below work in a macOS/Linux shell; use a writable working directory.

This is a development package, not a published npm release. Until [PR #34](https://github.com/wildanniam/self-healing-tool/pull/34) is merged, the clone command selects its integration branch; `main` does not yet include automatic reporting.

## 1. Build the package

Start in an empty working directory:

```sh
git clone --branch codex/33-playwright-reporting --single-branch https://github.com/wildanniam/self-healing-tool.git
cd self-healing-tool
npm ci
npm pack
cd ..
```

`npm pack` builds the library and creates `self-healing-tool-0.0.8.tgz` in the repository. Leave that directory in place; the next step installs its archive into a separate project.

## 2. Create your test project

Run these commands from the same working directory, beside `self-healing-tool/`:

```sh
mkdir healing-example
cd healing-example
npm init -y
npm pkg set type=module
npm install ../self-healing-tool/self-healing-tool-0.0.8.tgz playwright@1.62.1
npm install --save-dev @playwright/test@1.62.1
npx playwright install chromium
mkdir tests
```

`type=module` enables ESM imports. Create the next two files inside `healing-example/` using the exact paths shown. Also create `.gitignore` so generated reports stay out of Git:

```gitignore
node_modules/
output/
test-results/
playwright-report/
```

## 3. Configure automatic reports

Save this as **`healing-example/playwright.config.ts`**:

```ts
import { defineConfig } from '@playwright/test';
import type { HealingFixtures } from 'self-healing-tool/playwright';

export default defineConfig<HealingFixtures>({
  testDir: './tests',
  workers: 1,
  retries: 0,
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

Configure this once. `audit: true` includes available AI request/output evidence automatically; omit it or set `false` for a report without raw capture. The first example makes no AI call, so its AI panel correctly shows no model evidence.

## 4. Add a complete test

Save this as **`healing-example/tests/profile.spec.ts`**:

```ts
import { test, expect } from 'self-healing-tool/playwright';

test('update profile after a field locator changes', async ({ page, healing }) => {
  await page.setContent(`
    <label>Display name <input id="display-name"></label>
    <button id="save-profile" onclick="
      document.querySelector('[role=status]').textContent =
        'Saved: ' + document.querySelector('#display-name').value;
    ">Save profile</button>
    <p role="status"></p>
  `);

  await healing.fill('#previous-display-name', 'Taylor', {
    description: 'Fill display name',
  });
  await healing.click('#save-profile', { description: 'Save profile' });
  await expect(page.getByRole('status')).toHaveText('Saved: Taylor');
});
```

The page contains `#display-name`, but the fill action tries the outdated `#previous-display-name`. After that locator times out, the library selects and checks a replacement. The Save button still matches its original locator. The final assertion checks the displayed result.

For your own application, replace `page.setContent(...)` with `page.goto(yourAppUrl)`, start your application before the test, and use its selectors and assertions. The fixture still handles reporting.

## 5. Run the test

From **`healing-example/`**, run:

```sh
npx playwright test
```

Expect **one passing test**. The fixture writes the action report during teardown and the reporter prints a path such as `output/healing/run-.../index.html`. With `open: 'always'`, it opens that index once in your default browser after the run. If opening is unavailable, open the printed HTML file yourself.

There is no `writeReport`, `healing.audit()` or `finally` call to add to this test. Those manual steps belong only to the [core API integration](integration.md#local-action-audit-reports).

## 6. Read the report

Open the passing test from the suite index. For this example, the action summary should show **one recovery action completed** (fill), **one original action completed** (click), and no stopped/failed actions. Inspect the fill action to see the outdated locator, retained DOM candidates, replacement locator and checks. The AI panel records that no model was used.

The index shows final Playwright status, project, file and retry number. When retries are enabled, a failed attempt and passing retry both remain visible. Reports are retained after assertion or recovery failures. Skipped tests or setup failures without a fixture report are explicitly unavailable; forced process termination may prevent report generation.

A passing test does not automatically mark every recovered action semantically correct. Independent correctness remains `unassessed` until an observed effect is supplied through [assessment](integration.md#evidence-reports-and-independent-assessment). Both the index and action inspector support English and Indonesian; changing the language does not translate original evidence.

`open` accepts `always`, `on-failure`, or `never`; a set `CI` environment variable disables opening. Paths are relative to the command's working directory and each run has its own folder. Reports are also attached to the Playwright test result. To add Playwright's own HTML report, include `['html', { open: 'never' }]` alongside the healing reporter.

## Optional: enable LLM-assisted recovery

After the offline example works, edit `playwright.config.ts`. Add the following import and declarations above `export default defineConfig`:

```ts
import { validateConfig, createOpenAIProvider } from 'self-healing-tool';

const config = validateConfig({ mode: 'full' });
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error('OPENAI_API_KEY is required for full mode');
const provider = createOpenAIProvider({ apiKey: key, config, maxRequests: 3 });
```

Then replace the existing `healingOptions` object inside `use` with:

```ts
healingOptions: { config, provider, audit: true },
```

Set `OPENAI_API_KEY` in your terminal environment before running `npx playwright test` again. The library does not automatically load `.env` files. Eligible recovery now makes real, billable requests; original-locator success makes no model call. The report can show the captured request and returned text.

Keep the example's single worker and zero retries for the first live run. `maxRequests` belongs to each provider instance, not the whole suite across workers/restarts. Use the [budgeted adapter](integration.md#optional-persisted-live-request-budget) for a persistent shared request budget. Custom providers must supply the capture hook for their actual request bodies.

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
