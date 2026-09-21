# D32 inspectable report verification — 16 September 2026

Issue #23; OpenSpec `build-self-healing-tool`, OBS-010, tasks 15.1–15.3. This is reporting/presentation engineering on the D31 base (`8d0a205`), using unchanged D30 / 0.0.8 methods and results. No new paid inference, study collection, release, submission or merge.

## Delivered behavior

- One full-page inspector replaces the crowded three-column detail modal. Select case, A/B/C, repetition and healing attempt, then inspect eight execution stages.
- Request messages are the retained serialized provider body, checked against its SHA-256 and the attempt's input hash. Missing, invalid, withheld, redacted and mismatched states are distinguished. Missing numbered request packets cannot shift later outputs to the wrong attempt.
- Candidate order, final scores, features and coverage are recorded observations, not recomputed scores. Basic validator evidence, C requirement-clause decisions and independently assessed effects remain distinct.
- F-C01 explicitly shows native success and no healing/AI call. Reports do not fabricate a prompt for a control or infer functional correctness from a successful click/fill alone.
- Historical independent records show parsed proposals only. Private records have stored provider output. New replay/live presentation capture retains exact requests and returned text; replay is explicitly labeled. No hidden model reasoning is claimed.
- Local private diagnostics require explicit opt-in; ordinary summary JSON strips those objects. Private raw content remains in ignored local outputs, not committed assets. All rendered evidence is escaped; sensitive key/header/session fields are excluded. Generated output refuses overwrite.

## Verification

Environment: macOS arm64, Node 25.8.2, Playwright 1.62.1 / Chromium. No paid API call was made.

| Check | Observed result |
|---|---|
| `npm run test:presentation` | 15/15 passed, including real Chromium navigation, request download byte equality, A/B/C rule behavior, control skip, repeat/attempt selection, escaping, keyboard and 390px layout |
| Full retained archive adapter | 378 rows, no coverage gaps; 324/324 recorded request bodies verify against request and attempt fingerprints |
| Raw response availability | 144 private request outputs available; 180 independent requests retain parsed proposals only |
| Outcome preservation | All 378 normalized rows equal the D31 full report; independent rows also equal the committed D31 snapshot. Accounting stays 498,225 input / 3,531 output tokens and 324 requests |
| Native platform control | All nine F-C01 slots have zero attempts and recorded oracle/guard success |
| `npm run demo:walkthrough -- --headless --no-open --pause 0` | Nine browser slots, nine verified request captures, nine replay-labeled outputs; zero input/outcome mismatches |
| Retained archive integrity | All 1,486 frozen file fingerprints match (131 library + 1,355 private-host files) |
| Visual review | Desktop overview/control/outcome/request/response/refusal and mobile refusal inspected; zero browser page errors, no mobile horizontal overflow |
| `npm run check`, `npm run test:audit`, `npm run typecheck` | Passed; 7/7 traceability tests, 56 requirements / 129 scenarios, 53/59 implementation tasks complete |
| `npm run test:consumer` | Clean tarball consumer import, native fill, ranker recovery and contract gate passed; presentation/private evidence excluded from package |

The initial new assertion expected 162 independent requests; the raw archive contains 180. After checking source counts (180 independent + 144 private = 324), the assertion was corrected. No research record, expectation, outcome or method was changed to pass a test.

The consumer check initially encountered sandbox-denied npm cache access. It passed with normal cache/browser permissions; no ownership or dependency changes were needed. Core source, evaluation fixtures and lockfile are unchanged from D31.

## Limits and provenance

Raw DOM before cleansing, individual discarded nodes, per-feature ranking contributions and some successful per-check validator logs were not stored. The inspector states these gaps. It also separates retained evaluator flags from a complete expected/before/after state snapshot, which is not always available.

The shared snapshot includes only the 198 independent fixture executions, now with available diagnostic evidence. The owner's designated private source adds 180 local records. Private output remains outside version control. Data adapters preserve category denominators and stress failures; D32 does not improve empirical success rates or establish general safety.

Canonical archives remain the D30 tool `output/d30` and designated private-host `output/self-healing-d30` directories. The local D32 generated report and verification JSON identify each source by hash. Read the [presentation guide](../presentation.md), [decision D32](../decisions/2026-09-16-inspector.md) and [D30 evaluation](scoped-evaluation-2026-09-15.md).
