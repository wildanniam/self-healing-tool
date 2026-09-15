# D30: scoped ordinary-change evaluation

The owner accepted execution on 15 September. This increment changes evaluation organization and adds six ordinary variations; it does not change the 0.0.8 D29 runtime, prompts, contracts, ranker, or business-effect oracles. All old conditions and results remain available. Scope categories were chosen after exploratory D26–D29 findings and frozen before D30 outcomes. This is transparent scoped regression evidence, not a new unseen-application study.

All **378 planned slots completed**: 20 known private conditions × three arms × three repeats = 180, plus 16 known synthetic conditions and six new variants × three × three = 198. The six new variations belong to the same two mini applications. Repeats are not independent tasks. A omits the target contract; B supplies contract context; C adds the lexical admission gate to the same B input. Application state/endpoint oracles independently determine correctness and wrong effects.

## Results

| Workload | A: no contract | B: contract context | C: context + gate |
|---|---:|---:|---:|
| Private control (correct / planned) | 12/12 | 12/12 | 12/12 |
| Private recoverable (correct / planned) | 33/36 | 36/36 | 36/36 |
| Private negative (correct / planned) | 3/12 | 6/12 | 12/12 |
| Synthetic ordinary-known recovery | 15/18 | 15/18 | 15/18 |
| Synthetic ordinary-new recovery | 15/18 | 15/18 | 15/18 |
| Synthetic negative wrong effects | 6/12 | 3/12 | 0/12 |
| Synthetic misleading-label-stress wrong effects | 6/6 | 6/6 | 6/6 |

Synthetic C controls pass 6/6 without API use. C ordinary recovery is 30/36 (83.3%): 15/18 known plus 15/18 new; there are no wrong effects in these ordinary conditions. The six failures are two wording variants × three repeats. C also stops on all six missing/stale-contract conditions without wrong effects, while the underlying action goal remains unmet; these are prerequisite-quality outcomes, not successful recoveries.

The preserved old synthetic aggregate still gives C 15/24 valid-contract recoveries with six wrong effects, exactly as D29. Splitting the denominator does not establish a method improvement. Misleading-label stress remains 0/6 recovered correctly with 6/6 wrong effects. Duplicate labels across distinct owners remain in ordinary fixtures; this increment does not exclude all duplicate labels or all wording changes.

## Evidence-backed diagnosis

1. **Ordinary wording limitation:** h2-04 (Change delivery address) and n2-03 (Update delivery address) return null from the actual model in all three arms/repeats, although the intended control is present and native actions reach the correct state. C's live event never reaches admission because the model already abstains. The unchanged contract requires a literal destination phrase in text/label/ariaLabel/title/name; the correct controls lack it in those allowed sources. In separate offline forced-selector probes, A and B execute the correct action while C stops with insufficient contract evidence. This establishes a lexical admission limitation in addition to the observed model abstention. It does not establish why the model internally abstained, especially in A, which has no contract.
2. **Misleading labels:** h1-05 and h2-05 give a wrong-function control the same task label and owner as the intended control. Actual C requests select the wrong function, the gate accepts the observable clauses, and the independent state oracle records the wrong effect. Forced intended and wrong selections both pass the gate; their business effects differ. The current gate cannot establish handler/function correctness from these matching clues. This is a demonstrated limitation, not proof that every possible self-healing method must fail.
3. **No fixture, missing-candidate, or budget explanation:** native/oracle checks pass, every new C payload represents its intended target, all frozen source hashes agree, and all requests settle. No model reason is fabricated and no success condition is relaxed. The offline interventions are 18 diagnostic probes with zero model requests; they are not added to the 378 empirical executions.

Private failure tracing retains 18 unsuccessful comparator records: A abstains in all three repeats of navigation F-R08 despite the correct target appearing in candidates; A also causes nine wrong effects and B six, all on negative conditions after selecting alternatives. C has no unsuccessful records, with six explicit abstentions and six unknown-contract-evidence stops on its 12 negative opportunities. Recorded selection, admission and state effects explain where the failure occurs; the model's internal reason is not inferred. See private `failure-diagnosis.json` for every failed slot and paired method outcomes.

No correction was tuned on these collected outcomes. A future semantic-contract or ambiguity-policy change would be a separate experiment with declared cases and budgets. Ordinary paraphrases remain reported failures in the current scope.

## Per-stage checks and preparation failures

- Engineering: typecheck, 42 unit, 83 browser, seven audit and clean tarball consumer checks pass. The private harness has eight passing contract tests. No runtime source change occurred.
- Native synthetic preflight: 288 checks across 22 conditions pass. Offline: 66 exact payload/model/privacy/coverage checks pass; B/C inputs match. The 39 source/dist files match D29.
- Private native rehearsal: 20 native + four wrong-action calibration + one adapter check pass; the same 25 checks also pass immediately before actual collection.
- Initial consumer preparation failed because the shared npm cache was unwritable; a dedicated temporary cache passed. The global cache and dependencies were not modified.
- The draft 1,134-request limit exceeded the unchanged 1,000 hard maximum and was rejected before any dispatch. The frozen cap is 980 requests / US$2, sufficient for the 972 theoretical non-control attempts. No runtime cap was loosened.
- A second private rehearsal exposed two synthetic accounts with the same name because the first rehearsal's database state remained. A read-only count confirmed two matches. Resetting only the idle dedicated loopback E2E database restored 25/25 native checks. The failed rehearsal remains archived and is not counted as AI performance. The database was reset again before collection.

## Accounting and provenance

324 actual provider requests settled, using 498,225 input and 3,531 output tokens. Estimated cost from actual usage and the frozen rates: US$0.07685235; conservative reservations US$0.51706620, within US$2. No pending, duplicate-owned or orphan requests remain. Synthetic exact-request and independent state audits pass; private original summary and separate audit agree. Missing control request pairs are unavailable, not parity passes.

After collection, 83 synthetic frozen inputs, 420 private frozen inputs, and 26 injected dist files match their freezes. Historical D27 and D29 inputs remain intact. The retained synthetic analysis uses its end-of-synthetic ledger snapshot; the final audit reconciles both workloads against the final shared ledger.

Canonical archives: tool `/Users/wildanniam/Development/project-ta/self-healing-tool/output/d30/`; private `/Users/wildanniam/Development/koderea/web/output/self-healing-d30/`. Private source and raw records stay with the private host. Raw data is local diagnostic evidence, not public release authorization. See `final-audit.json`, the paired workload audits, `diagnosis/forced-targets.json`, frozen inputs and archive manifests.

## Review status and next decision

OpenSpec EVAL-011 and tasks 13.1–13.4 cover evaluation completion and documentation, not universal healing or release readiness. The practical result supports explicit click/fill recovery under bounded ordinary DOM changes, with the recorded wording limitation and stress failures. The owner still reviews scope, demo usability and paper claims; no acceptance guarantee follows.

Automatic approval review rejected GitHub issue creation as external publication without specific permission. Work continued locally on `codex/d30-scoped-evaluation`; no new issue or PR exists and no bypass was attempted. Review-ready issue and PR bodies are under the local archive's `review/` directory. Publishing requires the final owner permission. No merge, release, production change or submission occurred.
