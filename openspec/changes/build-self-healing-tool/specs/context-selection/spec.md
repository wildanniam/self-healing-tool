## Purpose

Provide bounded action and entity context for candidate selection without including private evaluator answers in model or ranking inputs.

These are planned capability requirements; implementation and empirical verification are pending.

## ADDED Requirements

### Requirement: CTX-001 Action-relevant candidate context

Candidate selection SHALL use the intended action and normal task description and expose which candidate attributes and surrounding labels were included.

#### Scenario: CTX-001-S1
- **WHEN** A fill action fails among input fields and buttons
- **THEN** the supplied candidates prioritize fields compatible with the intended fill action

#### Scenario: CTX-001-S2
- **WHEN** Context must be shortened
- **THEN** the system records the applied limit and omitted or truncated context metadata

### Requirement: CTX-002 Reusable entity context

Context selection SHALL retain relevant entity and container relationships using application-independent rules rather than private route names or business selectors.

#### Scenario: CTX-002-S1
- **WHEN** Several participant cards contain identically labeled buttons
- **THEN** the selection context retains labels that allow those entities to be distinguished

#### Scenario: CTX-002-S2
- **WHEN** The UI uses a native dialog or a repeated card instead of a table row
- **THEN** the documented container strategy is evaluated without application-specific hardcoded identifiers

### Requirement: CTX-003 Oracle separation

Ranking and provider inputs SHALL exclude correct replacement locators, evaluator markers, expected oracle outputs, and mutation-answer metadata across every primary and fallback context path.

#### Scenario: CTX-003-S1
- **WHEN** A failure descriptor or DOM contains an evaluator-only marker
- **THEN** the actual transmitted and ranked payload omits that marker and the correct-answer metadata

#### Scenario: CTX-003-S2
- **WHEN** The normal task names its intended participant or course
- **THEN** that legitimate task identity may remain available without exposing the oracle locator or expected result

### Requirement: CTX-004 Auditable input budget

The effective candidate and payload limits SHALL be explicit and reviewable; truncation MUST NOT be hidden or described as proof that the correct target was preserved.

#### Scenario: CTX-004-S1
- **WHEN** A payload exceeds the configured context limit
- **THEN** it is reduced or rejected by a documented rule and the event records what limit applied

#### Scenario: CTX-004-S2
- **WHEN** The target is outside the selected candidates
- **THEN** the evaluator can record the coverage failure without injecting the answer into the runtime

### Requirement: CTX-005 Thesis-aligned information and ranking

The supported click/fill context SHALL preserve sanitized original-locator signals, stable attributes and documented thesis ranking components; cleaned HTML supplement/fallback SHALL remain bounded and subject to the same privacy/oracle rules. Method deviations MUST be explicit.

#### Scenario: CTX-005-S1
- **WHEN** Similar controls differ in old-locator attributes, duplicate labels or entity context
- **THEN** extraction and ranking retain those signals, follow the documented weights and offer non-positional locator suggestions

#### Scenario: CTX-005-S2
- **WHEN** Candidates are sparse or the page contains large noisy/sensitive content
- **THEN** bounded cleaned supplement/fallback excludes disallowed data and every actual serialized request respects configured limits
