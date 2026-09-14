# D26 spec-aware engineering verification — 2026-09-14

This is mechanism evidence for version 0.0.6, not live-model effectiveness. Implementation checkpoint: `8e4baf9`, based on 0.0.5 `c5641ce`. Issue #13; draft PR #14. The independent live protocol is in `docs/evaluation/spec-aware-protocol.md`.

## Verified new behavior

- INT-006: explicit single-file Markdown contract loader, bounded strict data schema, file provenance and unchanged no-spec context/request for both click/fill against the actual archived 0.0.5 build.
- CTX-006: identical initial serialized provider input for context-only and enforced branches; contract sanitization, path-only URL observations, immutable snapshots and configured payload limits.
- HEAL-008: fresh evidence is checked before recovery; the same admitted ElementHandle receives the action; missing/stale/retired/insufficient evidence ends recovery without a semantic retry. Original-locator success remains outside the recovery guard.
- OBS-007 implementation: sanitized decisions/clauses/provenance remain inspectable. Action execution is not automatically semantic correctness; zero or unassessed accepted actions do not create a zero-risk claim. The final empirical comparison is still a separate task.

## Actual checks

Environment: macOS arm64, Node 24.18.0, Playwright 1.62.1, installed Chromium.

| Check | Result |
|---|---|
| `npm run build`, `npm run typecheck`, `git diff --check` | Pass |
| `npm run test:unit` | 26/26 pass |
| New `tests/spec-admission.spec.ts` cases | All 13 ultimately pass; 12 in the serial subset, one corrected budget-fixture rerun |
| `npm run test:consumer` | Pass; clean tarball imports, normal/ranker fill and target-contract admission work without a key/private host |
| Exact archived 0.0.5 vs new no-spec payload/context probe | Byte-identical for click and fill |
| Paired archived/current native and recovery probe at 300ms | Both original-success and recovered |
| `npm run check` | 44 requirements, 92 scenarios, 39 tasks; structure/traceability pass |
| `npm run test:audit` | 7/7 pass |
| Independently authored holdout native preflight | 222 checks pass, zero healer runs/provider calls; see its retained evidence/status |

## Failures retained and limits

The complete browser suite is **not green on this host**. An initial concurrent run was interrupted after 15 passes and 14 timeouts; a serial failed/unfinished subset completed 18/28. Nine remaining failures concern unchanged native 100–300ms timeouts/classification under host contention. One additional new fixture had an invalid DOM/payload-limit combination; only that test setup was corrected, and its subsequent rerun passed. Runtime defaults and empirical settings were not loosened. Passing targeted probes does not erase those full-suite failures.

Browser launch initially required normal macOS sandbox escalation. These launch/timing failures and native preflight checks are not model results. No claim that the gate eliminates false healing follows from offline providers. Clauses are manually authored lexical observations: wrong semantics can share them, and valid paraphrases can fail them. The consumer retains assertions and independent effect assessment.

## Pre-live operational-classification correction

Before any model call or held-out outcome, review found that a broad admission catch could classify an expired deadline or closed page as spec-unknown. The catch now distinguishes observed target change from operational failure: deadline is budget/time-limit; closed page or observation exception is context/context-failure. No positive/negative contract matching rule changed. Four new regression tests were added; a seven-case serial subset covering the new cases and existing parity/admission behavior passed. Build and all26unit tests passed again. The original 13new cases plus these4 give17 targeted spec browser cases with passing evidence across these runs; this is not a claim that the complete suite was green in one invocation.

The first holdout freeze was retained without a started marker or paid calls. A new freeze records this correction before live collection, preserving the distinction between pre-live engineering and tuning on outcomes.
