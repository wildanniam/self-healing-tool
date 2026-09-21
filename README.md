<h1 align="center">Self-Healing Tool</h1>

<h3 align="center">Recover broken locators. Inspect every attempt.</h3>

<p align="center">
  A Playwright library for bounded, LLM-assisted locator recovery.<br />
  Prepare DOM context, check replacement locators, and inspect the recorded process in a local HTML report.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Playwright-1.62.1-2EAD33?style=for-the-badge" alt="Playwright 1.62.1" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&amp;logo=typescript&amp;logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Node.js-24%20%7C%2025-417E38?style=for-the-badge&amp;logo=nodedotjs&amp;logoColor=white" alt="Node.js 24 or 25" />
  <img src="https://img.shields.io/badge/Status-Research%20Prototype-52667A?style=for-the-badge" alt="Research prototype" />
</p>

<p align="center">
  <a href="#what-it-does"><strong>Overview</strong></a> ·
  <a href="#try-the-offline-demo">Quick Start</a> ·
  <a href="#use-in-your-tests">Library Usage</a> ·
  <a href="#inspect-the-report">Reports</a> ·
  <a href="#documentation">Documentation</a>
</p>

---

## What it does

A page change can break a test's locator while the intended button or field is still available. Self-Healing Tool wraps selected Playwright `click` and `fill` actions to attempt recovery when the original locator finds no element and times out.

1. **Try the original locator.** Successful actions continue without calling AI.
2. **Prepare page context.** Extract and clean DOM candidates, retain labels and surrounding context, rank candidates, and fit the input limits.
3. **Propose a replacement.** In full mode, an LLM returns a locator or no selection, within bounded attempts.
4. **Check before acting.** Validate the locator on the current page and optionally check explicit target rules supplied by the integrator.
5. **Inspect the evidence.** A local report shows candidates, recorded AI input/output, checks, and action outcomes.

Navigation, setup and assertions remain in your Playwright tests. The library does not rewrite test files. An action completing does not, by itself, prove that it reached the intended target.

**Package status:** development package; public distribution and licensing are pending. The instructions below use the repository and a local package archive, not an assumed npm release.

## Try the offline demo

Use **Node.js 24 or 25** and npm. Chromium is the tested browser.

```sh
git clone https://github.com/wildanniam/self-healing-tool.git
cd self-healing-tool
npm ci
npx playwright install chromium
npm run demo:offline
```

This runs the independent synthetic application and creates an HTML/JSON report. It uses **ranker-only recovery**, requires no API key, and makes no AI requests. Open `report.html` in the output directory printed by the command.

To inspect retained research results instead:

```sh
npm run demo
```

This opens a report in your default browser; it does not rerun the experiments. A fresh clone includes only the portable evidence. Missing private or local archives are shown as unavailable. See the [presentation guide](docs/presentation.md) for a browser walkthrough using recorded AI decisions.

## Use in your tests

First build and package this checkout:

```sh
npm pack
```

In your own Playwright project, install the generated archive and the supported Playwright version. Replace the archive path with its actual location:

```sh
npm install /absolute/path/to/self-healing-tool-0.0.8.tgz playwright@1.62.1
npm install --save-dev @playwright/test@1.62.1
npx playwright install chromium
```

For **automatic reports**, configure the fixture and reporter once using the [Playwright quick start](docs/playwright.md). Tests then use the library's `test` import:

```ts
import { test, expect } from 'self-healing-tool/playwright';

test('update profile', async ({ page, healing }) => {
  await page.goto('http://127.0.0.1:3100'); // Start your app first.
  await healing.fill('#previous-display-name', 'Taylor', {
    description: 'Fill display name',
  });
  await healing.click('#save-profile', { description: 'Save profile' });
  await expect(page.getByRole('status')).toHaveText('Saved: Taylor');
});
```

The fixture saves each action report after the test. The reporter builds one index with test names, projects, statuses and retries, and opens it once locally; CI keeps file output only. No per-test `finally` is needed. Audit capture is configured once with `healingOptions: { audit: true }`. Test status stays separate from independently assessed action correctness.

To try the **complete local example** without your own app or an API key:

```sh
npx playwright test --config examples/playwright/playwright.config.ts
```

It starts a synthetic local app and uses ranker-only recovery. The [same guide](docs/playwright.md#4-enable-llm-assisted-recovery) explains full-mode provider setup, explicit request limits and how to run the example with a real model. The [core API](docs/integration.md) remains available for other runners.

## Inspect the report

The report supports **English and Bahasa Indonesia**. Select an action and attempt, then inspect:

| Stage | What you can inspect |
| --- | --- |
| DOM context | Retained candidates, context fields, and available ranking scores |
| AI input and output | Captured request and returned text for the selected attempt |
| Checks | Locator validation and optional target-rule decisions |
| Outcome | Execution status and independent effect assessments when supplied |

Enable `audit: true` before running and pass `healing.audit()` to `writeReport` for detailed capture. Original evidence is not translated when switching the interface language. No-AI actions and unavailable records are labeled explicitly. Custom providers must supply the capture hook for their actual request bodies.

See [audit setup and capture limits](docs/integration.md#local-action-audit-reports). Detailed reports can contain application context; review them before sharing.

## Documentation

| I want to… | Read |
| --- | --- |
| Configure automatic Playwright reports | [Playwright quick start](docs/playwright.md) |
| Integrate the library and configure recovery | [Integration guide](docs/integration.md) |
| Configure a live provider | [Local API setup](docs/local-api-setup.md) |
| Explore results or demonstrate recorded recovery | [Presentation guide](docs/presentation.md) |
| Understand DOM preparation and ranking | [Method alignment](docs/implementation/thesis-method-alignment.md) |
| Review report verification | [Bilingual report evidence](docs/evidence/bilingual-library-report-2026-09-20.md) |
| Inspect research history and development decisions | [Development and research records](DEVELOPMENT.md) |

## Scope and limitations

- Explicit string-selector `click` and `fill` wrappers; ESM, Node 24/25, Playwright 1.62.1 and Chromium are the verified integration scope.
- Recovery handles supported zero-match timeouts. Other failures, such as invalid selectors or disabled elements, retain their original error.
- Optional target rules check declared observable conditions; they do not establish complete requirement satisfaction. Misleading labels can still lead to wrong actions.
- Keep your own assertions. Inspect stopped, failed and unassessed outcomes as well as successful actions.
- Raw DOM before cleansing and individual score contributions are not automatically captured in the action audit.

## Development

```sh
npm run typecheck
npm run check
npm run test:consumer
```

The consumer check installs a local package archive into a temporary project and exercises it in a browser without paid inference. Further verification commands, historical results and decision records are in [DEVELOPMENT.md](DEVELOPMENT.md).

---

<p align="center">
  <strong>Self-Healing Tool</strong><br />
  DOM context preparation · Bounded recovery · Inspectable outcomes
</p>
