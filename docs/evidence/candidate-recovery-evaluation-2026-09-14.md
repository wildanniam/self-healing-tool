# D27 candidate-recovery evaluation

The candidate/locator corrections substantially improve recovery on the known private application, but the complete regression also exposes worse synthetic recovery and a false admission. This is engineering evidence for D27 / issue #15, not manuscript text or a release recommendation. The frozen method remains unchanged after outcomes were observed.

## Design and version

Library 0.0.7, source commit `136e3bc`, engineering checkpoint `b1d11be`; Node 24.18.0, Playwright 1.62.1 Chromium, returned model `gpt-4o-mini-2024-07-18`. All D27 arms share the corrected core. A omits targetSpec; B supplies the contract and additional DOM observation fields; C receives the same first request as B and additionally applies admission before action. A/B do not isolate the effect of specification prose alone.

The repeated private workload has 20 conditions: 4 controls, 12 recoverable mutations, 4 negatives. Three repeats on A/B/C yield 180 slots. The repeated synthetic workload has 16 conditions across warehouse and shipment applications: 2 controls, 8 recoverable variants with applicable contracts, 4 negative conditions, and 2 missing/stale-contract cases. Three repeats on A/B/C yield 144 slots. The 324 executions are dependent repetitions of 36 known conditions, not 324 independent cases or a new holdout.

Model, repetition, budget, oracle and mutation definitions follow the frozen D27 protocol. Maximum 3 attempts, temperature 0, output 500 tokens, action/recovery/provider timeouts 3/45/15 seconds, DOM/payload limits 8000/12000 characters. No cases, contracts, thresholds, source or scoring were tuned during collection. D26 is preserved separately.

## Before and after: private application

Each cell is D26 → D27. Correct recovery requires an acknowledged action and independent correct effect, not simply a passing collector test.

| Measure | A | B | C |
|---|---:|---:|---:|
| Correct controls /12 |12 → 12|12 → 12|12 → 12|
| Correct recoveries /36 |15 → 33|15 → 36|15 → 36|
| Wrong effects on negatives /12 |3 → 9|3 → 6|0 → 0|
| Appropriate negative stops /12 |0 → 3|0 → 6|3 → 12|
| Unnecessary recoverable stops /36 |0 → 3|0 → 0|0 → 0|

All 180 slots and 25 native/calibration/adapter checks completed; no operational failure or unstarted slot. All 36 recoverable slots per arm now contain a locator uniquely resolving the intended target. A still returns no selection for F-R08 across three repeats despite the target being present; B/C recover it. This is observed model abstention, not evidence about the model's internal reason.

F-N01 is now correctly stopped by all arms. A/B act wrongly on F-N02 and F-N04; C blocks. A also acts wrongly on F-N03 while B/C abstain. For all six B wrong-effect slots, B/C first input and first proposed selector are identical; C stops before action. Improved usable candidate coverage also enables previously blocked wrong actions, so recovery counts alone would misrepresent effectiveness.

The private supplemental audit retains three unknown positive-goal observations in A because the inherited oracle runs after action acknowledgment. These are not proved physical-goal failures. One application `destination stream closed early` diagnostic remains in the raw log; no slot or provider accounting is missing and no operational failure is classified, but its exact cause is unresolved.

## Before and after: known synthetic regression

| Measure | A | B | C |
|---|---:|---:|---:|
| Correct controls /6 |6 → 6|6 → 6|6 → 6|
| Correct recoveries with applicable contract /24 |18 → 18|21 → 18|18 → 15|
| Wrong effects across all slots /48 |12 → 9|3 → 6|0 → 3|
| Unnecessary stops on valid recovery /24 |0 → 3|3 → 3|6 → 6|
| Appropriate negative stops /12 |6 → 6|9 → 9|12 → 12|

All 144 slots completed with no operational failure, unstarted slot, unassessed accepted recovery, unknown state/effect observation or effect without acknowledgment in D27. The independent state oracle agrees with recorded semantic/wrong-effect classifications. Synthetic state changes do not independently prove rendered dialog visibility; no Playwright trace or per-attempt business timestamp is available.

Six additional physical recovery opportunities per arm have missing or stale contracts. A/B attain all six goals; C stops all six. These are reported separately from the 24 valid-contract opportunities. Including them gives acknowledged correct physical recoveries A 24/30, B 24/30, C 15/30. A generic "success rate" mixing controls, negative stops and contract-quality cases would obscure this tradeoff.

### Recorded failure mechanisms

