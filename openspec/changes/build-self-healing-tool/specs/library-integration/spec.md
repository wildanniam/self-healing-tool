## Purpose

Let a Playwright project consume locator recovery as a reusable dependency while keeping application tests and business configuration separate.

These are planned capability requirements; implementation and empirical verification are pending.

## ADDED Requirements

### Requirement: INT-001 Independent consumer package

The library SHALL be consumable through a documented public entry point without importing the private evaluation application, its tests, fixtures, or authentication helpers.

#### Scenario: INT-001-S1
- **WHEN** A clean consumer installs the prepared package
- **THEN** it can import the documented recovery interface without access to any private application repository

#### Scenario: INT-001-S2
- **WHEN** The distribution contents are inspected
- **THEN** only explicitly permitted library assets are included

### Requirement: INT-002 Explicit action integration

Users SHALL opt into recovery for supported click and fill actions while retaining their own navigation, task inputs, assertions, and normal Playwright APIs.

#### Scenario: INT-002-S1
- **WHEN** An opted-in action succeeds with the original locator
- **THEN** the original action completes without model invocation

#### Scenario: INT-002-S2
- **WHEN** An existing test uses native locators for setup and assertions
- **THEN** those operations continue to work without conversion to the recovery wrapper

### Requirement: INT-003 Explicit validated configuration

The library SHALL validate the configured provider, model, attempt limits, and context limits before a paid invocation, reject unsupported values, and report the effective configuration without secrets. The initial development defaults follow decision D18; preparing an environment template does not establish this runtime behavior.

#### Scenario: INT-003-S1
- **WHEN** An unknown model or invalid attempt limit is configured
- **THEN** execution reports a configuration error without silently substituting a model or sending a paid request

#### Scenario: INT-003-S2
- **WHEN** A supported configuration is used
- **THEN** the report identifies the actual provider, model, and limits used

### Requirement: INT-004 Documented compatibility

The library SHALL publish and verify its supported runtime and Playwright version range and document the limitations of the initial selector and action interface.

#### Scenario: INT-004-S1
- **WHEN** A release candidate is prepared
- **THEN** a clean consumer smoke check covers the declared supported configuration

#### Scenario: INT-004-S2
- **WHEN** A user reads the integration instructions
- **THEN** the instructions explain explicit string-selector adaptation and do not claim drop-in support for every native locator or browser

### Requirement: INT-005 Authorized source extraction

Each component proposed for distribution SHALL have a recorded origin and distribution decision; the extraction MUST exclude application-specific artifacts and unrelated repository history.

#### Scenario: INT-005-S1
- **WHEN** A component has unresolved distribution rights
- **THEN** it is held outside the release package until a documented decision permits inclusion

#### Scenario: INT-005-S2
- **WHEN** The extraction inventory is reviewed
- **THEN** it records included and excluded categories without copying restricted raw artifacts


### Requirement: INT-006 Explicit target contract input

The library SHALL accept an optional bounded data-only target contract with requirement provenance, revision, action, status and observable evidence clauses; it MUST reject executable predicates and invalid records and MUST preserve no-contract compatibility.

#### Scenario: INT-006-S1
- **WHEN** An explicit requirement file is loaded
- **THEN** only its declared structured contract and safe provenance are returned without reading application source

#### Scenario: INT-006-S2
- **WHEN** A malformed or executable contract is supplied
- **THEN** configuration fails before candidate actions


### Requirement: INT-007 Automatic Playwright Test lifecycle

An optional Playwright Test integration SHALL create isolated healing sessions and write reports during teardown, preserve explicit audit opt-in, attach report evidence, and preserve primary test failures when diagnostics fail.

#### Scenario: INT-007-S1
- **WHEN** an installed consumer runs normal, recovered, refused, provider-failed or assertion-failed tests
- **THEN** each completed fixture teardown writes its own report without consumer finally blocks and never treats test success as semantic proof

#### Scenario: INT-007-S2
- **WHEN** a report write or attachment fails
- **THEN** the test's original failure remains intact and diagnostic unavailability is reported separately

#### Scenario: INT-007-S3
- **WHEN** parallel tests, retries, skipped tests or an audit-disabled consumer execute
- **THEN** identities and evidence remain separate and unavailable captures are explicit
