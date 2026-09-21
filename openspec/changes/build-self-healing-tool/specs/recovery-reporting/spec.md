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

#### Scenario: OBS-002-S3
- **WHEN** Attempt-level and event-level assessments describe the same wrong-target action
- **THEN** aggregate reporting counts unique affected events and attempts separately from assessment records, without double-counting or erasing any record

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

### Requirement: OBS-006 Returned model provenance

Future provider-backed reports SHALL distinguish the requested model configuration from allowlisted returned model and finish metadata. Missing or invalid metadata MUST remain unknown without copying arbitrary provider fields or rewriting earlier evidence.

#### Scenario: OBS-006-S1
- **WHEN** A provider response supplies valid model and finish metadata, including one whose selector output later fails parsing
- **THEN** the corresponding attempt preserves these fields independently of selection outcome and requested configuration

#### Scenario: OBS-006-S2
- **WHEN** Metadata is missing, invalid or accompanied by private extra fields, or a transport fails before a response
- **THEN** only validated allowlisted fields appear in snapshots/reports and unavailable values remain null


### Requirement: OBS-007 Inspect spec decisions without overstating correctness

Reports SHALL distinguish spec provenance, admission decisions, action execution and independent semantic outcome; summaries MUST report accepted-error risk as undefined when no actions were accepted.

#### Scenario: OBS-007-S1
- **WHEN** An enforced candidate is refused
- **THEN** report shows its policy reason and no action without calling it a successful heal

#### Scenario: OBS-007-S2
- **WHEN** No recovery is accepted in a group
- **THEN** the summary does not claim zero-error effectiveness from an empty denominator


### Requirement: OBS-008 Exact attempt and refresh evidence

Local diagnostics SHALL retain sanitized exact input context for each provider attempt and refresh outcome, duration and selection-evidence hashes; normal reports MUST omit raw attempt and refresh contexts and late known fill values MUST be redacted throughout snapshots.

#### Scenario: OBS-008-S1
- **WHEN** A refreshed observation changes a later request
- **THEN** each attempt retains its own actual input and initial context remains unchanged

#### Scenario: OBS-008-S2
- **WHEN** A later fill value was present in earlier observations
- **THEN** all retained initial, attempt and refresh contexts redact that value

#### Scenario: OBS-008-S3
- **WHEN** A normal report is produced
- **THEN** refresh summary is visible without raw candidate or DOM context


### Requirement: OBS-009 Presentation comparison from retained evidence

The presentation report SHALL retain every loaded condition, arm and repetition, separate controls, ordinary recovery, negative cases, stress cases and contract-quality cases, and expose source fingerprints and evidence type. Private raw context MUST remain outside committed assets.

#### Scenario: OBS-009-S1
- **WHEN** complete D30 private and independent sources are supplied
- **THEN** 378 slots are represented with class-specific denominators, wrong actions, independent correctness and known limitations

#### Scenario: OBS-009-S2
- **WHEN** sources are missing, duplicated, malformed or incomplete
- **THEN** the report refuses inconsistent data or explicitly reports missing coverage without fabricated rows or zero-valued unknown usage

#### Scenario: OBS-009-S3
- **WHEN** the report is opened offline or contains untrusted page labels
- **THEN** comparison filters, condition details, downloads and print remain usable, and labels render as text without executing markup


### Requirement: OBS-010 Stage-by-stage execution inspection

Reports SHALL support readable inspection of one case, arm, repetition and attempt at a time, with source-backed input, transformation, response, decision and outcome evidence. Private diagnostics MUST be explicitly local and excluded from ordinary exports and committed fixtures.

#### Scenario: OBS-010-S1
- **WHEN** an original action succeeds without recovery
- **THEN** the inspector shows the recorded independent checks and marks DOM recovery, AI and admission stages skipped, without invented requests

#### Scenario: OBS-010-S2
- **WHEN** a retained recovery request or multiple attempts are inspected
- **THEN** exact messages and hash status, attempt-specific observed candidates/coverage, available output and retry feedback remain separate and navigable

#### Scenario: OBS-010-S3
- **WHEN** a candidate is admitted, rejected, abstained or executed wrongly
- **THEN** readable reasons link to recorded validation/rule clauses and independent effects, without inferring business correctness from locator acceptance or inventing model reasoning

