# Integration and execution contract

For the shortest Playwright Test setup, start with [automatic reports](playwright.md). This page documents the core API for consumers who manage their own test lifecycle.

## Package and compatibility

GitHub source release 0.1.0 under MIT; npm publication remains pending. Use ESM, Node.js 24/25 and Playwright 1.62.1. Chromium is the tested browser. Other browser versions, CommonJS, frames and shadow-root extraction are not verified. Build a local archive with `npm pack` and install it into the consumer project. Playwright Test is an optional peer used only by the `/playwright` subpath.

## Explicit integration

`createHealingSession(page, options)` exposes string-selector `click` and `fill`. The task descriptor supplies `description` and optional `scope`; navigation, setup and assertions remain native Playwright operations. The Playwright fixture handles teardown/reporting for you. Other runners should retain the session and save `snapshot()` after execution, including failed actions.

One session serializes actions on one page. Use separate sessions/pages for concurrent tests. A supported zero-match timeout triggers recovery. Invalid selectors, multiple matches, page closure, and existing but disabled/hidden targets retain their native failure. Recovery does not rewrite source files or assertions. An unsuccessful recovery throws `HealingFailure` with an event ID and the original error as cause.

## Context and selection

The library extracts compatible light-DOM controls, cleans their representations, retains labels and surrounding owner context, applies weighted ranking, and fits candidate/serialized-request limits. Suggested locators are checked against their originating nodes. Ranking-only mode uses the candidate order without a provider; full mode asks the configured provider for a replacement locator.

Candidate JSON and optional cleaned HTML must fit `domMaxChars`; the complete request must fit `payloadMaxChars`. Cleaned HTML is trimmed before candidates are dropped. These are character limits, not token limits. The selected target may be absent after filtering or truncation. [Method details and historical deviations](implementation/thesis-method-alignment.md) document the signals.

Invalid proposals can receive bounded validation feedback. An explicit null selection permits at most one observation refresh; another model call occurs only if the visible selection evidence changed and budget remains. Provider failures stop immediately. Current default recovery behavior is unchanged by optional ranking-study configuration or report capture.

## Configuration and provider

Defaults: `mode: 'ranker-only'`, `model: 'gpt-4o-mini'`, 500 output tokens, temperature 0, three maximum attempts, 1000 ms action timeout, 15000 ms recovery deadline, 5000 ms provider timeout, 8000 candidate-context characters, 12000 full-payload characters and 30 candidates.

Use `validateConfig({...})` or `configFromEnv(env, overrides)`. The latter reads explicit allowlisted values and never loads a credential file. Supported model identifiers are `gpt-4o-mini` and `gpt-4o-mini-2024-07-18`. Full mode requires an explicit provider with matching configuration:

```ts
import { validateConfig, createOpenAIProvider, createHealingSession } from 'self-healing-tool';
const config = validateConfig({ mode: 'full' });
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error('OPENAI_API_KEY is required');
const provider = createOpenAIProvider({ apiKey: key, config, maxRequests: 3 });
const healing = createHealingSession(page, { config, provider, audit: true });
```

Requests use Chat Completions with no hidden transport retries. The request cap is per provider instance. Recovery time includes extraction, selection, checking and retries after original failure; total action time also includes the original timeout. Parsed model text is data and is never evaluated as program code. Full-mode steps make paid requests; offline checks do not.

## Evidence, reports and independent assessment

Candidate acceptance, action completion, Playwright test status and semantic correctness are separate facts. Semantics begin as `unassessed`. After observing the business effect, consumers may append `healing.assess({eventId, attemptId?, semantic, wrongEffect, targetInCandidates?, evidenceRef?})`. Assessments do not enter model inputs. Preserve earlier wrong effects even if a later action succeeds.

Report summaries lead with operational outcomes. They do not infer semantic success from passing Playwright assertions. Timing/usage/cost retain unknown values when evidence is unavailable; a caller-supplied model-matched price assumption is needed for estimated cost. Recorded experiment protocols remain separate from current engineering defaults.

## Local action audit reports

Enable `audit: true` before execution to capture actual built-in adapter request bodies and returned text. Pass `healing.audit()` to `writeReport` when managing your own lifecycle; the optional Playwright fixture does this automatically. Capture is off by default, and custom providers must call the optional `audit.request(actualBody)` hook to record requests.

`writeReport(healing.snapshot(), {directory, audit: healing.audit(), language: 'en'})` saves HTML and JSON in a unique run folder and returns its path. The core writer does not open a browser. The Playwright reporter opens its suite index once according to its `open` option, except in CI. When managing the lifecycle manually, handle writer errors separately so they cannot replace the original test failure.

The packaged inspector exposes DOM candidates, paired AI input/output, locator/target checks and outcomes in EN/ID. Language switching never translates original evidence. `report.json` is a summary without raw payloads; HTML with audit is a detailed local artifact. Request/output bounds are 128,000 characters per entry and 4,000,000 per session; unavailable, redacted or withheld records remain explicit. Hash agreement is archive consistency, not provider attestation.

Raw pre-cleansing DOM and score contributions are not automatically part of the ordinary action report. `captureDiagnostics(eventId)` explicitly captures current page HTML, which can be passed separately via `diagnostics`. Optional research `onContextAudit` records observation-stage data for a caller; it does not automatically populate the report. Keep detailed application context local and review before sharing.

## Optional target contracts

Use `loadTargetSpec` to read a selected requirement Markdown file containing one JSON `self-healing-contract` block. It does not compile arbitrary OpenSpec prose. Set `targetSpec: {mode: 'context' | 'enforce', contract, expectedRevision}` on session options. Context mode sends the rules to the provider; enforce mode also checks declared observations before the replacement action. See [contract structure and examples](integration-history.md#version-006-optional-target-contract-prototype).

Admission applies to recovery only. Missing/stale rules can stop an otherwise feasible action; misleading labels can still admit wrong actions. Rules do not diagnose application bugs or guarantee semantic correctness.

## Optional persisted live-request budget

Use `createLiveBudget(absolutePath, plan)` and `createBudgetedOpenAIProvider({apiKey, config, ledgerPath, phase})` when multiple provider instances must share a persistent request/cost budget. Plans have explicit phase and total limits, reservations survive restarts, and unknown usage stops further dispatch. Existing ledgers cannot be reset. `readLiveBudget` returns accounting. See the [budget implementation](../src/budget.ts) and [local setup](local-api-setup.md); never reuse closed research ledgers for a new demo.

## Independent demo

`npm run demo:offline` runs the synthetic ranker-only example without a key. `npm run demo` opens retained historical results without rerunning a study. `npm run demo:walkthrough` runs a labeled replay using recorded decisions. The [complete Playwright consumer example](playwright.md#a-complete-local-example) starts its own local app and generates automatic reports. These modes are distinct from new live model evaluation.

## History

[Earlier versioned integration notes](integration-history.md) preserve the development record. This page and [the Playwright guide](playwright.md) describe current behavior; historical planned/frozen statements must not be read as current setup requirements.
