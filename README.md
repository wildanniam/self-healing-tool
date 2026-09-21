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
  <a href="docs/playwright.md">Quick Start</a> ·
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

## Quick start

Start with the **[Playwright quick start](docs/playwright.md)**. It takes you from an empty directory through prerequisites, package installation, configuration, a complete test, and the automatic HTML report.

The first test creates its own small page, recovers a broken field locator, clicks Save, and checks the result. It uses **ranker-only recovery**: no separate application, API key or AI request is needed. The guide then explains how to use your own application and [enable LLM-assisted recovery](docs/playwright.md#optional-enable-llm-assisted-recovery).

## Use in your tests

After the quick start, import `test` and `expect` from `self-healing-tool/playwright`. Use `healing.click(selector, task)` and `healing.fill(selector, value, task)` for actions you want to recover. Navigation and assertions remain ordinary Playwright operations.

Configure the fixture and reporter once. The fixture saves each action report after the test; the reporter builds one index with test names, projects, statuses and retries, and opens it once locally when enabled. CI keeps file output only. No per-test `finally` or report-writing call is needed. Set `healingOptions: { audit: true }` to capture available AI input/output. Test status stays separate from independently assessed action correctness.

For other test runners or manual lifecycle control, use the [core API guide](docs/integration.md).

## Inspect the report

The report supports **English and Bahasa Indonesia**. Select an action and attempt, then inspect:

| Stage | What you can inspect |
| --- | --- |
| DOM context | Retained candidates, context fields, and available ranking scores |
| AI input and output | Captured request and returned text for the selected attempt |
| Checks | Locator validation and optional target-rule decisions |
| Outcome | Execution status and independent effect assessments when supplied |

With the Playwright fixture, enable `healingOptions: { audit: true }` before running; the fixture includes captured evidence in the report automatically. Only consumers managing the [core API lifecycle](docs/integration.md#local-action-audit-reports) themselves need to pass `healing.audit()` to `writeReport`. Original evidence is not translated when switching the interface language. No-AI actions and unavailable records are labeled explicitly. Custom providers must supply the capture hook for their actual request bodies.

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

## Other demos and research results

Run these from the tool repository after `npm ci` and `npx playwright install chromium`:

| Command | What it runs |
| --- | --- |
| `npx playwright test --config examples/playwright/playwright.config.ts` | A profile app with its own local server and automatic reports; ranker-only by default. |
| `npm run demo:offline` | The core API example; ranker-only, with an HTML/JSON report path printed for manual opening. |
| `npm run demo` | A browser view of retained research results; no experiment rerun or new AI request. |

A fresh clone includes only portable research evidence. Missing private/local archives are shown as unavailable. See the [presentation guide](docs/presentation.md) for recorded results and replay; these are separate from the quick start above.

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
