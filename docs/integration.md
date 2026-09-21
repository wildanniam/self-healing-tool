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

## Context and selection (0.0.5)

Version 0.0.5 restores documented thesis-method components after D25's method audit. Read the [component matrix and explicit differences](implementation/thesis-method-alignment.md) before treating it as equivalent to the old prototype. Version 0.0.3/D24 used a simpler method; old results remain historical and unchanged.

The supported actions remain click/fill. The extractor prioritizes action-compatible top-level light-DOM controls and records semantic/stable attributes, row/parent/container text, visibility/disabled state and duplicate counts. Ranking uses sanitized original-locator and task signals with the documented thesis weights. Scope is part of the task meaning. Generic row/card/dialog rules replace framework-specific selectors. Scan is limited to 5000 elements; text/scan truncation and omitted candidate counts are reported.

Suggested locators prefer stable attributes, exact text and generic container scope. No positional selector is generated. Full mode prefers suggestions and may compose a specific supported CSS/XPath locator; ranker-only uses the same initial candidate information without provider calls. Supported text forms may be normalized, but every variant must match exactly one visible/enabled action-compatible element before retry. This structural check still cannot establish semantic correctness.

Cleaned HTML supplement/fallback is now available when the fitted list has fewer than five candidates: half DOM limit for 1–4, full limit for zero. DOM noise/evaluator subtrees, non-allowlisted attributes, form/textarea/editable values, hidden subtrees and known sensitive strings are excluded/redacted. Task/selector text and candidate features are sanitized before ranking. No raw page URL/exception stack is supplied. The new payload contract needs its own audit before private live use; prior structural-path-only disclosure is not silently extended by running this version.

Candidate JSON plus optional HTML must fit `domMaxChars`; the entire serialized request must fit `payloadMaxChars`. Supplement is trimmed first, then low-ranked candidates. Feedback includes only rejected selector/count/reason; the same budget is rechecked before every retry. Essential context/feedback overflow stops without dispatch. These are character limits, not token counts or a guarantee that target context survived. Full-mode null responses retry within maxAttempts as in the thesis; provider failures terminate immediately.

Per-attempt records retain the original proposal, rejected normalization variants and request hash/coverage. Default reports omit candidate payloads and cleaned HTML; sensitive raw capture remains explicit/local. Independent semantic assessment never becomes selection input. Stronger privacy filtering, generic containers, finite normalizer and the supported wrapper subset are disclosed differences from the prototype, not claims of method/performance identity.

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


## Optional persisted live-request budget

`createLiveBudget(absolutePath, plan)` creates a new owner-only ledger and refuses overwrite. `createBudgetedOpenAIProvider({apiKey, config, ledgerPath, phase})` wraps the same OpenAI adapter and reserves a request plus conservative estimated token cost before dispatch. Phase/total limits persist across provider instances and process restarts; unknown/incomplete usage halts subsequent dispatch. Reservations are retained, not refunded for retries. `readLiveBudget` exposes sanitized accounting; `serializeRequest` supports an explicit private payload audit. Keep ledgers/context records local and out of source control.

The ledger is an application-level guard using caller-supplied model-matched price assumptions, not a change to provider-account billing controls. The serialized UTF-8 byte count plus 1024 framing tokens and maximum output form a conservative cost reservation. Actual reported usage remains separate and unknown values remain unknown. A held lock or pending request fails closed; inspect evidence rather than deleting/resetting a live ledger.

The supplied live demo now requires `HEALING_LIVE_BATCH_FILE` in addition to the existing explicit key/request cap. It saves the actual sanitized request body separately beside the ledger for local review. Offline demo usage is unchanged.


## Provider failure policy (development 0.0.2)

Provider, transport and budget exceptions terminate the current event as `provider-failure`, unless the total deadline expired (`time-limit`). A candidate-repair attempt cannot fix a halted ledger, unavailable API or uncertain request. Parse/selector-validation failures still use the configured remaining attempts. No default timeout, selection score or prompt changed.

The deadline race may return before the adapter records its cancellation. In that case the event truthfully keeps dispatch/usage unknown; the separately retained budget ledger can establish transport dispatch during the external audit, but missing token usage stays unknown. Late provider output is never applied. Do not clear a halted ledger or interpret API failure as correct abstention.

## Version 0.0.4 reporting refinement

Attempt `providerMetadata` records allowlisted `returnedModel` and `finishReason` when supplied. Effective `config.model` remains the requested identifier. Missing/invalid metadata, old/custom providers and pre-response failures remain null; no snapshot is inferred from an alias. Metadata survives selector parsing failure but cannot reconstruct old 0.0.3 responses. Reports continue to omit arbitrary provider response properties.

`summary.wrongEffects` now means distinct events with any wrong-effect assessment. `wrongEffectAttempts` counts distinct explicitly assessed attempts, and `wrongEffectAssessments` counts raw wrong-assessment records. The last number can be larger when event/attempt assessments describe the same action; it is not a count of separate effects. All assessment records remain intact and later correctness never erases an earlier wrong effect. Historical 0.0.3 summaries used assessment-row counts under `wrongEffects`; do not pool these fields across versions without normalization.

