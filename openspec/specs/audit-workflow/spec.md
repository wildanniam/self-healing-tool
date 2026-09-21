## Purpose

Maintain a reviewable connection between decisions, requirements, tasks and evidence without representing plans as implemented features.

This is the repository governance baseline; it is not a claim that runtime features exist.

## Requirements

### Requirement: AUD-001 Traceable requirements

The repository SHALL assign unique stable requirement and scenario IDs and maintain a complete mapping to decision IDs, ownership, planned verification, and implementation tasks where applicable.

#### Scenario: AUD-001-S1
- **WHEN** A requirement or scenario is added
- **THEN** the traceability register identifies its source spec, decision, owner, and planned verification

#### Scenario: AUD-001-S2
- **WHEN** A mapped requirement, scenario, or task reference is missing
- **THEN** the repository audit check fails with the unresolved reference

### Requirement: AUD-002 Truthful completion states

Contributors SHALL distinguish specification readiness, implementation completion, and verification evidence; planned runtime tasks MUST remain unchecked until their acceptance checks are satisfied.

#### Scenario: AUD-002-S1
- **WHEN** OpenSpec reports all planning artifacts present
- **THEN** the README and audit report still identify runtime implementation as pending until task evidence exists

#### Scenario: AUD-002-S2
- **WHEN** A requirement is marked verified without evidence
- **THEN** the audit check rejects the state

### Requirement: AUD-003 Reviewable change lifecycle

Meaningful work SHALL link an issue, a non-default branch, a change proposal, and a PR containing verification and risk notes; merging and public release MUST follow the owner authorization recorded for those actions.

#### Scenario: AUD-003-S1
- **WHEN** An implementation PR is opened
- **THEN** its description records the issue, change, affected requirement IDs, checks, and remaining risks

#### Scenario: AUD-003-S2
- **WHEN** Tasks are incomplete
- **THEN** the change stays active and is not archived as completed work

### Requirement: AUD-004 Decision and evidence provenance

The repository SHALL preserve dated decisions, superseding decisions, source references, and evidence status while keeping private discussion material and credentials outside distributable artifacts.

#### Scenario: AUD-004-S1
- **WHEN** An operational assumption changes after a pilot
- **THEN** the decision register and affected specifications identify the change and its reason before final evaluation

#### Scenario: AUD-004-S2
- **WHEN** A repository result is reported in Atlas Vault
- **THEN** the project memory links to the issue, PR, and current implementation status
