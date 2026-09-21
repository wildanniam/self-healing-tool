## Purpose

Give users and evaluators isolated, inspectable recovery records with honest outcome, timing, resource, and data-exposure semantics.

These are planned capability requirements; implementation and empirical verification are pending.

## ADDED Requirements

### Requirement: OBS-001 Isolated recovery records

Every evaluation run and recovery event SHALL have a stable identifier and separate outputs; one run MUST NOT delete or overwrite another run evidence.

#### Scenario: OBS-001-S1
- **WHEN** Two runs produce reports in the same workspace
- **THEN** both remain separately identifiable with their configurations and artifacts

#### Scenario: OBS-001-S2
- **WHEN** A failed run is repeated
- **THEN** the repeat receives a new ID linked to the retained original

### Requirement: OBS-002 Independent result dimensions

Reports SHALL distinguish locator acceptance, action success, semantic outcome when assessed, and wrong-target effects on any attempt.

#### Scenario: OBS-002-S1
- **WHEN** A wrong participant dialog opens before a later correct retry
- **THEN** the wrong-target effect remains recorded even if the final outcome is correct

#### Scenario: OBS-002-S2
- **WHEN** Only runtime structural checks have executed
- **THEN** the report displays semantic outcome as unassessed

### Requirement: OBS-003 Comparable time and resource accounting

Reports SHALL separate internal healing latency, total recovery time including the original failed action timeout and retry, and setup time; costs MUST include failed attempts and identify model and price assumptions.

#### Scenario: OBS-003-S1
- **WHEN** Recovery includes an original timeout, a model call and a retry
- **THEN** total recovery accounts for all three while the internal interval is labeled separately

#### Scenario: OBS-003-S2
- **WHEN** No run in a group succeeds
- **THEN** cost per correct repair is undefined rather than zero and total observed cost is retained

### Requirement: OBS-004 Controlled artifact disclosure

Default reports SHALL omit raw sensitive context and secrets; optional diagnostic capture MUST be explicit, local, and labeled for review before sharing.

#### Scenario: OBS-004-S1
- **WHEN** A report is generated using authenticated test context
- **THEN** API keys, cookies, authentication headers and browser session state are not serialized into the report

#### Scenario: OBS-004-S2
- **WHEN** A user enables raw diagnostic capture
- **THEN** the output is separately identified as potentially sensitive and is excluded from the distributable demo by default

### Requirement: OBS-005 Human review support

Reports SHALL present the original and proposed locator, action, validation and attempt outcomes, effective configuration, and evidence references without automatically applying source changes.

#### Scenario: OBS-005-S1
- **WHEN** A practitioner inspects a proposed repair
- **THEN** the report exposes enough recorded context and limitations to review it and apply a locator change manually

#### Scenario: OBS-005-S2
- **WHEN** A page label contains markup
- **THEN** the report renders it as data rather than executable HTML
