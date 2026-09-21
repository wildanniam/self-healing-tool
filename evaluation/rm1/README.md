# RM1 DOM ranking experiment (D33)

**Collection is complete and closed.** See [the final result](../../docs/evidence/rm1-continuation-results-2026-09-18.md). The original halted run and separately authorized companion continuation are preserved. `continuation/` adds fixed lineage, joint reduced budget, explicit verified organization, complete pilot admission and null-safe analysis without changing the original fifty inputs. All 9 pilot/108 main records passed primary and independent audits. Do not rerun collection or regenerate pinned pilot artifacts; commands below describe the historical original workflow.

This study compares **ranking only** on two known synthetic flow families. Read [the frozen protocol](../../docs/evaluation/rm1-dom-ranking-protocol.md) before interpreting results. R0 is lexical Jaccard, R1 is the thesis score without relational scoring, R2 is the full thesis score. All three retain relational evidence in their score-free model inputs. The optional configuration does not change the default library behavior.

The repository contains synthetic inputs and runners; raw runs live in an ignored local archive. No command reads a credential file automatically. Offline checks do not contact a model. Paid collection requires a separately authorized fresh ledger; do not reuse a historical ledger or started phase.

```sh
npm ci --ignore-scripts
npm run build
node evaluation/rm1/native-preflight.mjs
node evaluation/rm1/offline.mjs
```

The native preflight verifies intended/wrong effects and resets. The offline preflight verifies all 45 case/arm contexts, exact meters, common candidate features and actual final-input target coverage. `output/d33/review.json` must also record a real independent review matching the current source hash; never fabricate that gate.

For the authorized collection, initialize the new ledger with `node evaluation/rm1/run.mjs --init-budget`, then freeze and execute `--pilot --freeze` / `--pilot --live`; analyze with `node evaluation/rm1/analyze.mjs --pilot`. Only after its audit passes freeze and execute `--main --freeze` / `--main --live`, then `node evaluation/rm1/analyze.mjs --main`. Explicitly provide `OPENAI_API_KEY` in the process environment for live only. This documentation does not authorize another paid batch.

`RM1_OUTPUT` may select a fresh absolute output directory. Default is `output/d33`. Freeze archives every critical source/build/configuration/fixture/oracle/analysis input, refuses changed files, and refuses a phase that already started. Every slot gets its own JSON record, exact dispatched payload, detached observation audit, independent final state and request IDs. Analysis independently reconstructs outcomes and reconciles records with the ledger. A halted or partial phase requires diagnosis; no automatic repeat-until-success path exists.

Final-input target coverage counts the actual candidate projection or a complete matching target HTML control tag. Owner text alone does not count. A model can sometimes infer a correct locator from the original selector/task even when the target is not represented; coverage and correctness are separate metrics. Token use comes from provider usage; character limits are not token counts. Instrumented timing includes measurement overhead.
