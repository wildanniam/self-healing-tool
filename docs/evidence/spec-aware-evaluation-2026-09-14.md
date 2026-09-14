# D26: four-stage method evaluation completed

The restored core, a generic target-contract prototype, a matched three-arm comparison, and independent post-freeze tasks have all been executed. The experiment supports investigating contract admission further, while exposing substantial recovery and observation limitations. It does not establish a final production method or universal prevention of false healing.

## What was compared

- **A:** restored TA core 0.0.5, including context cleaning, ranking, failure context and bounded retries; immutable baseline commit `c5641cec2082431d384a13564ff802d9ed714b64`.
- **B:** the same recovery pipeline plus a consumer-authored target contract and additional `href`/`formAction` observations. A/B does not isolate specification text alone.
- **C:** the same input as B, with a deterministic contract check on the actual element immediately before the recovery action. The admitted element handle receives that action.

The loader consumes explicit versioned JSON annotations in a Markdown file. Schema and matching logic are reusable; target clauses are manually authored. This is not automatic interpretation of arbitrary OpenSpec prose or verification of the application's business implementation. Original-locator success bypasses this recovery guard.

## Actual live results

All **324 planned slots** completed: 180 known private-regression slots and 144 independent synthetic holdout slots. Normal controls make zero model calls; the recovery attempts made **516 actual provider requests**. There were no provider, setup or assessment failures in these completed collections, no unknown usage, and no pending accounting. Estimated total token cost is **US$0.15437535**; every response reported `gpt-4o-mini-2024-07-18` through the configured alias.

| Data and metric | A | B | C |
|---|---:|---:|---:|
| Private: correct acknowledged recovery | 15/36 | 15/36 | 15/36 |
| Private: any wrong effect / all slots | 3/60 | 3/60 | 0/60 |
| Private: appropriate explicit refusal / negative slots | 0/12 | 0/12 | 0/12 |
| Private: appropriate unknown stop / negative slots | 0/12 | 0/12 | 3/12 |
| Private: normal controls correct | 12/12 | 12/12 | 12/12 |
| Holdout: correct acknowledged recovery, valid applicable contract | 18/24 | 21/24 | 18/24 |
| Holdout: any wrong effect / all slots | 12/48 | 3/48 | 0/48 |
| Holdout: appropriate refusal or unknown / negative slots | 6/12 | 9/12 | 12/12 |
| Holdout: unnecessary stop, valid applicable contract | 0/24 | 3/24 | 6/24 |
| Holdout: normal controls correct | 6/6 | 6/6 | 6/6 |

Private data comprise 20 known conditions in four task families. Holdout comprises 16 condition variants in two independently authored synthetic application tasks. Three repeats per condition/arm are dependent observations, not three new tasks. Do not pool the data into a universal accuracy estimate or compare these numbers causally with historical D24 0.0.3 results.

## Findings that matter

1. **The original false-healing problem persists after TA restoration.** In the private absent-certificate-field condition, A and B filled the display-name field in all three repeats. C stopped because the observed field identity did not meet the supplied requirement. Its result is an explicit lack-of-evidence stop (`unknown`), not proof that the application feature was deliberately retired.
2. **Contract context alone is insufficient.** The B/C initial provider inputs were identical in 48 private and 42 holdout pairs, with zero mismatches. The 12 private and six holdout controls without provider requests are unavailable comparisons, not additional passes. Equal input does not make model sampling deterministic.
3. **Upstream candidate coverage is currently a major limitation.** In the private study, the intended target was identified in the transmitted candidate set for only 15/36 recoverable opportunities per arm. Each arm achieved 15/36 verified recoveries. In the inspected navigation text-drift example, all seven transmitted candidates were marked hidden and the target was absent. Full pre-truncation ranks were not retained, so the exact discard point remains uncertain. A contract check cannot recover a target it never receives as a valid proposal. The other nine negative observations per arm exhausted selection/validation rather than producing an appropriate explicit stop.
4. **The generic check transfers beyond the certificate task, with a completion cost.** In the independent tasks C had no observed wrong effects, but stopped six of 24 valid repair opportunities. Three additional losses relative to B came from a warehouse identity represented by `fieldset`/`legend` that the context extractor omitted. Another six physically recoverable missing/stale-spec opportunities were stopped by policy; keep this distinct from valid-contract unnecessary stops.

