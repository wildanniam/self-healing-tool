# D29 result: audited mechanics improved, overall safety regressed

Issue [#17](https://github.com/wildanniam/self-healing-tool/issues/17), draft PR [#18](https://github.com/wildanniam/self-healing-tool/pull/18), executable source commit `94e55b6d37954063209e5bba6be7af8ded68d244`, package 0.0.8. A later test-only commit `cb059dd` changes a CI fixture timeout; all 74 frozen experiment inputs remain identical. Both push and PR CI checks on that commit passed.

**Do not promote this increment as an overall method improvement.** The owning-context defect is corrected on the audited layouts and h2-03, but changing the shared input representation coincides with a new model-selection regression on h2-05. Enforced C remains at 15/24 correct valid-contract recoveries; wrong effects increase from 3 to 6. The PR remains draft. No merge, release or submission occurred.

## Workload and actual collection

The same 16 synthetic conditions × three arms × three repeats = 144 completed slots, no missing slots or operational failures. Per arm: six normal controls, 24 valid-contract recovery opportunities (eight conditions × three repeats), 12 negative conditions, and six physically recoverable missing/stale-contract conditions. Repeats are not independent tasks. No private Koderea batch was rerun; the prior 36/36 private C result belongs to D27, not version 0.0.8.

A uses the shared core without target contract; B supplies the contract to the model; C uses the identical contract context plus lexical admission before the recovery action. Original fixture, task, contract, model prompt, ranker weights and business oracle bytes were preserved. Narrower features can still change score values and model inputs.

| Metric | D27 A | D29 A | D27 B | D29 B | D27 C | D29 C |
|---|---:|---:|---:|---:|---:|---:|
| Correct normal controls / 6 | 6 | 6 | 6 | 6 | 6 | 6 |
| Correct valid-contract recovery / 24 | 18 | 15 | 18 | 15 | 15 | 15 |
| Wrong effects, all 48 slots | 9 | 12 | 6 | 9 | 3 | 6 |
| Wrong effects on 12 negative slots | 6 | 6 | 3 | 3 | 0 | 0 |
| Correct missing/stale recovery / 6 | 6 | 6 | 6 | 6 | 0 | 0 |
| Unnecessary safety stops / 24 valid opportunities | 3 | 3 | 3 | 3 | 6 | 3 |

Missing/stale-contract recovery must not be silently added to the 24 valid-contract denominator. C appropriately stops under its applicability policy on those six conditions, but the original business action still remains unfulfilled. Wrong effects are counted regardless of final action acknowledgment; the independent state audit agrees with recorded outcomes.

## Previously failing and newly regressed conditions

| Enforced C condition | D27 | D29 | Evidence-backed interpretation |
|---|---|---|---|
| h2-03, destination control wrapped in an unnamed aside | 0/3 correct; correct selected control refused | 3/3 correct | Fresh gate now retains Shipment CN-804 as the owning identity. Wrong origin control remains inadmissible on this fixture. |
| h1-05, two warehouse fields labeled Reorder level | 0/3 correct; 3 wrong target-stock changes | 0/3 correct; 3 wrong target-stock changes | Both fields satisfy the unchanged observable clauses. Owner identity alone does not distinguish functions within one warehouse. |
| h2-04, Change delivery address paraphrase | 0/3 correct; repeated null | 0/3 correct; one null per event | Model still abstains. Forced intended selection is rejected by the unchanged literal destination clause. The field exists; this is not a missing target. |
| h2-05, two shipment buttons labeled Edit destination | 3/3 correct | 0/3 correct; 3 wrong origin-editor openings | D27 selected #dispatch-edit-address; D29 selected #edit-origin-cn804. Gate accepts the misleading destination label plus the correct shipment identity. |

**h2-05 is ambiguity with the correct target still present, not target-absent.** A brief intermediate progress message misidentified that condition and was immediately corrected after inspecting the fixture. Negative-condition C wrong effects remain 0/12. The six D29 C wrong effects arise from two ambiguity conditions × three repeats.

The h2-05 regression appears in all A/B/C arms, so it cannot be attributed solely to C's gate. Four post-collection forced-selector probes confirm that both D27 and D29 admit the intended button and the wrong origin button; the independent business oracle distinguishes their effects. These offline interventions are not extra model samples. The gate's inability to reject a mislabeled alternative is observable; which specific representation change caused GPT to switch targets is not isolated by this bundled before/after study. Do not invent a model reasoning trace or claim rank order alone caused it.

## Exact h2-05 input comparison

Independent reconstruction reproduces all nine D27 first-request hashes for this condition. Across all arms the system prompt, task and contract are unchanged. All six candidates remain available with zero omission, truncation or unaddressable locators. The wrong origin button was already rank 1 in D27 (score 191) and remains rank 1 in D29 (165). The correct destination button moves from rank 3 (166) to rank 2 (140); the score margin remains 25. B/C serialized payloads grow from 6480 to 6662 characters. Broad container text is retained in the new localActionContext; owning identity/provenance and field representation change.

Therefore the recorded regression is not explained by dropping the correct target, demoting its rank, payload overflow or a newly weakened lexical gate. Reorganized/reweighted evidence coincides with the changed model selection, but no single feature or internal model cause was isolated. Further counterfactual ablation is needed before claiming a corrective solution to this new regression.

## Retry, payload and accounting

126 actual requests completed; the returned model was `gpt-4o-mini-2024-07-18` on every response. Recorded usage: 153,996 input and 939 output tokens. Estimated cost under the frozen rate assumptions is US$0.02366280; conservative cumulative reservations are US$0.17072595 under the US$0.50 / 432-request cap. No pending, unknown-usage, orphaned or duplicate-owned requests remain. D27 synthetic collection used 192 requests and estimated US$0.03442095; reduced calls do not offset the safety regression.

All 126 requests have matching actual payload, runtime attempt hash, coverage and ledger byte count. All 42 noncontrol B/C first-request pairs are identical; six normal-control pairs have no requests and are reported unavailable, not passed. The 74 frozen inputs and D27 provenance match after collection. An independent audit passed 540 checks, including all 144 business-state/oracle comparisons and all 126 payload/attempt/ledger correspondences.

There are 33 unchanged-observation refreshes, each followed by stopping rather than a redundant API call; the other 93 attempts do not refresh. No refreshed-evidence recovery occurred in this static batch. Separate offline tests prove a newly observed target can be used; that is not additional empirical accuracy evidence.

## What is complete and what remains

Completed: owner extraction and missing-owner hardening, bounded refresh, exact attempt evidence/privacy, 42 unit and 83 full browser checks, clean consumer, OpenSpec/traceability, 222 native checks, 126 offline diagnostic checks, frozen collection and accounting analysis. See [engineering evidence](owner-evidence-engineering-2026-09-14.md) and [protocol](../evaluation/owner-evidence-protocol.md).

Open: eliminating the new h2-05 regression, distinguishing misleading same-label functions, and handling semantic rewording without admitting wrong effects. The library still uses a manual adapter contract and lexical clauses, not automatic interpretation of full OpenSpec meaning. Passing engineering checks is not evidence these research problems are solved.

The next proposed research step is to isolate the changed input components on ambiguity conditions and independent variants, preserving the separate fresh gate. Compare representations before choosing a further implementation. A policy that stops when evidence is ambiguous may reduce wrong actions but can reject interchangeable valid controls; it needs its own predeclared tests. Historical target evidence or stronger semantic checks are alternatives requiring new design/evaluation. No such extension, additional live budget or superiority claim is locked by this report.

Canonical local archive: `/Users/wildanniam/Development/project-ta/self-healing-tool/output/d29/`. It retains raw synthetic outcomes, exact request payloads, the frozen implementation, native/offline checks, independent audits, CI diagnostic and manifests. These are restricted local diagnostic artifacts, not public-release approval.
