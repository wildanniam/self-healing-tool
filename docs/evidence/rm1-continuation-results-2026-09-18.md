# D33 RM1 — completed ranking comparison

The authorized continuation completed **9 pilot and 108 main executions**, with primary and independent raw-evidence audits passing. The original interrupted trial and diagnostic remain separate. The full thesis ranker matches the lexical baseline and outperforms its no-relational-scoring ablation on two crowded conditions. This does not establish superiority of the full scoring formula over a simple lexical ranker.

## Main result

Twelve controlled conditions from two known synthetic application families, three repetitions per arm. Runtime target contracts were disabled consistently. Each arm shares extraction, candidate fields (including relations), score-free prompts, maximum input budgets, model, validation, retries and effect oracle. R1 removes relational scoring, not all relation text from model inputs.

| Arm | Correct recovery | Wrong effect | Refusal | Target in first actual input |
|---|---:|---:|---:|---:|
| R0 | 36/36 (100.0%) | 0 | 0 | 36/36 |
| R1 | 30/36 (83.3%) | 3 | 3 | 30/36 |
| R2 | 36/36 (100.0%) | 0 | 0 | 36/36 |

R0 is lexical Jaccard with relational fields; R1 is thesis ranking without relational scoring; R2 is full thesis ranking. Every main trial used one model request. There were no new infrastructure failures, unstarted slots, unmatched reservations or unknown usage in the continuation. All targets survived initial extraction.

R2−R0: **0 improved, 12 tied, 0 worse conditions**. R2−R1: **2 improved, 10 tied, 0 worse conditions**; the pooled descriptive difference is 6/36, or 16.7 percentage points. Repetitions are not 108 independent cases. No inferential significance or population-wide superiority claim is made.

## Failure mechanism and examples

- **S-A-L / R1**, all 3 repetitions: intended target rank 25 survives top 30 but is removed by the shared character budget. The actual input has 13 candidates without the intended target. The model selects `#dispatch-control-001`, opening the wrong shipment destination. These are 3 wrong effects even though the runtime reports locator recovery.
- **S-S-L / R1**, all 3 repetitions: intended target rank 33 is removed by top 30, remains absent from the final input, and the model returns null. These are 3 refusals with no wrong action.
- Both other arms retain the correct target and recover correctly in those conditions. All arms recover 12/12 on small unique cases and 12/12 on duplicated-owner cases. On crowded cases, R0/R2 recover 12/12 and R1 recovers 6/12.

The six missing-target inputs coincide with six failed recoveries in this collection; all 102 target-present inputs recover correctly. This is a controlled observed pattern, not proof that a model can never infer a missing target or that target presence guarantees correctness in general. The data do not isolate cleansing, relation-bearing prompts, or LLM necessity.

## Resources

| Arm | Input tokens | Output tokens | Rate-calculated cost USD | Median wrapper seconds | Mean ranking ms |
|---|---:|---:|---:|---:|---:|
| R0 | 64,833 | 324 | 0.00991935 | 3.985 | 0.847 |
| R1 | 64,233 | 312 | 0.00982215 | 3.900 | 1.617 |
| R2 | 64,968 | 324 | 0.00993960 | 4.010 | 2.794 |

The main used 194,034 input and 960 output tokens, with rate-calculated cost **USD 0.02968110**. These costs use the frozen rates (USD 0.15/M input, 0.60/M output) without cache discounts; they are not invoice verification. Wrapper time includes the intentional original locator timeout of approximately 3 seconds and instrumentation; it is not model-only latency. All measured maximum inputs satisfy the common character limits, but actual token counts differ. The small timing differences do not establish a general performance advantage.

## Pilot, incident and joint accounting

The continuation pilot has 8 correct and 1 wrong effect: R0/R2 each 3/3, R1 2/3. Its wrong P-W-S-L action remains development evidence and is not pooled with main. Pilot cost is USD 0.00248895 from 9 known requests. The separate diagnostic cost is USD 0.00003450. The original failed pilot trial still has unknown cost and usage; its halted ledger was never reset.

Combined effort: **119/351 requests**, USD 0.21495420 reserved against the USD 3 cap. Known rate-calculated cost subtotal is **USD 0.03220455** across 118 requests. **Overall actual cost and token totals remain unknown** due to the original one unresolved request. Preserving its full reservation permitted the explicitly authorized continuation amendment; this is not claimed historical billing reconciliation. No new unknown usage arose. Collection is now closed; unused allowance does not authorize another study.

## Verification and reproducibility

The original 50 frozen inputs remain byte-identical (SHA256 `3106b4c8c57917fc3ef39fa8985902a587fc724ccdbd498baed33ff0ccfae99a`). The 57-input continuation bundle is `fcfdacf132794cc2e6a9f5d86dc55a3d1050a7a0ee05935ff305260707abe52a`, committed in `ffa2cf9`; planning amendment commit `22e510b`. Main ran 2026-09-18 03:35:38–03:43:28 UTC. Both freezes and all historical evidence are retained.

Before collection, 18 companion tests, isolated 9-refusal mocked integration (zero actual API), original 359 native checks/45 offline contexts, and independent implementation review supported admission. Primary and independent post-run audits checked all 108 records, all request/reservation/payload/model/organization/usage links, fresh-state evidence, raw DOM/mapping/pre-ranking parity across arms and repeats, full state/history outcomes, source/archive hashes, and condition-level denominators. No audit violations remain. The independent auditor used a standalone implementation rather than the production summary helpers.

Relevant commands: `node --test evaluation/rm1/continuation/*.test.mjs`; `node evaluation/rm1/continuation/preflight.mjs`; `node evaluation/rm1/continuation/run.mjs --pilot --freeze` / `--pilot --live`; `node evaluation/rm1/continuation/analyze.mjs --pilot`; corresponding main commands. Collection required explicit credentials and the verified Vanie organization environment; no credential is stored in evidence. Do not repeat started phases or regenerate the pinned pilot audit after main admission. See the [continuation amendment](../evaluation/rm1-continuation-protocol.md) for the historical authorization and reduced allowance.

Permanent local raw archive: `self-healing-tool/output/d33/continuation-v1/`, containing exact per-trial inputs/responses, final state/history, both phase freezes/reports, companion ledger, independent audit and archive hashes. The original D33 archive and D30 stay separate and unchanged. [Issue #25](https://github.com/wildanniam/self-healing-tool/issues/25), [draft PR #26](https://github.com/wildanniam/self-healing-tool/pull/26). No merge, release or conference submission was performed.

## Implications for the paper

The locked RM1 is answered by this bounded comparison. Supported contribution: auditable context selection under constrained input budgets, with evidence that relational scoring prevents target loss and associated errors relative to its ablation on two crowded conditions. The full method does **not** beat the relational lexical baseline here; do not claim novel scoring superiority, isolated cleansing benefit, efficiency leadership, universal correctness, or generalization to unseen applications.

The paper can retain DOM context engineering as its principal tool-design contribution and report this comparative result honestly. OpenSpec/requirement evidence remains the separate D30/RM2 study. Neither this experiment nor the observed 100% within selected arms establishes bug diagnosis, intentional-removal diagnosis, or complete semantic verification. No further experiments were run to seek a favorable R2-versus-R0 difference.
