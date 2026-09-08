# D24 frozen evaluation — 2026-09-09

Authority: [D24](../decisions/2026-09-09-final-evaluation.md). Work: tool #9 / private host #178. Native rehearsal passed twenty conditions, four calibrations and an independent adapter test; eight contract tests/typecheck/lint passed. The prior unknown-usage pilot ledger is retained unchanged.

## Freeze

Private freeze `apsec-final-d24-2026-09-09-v1` was created before method outcomes at 2026-09-08T18:10:25.699Z. It pins the reviewed v2 manifest, twenty purposefully selected conditions, three repeats/two methods (120 slots), seeded adjacent pairs with alternating lead, accepted config, source/installed-package hashes, Node/Playwright and a single batch capped at 144 requests/US$1.9991009. The US$0.0008991 prior reservation remains within the accepted US$2 envelope. Package 0.0.3 source stays 9c81a8d0d19d038ad6e3cfad0e9a483f15503533; host runner source is 5b0ff1422863fcfc13d724ffddd54475b50647b1. Freeze commit: dfdb87e. This is versioned provenance, not a public reproduction of private data.

Native fixture validation is repeated before final methods. Full ledger halt prevents subsequent full dispatch; ranker-only remains independent. All planned slots are inventoried, including setup failures/unstarted entries. Final effectiveness and owner interpretation are not inferred from a passing rehearsal or accepted protocol. Results will be appended after collection audit.

## Completed collection and audit

All 120 slots completed; no setup/operational failures or unstarted slots. The native/adapter prerequisites and collection harness passed 145 checks in 13.1 minutes. Harness passes do not imply semantic success. Full and ranker-only each repaired 33/36 recoverable runs without wrong effects. Full incorrectly acted on all 12 absent-target runs; ranker correctly refused three and incorrectly acted on nine. Both preserved all 12 normal controls with no recovery/provider calls. Three repeats of twenty controlled conditions are not 120 independent samples.

Across recoverable pairs: both correct 30, full-only three, ranker-only three. Full resolved one label-paraphrase failure family that ranker missed; ranker preserved entity selection in a different label-paraphrase family that full missed. All sixty pairs received identical serialized contexts; the correct target was present in all 72 recoverable candidate sets. All 27 wrong-target recovery actions are retained. This provides no aggregate LLM-superiority evidence and demonstrates weak absence handling.

49 requests reconcile with 99,960 input / 4,667 output tokens, zero unknown final usage, no halt. One candidate-validation rejection required a second call; no extra batch/replay was run. Final cost estimate US$0.01779420, reservation US$0.07741935. The old pilot's unknown request/US$0.0008991 reservation remains unchanged. Recoverable median wrapper total: full 4928.65 ms vs ranker 3101.62 ms; internal 1851.39 vs 38.54 ms. Setup and post-action semantic oracle are outside wrapper total; these are not complete-E2E-test durations. Price source/rules remain in the freeze; estimates are not an account invoice.

Audit verified 437 frozen file hashes, all 49 serialized payloads, request assignments, per-attempt observation coverage and inventory checksum b2759ef3c8ca9d0da0642361d535fc2eca0bf1a24c90baa2111bc449f2d83f30. The initial audit assertion incorrectly applied recovery timing decomposition to native controls; it was corrected to total >= original for controls without changing measurements. Nine private contract/analyzer regressions pass, including unavailable-cost, operational-failure and unstarted-slot accounting on synthetic inputs; no such operational failure was observed in this final live batch.

The private fixture created four evaluation accounts in addition to one pre-existing synthetic learner from the frozen reset harness. Do not describe four total database rows. Role/status guards cover the four evaluation identities, not the entire database. Wrong entity clicks are not equivalent to completed deactivation or necessarily an opened dialog. State-guard changes on negative cases include local input/URL changes; do not relabel them account-role changes. No practitioner results exist.

Private evidence and detailed failure analysis: [PR #179](https://github.com/wildanniam/koderea/pull/179), `web/evaluation/self-healing/final-results-2026-09-09.md`, machine-readable class/slot/audit summaries and 461 raw-evidence file checksums. Raw data remains in the local private batch directory and is not publicly reproducible. Hashes are not a backup. Requested gpt-4o-mini alias was recorded; the returned model snapshot was not retained in measured version 0.0.3.

### Verification commands

- Private `npm run test:e2e:healing:final -- collect`: 145 harness checks passed, 120 method records.
- Private `node scripts/analyze-self-healing-final.mjs apsec-final-d24-2026-09-09-v1` and `node scripts/audit-self-healing-final.mjs apsec-final-d24-2026-09-09-v1`: complete analysis/audit, all sixty paired contexts equal, no request discrepancy.
- Private `node --test scripts/self-healing-final-contract.test.mjs scripts/analyze-self-healing-final.test.mjs`: nine pass; eslint for audit/analyzer regression files passes.
- Environment: macOS arm64, Node 24.18.0, Playwright 1.62.1 Chromium, frozen private package 0.0.3 and dedicated loopback application/Postgres/Mailpit.

## Post-collection increment: 0.0.4 (offline evidence only)

Version 0.0.4 preserves allowlisted returned model/finish metadata through adapter responses, missing-output errors, parser failures, runtime snapshots and report projection. Missing/invalid metadata stays null; effective config remains the requested model. No arbitrary provider fields are copied. The measured 0.0.3 responses cannot be backfilled.

The frozen records assess the same wrong action at both attempt and event levels. The 0.0.3 report's `wrongEffects` counted assessment rows, so one effect could appear twice. 0.0.4 reports distinct affected events, distinct explicitly assessed attempts and raw wrong-assessment counts separately. Raw assessments remain append-only and prior wrong effects survive later correct assessments. The frozen private class analysis already uses one wrong-effect boolean per slot and requires no correction.

Relevant checks: typecheck; 21 unit tests; 21 browser tests; clean consumer import/native fill/ranker recovery and 22-file package allowlist all pass on Node 24.18.0/Playwright 1.62.1. No paid requests were made for the increment. Private vendor/package/source hashes and frozen data are preserved. This improves observability, not semantic performance or false-heal prevention.

## Review boundary

Task 7.2 is technically complete. Task 7.3 analysis is prepared but its owner interpretation review remains unchecked; practitioner tasks 7.4/7.5 and release/claims tasks 8.1–8.3 remain open. The current results do not justify more repeats merely to improve a score. Prioritize an explicitly designed abstention/entity-validation increment on separate development fixtures, then a new frozen holdout protocol and budget if a subsequent live study is chosen. That future algorithm/study is a proposal, not part of completed evidence or an automatic paid batch. No merge, public release or paper submission occurred.
