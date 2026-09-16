# D31 presentation verification — 16 September 2026

Scope: issue #21, branch `codex/21-presentation-demo`, based on D30 commit `12f6b2e`. No core, provider prompt, contract, fixture, oracle or research result was changed. This is presentation engineering, not a new effectiveness study.

## Delivered

- Standalone Indonesian HTML comparison and normalized JSON, opened by `npm run demo`.
- All five result categories, A/B/C explanations, condition/repetition details, filtering, pagination, JSON/CSV download and full filtered print output.
- Ignored local source configuration for the private 180-slot archive; committed normalized independent evidence contains 198 slots.
- Headed A/B/C walkthrough with recorded model decisions, exact serialized-request hash checks, real runtime actions, independent outcome checks and screenshots.
- Interactive Enter-to-advance mode; optional explicitly selected live mode with separate output and a fresh 27-request / US$0.10 ledger.
- [Runbook](../presentation.md) and [D31 decision](../decisions/2026-09-16-presentation.md).

## Verification performed

Environment: macOS arm64, Node v25.8.2, Playwright 1.62.1 / Chromium. No paid provider calls were made for D31.

| Check | Observed result |
|---|---|
| `npm run test:presentation` | 10/10 pass, including retained 198 slots, duplicate/malformed outcomes, unknown usage, private projection, missing sources, mode guards, overwrite refusal and offline Chromium UI. |
| Final archived report + direct assertions | 378 rows, 42 conditions, no missing coverage; 324 historical transport requests, 498,225 input and 3,531 output tokens. |
| Full report browser inspection | Desktop/mobile, no page errors or horizontal mobile overflow; filters/details/export work; actual PDF generated. |
| Headed `demo:walkthrough -- --no-open --pause 0` | Nine slots, no mismatch; each consumed recorded request matched its original input hash; zero API requests. |
| Interactive `demo:walkthrough -- --step --headless --no-open` through a PTY | All 18 before/after prompts advanced; nine slots completed with no mismatch. |
| Default `npm run demo -- --out output/presentation/meeting-2026-09-16` | Wrote JSON/HTML and successfully invoked the macOS browser opener. |
| `npm run test:unit` | 42/42 pass, including provider/budget/privacy behavior. |
| `npm run test:consumer` | Clean tarball import, normal fill, ranker recovery and target-contract gate pass; presentation/private assets absent from package. |
| Archive fingerprint audit | All 131 tool-archive and 1,355 private-archive entries match their retained SHA-256 manifests. |
| Core/fixture diff inspection | No modifications to `src/`, `evaluation/` or `package-lock.json`. |

The first restricted-shell consumer attempt could not write npm's cache; it passed when rerun with the necessary filesystem access. Chromium/server operations also required the normal local execution permission outside the sandbox. These were environment failures, not recorded method outcomes. No global cache ownership or permission settings were changed.

Final `npm run check` passed: 55 requirements, 123 scenarios, 56 tasks, 50 completed implementation tasks. `npm run test:audit` passed 7/7; `npm run typecheck` and `git diff --check` passed. Remaining six tasks are inherited research interpretation/release items, not unfinished D31 implementation.

## Retained class-specific result parity

Each cell is an execution count; conditions were repeated three times per arm.

| Metric | A | B | C |
|---|---:|---:|---:|
| Controls: correct | 18/18 | 18/18 | 18/18 |
| Platform ordinary changes: recovered correctly | 33/36 | 36/36 | 36/36 |
| Independent ordinary changes: recovered correctly | 30/36 | 30/36 | 30/36 |
| Negative cases: wrong actions | 15/24 | 9/24 | 0/24 |
| Misleading-label stress: wrong actions | 6/6 | 6/6 | 6/6 |
| Insufficient requirement: stopped | 0/6 | 0/6 | 6/6 |

The complete local report and audit outputs are under `output/presentation/meeting-2026-09-16/`. Generated files are ignored, and private raw evidence stays in its original repository. Three independent replay conditions illustrate success, refusal and a failure; they do not replace any research denominator.

## Evidence boundaries

OBS-009-S1 uses actual retained-source loading and exact result assertions. S2/S3 have adapter and real-browser checks, including hostile labels rendered as text and all filtered rows exposed for printing.

DEMO-006-S1/S2 were executed with real browser/report behavior. S3 is supported by the explicit missing-key test, source inspection of fresh per-invocation ledger creation/separate paths, and existing provider/budget tests. The new nine-slot live orchestration was **not** exercised against the real API; no new model result or live-demo reliability is claimed.

The old D30 failures, known-workload limitations and lexical nature of the rule gate remain. Neither D31 completion nor a replay pass authorizes public release or conference submission.
