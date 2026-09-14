# D29 engineering verification — 2026-09-14

Issue: [#17](https://github.com/wildanniam/self-healing-tool/issues/17). Version: 0.0.8. Node 24.18.0, Playwright 1.62.1, macOS arm64. This is engineering verification and offline diagnosis, not model-effectiveness evidence.

## Verified changes

The collector separates owning identity, local action context and provenance. Unnamed action wrappers preserve justified outer identity; unrelated sibling prose and nested entity headings cannot become that identity. Missing inner owners and unresolved competing names stay explicit. An independent review found an asymmetric-card counterexample after initial tests passed: the headingless peer had erased recognition of the headed peer. The final rule recognizes same-tag control-bearing peer families with at least one own heading, keeps the headed owner's identity and refuses to borrow for the missing peer. A title-only sibling and nested-owned controls do not manufacture a peer family.

Full-mode no-selection refreshes at most once. Compare actual fitted selection evidence with the refreshed observation fitted under identical prior feedback; accounting-only changes and changes removed by the payload limit do not cause another model call. Provider failure and admission refusal remain terminal. All exact attempt/refresh contexts participate in later-value redaction; normal reports omit raw contexts.

## Checks on final implementation

- TypeScript build/type check: passed.
- Unit tests: 42/42 passed, including normal-report omission and owner projection.
- Browser suite: 83/83 passed, workers=1. Ten owner tests and ten observation-retry tests add cross-layout, missing-owner, feedback-budget, timeout, late-response and privacy coverage.
- Clean tarball consumer: import, original fill, ranker recovery and enforced-contract recovery passed. Package asset allowlist passed.
- OpenSpec strict validation and traceability: passed before completion updates; final register is checked again after evidence linkage.
- Traceability audit tests: 7/7 passed.
- Native fixture/oracle preflight: 222/222 passed, zero healer/model calls, fixture bundle `621956d78f68fa780f3cb7b10e24d93fd74a96dcbebe837ffd9d22c1048d499f`.
- Offline diagnostics: 126 checks passed, 60 forced-selector runs and 42 initial payload captures. B/C inputs match for all 14 noncontrol conditions. These are forced answers, not AI results.
- Independent post-fix counterexamples: 3/3 passed; identity renaming, action variation, order reversal and wrapper changes did not restore the asymmetric-peer defect. [Retained independent check](owner-evidence-independent-check.json).

The first consumer attempt hit a sandbox cache restriction; the second sandbox attempt stalled at npm network access and was stopped. The final consumer check ran successfully with the needed host permissions. Chromium likewise required host execution permission. These setup failures are not healer failures. Earlier 80-test and focused runs are intermediate evidence; the final 83-test suite includes the subsequent fixes.

## Forced-selector results and limits

For enforced C on h2-03, forcing the correct destination control was previously rejected and is now accepted with a correct independent business outcome; the wrong origin control remains rejected. On h1-05, both correct and misleadingly labeled wrong fields still satisfy the unchanged lexical contract. On h2-04, the correct `Change delivery address` control still fails the literal `destination` clause. Thus extraction is corrected for the audited examples, but these two method limits are not solved by owner extraction or refresh.

No fixture, contract, oracle, original ranker weights or model prompt was edited. The new representation can nevertheless change rankings and model choice. All 62 archived D27 inputs, 16 fixture files and four historical artifacts match their retained hashes. Reused conditions are known regression, not unseen validation. Row identity and named-group interpretation remain bounded structural heuristics, not universal business semantics.

The first-payload reservation estimate for 126 noncontrol calls is US$0.17072595; mechanically repeating each three times projects US$0.51217785, exceeding the US$0.50 cap. This is not an actual-cost forecast. The fresh ledger enforces the cap per dispatch and will preserve partial results if exhausted. Static nulls now stop after one call; no budget top-up is planned.

## Subsequent CI fixture stabilization

One push CI run failed two new observation tests with native `TimeoutError2`; the corresponding PR CI run passed all checks on the same commit. A controlled six-condition probe reproduced that exact outcome by delaying either pre-action or post-action zero-count observation by 160 ms against the test's 100 ms action timeout. With a 1000 ms fixture timeout the same delays reached recovery, made one provider invocation and abstained correctly. The CI failures overlapped the large 300-entity test, but the actual CI count-probe durations were not logged, so runner contention remains an inference rather than a measured cause.

Only the observation test fixture's original-action timeout is changed to 1000 ms; assertions, recovery/provider deadlines, runtime source and the empirical 3000 ms action timeout remain unchanged. The 74 frozen experiment input hashes are unchanged. This test-only correction does not justify replacing or rerunning empirical results.