## Evidence quality and limitations

The private positive oracle runs only after action acknowledgment; its default `oracleCorrect:false` on an unexecuted action does not establish the final business state. The supplementary audit reports those goal outcomes as unknown. The independent shipment oracle observes reducer state/journal, not visible dialog rendering. Two holdout records show effects despite failed acknowledgment: one wrong effect in A, one intended state reached in B. Primary acknowledgment-based results remain unchanged; state/effect breakdowns are posthoc additions.

The schema and matcher contain no certificate-specific branch. However, lexical matching can be fooled by misleading labels and can reject valid synonyms or missing context. This is bounded transfer evidence, not semantic correctness proof. Consumer annotations require maintenance, and their authoring effort was not measured. Human productivity, practitioner acceptability and public-release readiness were not evaluated in this increment.

Mechanism checks passed for build/typecheck, 26 unit tests, 17 targeted spec browser cases across retained runs, clean-consumer integration, exact no-spec request/context parity, and seven audit tests. The **complete browser suite is not green on this host**: nine earlier native 100–300 ms timeout/classification failures remain recorded. These are separate from the two successfully completed live collections.

## Freeze, setup failures and provenance

The live method is the implementation at `68cff2c`; subsequent commits add analysis/documentation without tuning it. All 78 holdout inputs match their frozen hashes after collection. Private sources and both library artifacts also match their final freeze.

- Holdout directory `output/d26/holdout-v2`; freeze digest `b5e0503d1925150e2ab5b4f2cfa609a023c6dc8d2307833b2aff77af1c2fb4af`; native preflight 222 checks.
- Private final ID `apsec-d26-known-8d006f9a-dc7d-48de-920e-06fe71cd0d94`; freeze SHA-256 `b83b5b2819ef17383745bf140713d870f0553ff5b10d536f5b44eef702634bc2`; harness commit `1aa7f2583aab0797efe4142ffd9566e02a31ba4a`; final collection 25 prerequisites + 180 slots passed as an execution harness, not 180 successful healings.
- Several private rehearsals failed before model calls due to build/environment constraints. A subsequent collection freeze was aborted at its 100 ms adapter calibration with all 180 slots unstarted and zero private requests. Only that test's timeout was aligned with the already frozen 3000 ms empirical setting; core, contract and scoring were unchanged. The successful final freeze is separate; prior evidence is retained.
- Holdout was collected first while private build infrastructure was prepared. Paid dispatch was serial under one US$2/980-request ledger. It was never reset or topped up.
- Private cost US$0.10503660; holdout US$0.04933875. All 516 requests reconcile uniquely. Cost is derived from recorded usage and the frozen standard uncached price, not an invoice.

Read [independent holdout details](spec-aware-holdout-2026-09-14.md), [mechanism verification](spec-aware-engineering-2026-09-14.md), and [the frozen protocol](../evaluation/spec-aware-protocol.md). Raw data and read-only ledger snapshots are retained in the original projects' ignored output directories. Private application artifacts stay in the private host.

## Recommended next increment — proposal, not a new locked method

Keep the spec-aware direction, but address target loss from the candidate context and missing named-group relationships before presenting this version as a mature method. Preserve D26 as a completed experiment. Any resulting method change needs new independent tasks; re-running these now-known cases alone would not establish transfer. Review the target requirements and safety/completion tradeoff with the authors before locking paper claims. Public demo packaging, practitioner review and manuscript/submission remain separate work.
