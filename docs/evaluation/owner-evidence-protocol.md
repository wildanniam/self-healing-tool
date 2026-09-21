# D29: bounded owner evidence and abstention refresh regression

Issue #17 governs this engineering increment. This protocol is an operational evaluation plan, not an APSEC manuscript. The user authorized implementation and rerunning previously failing scenarios. The chosen batch is restricted to the existing synthetic fixtures; no private application or production action is included.

## Intervention and interpretation

Version 0.0.8 introduces owner evidence that separates an action's local context from its structurally associated owner, and a bounded refresh after model abstention. The exact changes are tracked by the D29 OpenSpec change. Literal contract phrase requirements remain unchanged. No answer selectors, case-specific aliases, historical target store, business oracle, or automatic natural-language requirement interpretation are added to the recovery method. This bundle cannot establish the isolated causal effect of each component.

A has no target specification. B receives the contract as model context. C receives the same contract with deterministic admission. All arms share one frozen source/build, model/request configuration and observation implementation. B/C contract and first-request parity must be measured, not assumed. Owner evidence is not a guarantee of business identity; refusal on insufficient evidence remains possible.

## Immutable workload and denominator

The exact `evaluation/holdout/` fixture, contract and oracle bytes from D27 are retained. Sixteen known conditions across two application groups, three arms and three repeats produce 144 planned slots. The order rotates A/B/C by case index plus repeat. Every slot starts in a new browser context. Two normal controls, eight valid-contract recoverable conditions, four unavailable/retired conditions and two missing/stale-contract conditions are reported separately. The last category remains physically recoverable while policy applicability is lacking. Cases were already inspected: this is regression evidence, not an unseen holdout or 144 independent tasks.

No failed or unstarted slots disappear from denominators. Every business effect, including effects without successful action acknowledgment, remains in the independent evaluator. The scoring and native oracle are inherited unchanged. A known-case result cannot establish broad generality or acceptance at a conference.

## Precollection gates

1. Run relevant type/unit/browser/consumer/OpenSpec/traceability/audit checks.
2. Run `node evaluation/native-d29-preflight.mjs`: native intended and deliberate wrong actions prove target reachability, observable business outcome, retained previous wrong effects, independent reset, contract authorship and localhost-only fixture execution. This is not a healer accuracy test.
3. Run `node evaluation/offline-d29-diagnostics.mjs`: compare D27 and D29 forced-selector runtime behavior on the three previously problematic conditions and both controls; separately run a full-condition payload and conservative reservation precheck. Forced selections are deliberately supplied by the evaluator and must not be described as AI decisions. The ordinary live provider receives no oracle or intended selector.
4. Review the projected reservation envelope before collection. `maxAttempts=3` remains a ceiling; refreshed observations can stop unchanged null responses earlier. The budget reserves UTF-8 payload bytes plus 1024 framing tokens and the 500 output-token ceiling, without refunding reservations. Therefore an actual-cost estimate is not proof the full batch fits the reservation budget.
5. Create one new ledger with `node evaluation/init-d29-budget.mjs`. Freeze source, compiled build, protocol, all D29 harness scripts, unchanged fixtures/contracts, runtime identity, preflight, offline diagnostic status, historical D27 provenance and the exact ledger plan. No paid calls occur until root review of this freeze.

## Provider, budget and traceability

The hard fresh budget is US$0.50 and at most 432 requests, with no top-up, ledger reset, hidden retries or reuse of D26/D27 ledgers. The historical accounting phase name `holdout` is retained for analyzer compatibility only. Unknown billing halts the run. If this ceiling prevents completion, remaining planned slots stay visible and the report is explicitly partial.

The frozen configuration is gpt-4o-mini, temperature 0, output cap 500, at most 3 attempts, action/recovery/provider timeouts 3000/45000/15000 ms, candidate/HTML budget 8000 characters, complete-request budget 12000 characters and at most 30 candidates. Record the actual returned model ID. No automatic `.env` discovery occurs: the runner accepts `OPENAI_API_KEY` only through the explicit process environment and never writes or prints the key. Credential loading, when authorized, is performed by the root operator outside this harness.

The provider wrapper stores the exact sanitized serialized request and its SHA256 before every dispatch, including refreshed attempts. It also records UTF-8 byte count and coverage/omissions. Post-run auditing compares these bytes to attempt hashes and ledger reservations, with one owner per reservation. Initial `event.context` must not be substituted for later refreshed requests. Per-attempt runtime observations and request records are operational evidence, not evidence of model reasoning.

Privacy diagnostics use independent ephemeral sentinels; empirical fixture bytes remain untouched. Exact requests contain allowlisted synthetic observations only. Native evaluator metadata, expected selectors, case identifiers, state assertions and oracle outputs are not supplied to the live provider. D27 archived source/build/results and all fixture hashes are rechecked before freeze, before live collection and after analysis.

## Required results and evaluation limits

Report normal controls, correct acknowledged recoveries, wrong effects, unnecessary stops, appropriate refusal/unknown, validation or action failure, operational failure and unstarted slots separately. Include per-condition and per-arm breakdowns, valid-contract versus missing/stale opportunities, model calls, returned models, tokens, reservation consumption, known billed cost and unresolved accounting. Preserve B/C first-input parity, per-attempt coverage, exact payload hash correspondence and complete reservation ownership.

The forced-selector diagnostic uses 200 ms only for the expected missing-original-locator wait; empirical live collection retains 3000 ms. Both use Node 24.18.0 and Playwright 1.62.1. Diagnostic selections and precheck payload estimates are not additional empirical samples and cannot be added to the 144-slot success rate. Freeze before paid collection; no changes to core, contracts, prompts or scoring after outcomes. Further iterations require a new identified batch.
