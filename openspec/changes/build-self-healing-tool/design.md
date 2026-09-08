## Context

See [proposal.md](proposal.md) for motivation and the [decision register](../../../docs/decisions/2026-09-07-foundation.md) for direction and authority. This document defines the architecture. The initial runtime implementation and its limits are now recorded in docs/integration.md and the traceability register; remaining research/release work stays proposed.

The owner's earlier prototype was inspected read-only. It already has a wrapper/orchestrator, candidate extraction/ranking, model invocation, validation, and reports. Extraction cannot be a wholesale repository copy: packaging is not consumer-ready, public exports include source/Git automation, output management and report metadata are application-specific, and failure handling can treat unrelated action errors as missing locators. The existing wrapper uses string selectors plus a descriptor rather than accepting every native Playwright Locator.

The audit also found evaluator metadata paths that could reach ranking/model input, table-oriented context assumptions that need adaptation to repeated cards and native dialogs, and timing that omits the original failure timeout and retry. A locator being accepted does not establish that an action executed or reached the intended entity. These are design inputs, not evidence that the new implementation fixes them.

The separate private host already has local E2E facilities, synthetic identities and guarded resets. Its runner and business fixtures remain there. Its application/runtime versions differ from the prototype; compatibility must be demonstrated with a clean consumer, not inferred from matching TypeScript versions. No raw source, DOM, private case identifiers or historical run artifacts are included here.

## Goals / Non-Goals

**Goals:** separate reusable mechanisms from application/evaluator policy; make every recovery attempt bounded and inspectable; provide a public-demo path that needs no private host; preserve a traceable route from decisions to future acceptance evidence.

**Non-Goals:** a transparent replacement for all Playwright APIs, production-targeted demo execution, autonomous source maintenance, new authentication or business logic for the private host, a hosted service, automatic model/provider fallback, or cross-application effectiveness claims from one host.

## Decisions

### 1. One library repository, one separate private integration

Planned layout:

```text
src/                    library entry point and generic mechanisms
tests/                  unit/contract/consumer checks with synthetic fixtures
examples/local-demo/    independent localhost application and example tests
evaluation/             public schemas and analysis support, no private suite
docs/                   decisions, evidence references and integration guide
openspec/               current baseline and proposed changes
```

Begin with one package and an explicit distribution allowlist. A separate monorepo package system adds no initial research value. Keep Playwright as a documented compatible consumer/peer dependency rather than bundling a second test runner. Select build/module output during the packaging task against actual consumer requirements and verify with a tarball install. Do not promise unsupported versions. Remove source patching, Git and GitHub automation from the library export graph. Fresh extraction avoids carrying unrelated private history; record origin and redistribution eligibility per component (INT-001, INT-004, INT-005).

### 2. Explicit wrapper, narrow failure gate, bounded state machine

The initial interface adapts string selectors for `click` and `fill` with a normal task descriptor and optional generic scope information. The test retains its inputs, navigation and assertions. Native setup/assertion locators continue to work outside the wrapper. A universal Locator proxy would obscure semantics and enlarge the compatibility burden.

Flow: **original action → classify error → collect bounded context → rank/select → validate selector → retry original action → record outcome or propagate failure**. A recovery event begins only for a supported zero-match failure. A current zero count is necessary but not by itself sufficient: malformed selectors, page closure, multiple matches and present-but-not-actionable failures must retain their own error path. Record the original action interval before invoking it.

Every attempt consumes a shared retry/time budget, including provider timeout. Output parsing accepts a constrained selector record, never executable model code. Candidate validation checks a unique match and action prerequisites. A successfully executed retry ends that recovery event; an independent oracle may subsequently identify a wrong effect, but must not feed corrective answers back into recovery. Preserve all earlier attempts and effects (HEAL-001 through HEAL-006).

### 3. Generic context with a separate oracle boundary

Use action-compatible candidates, accessible labels and nearby entity/container relationships, covering table rows, repeated cards and native dialogs through generic DOM relationships. Do not hardcode private route names, app CSS selectors, participant IDs, or mutation identifiers. Document ambiguous container fallback and context truncation.

