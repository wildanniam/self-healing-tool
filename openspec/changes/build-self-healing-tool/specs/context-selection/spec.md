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


### Requirement: CTX-006 Equal spec context across comparison arms

Context-only and enforced sessions SHALL provide the same sanitized requirement, applicability and evidence-policy information to the provider; sessions without a target spec MUST use the documented request contract of the declared version. D26 preserves its historical 0.0.5 contract; D27 explicitly versions the corrected shared core and compact request projection.

#### Scenario: CTX-006-S1
- **WHEN** B and C receive the same state and contract
- **THEN** their first serialized provider requests are identical

#### Scenario: CTX-006-S2
- **WHEN** Spec metadata exceeds the payload budget or contains sensitive omitted values
- **THEN** the request is bounded/sanitized or fails without dispatch


### Requirement: CTX-007 Eligible and verified candidate context

The context pipeline SHALL exclude unavailable hidden action targets and preserve meaningful local/accessibility identity across wrappers; suggested locators SHALL be verified with the browser engine to uniquely identify the originating node without positional or evaluator-derived selectors.

#### Scenario: CTX-007-S1
- **WHEN** A click/fill page contains a visible control, a closed-dialog duplicate and hidden inputs
- **THEN** only eligible action candidates remain while legitimate accessible labels and scrollable targets retain their identity

#### Scenario: CTX-007-S2
- **WHEN** Interactive text is nested or the control is wrapped without changing intent
- **THEN** a supported suggested locator identifies the actual interactive candidate and generic semantic group identity remains available

#### Scenario: CTX-007-S3
- **WHEN** No unique supported locator can identify a candidate
- **THEN** the loss is recorded, invalid locator suggestions are not advertised as verified, and independent semantic correctness is not assumed



### Requirement: CTX-008 Stable ranking and compact bounded payload

The corrected ranking SHALL avoid duplicate structural-token amplification and shared-class identity errors. Provider projection and context budgeting SHALL use the same compact representation, retain distinct entity candidates and audit stage/omission counts within explicit total limits.

#### Scenario: CTX-008-S1
- **WHEN** A semantic control is wrapped or its old structural locator repeats tag tokens
- **THEN** ranking preserves relevant semantic features without multiplying bare structural matches

#### Scenario: CTX-008-S2
- **WHEN** Distinct entities share button text/classes while another field has unique stable identity
- **THEN** entity candidates remain distinct and the unique field is not penalized solely for shared classes

#### Scenario: CTX-008-S3
- **WHEN** Compact candidates and fallback approach configured limits
- **THEN** actual serialized projection is measured, all input limits hold, and omitted candidates/stages are reported without claiming guaranteed target coverage



### Requirement: CTX-009 Owned evidence with bounded provenance

Candidate context SHALL distinguish local action context from owning identity and expose bounded provenance; owner-bearing evidence MUST NOT borrow unrelated sibling or nested entity prose. No task or contract phrase may guide ownership traversal.

#### Scenario: CTX-009-S1
- **WHEN** An unnamed semantic wrapper is added around a control
- **THEN** the nearest justified owner remains identifiable through the wrapper

#### Scenario: CTX-009-S2
- **WHEN** A nested owner is missing identity or named ownership boundaries conflict
- **THEN** ownership is reported missing or ambiguous rather than borrowing broader identity

#### Scenario: CTX-009-S3
- **WHEN** A neighboring entity mentions the desired identity in its prose
- **THEN** that mention does not become the candidate owner identity
