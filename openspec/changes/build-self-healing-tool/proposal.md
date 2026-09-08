## Why

QA practitioners need to recover broken UI locators without silently changing the intended test behavior. The existing research prototype mixes reusable recovery components with application-specific testing and reporting, so a separately distributable tool needs explicit boundaries, acceptance scenarios, and evidence before extraction.

Planning source: owner-approved direction dated 2026-09-07, summarized in [the decision register](../../../docs/decisions/2026-09-07-foundation.md). This proposal is tracked by [issue #1](https://github.com/wildanniam/self-healing-tool/issues/1) for specification setup; implementation work will use follow-up issues linked to this change. Planning artifacts being complete does not mean the tool is implemented.

Decision basis: D01–D08 establish the tool and artifact boundaries, D09–D13 the evaluation direction, D14–D15 the evidence constraints, and D16–D17 the durable audit workflow. [D18](../../../docs/decisions/2026-09-08-local-api.md) adds the owner-selected initial API settings on 2026-09-08 under issue #3. Per-requirement links are recorded in the traceability register.

## What Changes

- Define a reusable TypeScript library integrated through explicit Playwright click/fill wrappers.
- Bound the locator-recovery trigger, candidate selection, model invocation, runtime validation, retry, and failure propagation.
- Provide context and reports that distinguish proposed selectors, executed actions, and externally assessed correctness.
- Add an independent synthetic localhost demo; preserve the private application's repository and evaluation suite boundary.
- Specify a five-case pilot, a provisional coverage-based final suite, a ranker-only technical comparison, and an exploratory manual-versus-assisted maintenance study.
- Link requirements and scenarios to tasks, planned checks, issues, and evidence using the audit workflow already established in this repository.

Non-goals: copying the old repository/history; publishing private application code or sessions; production testing; autonomous assertion/source rewriting; automatic commits/PRs at runtime; npm/public release in this planning task; broad benchmarks or claims of general superiority.

## Capabilities

### New Capabilities

- `library-integration`: installable library boundary, explicit wrapper integration, configuration and extraction provenance.
- `runtime-recovery`: bounded missing-locator recovery and explicit action/failure outcomes.
- `context-selection`: action/entity-aware candidate context and separation from the evaluation oracle.
- `recovery-reporting`: isolated run records, measurable resource use, and reviewable outputs.
- `local-demo`: independent synthetic demo with isolated local services and no private-host dependency.
- `evaluation-protocol`: controlled cases, semantic oracle, paired comparisons, and practitioner study contracts.

### Modified Capabilities

None. The current `audit-workflow` capability governs repository process; it does not describe an implemented runtime.

## Impact

Future implementation will add library, demo, and evaluation-support modules here. Integration with the real application happens separately in its private repository. Foundation issue #1 adds specifications and repository tooling; follow-up issue #3 prepares the local API environment. No application source, model execution, participant data, or prior experiment artifacts are migrated. D18 selects the initial model/profile. Final experiment configuration, API budget, case manifest, participant availability, public licensing, and release approval remain explicit decisions to resolve at their relevant milestones.