The evaluator retains expected targets and outcomes out of band. Sanitize every context source, descriptor and fallback before it reaches ranking or provider serialization; test the actual payload with sentinel oracle markers. A generic raw-DOM fallback is not a permitted bypass. A legitimate task description can identify the intended entity, but cannot contain a correct replacement selector or evaluator answer. Store candidate inclusion/truncation metadata for separate coverage analysis (CTX-001 through CTX-004).

### 4. Common selection contract for full and ranker-only modes

Use one extraction/candidate contract, validator and attempt accounting. Full mode invokes the explicitly configured model; ranker-only selects through a documented deterministic ranking rule without a provider call. Both receive equivalent legitimate task information and no oracle. Freeze tie-breaking, thresholds, model ID, payload limits and stopping rules before final collection. Do not retune one method after inspecting final outcomes.

The initial provider adapter must validate configured values and expose actual usage or unknown usage, rather than silently substituting a model. [D18](../../../docs/decisions/2026-09-08-local-api.md) selects the initial reference profile: OpenAI Chat Completions, gpt-4o-mini, output cap 500, temperature 0, healing limit 3 and DOM-context characters 8000. The initial implementation now reads these values through an explicit allowlisted environment function and validates them before provider use. Total spending, request timeout, complete-payload limits and final experiment model/version are set before live collection; offline fake-provider responses support integration checks but cannot support model performance claims (INT-003, EVAL-003, DEMO-004).

### 5. Event records separate facts from interpretation

An event stores run/event/attempt IDs, original selector, action type, effective configuration without secrets, candidate references, validation result, retry result, timing and usage. Semantic outcome defaults to `unassessed`; the evaluator may add an independent outcome and wrong-effect records. A later success never erases an earlier wrong-target interaction.

Use per-run output directories with repeat lineage, not a cleanup function that overwrites previous evidence. Reports are generated from the event records, escape untrusted labels, omit raw context by default and support explicit local diagnostic capture. Normal field values and authentication material require omission/redaction; synthetic demo data does not justify unsafe library defaults.

Record internal healing latency separately from total recovery latency (original timeout through retry completion) and environment setup. Count failed model attempts in observed cost, label missing usage as unknown, and version the price assumptions. Cost per correct repair is undefined when the count of correct repairs is zero. Maintenance-task timing is a separate human-study measurement (OBS-001 through OBS-005).

### 6. Independent local demo and private-host adapter

Build a small synthetic application with profile fields and repeated entity actions/dialogs, retaining the mechanisms needed to demonstrate context-sensitive recovery without importing private business code. Deterministic reset and offline checks come first. The demo runner restricts target, redirects and application requests to declared loopback services; explicitly enabled server-side model calls are separate. A user-modifiable local guard does not secure a production server.

The real application's source/E2E suite stays private and consumes the prepared package through its own issue/PR. Its pilot will exercise normal controls, a recoverable profile field, an ambiguous entity action and an absent target. Use stable synthetic state and dates; mutations must break locator resolution without inadvertently changing intended business behavior. Local report/video sharing still requires artifact review. The synthetic demo reproduces the tool mechanism, not the full private-host results (DEMO-001 through DEMO-005).

### 7. Coverage-based evaluation with distinct endpoints

The five-case pilot checks instrumentation and feasibility. Keep development cases visibly labeled; select a final manifest separately and document any overlap or knowledge gained. The provisional final plan is 12 recoverable cases across four mutation patterns, four negatives and four normal controls. Each case records task intent, mutation, initial failure, ground truth, side-effect checks, reset, inclusion rationale and class. Replace or add cases for missing coverage before the freeze; no statistical sufficiency is assumed from 20.

Provisional collection is three repeats × 20 cases × two methods = 120 method executions, plus 20 no-healing sanity checks. Pristine/setup checks and repeats remain separately counted; they do not increase independent case count. Report clean semantic recovery, wrong effects on any attempt, correct refusal, normal-control regression, operational failures, latency and resource use with class-specific denominators. Report initial method-start failures and pre-start setup failures separately.

