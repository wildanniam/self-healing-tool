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
# Until this documentation increment is merged, use its development branch.
git switch codex/31-readme-quickstart
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

The example below uses **ranker-only mode** so you can try the integration without an AI key. Adapt the app URL, selectors and assertion to your application, save it as a Playwright test, and run it with `npx playwright test`.

```ts
import { test, expect } from '@playwright/test';
import { createHealingSession, writeReport } from 'self-healing-tool';

test('update display name', async ({ page }) => {
  await page.goto('http://127.0.0.1:3100'); // Start your own app first.
  const healing = createHealingSession(page, { audit: true });

  try {
    await healing.fill('#previous-display-name', 'Synthetic User', {
      description: 'Fill display name',
    });
    await healing.click('button[type="submit"]', {
      description: 'Save profile',
    });
    await expect(page.getByLabel('Display name')).toHaveValue('Synthetic User');
  } finally {
    const directory = await writeReport(healing.snapshot(), {
      directory: './output/healing',
      audit: healing.audit(),
    });
    console.log(`Open ${directory}/report.html`);
  }
});
```

With this setup, the report is written after the actions even when an action or assertion fails. Open the generated HTML in a browser. This library report is separate from Playwright's built-in report; a passing assertion is not automatically recorded as a semantic assessment in the library.

For **LLM-assisted recovery**, explicitly configure full mode and a provider with a request cap. See [provider configuration](docs/integration.md#configuration-and-provider) and [local API setup](docs/local-api-setup.md). The default session does not call an LLM.

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
