# D26 independent holdout: completed live evidence

All 144 planned slots completed: 16 condition variants in two synthetic application tasks, three arms and three repeats. This is transfer evidence beyond the known private application, not 144 independent tasks or a real-world benchmark. The method was frozen before the first outcome. No core, contract or fixture was tuned after collection began.

A executes the restored 0.0.5 core; B adds consumer-authored target-contract context and the additional `href`/`formAction` DOM observations used by that context; C receives B's input and additionally checks the proposed element against the contract before acting. A/B differences cannot be attributed exclusively to specification text. These arms differ from the historical D24 full/ranker comparison of version 0.0.3. Do not pool their results.

## Outcomes

| Measure, per arm | A: core | B: context | C: enforced contract |
|---|---:|---:|---:|
| Completed / planned slots | 48/48 | 48/48 | 48/48 |
| Correct acknowledged recovery on valid, applicable contracts | 18/24 | 21/24 | 18/24 |
| Correct acknowledged recovery on all physically recoverable conditions, including missing/stale contracts | 24/30 | 26/30 | 18/30 |
| Any wrong business effect, including failed action acknowledgments | 12/48 | 3/48 | 0/48 |
| Incorrect acknowledged / all acknowledged recoveries | 11/35 | 3/29 | 0/18 |
| Appropriate stops on negative conditions | 6/12 | 9/12 | 12/12 |
| Of these: explicit refusal / unknown | 6/0 | 9/0 | 9/3 |
| Unnecessary stops on valid, applicable recoverable conditions | 0/24 | 3/24 | 6/24 |
| Normal controls correct, with no recovery interference | 6/6 | 6/6 | 6/6 |
| Provider or harness failures | 0 | 0 | 0 |

C prevented the observed wrong effects in this sample, but also stopped six valid repair opportunities. Relative to B, three additional valid opportunities were lost. Missing/stale contracts create another six C stops on physically recoverable conditions; those are reported separately as a completion cost of the contract policy. Zero wrong effects in this limited sample is not a guarantee of zero false healing.

## Diagnoses retained without tuning

- **Structure drift, warehouse task:** A and B selected the correct reorder-level field. C rejected it because the relevant warehouse identity was in a `fieldset`/`legend` relationship that the bounded ancestor extractor did not represent. All three repeats lost a legitimate repair. This is insufficient observed context, not a disappearance of the target between selection and action.
- **Semantic paraphrase, shipment task:** B and C stopped three recoverable opportunities where A acted incorrectly. They avoided the observed wrong action but did not complete the intended task; this comparison does not isolate specification text from the additional observations.
- **Absent warehouse target:** A and B changed another field in all three repeats; C prevented those actions. This reproduces the false-healing problem outside the certificate example.
- **Missing/stale specification:** A and B reached the intended state in all six physically recoverable opportunities. C stopped all six. Lack of an applicable contract does not establish that a feature was removed.

The schema and evidence matcher are generic; clause contents are authored for each target. The loader reads an explicit `self-healing-contract` JSON annotation, rather than interpreting arbitrary OpenSpec prose. The matcher is lexical, and observable DOM evidence is not proof of business semantics. A misleading UI can satisfy clauses and still perform the wrong function. The gate only checks recovery; an original locator that still succeeds bypasses it.

## Acknowledgment is not an effect oracle

Two retained runs show why wrapper success alone is insufficient. In shipment ambiguity A repeat 1, the wrong business effect occurred although the action promise failed. In the stale-spec shipment case B repeat 1, the intended state was reached although the wrapper did not acknowledge recovery. Thus state-based recovery attainment is A=24, B=27, C=18, while the frozen acknowledged-correct metric is 24, 26, 18. These state/acknowledgment breakdowns are posthoc additions; the primary summary is unchanged.

The shipment oracle observes reducer state and an effect journal updated before `showModal()`. It does not independently prove that the resulting dialog was visibly rendered. The retained reports lack per-attempt business timestamps and the original detailed action exception; the exact causes of these two failed acknowledgments cannot be reconstructed. They are not reclassified as provider failures or silently discarded.

## Accounting and input equivalence

All 192 reservations map uniquely to observed attempts. No missing/orphan/duplicate reservation or unknown usage remains. Recorded model responses all identify `gpt-4o-mini-2024-07-18`, using the configured `gpt-4o-mini` alias and temperature 0. Estimated cost is **US$0.04933875**, derived from actual returned token usage and the frozen pricing record.

| Arm | Requests | Input tokens | Output tokens | Estimated USD |
|---|---:|---:|---:|---:|
| A | 58 | 86,763 | 421 | 0.01326705 |
| B | 68 | 120,480 | 439 | 0.01833540 |
| C | 66 | 116,550 | 423 | 0.01773630 |

B/C first-request parity: **42 equal, 0 different, 6 unavailable**. The unavailable pairs are normal controls without provider requests, not additional passing comparisons. Equal input does not guarantee identical sampled model output.

## Provenance and reproduction

- Core commit at freeze: `68cff2c`, baseline `c5641cec2082431d384a13564ff802d9ed714b64`.
- Actual study directory: `output/d26/holdout-v2`; frozen digest `b5e0503d1925150e2ab5b4f2cfa609a023c6dc8d2307833b2aff77af1c2fb4af`.
- Native preflight: 222 checks passed with no healer/model calls. Report SHA-256 `bb1ccfee14710fd07d73649c02a176c3d40f7651f771d6870ae4b402deedaf67`.
- `holdout-v1` was an unused freeze, superseded before any paid request by an operational-error classification fix. Its evidence remains retained.
- Collection ran before the private regression because the private application build was still being prepared. The shared ledger was used serially, and neither set was used to tune this frozen version.
- Source fixtures, contracts and runner: `evaluation/holdout/` and `evaluation/run-holdout.mjs`.
- Primary: `results.json`, `summary.json`, frozen schedule and source hashes. Added analysis: `posthoc-analysis.json` and `.md`, reproducible in a fresh output copy with `node evaluation/analyze-holdout.mjs --directory output/d26/holdout-v2 --budget output/d26/budget-after-holdout-read-only.json`. The command refuses to overwrite prior analysis. The ledger snapshot is accounting evidence, not a dispatch ledger.
- Final posthoc JSON SHA-256: `74740b2db4aa67d0462bee6e36fec88900c0e52e9b6b13422e8812e8ffd5dbdc`. A reviewed partial-inventory denominator defect in the added analyzer was corrected; complete-study numerical results were unchanged. Earlier analysis outputs are retained with a `pre-partial-fix` suffix.

The study supports testing a conservative contract check further. It does not establish universal prevention, exact OpenSpec prose interpretation, human productivity improvement, or readiness for unattended production healing. Engineering verification and its retained full-browser-suite failures are documented separately in [the mechanism evidence](spec-aware-engineering-2026-09-14.md).