The preferred practical study is exploratory, provisionally six practitioners completing six distinct balanced tasks each. Manual and assisted conditions both end at a reviewed source-locator repair followed by a run with healing disabled; a negative case instead requires correct diagnosis and preserved failure. Counterbalance tasks/order, account for learning, define allowed auxiliary AI tools, and record active maintenance time separately from setup and runtime latency. Six participants are six participants, not 36 independent people. If recruitment or protocol quality is insufficient, document omission and narrow claims; do not label a self-run timing comparison as a practitioner study. Add context ablation only when asserting a causal context benefit (EVAL-001 through EVAL-007).

### 8. Auditable changes without overstating automation

Keep requirement/scenario IDs in specs, task references and planned evidence in the traceability register, and issue/PR links in each increment. CI validates structure and links. Behavioral verification and scientific review remain explicit work. Only the repository process is a current baseline at bootstrap; do not synchronize planned runtime specs into the baseline or archive this change just because all planning artifacts exist (AUD-001 through AUD-004).

## Risks / Trade-offs

- Unclear component redistribution rights → prepare a concrete origin inventory; hold affected code outside distribution or implement a clean equivalent. Technical genericity is not permission.
- Runtime-valid but wrong-entity selection → preserve semantic uncertainty, independently inspect outcomes and record all wrong effects; do not promise runtime semantic certainty.
- Context improvements also changing candidate coverage → document equal-information comparisons and use an ablation if the paper attributes improvement to context.
- Private-host results cannot be fully reproduced from the public demo → disclose the boundary and publish only permitted schemas, summaries and synthetic examples.
- Small controlled sample and exploratory participants → bound claims to observed cases/people, report distributions and failures, avoid broad significance/generalization claims.
- Budget exhaustion or provider outage → bounded fail-visible execution and unknown resource values where measurement is unavailable.
- One foundation change spans multiple implementation phases → follow-up issues specify subsets; keep the change open until its actual obligations are resolved. Split scope through a reviewed change update if needed.

## Migration Plan

1. Inventory eligible generic components and define the package contract; keep old repositories untouched.
2. Add packaging and a clean-consumer smoke check, then implement recovery/context/reporting with offline acceptance tests.
3. Build the independent local demo and prove confinement/reset behavior.
4. Integrate the package in the private host through its separate workflow; establish pristine controls and run the five-case pilot under an explicit live budget.
5. Review and freeze the final evaluation protocol; conduct the planned comparisons and feasible practitioner study, retaining all evidence.
6. Prepare the reviewed package, documentation and paper evidence; obtain owner approval for public release. Archive/sync only after implementation and scenario verification are complete or remaining scope has been explicitly superseded.

Rollback is removal/reversion of the wrapper integration or package version in the respective consumer; original test assertions remain intact. There is no production deployment or private database migration in this repository bootstrap.

## Open Questions

These are parameters or release decisions deferred to named tasks, not permission to start unbounded work: final tool branding/license; exact supported package/module/version matrix after a consumer check; final experiment model/version and live budget (initial profile selected in D18); final case manifest after the pilot; study participants and allowed auxiliary tools. Their owners and preparation requirements are in the decision register. A choice that materially changes the capability contract must update the specs before implementation.

## Initial implementation choices — D19

The package is ESM on Node 24/25 with consumer-owned Playwright 1.62.1/Chromium. New source implements the contracts without copying unresolved reference components. The wrapper accepts explicit string selectors and generates light-DOM structural CSS candidate paths, so iframe/shadow extraction and robust permanent selector synthesis are not claimed. Ranking is a documented lexical rule; native row/card/dialog labels preserve entity context. There is no raw-DOM fallback. Scope-specific metadata and assertions remain out of band.

Initial non-final limits: 1000 ms original/retry actions, 15000 ms recovery, 5000 ms provider, 30 candidates, 8000 candidate-JSON characters and 12000 complete-request characters. The provider is explicit; offline ranker-only is the default. Native HTTP uses Chat Completions without SDK transport retries. Reports distinguish adapter invocation from transport attempt and expose unknown resource measurements. Private-host semantic instrumentation still needs its own pilot evidence.

These choices refine the planned contracts, not the study's scientific claims or final parameter freeze. See [integration](../../../docs/integration.md) for the exact selection/measurement rules and [inventory](../../../docs/implementation/component-inventory.md) for component origin.