- **h1-03, warehouse structure:** C now recovers all three repeats after previously rejecting them. Fieldset/legend identity survives the wrapper.
- **h1-05, duplicate labels:** A/B/C each choose `#harbor-target-stock` across all three repeats, changing target stock instead of the intended reorder level. Both fields carry the label `Reorder level` and belong to `Harbor warehouse`. The recorded C decision accepts both required clauses. Read-only replay of the frozen gate confirms that both this wrong candidate and `#stock-limit-editor` satisfy the same contract. Unique locator resolution does not imply unique business identity. D26 C selected the correct field; the combined ranking/context/projection change coincides with a different selection, but no component ablation identifies which change caused the model choice.
- **h2-03, nested semantic group:** C rejects the correctly selected `#dispatch-edit-address` in all three repeats. `containerFor()` stops at `aside.actions`; the outer section's shipment identity is omitted. The action clause matches, while the CN-804 entity clause does not. A/B execute correctly. This is a demonstrated context-extraction regression and a counterexample to CTX-007-S2, so task 11.1 is reopened.
- **h2-04, paraphrase:** all arms return no selection for all bounded attempts across three repeats. The intended button exists with a valid locator and the label `Change delivery address`. This observed failure occurs before admission, including in A without a contract. Separately, read-only gate replay rejects that candidate because its allowed label sources lack the contract's literal `destination`. That lexical weakness is a counterfactual additional blocker, not the observed cause of the model's abstention.

For C, the nine unsuccessful valid-contract opportunities consist of three wrong actions, three correct-selector rejections and three model abstentions. This is why the private 36/36 must not be presented as general correctness or elimination of false healing.

## Audit and accounting

Engineering verification before collection: 40/40 unit tests, 63/63 browser tests, clean-tarball consumer, strict OpenSpec/traceability and 7/7 audit tests. Synthetic native preflight passed 222 checks with no healer/provider; private exact-artifact rehearsal passed 25/25, followed by the same checks during collection. See the separate engineering record for stress limits and earlier unsuccessful development checks.

Post-collection SHA-256 checks confirm all 62 synthetic frozen inputs plus runtime/native provenance, and all 420 private input files plus 26 library artifact files. Both primary audits match the retained runner summaries. Every provider reservation maps uniquely to a completed slot. B/C first-request parity is 48/48 private and 42/42 synthetic comparable pairs; the respective 12 and 6 zero-request controls are not missing experiments.

| Workload | Actual requests | Input tokens | Output tokens | Known token-priced cost |
|---|---:|---:|---:|---:|
| Private |180|335112|2301|US$0.05164740|
| Synthetic |192|224433|1260|US$0.03442095|
| Total |372|559545|3561|US$0.08606835|

All requests settled; no unknown usage, pending reservation or ledger halt. The cap was 980 requests / US$2, not a spending target. D26 cost US$0.15437535 for 516 requests; these are observed run costs under the retained price assumption, not an isolated causal efficiency result or billing invoice. The final ledger is retained read-only; completion does not authorize additional calls.

## Disposition and next engineering work

Collection and analysis tasks 11.4/11.5 are complete. CTX-007 returns to implemented status and task 11.1 is reopened because of h2-03. Historical passing fixture evidence remains alongside the new counterexample. The method is not ready for a claim of generally safe unattended repair; both PRs stay draft.

Proposed follow-up, not implemented or remeasured in D27: preserve bounded ancestor identity through nested semantic containers without merging neighboring entities; treat multiple contract-compatible targets as unresolved ambiguity; separately test paraphrase coverage without adding case-specific aliases after seeing the result. Ambiguity refusal can prevent an action but also loses a valid repair, so it must be measured rather than counted as recovery. Stronger business-effect verification requires a consumer-owned oracle; label matching alone cannot guarantee semantics. A new transfer claim requires fresh tasks not used to tune these fixes.

Author interpretation, practitioner-study feasibility, distribution/license, paper/demo claims and release decisions remain open. The current evidence can support an honest prototype discussion, not a blanket success or acceptance guarantee.

## Source trail

- [D27 protocol](../evaluation/candidate-recovery-protocol.md), [engineering verification](candidate-recovery-engineering-2026-09-14.md), [historical D26](spec-aware-evaluation-2026-09-14.md).
- [Library issue #15](https://github.com/wildanniam/self-healing-tool/issues/15), [draft PR #16](https://github.com/wildanniam/self-healing-tool/pull/16), stacked on #14.
- [Private issue #182](https://github.com/wildanniam/koderea/issues/182), [draft PR #183](https://github.com/wildanniam/koderea/pull/183), stacked on #181. Private results document: `web/evaluation/self-healing/d27/results.md`.
- Synthetic/local audit archive: `/Users/wildanniam/Development/project-ta/self-healing-tool/output/d27`, including freeze, results, summary, posthoc analysis, comparison, selected-case diagnostic, post-collection hash audit and final read-only ledger. Raw files remain ignored.
- Private archive: `/Users/wildanniam/Development/koderea/web/output/self-healing-d27/apsec-d27-known-633ad6c8-38b1-490c-9fb1-0e62ad9fad32` (971 hash-verified files); separate rehearsal archive `web/output/self-healing-d27-rehearsal/9be337fc-1e30-45de-ad64-c6c9351eed67` (64 files). No private raw payload or source is copied into this library.
- Atlas canonical note: `20 - Projects/Self-Healing Test Automation/APSEC Candidate Recovery Execution 2026-09-14.md`.
