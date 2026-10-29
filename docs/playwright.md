# Playwright guide

Start with the [quick start](../README.md#quick-start). It installs the library from GitHub, adds the reporter and runs a self-contained test with ranker-only recovery. This guide continues from there.

## Read the report

Open the passing test from the suite index. For the quick-start test, the action summary shows **one recovery action completed** (fill), **one original action completed** (click), and no stopped or failed actions. Inspect the fill action to see the outdated locator, the retained DOM candidates, the replacement locator and the checks. In ranker-only mode the AI panel records that no model was used.

The index shows the final Playwright status, project, file and retry number. When retries are enabled, a failed attempt and a passing retry both remain visible. Reports are kept after assertion or recovery failures. Skipped tests or setup failures without a fixture report are explicitly marked unavailable; forced process termination may prevent report generation.

A passing test does not mark every recovered action semantically correct. Independent correctness remains `unassessed` until an observed effect is supplied through [assessment](integration.md#evidence-reports-and-independent-assessment). The index and the action inspector support English and Indonesian; switching the language does not translate original evidence.

## Use your own application

- Replace `page.setContent(...)` with `page.goto(yourAppUrl)` and start your application before the tests run.
- Import `test` and `expect` from `self-healing-tool/playwright` and wrap only the actions you want protected: `healing.click(selector, task)` and `healing.fill(selector, value, task)`.
- Give every wrapped action a short `description` of its intent. It is part of the recovery input.
- Keep navigation, setup and assertions as ordinary Playwright code. The fixture still handles reporting.

There is no `writeReport`, `healing.audit()` or `finally` call to add to a test. Those manual steps belong only to the [core API integration](integration.md#local-action-audit-reports).

## Report options

- `open` accepts `always`, `on-failure` or `never`. A set `CI` environment variable disables opening.
- `outputDir` is relative to the command's working directory, and each run has its own folder.
- Reports are also attached to the Playwright test result.
- To add Playwright's own HTML report, include `['html', { open: 'never' }]` alongside the healing reporter.

Keep `output/` and test artifacts out of Git. Detailed reports may contain application context; share only reviewed artifacts. The reporter preserves its standalone HTML copies before the runner cleans temporary outputs. A report failure is a warning: it does not turn a passing test into a failure or replace an existing failure.

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

Set `OPENAI_API_KEY` in your terminal environment before running `npx playwright test` again. The library does not load `.env` files automatically. Eligible recovery now makes real, billable requests; an original locator that works makes no model call. The report shows the captured request and returned text.

Keep a single worker and zero retries for the first live run. `maxRequests` belongs to each provider instance, not to the whole suite across workers or restarts. Use the [budgeted adapter](integration.md#optional-persisted-live-request-budget) for a persistent shared request budget. Custom providers must supply the capture hook for their actual request bodies.

## A complete local example

From a clone of the repository:

```sh
npm ci
npx playwright install chromium
npx playwright test --config examples/playwright/playwright.config.ts
```

The example starts and stops its own loopback profile app. It fills a field through a deliberately outdated locator, clicks Save, and checks the displayed result. Default execution uses ranker-only recovery without API calls; its report still shows candidates and checks and labels the absence of AI evidence.

To deliberately run the same example with the real provider, set your key locally and run:

```sh
HEALING_EXAMPLE_LIVE=1 npx playwright test --config examples/playwright/playwright.config.ts
```

The example permits at most three requests per provider instance. It is a usage demonstration, not a new research experiment.

## Reproduce the paper version (v0.1.0)

The APSEC 2026 paper evaluated v0.1.0. That tag predates installation from Git, so build its package archive and install it into a separate project. v0.1.0 declares Node.js 24 or 25 and exactly Playwright 1.62.1.

```sh
git clone --branch v0.1.0 https://github.com/wildanniam/self-healing-tool.git
cd self-healing-tool
npm ci
npm pack
cd ..
mkdir healing-example && cd healing-example
npm init -y && npm pkg set type=module
npm install ../self-healing-tool/self-healing-tool-0.1.0.tgz playwright@1.62.1
npm install --save-dev @playwright/test@1.62.1
npx playwright install chromium
mkdir tests
```

Then add the same two files as in the quick start.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `npm install` fails with `ERESOLVE` | Use Playwright 1.62.1 or a later 1.x release. Older versions are outside the supported range. |
| Installing from GitHub fails | Git must be installed and able to reach github.com. npm clones the repository and builds the package during installation. |
| pnpm stops with `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` | pnpm 10 does not build Git-hosted packages by default. Add the entry it prints to `onlyBuiltDependencies` in `pnpm-workspace.yaml` and install again. The entry names a commit, so it changes when you update. npm needs no extra step. |
| No action report | Import `test` from `self-healing-tool/playwright`; a skipped test or failed setup may never start the fixture. |
| No suite index | Configure `self-healing-tool/reporter`, and check that its output directory is writable. |
| Empty AI input/output | The original action succeeded, ranker-only mode is selected, capture was disabled, or a custom provider omitted the capture hook. |
| Browser did not open | Check `open`, `CI` and whether the OS can open files. Open the printed `index.html` path manually if needed. |
| Report write failed | Fix permissions or a file blocking the output directory. The original test outcome remains intact; report unavailability is shown separately. |
| Action completed but correctness unassessed | No independent `healing.assess` result was supplied. This is not an execution failure. |
