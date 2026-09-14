# D27: candidate recovery regression protocol

Status: authorized implementation and bounded rerun; results pending. Decision D27 and issue #15 govern the shared library; private issue #182 governs the application harness. This is a known development regression study, not a fresh holdout or an APSEC manuscript.

## Question and interventions

Can correcting locator construction, action-target eligibility, ranking and request representation recover previously missed intended controls without increasing wrong business effects? Version0.0.7 verifies suggested locators against the originating node, excludes unavailable action targets, retains semantic context through wrappers, removes structural-token amplification and shared-class-only penalties, compacts model payloads, and normalizes a no-selection string. These fixes form one engineering bundle: this study does not identify each fix's isolated causal contribution.

A, B and C use the same repaired build and request projection. A omits targetSpec. B supplies the contract as model context. C supplies the same contract and enables deterministic admission. B/C first-request and contract hashes are compared; subsequent requests can differ after enforcement feedback. All use gpt-4o-mini, temperature0, output cap500, at most3 attempts, action/recovery/provider timeouts3000/45000/15000ms, candidate/HTML budget8000 characters, complete-request budget12000 characters and at most30 candidates. D26 is a historical comparison with a different core/request shape; it is not a simultaneous control or an isolated OpenSpec effect.

## Fixed workloads and independence

1. Private local application: the exact D26 20 conditions, contracts, independent business oracles, mutation scripts and deterministic order; 4 normal,12 recoverable and4 negative conditions, each repeated3 times in each arm (180 slots).
2. Synthetic regression: the exact existing16 conditions across two application groups, repeated3 times per arm (144 slots). `evaluation/holdout` is immutable. The budget phase retains its historical `holdout` name only for accounting compatibility. These cases have been inspected previously and cannot support claims of unseen generalization.

No answer locator, evaluator identifier, mutation label or outcome is supplied as new method evidence. Contract authorship and requirements remain unchanged. Runtime observations are available to all arms through the common extractor. Native preflight proves target/action reachability and oracle sensitivity independently of the healer. Repeats and condition variants are dependent measurements; no significance or population-generalization claim follows from slot totals.

## Before any live collection

Run type checks, unit tests, browser regression tests, clean-consumer smoke test, OpenSpec/traceability checks and audit tests. Inspect any failure and retain its diagnostic record; do not treat infrastructure failures as semantic outcomes. Run the private25-check native rehearsal and synthetic native preflight without provider calls. Freeze the exact source/dist, runtime identities, application/fixture inputs, contracts, protocol, schedules and scoring implementation before paid calls. New output paths and one fresh ledger preserve D26 artifacts. Private and synthetic collection are dispatched sequentially because they share a ledger and host resources.

The new plan `apsec-d27-core-repair-2026-09-14-v1` has ceilings980 requests and US$2, with phase ceilings180 baseline,360 development,432 synthetic (`holdout`) and8 smoke. These are maximums, not required consumption. No retries beyond the fixed per-event cap, replacement ledger, discarded failed batch or automatic top-up. Unknown billing halts the ledger. Any interrupted/unstarted slots remain visible and preclude describing the batch as complete.

## Measurements and interpretation

Keep all planned slots and classify normal control, intended recoverable task, unavailable/retired target, and missing/stale spec separately. Report:

- Normal goal completion with zero recovery and zero model requests.
- Correct acknowledged recovery divided by independently intended recoverable opportunities; also break down valid-contract and missing/stale-contract cases.
- Every observed wrong business effect, including effects without successful action acknowledgment; accepted-recovery risk is a separate conditional metric.
- Correct refusal/unknown versus unnecessary stopping; validation exhaustion and provider/setup failures are not credited as correct refusal.
- Per-condition/arm outcomes and first-request candidate coverage, where the existing instrumentation supports them.
- Request/attempt counts, usage completeness, tokens, known cost, event/attempt timings and returned model identity.
- B/C request parity and complete mapping between reservations and execution records.

Use the existing D26 primary scoring and state/acknowledgment analysis without modifying business truth. Private state after a failed action remains unknown where the inherited evaluator lacks observations; do not invent a zero wrong-effect claim for unknown states. Runtime locator validation establishes uniqueness/actionability, not business correctness.

After collection, verify frozen hashes again, retain raw records plus the final ledger in the appropriate permanent local outputs, and write a versioned before/after analysis. Do not adjust frozen inputs after seeing results. Further fixes, contract redesign, new cases, independent transfer validation and paper claims require a separately identified next iteration. No production target, publication, merge or submission occurs in this study.
