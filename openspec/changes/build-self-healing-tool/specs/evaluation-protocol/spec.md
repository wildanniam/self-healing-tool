## Purpose

Evaluate correct recovery and practical maintenance use with controlled, explicitly scoped evidence rather than conflating test pass, repeat count, and general effectiveness.

These are planned capability requirements; implementation and empirical verification are pending.

## ADDED Requirements

### Requirement: EVAL-001 Classified and justified cases

The evaluation manifest SHALL distinguish development pilot, recoverable failures, negative cases and normal controls, with task intent, mutation rationale, oracle, and inclusion criteria recorded before final collection.

#### Scenario: EVAL-001-S1
- **WHEN** The provisional 20-case plan is described
- **THEN** it is labeled as 12 recoverable, 4 negative and 4 controls rather than 20 repair failures or a statistically guaranteed sample

#### Scenario: EVAL-001-S2
- **WHEN** Pilot cases are used to tune the tool
- **THEN** those cases remain identified as development evidence and are not promoted into the final evaluation

### Requirement: EVAL-002 Independent semantic assessment

Evaluation SHALL verify task outcomes independently from candidate acceptance and inspect wrong effects on every attempt while preserving original inputs and assertions.

#### Scenario: EVAL-002-S1
- **WHEN** A recovered click opens the wrong entity dialog
- **THEN** the evaluator records a wrong-target effect even when the browser action succeeded

#### Scenario: EVAL-002-S2
- **WHEN** A profile fill appears successful but a different field changes
- **THEN** the evaluator does not classify it as a clean correct repair

### Requirement: EVAL-003 Comparable technical baselines

Comparisons SHALL use the same cases and reset conditions, document equivalent available information and attempt budgets, and distinguish no-healing sanity checks from ranker-only technical comparisons.

#### Scenario: EVAL-003-S1
- **WHEN** Full recovery and ranker-only are compared
- **THEN** both receive the specified runtime information and neither receives oracle answers

#### Scenario: EVAL-003-S2
- **WHEN** Ranker-only matches or exceeds the full tool
- **THEN** the result is retained and no unsupported LLM superiority claim is made

### Requirement: EVAL-004 Frozen final protocol

The final manifest, versions, effective configuration, repetitions, analysis rules and budget SHALL be frozen after the pilot and before final outcomes are inspected; subsequent changes MUST be versioned and explained.

#### Scenario: EVAL-004-S1
- **WHEN** The proposed three repetitions are used on 20 cases and two methods
- **THEN** 120 executions are reported as repeated runs of 20 cases, not 120 independent cases

#### Scenario: EVAL-004-S2
- **WHEN** A relevant case category is missing during pre-final review
- **THEN** cases may be added or replaced for coverage with a recorded reason before the manifest is frozen

### Requirement: EVAL-005 Complete outcome accounting

Analysis SHALL retain unsuccessful and wrong-target runs, separate class denominators, count operational failures after method start, and report setup failures and missing runs separately.

#### Scenario: EVAL-005-S1
- **WHEN** An API outage occurs after a method starts
- **THEN** the primary end-to-end outcome includes that operational failure

#### Scenario: EVAL-005-S2
- **WHEN** A setup error prevents a method from starting
- **THEN** the planned but unstarted run is reported separately and any rerun retains its lineage

### Requirement: EVAL-006 Fair practitioner task endpoints

A manual-versus-assisted maintenance study SHALL compare the same work product: a reviewed source locator repair verified with healing disabled, or a correct non-repair diagnosis for a negative task.

#### Scenario: EVAL-006-S1
- **WHEN** A participant completes an assisted repair
- **THEN** elapsed task time includes tool use, review, source application and verification with original assertions

#### Scenario: EVAL-006-S2
- **WHEN** Participants perform both conditions
- **THEN** different comparable tasks and balanced assignments/order mitigate answer recall; tool access and time limits are documented

#### Scenario: EVAL-006-S3
- **WHEN** Six participants perform six tasks each
- **THEN** the study describes 36 task attempts by six participants and does not infer population-wide productivity from the participant count alone

### Requirement: EVAL-007 Evidence and claim boundaries

Reports and paper artifacts SHALL distinguish new evaluation data from historical results, synthetic demo from private-application evidence, and practical feasibility from broad effectiveness or superiority.

#### Scenario: EVAL-007-S1
- **WHEN** Only a local single-application study is completed
- **THEN** claims are restricted to the studied conditions and the private replication limitation is disclosed

#### Scenario: EVAL-007-S2
- **WHEN** A study is planned but no participants or runs exist
- **THEN** its methods are described as a plan without fabricated scores, speedups, or success counts


### Requirement: EVAL-008 Frozen comparable live study

The study SHALL preserve D24, diagnose 0.0.5 separately, compare A/B/C with equal shared inputs and budgets, and run independently authored held-out task groups only after code/protocol freeze; all failures, unknowns, refusals and denominators MUST remain in evidence.

#### Scenario: EVAL-008-S1
- **WHEN** A new D26 batch runs
- **THEN** its fresh ledger and outputs cannot overwrite historical evidence and total spending remains bounded

#### Scenario: EVAL-008-S2
- **WHEN** Held-out outcomes are opened
- **THEN** the frozen implementation/protocol hashes precede collection and no post-result tuning is applied to that reported batch

#### Scenario: EVAL-008-S3
- **WHEN** A run is technically completed
- **THEN** its wrong-target effects and independent semantic correctness remain separately assessed


### Requirement: EVAL-009 Audited post-correction regression

The D27 rerun SHALL freeze the corrected common core and unchanged comparison tasks/configuration before collection, preserve D26, keep reused tasks labeled as known regressions, and retain complete class-specific outcomes and resource accounting.

#### Scenario: EVAL-009-S1
- **WHEN** The corrected implementation is evaluated across A/B/C
- **THEN** all arms share the corrected core and B/C input policy, original task/oracle/mutation contracts remain unchanged, and source/input hashes are audited

#### Scenario: EVAL-009-S2
- **WHEN** Post-correction outcomes are compared with D26
- **THEN** normal controls, correct recovery, wrong effects, refusals, operational failures and usage are reported with complete denominators and no universal or fresh-holdout claim

