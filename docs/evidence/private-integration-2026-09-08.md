# Private consumer integration checkpoint — 2026-09-08

OpenSpec task 6.1 is implemented through private-host issue [#174](https://github.com/wildanniam/koderea/issues/174) and draft PR [#175](https://github.com/wildanniam/koderea/pull/175), commit `f1cc846`. Its own instructions and existing local synthetic-database/authentication contract were followed. Both pristine profile and target-specific entity controls passed with native assertions and zero provider calls.

The private host installs the allowlisted development tarball from runtime commit `f59e96c83bace39bac5e951e103f640870079822` of [tool PR #6](https://github.com/wildanniam/self-healing-tool/pull/6). It records provenance/checksum and uses ESM test loading without changing application/authentication source. Later commit `9b2897a` changes consumer verification/documentation only. No private application suite or raw output is copied into this repository.

Actual environment: macOS arm64, Node 24.18.0, Playwright 1.62.1, Chromium, production Next.js build, loopback synthetic PostgreSQL and Mailpit. Typecheck, targeted lint, two existing local-reset guard tests, idle-database refusal/acceptance probe and the five-case offline instrumentation runner passed. Detailed cases, run IDs, semantic outcomes, earlier invalid/timing failures and raw evidence remain in the private PR's `web/evaluation/self-healing/verification.md` and ignored private outputs.

Instrumentation pass is not method success: the private negative example recorded an incorrect action and retained it. This establishes wrong-field detection for EVAL-002-S2, not a live-model performance result or complete validation of all semantic scenarios. EVAL-002 remains implemented pending fuller pilot review/audit. Tasks 6.2 and 6.3 remain unchecked: case meanings await owner review and no authorized live-model pilot has run. Final collection, practitioner work and publication remain later steps.

## Runtime CI

After correcting the fresh-cache dependency check, tool CI passed on runtime commit `9b2897a`: [run 34208847716](https://github.com/wildanniam/self-healing-tool/actions/runs/34208847716) and [run 34208852362](https://github.com/wildanniam/self-healing-tool/actions/runs/34208852362). This does not claim a later documentation commit's CI result in advance.

Checkpoint audit: strict OpenSpec/traceability PASS (36 requirements, 73 scenarios, 30 tasks, 19 completed); audit regression 7/7 PASS; diff check PASS. The initial register update correctly failed because an implemented requirement had only verification evidence; its separate implementation pointer is now recorded. No audit rule was weakened. Atlas Vault hub, decision lock, roadmap and dated autonomous-development record were written and read back.