These changes affect observability only. Frozen D24 results use private package 0.0.3 and per-slot independent correctness; 0.0.4 has offline engineering evidence, no new live effectiveness measurement.


## Version 0.0.6: optional target contract prototype

The default path retains 0.0.5 recovery behavior. Spec-aware use is explicit and needs a consumer-authored, versioned contract for the target application. The library reads one selected Markdown file; it does not need or crawl application source code. A repository's development OpenSpec is not automatically a target application's runtime contract.

```ts
import { createHealingSession, loadTargetSpec } from 'self-healing-tool';
const contract = await loadTargetSpec('./target-specs/settings.md');
const healing = createHealingSession(page, {
  config, provider,
  targetSpec: { mode: 'enforce', contract, expectedRevision: 'settings-v1' },
});
```

Put exactly one `self-healing-contract` JSON fence in the selected Markdown:

````md
```self-healing-contract
{
  "schemaVersion": 1,
  "requirementId": "SETTINGS-01",
  "revision": "settings-v1",
  "intent": "Edit the workspace display title",
  "action": "fill",
  "status": "active",
  "allOf": [
    { "sources": ["label", "nearestLabel", "ariaLabel"], "anyOf": ["workspace title"] }
  ]
}
```
````

The loader validates bounded data, records the file basename and SHA-256, and rejects executable/unknown fields. `allOf` requires every clause; within a clause, one complete case-insensitive normalized token phrase must appear in one named observable source. It is a lexical rule, not an LLM judge or executable assertion. See the exported `SpecEvidenceSource` type for available observations. Link/form action observations retain pathname only.

`context` and `enforce` send the same contract and prompt to the provider. `context` leaves recovery admission to the ordinary structural checks; `enforce` additionally checks current evidence on the resolved node before acting on that same node. A rejected or uncertain gate ends recovery; it does not search until a convenient candidate passes. Evidence mismatch produces `spec-unknown`, not a proof that the application contains a bug. Missing, stale, sanitized, retired and action-incompatible contracts are explicitly distinguished in reports.

The gate applies only to recovery. A working original locator is executed normally and remains subject to consumer assertions. Labels/containers can be misleading, so admitted actions still need independent business-outcome checks. Narrow clauses can reject valid paraphrases; broad clauses can admit wrong targets. Writing and maintaining these clauses is a measured integration cost, and the D26 study does not claim automatic OpenSpec compilation or universal prevention of false healing.

Use [the frozen comparison protocol](evaluation/spec-aware-protocol.md) for empirical claims. Unit and mocked browser checks verify execution mechanics only.

Operational failure during admission remains separate from a contract decision: an expired recovery deadline yields budget/time-limit, and page closure or failed observation yields context/context-failure. Neither produces a semantic refusal or a spec decision. Only an observed target change can produce spec-target-unavailable/unknown.

## Version 0.0.7: corrected candidate context

Version0.0.7 changes the common extraction/ranking/request representation for all modes. Unavailable action targets are filtered before ranking; accessible labels and scrollable offscreen controls are retained. Generic semantic groups survive layout wrappers. Suggested locators are verified with Playwright against the exact originating node, not only checked for unique counts. A retained unaddressable descriptor has an empty selector and no suggestions; ranker-only skips it. Full mode may compose another locator, subject to ordinary runtime validation and optional contract admission.

The wire payload drops empty fields and redundant audit metadata. `coverage.domChars` measures projected candidate JSON plus any cleaned HTML; `payloadChars` measures the complete request. Additional coverage fields distinguish scanned nodes, unavailable controls, ranked eligible candidates, checked shortlist, unaddressable descriptors and budget omissions. These counters report separate stages; `omitted` remains eligible candidates minus included candidates. Neither uniqueness nor contract admission proves the intended business outcome.

Historical D25/D26 behavior and results above remain versioned references. D27 reuses known cases for regression and does not establish unseen generalization.

## Version 0.0.8: owning evidence and bounded observation refresh

D29 separates `localActionContext` from `ownerContext`, with `ownerStatus` and `ownerSources` provenance. Legacy container evidence now carries bounded owning identity, not an entire ancestor's prose. Unnamed action wrappers do not automatically stop ownership traversal; unresolved named boundaries and missing nested owners are explicit uncertainty. This does not infer arbitrary business semantics from markup.

After an explicit null choice, the full provider mode refreshes observations at most once within the current event budget. Only changed selection evidence permits a subsequent call; unchanged evidence stops as abstention. Invalid-selector feedback retries remain bounded as before. Default maxAttempts is still a ceiling, not a required number of API calls. Per-attempt exact input context and refresh diagnostics are available in local snapshots; normal reports omit them. A later known fill value is redacted from all retained context copies.

Contracts and lexical admission are unchanged. Reworded labels, misleading metadata and semantically ambiguous controls can still lead to refusal or wrong action; independent behavioral assertions remain necessary. See [D29](decisions/2026-09-14-owner-evidence.md) for scope and evidence rules.
