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

## Implementation checkpoint — 2026-09-08

[D19](../../../docs/decisions/2026-09-08-autonomous-development.md) authorizes autonomous engineering in the agreed scope. [Issue #5](https://github.com/wildanniam/self-healing-tool/issues/5) implements the initial library, context/reporting and synthetic offline demo. The reference source/history remains excluded; the implementation is newly authored from the agreed contracts. Exact completed tasks and passing acceptance evidence are recorded in the register; this update does not mark the entire change or research complete.

[D20/D21](../../../docs/decisions/2026-09-08-live-pilot.md) record accepted five-case pilot meanings and an explicitly authorized one-batch live API budget. Tasks 5.4/6.3 may now execute once their limits/instrumentation are verified; final-study authorization remains separate.

[D22/D23](../../../docs/decisions/2026-09-08-live-pilot.md) resolve private pilot disclosure and authorize staged autonomous preparation. Issue #7 records pilot evidence, terminal provider-failure behavior and the final-protocol review package. Provider exceptions terminate recovery; malformed output and candidate validation retain bounded retries. Final collection still requires the agreed review checkpoint.

[D24](../../../docs/decisions/2026-09-09-final-evaluation.md) accepts the reviewed technical protocol/budget and authorizes autonomous final collection/analysis under issue #9 and private-host #178. Freeze and behavioral verification precede dispatch; final interpretation, practitioner decisions and release remain subsequent.

## D24 post-collection observability increment

Issue #9 also prepares version 0.0.4 after collection: preserve allowlisted returned model/finish metadata for future runs. Version 0.0.3 discards these fields, leaving the measured alias unresolved. This is an offline-tested provenance improvement, not a selection change or a retroactive repair of frozen evidence.

The same post-collection increment corrects duplicate wrong-effect summary counting: event and attempt assessments can refer to one observed action. Frozen per-slot analysis already counts unique slots and remains unchanged.

## D25 method correction

[Decision D25](../../../docs/decisions/2026-09-09-thesis-alignment.md) corrects unverified methodological simplification. Issue #11 restores thesis-informed cleaning, ranking, failure context, stable locator handling and validator feedback in a separate version. This refines the original research intent; earlier implementation checkpoints remain historical. Exact parity/deviations must be documented before claiming equivalence.


## D26 authorized method-validation extension

Execute the four owner-requested stages in issue #13. Extend the existing library-integration, context-selection, runtime-recovery and evaluation-protocol capabilities with optional consumer-provided target contracts, a context-only arm and a generic before-recovery admission arm. Preserve the no-contract 0.0.5 behavior. Run known private regression cases separately from independently authored synthetic holdout. Do not imply universal semantic verification or public release.
