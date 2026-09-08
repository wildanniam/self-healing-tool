# Integration and execution contract

## Package and compatibility

This private development package exports ESM JavaScript and TypeScript declarations. Use Node.js 24 or 25 and consumer-owned `playwright` **1.62.1**. Local checks use Node 25.8.2/macOS arm64; CI covers Node 24/Linux. Chromium is the tested browser. Other Playwright/browser versions, CommonJS, frames, shadow-root extraction and arbitrary native Locator adaptation are not verified.

Build with `npm run build`; prepare a tarball with `npm pack`. Install that tarball as a dependency of your own test project. `npm run test:consumer` installs an allowlisted local tarball and exact public Playwright peer in an isolated temporary project (npm may fetch public dependencies) and runs real browser actions without a private application or model key. Public publication/license remains a separate decision.

## Explicit integration

```ts
import { test, expect } from '@playwright/test';
import { createHealingSession, writeReport } from 'self-healing-tool';

test('profile', async ({ page }) => {
  await page.goto('http://127.0.0.1:3100'); // your authorized local app
  const healing = createHealingSession(page); // ranker-only; no provider calls
  try {
    await healing.fill('#previous-display-name', 'Synthetic User', {
      description: 'Fill display name',
    });
    // Keep the original assertions. Runtime action success does not prove intent.
    await expect(page.getByLabel('Display name')).toHaveValue('Synthetic User');
  } finally {
    await writeReport(healing.snapshot(), { directory: 'output/healing' });
  }
});
```

