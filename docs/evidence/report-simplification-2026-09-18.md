# D34 report simplification verification — 18 September 2026

Issue #27; OpenSpec `build-self-healing-tool`, OBS-011, tasks 16.1–16.3. This report-only increment is based on D32 (`2d0509c`, PR #24). D33 experiment code is on a separate branch; this increment reads its archived main records without merging or changing that runtime. The recovery core, study inputs, outcomes and package version 0.0.8 are unchanged. No paid inference, new research collection, merge, release or submission occurred.

## Delivered behavior

- Result-first overview, exact arm/repeat result buttons, original/replacement locator and four groups: DOM, paired AI input/output, checks, action outcome. Raw messages, source/configuration and detailed metadata expand on demand.
- A read-only D33 adapter adds 108 RM1 main slots alongside a separate RM2 D30 study. Pilot files are excluded, record/filename mismatches rejected, missing main slots stated. No pooled accuracy or undeclared ranking-vs-no-ranking claim.
- Same case filters drive CSV and JSON export. Wrong-action filtering preserves comparator arms for matching conditions. Filtered JSON retains source count, evaluation date, price assumptions and a coverage notice. Reopening a snapshot does not inject local archive rows.
- The inspector pairs inputs and outputs for the selected attempt. Missing original response text is not synthesized. Controls, null output, replay, wrong effects and unassessed actions remain distinct.
- Generic library HTML uses the same four groups, all initially collapsed, while retaining the existing safe projection. Raw DOM and full provider bodies are explicitly unavailable there. An executed but unassessed action is not labeled a correct repair.
- Private diagnostics remain local and opt-in. Normal exports strip private audit objects; per-run diagnostic download is explicit. Package allowlisting excludes presentation/evaluation artifacts. No sensitive raw archive was added to Git.

## Verification

Environment: macOS arm64; Node 25.8.2; Playwright 1.62.1 / Chromium. Browser/consumer checks needed normal host launch/npm-cache permissions; sandbox launch/cache errors did not require dependency or ownership changes.

| Check | Result |
|---|---|
| `npm run test:presentation` | 19/19 passed: D33 source mapping, missing/pilot handling, separate snapshots, selected identity, paired multi-attempt input/output/feedback, raw request download equality, filters/export metadata, private stripping, escaped evidence, controls, missing raw output, wrong effects, keyboard return, mobile and generic unassessed states |
| `npm run typecheck`, `npm run test:unit` | Passed; 42/42 library unit tests |
| `npm run check`, `npm run test:audit` | Passed; strict specification and traceability checks, 7/7 traceability tests |
| `npm run test:consumer` | Clean package import, normal fill, ranker recovery and contract gate passed; no presentation/private evidence in package |
| Read-only complete archive adapter | RM1 108 main rows, RM2 378 rows; known counts and RM1 usage below preserved; 108/108 D33 request fingerprints verify with recorded raw output |
| Source file integrity around generation | All 289 consumed source-file hashes unchanged: 108 D33 files, one D30 synthetic archive, 180 private D30 records. This is a consumed-source check, not a new claim of reauditing every historical artifact |
| Explicit CLI snapshot roundtrip | RM1 108 and RM2 198 synthetic rows retained as two studies, without injecting private or extra archive rows |
| `npm run demo:walkthrough -- --headless --no-open --pause 0` | Nine local browser replay slots, zero request/outcome mismatches, no fresh model inference |
| Visual inspection | Desktop 1440×900 and mobile 390×844: overview, DOM, AI, stress outcome, comparison and generic library screenshots inspected; zero page errors/document overflow. Mobile case identity stays visible during table scrolling |

Final presentation tests were updated to open the intentionally collapsed message before checking its contents. Assertions still verify the exact attempt's unique input, response and feedback. An initial local audit-script assertion used `response.kind`; the adapter schema uses `response.status`. Correcting that inspection assertion required no research-data change.

## Preserved empirical results

RM1 arm denominators are 36 each:

| Arm | Target in first input | Correct | Wrong | Stop | Input/output tokens |
|---|---:|---:|---:|---:|---:|
| R0 | 36 | 36 | 0 | 0 | 64,833 / 324 |
| R1 | 30 | 30 | 3 | 3 | 64,233 / 312 |
| R2 | 36 | 36 | 0 | 0 | 64,968 / 324 |

RM2 remains ordinary private recovery 33/36, 36/36, 36/36; ordinary synthetic 30/36 in every arm; negative wrong actions 15/24, 9/24, 0/24; misleading-label wrong actions 6/6 in every arm. These are separate datasets/settings; this presentation change is not evidence of improved recovery effectiveness.

## Limits and reproducibility

The portable checkout includes 198 D30 synthetic rows. RM1 uses `--ranking` or an ignored local `rankingDirectory`; full private D30 data needs the designated authorized source. Missing sources are visible. Generated diagnostics and screenshots stay in ignored `output/` directories, not in public artifacts.

D30 raw DOM and per-feature contributions were not retained; its 180 independent requests are parsed-only, whereas 144 private requests have raw output. D33 has raw DOM and 108 recorded provider bodies/outputs, but lacks individual feature-score contributions. Hash agreement demonstrates internal archive consistency, not independent provider attestation. No usability study or new model benchmark was performed. Optional live mode was not executed.

Implementation: `presentation/ranking-data.mjs`, `snapshot.mjs`, `report.mjs`, `report-style.mjs`, `inspector.mjs`, `cli.mjs`, and `src/report.ts`. Regression checks live in `presentation/*.test.mjs`. The local full archive check and source hash manifest are retained in ignored `output/playwright/archive-check.json` and `archive-fingerprints.json`; nine visual captures are `output/playwright/d34-*.png`. See [presentation guide](../presentation.md), [D34 decision](../decisions/2026-09-18-report-simplification.md) and [design](../../DESIGN.md). Atlas worklist item 2 records this implementation separately from paper visual production and writing.
