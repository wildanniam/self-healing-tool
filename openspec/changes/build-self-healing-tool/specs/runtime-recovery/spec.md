## Purpose

Recover a supported missing locator within explicit execution limits while retaining original task intent and observable failure information.

These are planned capability requirements; implementation and empirical verification are pending.

## ADDED Requirements

### Requirement: HEAL-001 Narrow recovery trigger

Recovery SHALL be attempted only for a supported missing-locator failure where the original selector matches zero elements; other failures MUST retain their original classification.

#### Scenario: HEAL-001-S1
- **WHEN** A supported action fails and its original selector matches zero elements
- **THEN** the configured recovery process may begin and records the original failure

#### Scenario: HEAL-001-S2
- **WHEN** The error is an invalid selector, multiple matches, a closed page, or a present but disabled target
- **THEN** the error is propagated without reclassifying it as missing-locator drift or invoking recovery

### Requirement: HEAL-002 Bounded attempts

Recovery SHALL obey the configured attempt and time limits, record rejected candidates, and stop with an explicit unsuccessful outcome when its budget is exhausted.

#### Scenario: HEAL-002-S1
- **WHEN** A candidate fails runtime checks and attempts remain
- **THEN** the next permitted attempt is recorded within the same bounded recovery event

#### Scenario: HEAL-002-S2
- **WHEN** No usable candidate is produced within the configured budget
- **THEN** execution ends with an unsuccessful recovery result and retains the original failure context

### Requirement: HEAL-003 Preserved test intent

Recovery SHALL preserve the original action type and input value and MUST NOT edit source tests, assertions, expected results, or task goals, or trigger commits and PRs.

#### Scenario: HEAL-003-S1
- **WHEN** A fill locator is replaced
- **THEN** the retry uses the original fill value and leaves the test assertions unchanged

#### Scenario: HEAL-003-S2
- **WHEN** A response contains instructions to skip a test or rewrite an assertion
- **THEN** those instructions are not executed and are reported as unsupported output

### Requirement: HEAL-004 Separated action outcomes

Recovery SHALL expose candidate acceptance and action execution as separate outcomes and MUST NOT claim semantic correctness without an independent assessment.

#### Scenario: HEAL-004-S1
- **WHEN** A replacement locator passes runtime validation but the retried action fails
- **THEN** the result retains candidate acceptance and records action failure

#### Scenario: HEAL-004-S2
- **WHEN** A retried action executes successfully without an evaluator
- **THEN** semantic correctness is unknown rather than automatically true

### Requirement: HEAL-005 Validated selector output

The runtime SHALL accept only supported selector output, verify uniqueness and action prerequisites before retrying, and MUST NOT execute model-produced program code.

#### Scenario: HEAL-005-S1
- **WHEN** A generated selector matches multiple elements or an incompatible field
- **THEN** the candidate is rejected before an action is retried

#### Scenario: HEAL-005-S2
- **WHEN** The model returns arbitrary program code or malformed output
- **THEN** the output is rejected without evaluating code

### Requirement: HEAL-006 Visible operational failures

Configuration, provider, parsing, validation, and action failures SHALL remain distinguishable in outcomes and reports; an unavailable provider MUST NOT be reported as a successful heal.

#### Scenario: HEAL-006-S1
- **WHEN** The provider request fails or times out
- **THEN** the recovery event records an operational failure and any resource information that is actually available, terminates without another provider invocation for that event, and never executes a late response

#### Scenario: HEAL-006-S2
- **WHEN** Token usage is unavailable after a request failure
- **THEN** usage is recorded as unknown rather than zero

### Requirement: HEAL-007 Normalized locators and rejection feedback

Supported selector normalization SHALL preserve browser validation and record proposed/validated variants; subsequent full-mode attempts SHALL receive sanitized prior rejection reasons/counts within existing budgets.

#### Scenario: HEAL-007-S1
- **WHEN** A text locator requires normalization or matches multiple elements
- **THEN** variants are validated before action and rejected selector/count/reason information is retained for the next request

#### Scenario: HEAL-007-S2
- **WHEN** Feedback makes the payload too large or a provider fails
- **THEN** the method stops visibly within limits without dropping accounting or executing late output


### Requirement: HEAL-008 Generic admission before recovery action

An enforced session SHALL check applicability and all consumer-declared evidence clauses against the resolved candidate before recovery execution; retired, mismatched or insufficient evidence MUST stop semantic recovery without domain-specific branches or automatic goal changes.

#### Scenario: HEAL-008-S1
- **WHEN** A runtime-valid candidate fails one identity clause
- **THEN** no recovery action is executed and the unmet clause is recorded

#### Scenario: HEAL-008-S2
- **WHEN** A candidate satisfies the declared generic policy
- **THEN** normal bounded action execution remains possible and independent correctness is not assumed

#### Scenario: HEAL-008-S3
- **WHEN** The target contract is retired or revision mismatched
- **THEN** recovery halts with a distinct refusal or unknown reason


### Requirement: HEAL-009 Explicit no-selection normalization

The runtime SHALL treat supported explicit null-selection output as a no-candidate attempt under the existing bounded abstention policy, retain its accounting, and never execute it as a literal selector or arbitrary code.

#### Scenario: HEAL-009-S1
- **WHEN** A response returns JSON null or the supported literal null selection
- **THEN** no browser action is attempted and the bounded retry/abstention result retains the provider attempt

#### Scenario: HEAL-009-S2
- **WHEN** An output contains unsupported code or a malformed selector record
- **THEN** the output is rejected without execution and normal validation remains required for actual selectors



### Requirement: HEAL-010 Observation-aware bounded no-selection retry

After explicit no-selection, full-mode recovery SHALL refresh observations at most once per event and call the provider again only when selection evidence changes within existing attempt/time limits; unchanged evidence MUST stop as abstention.

#### Scenario: HEAL-010-S1
- **WHEN** New observable candidate evidence appears after the first null response
- **THEN** one refreshed observation may support the next bounded attempt

#### Scenario: HEAL-010-S2
- **WHEN** Only accounting counts change or evidence is unchanged
- **THEN** no duplicate provider call is made and abstention stays visible

#### Scenario: HEAL-010-S3
- **WHEN** Refresh fails, time expires or the provider returns null again
- **THEN** the method stops with recorded cause and no unbounded polling
