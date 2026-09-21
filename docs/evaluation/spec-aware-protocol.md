# D26 comparable spec-aware recovery protocol

Authorized execution: [D26 decision](../decisions/2026-09-14-spec-aware-evaluation.md), issue #13. This file is a protocol, not a result.

## Scope and fixed sample

Use the known 20 private D24 conditions as regression/development, with 3 repeats and arms A/B/C (180 slots). Preserve all historical evidence. A executes the archived 0.0.5 core from commit c5641ce. B and C execute the new prototype with the same target contract/applicability/evidence input; C alone enforces admission. Optional added context observables are a documented part of the A/B information difference, not credited exclusively to natural-language spec text.

An independently authored pair of synthetic local applications supplies 16 conditions, 3 repeats, 3 arms (144 slots). Their conditions remain unseen by core implementation until the core/protocol/schema are frozen; native fixture/oracle preflight is permitted beforehand. All variants of each target application remain in the holdout group. Synthetic authoring and observer separation do not establish an externally curated real-world benchmark or universal generalization.

## Input and decision contract

Consumer supplies versioned requirement clauses with generic observable-feature phrase evidence. No mutation IDs, expected verdict, corrected selector, oracle observations, or test-run case metadata enter runtime/provider inputs. Contracts remain fixed across behavior-preserving UI mutations. Structured annotations are manually prepared integration input, not automatically inferred from arbitrary OpenSpec prose.

All shared settings are in `evaluation/d26-config.json`. Preserve the approved gpt-4o-mini alias and record returned model IDs. B/C first request parity is checked by hash. No statement claims a seed guarantees determinism. Rotate the three arms within case/repeat blocks and fully reset state.

The gate is a conservative lexical evidence policy, not an assertion that DOM features prove business meaning. Native locator success remains outside the recovery-only guard. Accepted repairs still receive independent outcome assessment. Explicit refusal/unknown, wrong action, operational failure and missing output stay distinct. Unnecessary refusal on recoverable cases is a measured cost.

## Ledger and failure rules

Create one fresh persisted study ledger: maximum US$2 and 980 requests, phase caps baseline 180/development 360/holdout 432/smoke 8. Existing reservations are never erased/reused. Unknown usage halts subsequent paid dispatch. The budget uses standard uncached prices USD0.15/0.60 per million input/output tokens, verified on [the official model page](https://developers.openai.com/api/docs/models/gpt-4o-mini) on 2026-09-14; cached savings are not assumed. Observed costs remain estimates derived from returned usage.

The ledger may stop before the planned slots if the conservative reservation cap is reached. Such slots remain in the schedule as unstarted, without a replacement batch. Network/accounting failures are reported, not retried as if they were wrong selectors. Unit tests use controlled providers only and are not empirical performance evidence.

## Freeze and acceptance

Before live comparisons: record code, fixture, source-spec/contract, oracle, schedule and configuration hashes. Holdout native-preflight output records its own digest but does not feed tuning. Do not modify the reported frozen version after seeing holdout outcomes. If a later correction is necessary, keep this batch and label the new design as subsequent work needing fresh holdout.

Report count-based outcomes by arm, case class and application group: correct recovery / recoverable opportunities; wrong recovery effects / all slots and / accepted recovery actions; explicit appropriate refusal / negative opportunities; unnecessary refusal; original-success controls; operational failures and unstarted slots; token/cost/time; B/C parity checks. Risk among zero accepted actions is undefined, never zero-error success. Repeats remain within-case observations.

Success of the study means completing a trustworthy comparison and reporting limits, not necessarily a positive result. No universal-effectiveness, automatic semantic-spec execution, manuscript, release or submission claim follows from these runs.