#### Scenario: OBS-010-S4
- **WHEN** evidence is missing or a source contains hostile markup or sensitive extra fields
- **THEN** missing/skipped/redacted states are explicit, only supported diagnostic fields are retained, markup is inert and ordinary exports exclude private diagnostics

#### Scenario: OBS-010-S5
- **WHEN** the owner navigates the inspector on desktop or mobile
- **THEN** case, arm, repetition, attempt and stage controls are keyboard usable, readable and preserve the overview result counts

#### Scenario: OBS-010-S6
- **WHEN** a subsequent replay or live demonstration is recorded
- **THEN** request/response capture is available to the same inspector with accurate evidence mode and without altering method inputs or historical results


### Requirement: OBS-011 Results-first reports with separate studies

Reports SHALL lead with observed outcomes, expose four process groups with paired attempt input/output, and retain progressive access to recorded evidence. RM1 and RM2 SHALL have separate adapters, scope, arms and denominators. Generic library reports MUST preserve their allowlisted projection and explicitly label unavailable raw evidence and unassessed correctness.

#### Scenario: OBS-011-S1
- **WHEN** D33 and D30 archives are loaded
- **THEN** ranking and target-rule comparisons retain their own records and denominators without pooled accuracy or changed source files

#### Scenario: OBS-011-S2
- **WHEN** a result or a later attempt is selected
- **THEN** the inspector opens that case, arm and repetition with the same attempt's input, output and checks, with raw and parsed evidence distinguished

#### Scenario: OBS-011-S3
- **WHEN** controls, missing raw evidence, replay or unassessed library runs are shown
- **THEN** no AI invocation, reconstructed output or semantic success is fabricated; four groups and on-demand sources remain clear

#### Scenario: OBS-011-S4
- **WHEN** a filtered summary is exported or hostile/private evidence is rendered
- **THEN** exported rows match visible filters, private diagnostics are excluded from summary exports, and markup remains inert

#### Scenario: OBS-011-S5
- **WHEN** the report is used with keyboard at desktop or mobile sizes
- **THEN** navigation, four-group inspection, focus return and readable evidence work without page overflow

### Requirement: OBS-012 Packaged bilingual action audit

The library SHALL provide the same per-action inspector as the research report, with optional local captured evidence and English/Indonesian UI, while preserving safe summary exports and historical gaps.

#### Scenario: OBS-012-S1
- **WHEN** local audit capture is enabled before recovery
- **THEN** actual provider request and returned text are paired by event and attempt, missing/failed/late results stay explicit, and capture does not change selection

#### Scenario: OBS-012-S2
- **WHEN** audit is disabled or normal JSON is exported
- **THEN** full request, returned text and candidate diagnostics are excluded; explicit local diagnostics are isolated and omissions are respected

#### Scenario: OBS-012-S3
- **WHEN** a library consumer opens the report and changes language or attempt
- **THEN** DOM, AI input/output, checks and outcomes remain readable with exact selected identity, unchanged recorded evidence and no experiment-only controls

#### Scenario: OBS-012-S4
- **WHEN** an installed package or historical presentation renders reports
- **THEN** the shared inspector works offline on desktop/mobile and with keyboard input, preserves historical results and labels unavailable, unassessed, original-success and replay states truthfully


### Requirement: OBS-013 Suite navigation and separate test outcomes

The packaged reporter SHALL provide one index of final test-attempt status and linked action reports, preserving separate execution and semantic assessments, safe metadata, bilingual UI and optional single local browser opening.

#### Scenario: OBS-013-S1
- **WHEN** a suite completes including retries and missing reports
- **THEN** the index identifies project, test, attempt and final test status, links available reports and labels missing diagnostics without inventing results

#### Scenario: OBS-013-S2
- **WHEN** an action finishes without an independent assessment
- **THEN** execution completion is visible without counting it as a correct repair

#### Scenario: OBS-013-S3
- **WHEN** automatic opening is enabled locally or the suite runs in CI
- **THEN** the opener is attempted at most once locally, never in CI, and opener failures do not change test results

#### Scenario: OBS-013-S4
- **WHEN** a user opens the suite in English or Indonesian on desktop or mobile
- **THEN** test statuses and report navigation remain readable, source strings are escaped and the original evidence remains unchanged
