## Purpose

Allow reviewers to try the recovery workflow on an independent synthetic local application without accessing any private evaluation environment.

These are planned capability requirements; implementation and empirical verification are pending.

## ADDED Requirements

### Requirement: DEMO-001 Independent example application

The public demo SHALL run using its own synthetic application and example tests without private application source, fixtures, credentials, or repository access.

#### Scenario: DEMO-001-S1
- **WHEN** A reviewer obtains only the tool repository
- **THEN** the documented demo can run with its declared public prerequisites

#### Scenario: DEMO-001-S2
- **WHEN** The private evaluation repository is unavailable
- **THEN** demo setup does not attempt to fetch or import it

### Requirement: DEMO-002 Local target confinement

The supplied demo runner SHALL permit only its declared loopback application and local support services; navigation and application requests to external production services MUST be rejected.

#### Scenario: DEMO-002-S1
- **WHEN** The demo target is configured as a public application domain
- **THEN** the demo fails before submitting browser requests to that target

#### Scenario: DEMO-002-S2
- **WHEN** The local application redirects or fetches an undeclared remote service
- **THEN** the demo blocks that application request; explicitly configured server-side LLM calls remain a separately documented exception

### Requirement: DEMO-003 Synthetic isolated state

Demo identities, authentication material and optional database state SHALL belong only to the demo instance, and reset MUST be confined to that local instance.

#### Scenario: DEMO-003-S1
- **WHEN** A demo administrator is created
- **THEN** the account exists only in the synthetic local instance and grants no authority on the private application

#### Scenario: DEMO-003-S2
- **WHEN** A reset target does not match the declared local demo datastore
- **THEN** reset refuses to run

### Requirement: DEMO-004 Explicit execution modes

Instructions SHALL distinguish offline verification from live-model demonstration and require user-provided model credentials for live calls, with bounded configuration and labeled results.

#### Scenario: DEMO-004-S1
- **WHEN** Offline checks are executed
- **THEN** they do not send model requests and do not claim empirical model performance

#### Scenario: DEMO-004-S2
- **WHEN** A live demo is requested without valid credentials or limits
- **THEN** it reports the missing configuration before issuing a paid request

### Requirement: DEMO-005 Reviewed release contents

A public release SHALL include usage instructions and a reviewed distribution manifest, and MUST exclude private source/history, authentication state, and unreviewed raw diagnostic outputs.

#### Scenario: DEMO-005-S1
- **WHEN** A release candidate is assembled
- **THEN** its contents are compared with the approved distribution inventory before public upload

#### Scenario: DEMO-005-S2
- **WHEN** Only the synthetic demo is shared
- **THEN** documentation identifies that it does not fully reproduce the separate private-application evaluation


### Requirement: DEMO-006 One-command presentation and bounded walkthrough

The supplied commands SHALL generate and open the retained comparison and support a separate headed A/B/C walkthrough on independent loopback fixtures. Recorded decisions MUST be labeled replay, not live inference or new empirical results. No credential or paid request SHALL be used by default.

#### Scenario: DEMO-006-S1
- **WHEN** the owner runs the default presentation command
- **THEN** new JSON and standalone HTML files are written and the report opens unless explicitly disabled, without changing historical sources

#### Scenario: DEMO-006-S2
- **WHEN** the replay walkthrough runs across A/B/C
- **THEN** real browser actions, runtime admission and independent outcome checks run with bounded recorded proposals; replay discrepancies are visible and not silently replaced with expected outcomes

#### Scenario: DEMO-006-S3
- **WHEN** live mode is explicitly selected
- **THEN** it requires explicit API configuration and a fresh bounded ledger, writes separate results, and cannot reuse or alter historical experiment accounting