Opt in using string selectors for `click` and `fill`. Navigation, login, setup and assertions stay native and consumer-owned. A task has only `description` and optional `scope` (e.g. the intended entity's normal visible name). Do not put expected replacement selectors, oracle answers or case metadata in these fields. Fill values are retained for the action and omitted from contextual/model/report text.

The first action uses its supplied selector. A supported zero-match timeout may enter recovery; malformed selectors, strict/multiple matches, page closure, and resolved-but-disabled/hidden errors retain the native error and do not invoke a provider. This gate intentionally favors refusing an uncertain failure. The configured original-action timeout is not the consumer's global Playwright timeout. A failed heal throws `HealingFailure` with an event ID and the original error as its cause; use `snapshot()` in `finally` for retained records.

One session serializes actions on one page. Use separate sessions/pages for concurrent tests. Snapshots are detached copies. No source edits, assertions changes, file patchers, Git commands or PR automation are exported.

## Context and selection

Candidates are visible, enabled controls compatible with the action in the top-level light DOM. Fill excludes buttons, non-editable controls and unsupported input types. The extractor examines at most 5000 controls and records scan/text truncation. It retains associated/ARIA labels and nearby table-row, list-item, article/card or dialog labels. A bounded repeated-sibling fallback supports plain containers; when no relationship is identified, the container is empty rather than guessed from an application-specific selector.

Candidates use generated structural CSS paths instead of carrying test IDs or evaluator-labelled attributes. These paths identify the captured DOM position and may be brittle under later structural changes. Uniqueness, visibility and action compatibility are checked again before retrying. This is an initial supported selector strategy, not a claim that the proposed selector is a permanent robust locator; practitioners review any source repair.

Ranking tokenizes description/scope and label/container text, weights label overlap by 3, container overlap by 1 and scope/container overlap by 3, then breaks ties by DOM order. A non-positive best score abstains. Ranker-only tries an unused positive candidate; full mode asks the configured provider using the same retained candidate context. The provider must return exactly `{"selector":"a candidate CSS path"}` or `{"selector":null}`. Extra instructions/code are rejected. Structural validation cannot distinguish semantically wrong but valid entities.

The context is allowlisted; input values, scripts, URL targets, arbitrary attributes and evaluator object fields are not serialized. Subtrees explicitly marked `data-healing-evaluator`, `data-evaluator` or `data-oracle` are excluded. Reserved oracle/answer/expected-result lines are removed from descriptors/labels. `omitValues` supports additional known private strings. No raw-DOM fallback exists. Evaluator answers should remain outside the DOM/runtime entirely: generic filtering cannot identify an arbitrary unmarked answer encoded as ordinary page text. Verify actual payloads before the private pilot.

Payload truncation drops the lowest-ranked tail until both candidate JSON (`domMaxChars`) and the complete serialized Chat Completions request (`payloadMaxChars`) fit, including the system prompt and metadata. These are JavaScript character limits, not token counts. Coverage records discovered/included/omitted candidates; scan truncation means discovered is not an exhaustive page count. The evaluator may later record `targetInCandidates: false`; it never supplies the answer to selection.

## Configuration and provider

Defaults: ranker-only, gpt-4o-mini, output 500, temperature 0, 3 healing attempts, 1000 ms original/retry action timeout, 15000 ms recovery budget, 5000 ms per-provider timeout, 8000 candidate-context characters, 12000 complete-payload characters, 30 candidates. These are initial engineering settings; final experiment settings are not frozen.

`configFromEnv(env, overrides)` accepts an explicit environment object and reads only documented non-secret values. It never reads a file, loads ambient credentials or silently changes an unknown model. The accepted model IDs are `gpt-4o-mini` and `gpt-4o-mini-2024-07-18`. Changing the supported set is a reviewed configuration change. `createOpenAIProvider({apiKey, config, maxRequests})` requires an explicit credential and request cap. It uses the public Chat Completions endpoint, rejects redirects, bounds response bytes and makes no hidden HTTP retries. A session rejects model/output/temperature/payload settings that differ from its OpenAI adapter.

The bounded recovery budget includes extraction, selection, validation and retries after the original action fails; total timing includes the original failure as well. Browser action timeouts and the abortable provider request enforce stopping; the library does not promise real-time scheduling under an unresponsive browser/OS. Returned model text is parsed as constrained JSON and never evaluated as program code.

## Evidence, reports and independent assessment

`event.attempts` exposes candidate acceptance separately from action completion. Semantics start as `unassessed`. After observing task outcomes, the consumer can append assessments using `session.assess({eventId, attemptId?, semantic, wrongEffect, targetInCandidates?, evidenceRef?})`. These assessment fields are excluded from all selection inputs. The evaluator must independently observe side effects on every attempted action, including actions that later throw; a final-page-only assertion can miss an earlier wrong effect. Append-only assessments preserve all earlier wrong effects even if a later assessment succeeds.

Reports use unique run directories and refuse overwrite; `repeatOf` retains rerun lineage. Normal reports omit raw payloads/DOM, fill values and browser/session objects, sanitize known secrets and escape HTML. Arbitrary personal data in ordinary labels or task descriptions cannot be automatically recognized; supply `omitValues` and review local reports before sharing. `captureDiagnostics(eventId)` explicitly captures potentially sensitive local DOM; it is persisted only when passed to `writeReport` as `diagnostics`, separately named and excluded from Git/package.

Time fields distinguish original action, internal processing and retry action; setup and human maintenance time belong to the evaluation harness. Provider invocations and transport attempts are separate. Usage is unknown when unavailable; failed requests with known usage remain counted. A caller-supplied, model-matched versioned price assumption converts observed tokens to cost. Unknown usage is not zero; cost per correct repair is undefined when there are no independently assessed clean repairs. Offline provider stubs/ranking are mechanism checks, not empirical LLM evidence.

## Independent demo

`npm run demo:offline` launches its own ephemeral loopback server/browser, runs synthetic controls and repairs, writes an HTML/JSON report, and closes its services. It uses no key or private repository. `npm run demo:live` explicitly loads the local `.env` and requires `HEALING_LIVE_MAX_REQUESTS` (1–9) in addition to a key. A live run is an owner-authorized development demonstration, not final study data. Configure its budget before executing it.

The demo's in-memory browser state resets by reloading its own declared instance; there is no database or account authority on another application. Target validation, blocked service workers/WebSockets and route interception reject undeclared browser requests and inspect redirects without following them. The supplied app CSP further limits requests. These guards constrain this demo; they are not a security boundary against users modifying the runner or a replacement for production authorization. The generic library does not restrict the consumer's authorized application to this demo.

## Sources and limits

Implementation references: [Playwright Locator API](https://playwright.dev/docs/api/class-locator) and [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), consulted 2026-09-08. APIs used are checked against the pinned local dependency types. The independent demo does not reproduce the separate private-host evaluation. See [component origin inventory](implementation/component-inventory.md) and [active tasks](../openspec/changes/build-self-healing-tool/tasks.md).
