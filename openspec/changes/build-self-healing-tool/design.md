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

Every attempt consumes a shared retry/time budget, including provider timeout. A provider/transport/budget exception terminates the current recovery event with `provider-failure` (or `time-limit` if the global deadline expired); candidate-repair attempts do not retry an unavailable or unreconciled provider. Parse and selector-validation failures may still use remaining attempts. The deadline race may finish before adapter cancellation accounting; retain unknown dispatch/usage in that event and consult the separate ledger during the run audit, without inventing usage or accepting a late output. Output parsing accepts a constrained selector record, never executable model code. Candidate validation checks a unique match and action prerequisites. A successfully executed retry ends that recovery event; an independent oracle may subsequently identify a wrong effect, but must not feed corrective answers back into recovery. Preserve all earlier attempts and effects (HEAL-001 through HEAL-006).

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

The five-case pilot checks instrumentation and feasibility. Keep development cases visibly labeled; select a final manifest separately and document any overlap or knowledge gained. D24 accepts 12 recoverable conditions (three mutation families across four workflows), four absent-target negatives and four normal controls. Each case records task intent, mutation, initial failure, ground truth, side-effect checks, reset, inclusion rationale and class. Replace or add cases for missing coverage before the freeze; no statistical sufficiency is assumed from 20.

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


## Authorized live pilot refinement — D20/D21

D20 accepts the five prepared development cases. D21 authorizes one batch capped at US$0.25 and fifteen requests across the demo (six) and private pilot (nine). Implement an opt-in persisted budget ledger alongside the provider: reserve before dispatch under an exclusive file lock, retain request/phase/cost reservations across provider instances/processes, never overwrite an existing ledger, and stop on unresolved usage. Record price assumptions; estimate conservatively from serialized-request UTF-8 bytes plus message-framing allowance and maximum output, without claiming a provider-side account spending limit.

Private evaluation records actual serialized candidate inputs locally after checking sentinel/secret exclusion; expected targets and observed side effects remain in evaluator memory/records. Observe input/dialog effects throughout attempts, retaining intermediate wrong effects even if the final action succeeds. Controls still use native assertions. Method failure/refusal is a recorded research outcome, not a reason to suppress later cases or rerun until success. This refines bounded spending/reporting and task 5.4/6.3 execution; it does not change candidate selection or freeze the final protocol.

## D24 approved collection

[Decision D24](../../../docs/decisions/2026-09-09-final-evaluation.md) accepts the final review package. Freeze exact runner/manifest/source hashes and seeded paired schedule before collection. The final batch reserves the acknowledged old unknown-usage reservation within the US$2 envelope; no reset or automatic top-up. On live-ledger halt, remaining full slots stay unstarted while independent ranker-only slots can proceed. Per-slot setup, method action, all wrong effects, final semantic oracle and operational failure are separate records. Offline rehearsal may validate these boundaries without viewing method-selection outcomes on the final suite. Later engineering versions never overwrite frozen results.

## Post-collection model provenance — D24 engineering refinement

After the frozen batch, version 0.0.4 adds optional provider metadata: returned model identifier and finish reason. Requested model remains in effective config. Only bounded model identifiers with a model-family prefix and enumerated finish reasons are retained; unknown/missing metadata is explicit null. No response text, headers, credentials or arbitrary provider fields are copied. Capture metadata before selector parsing and on a parsed response with missing output; transport errors and timeouts remain unknown. Runtime snapshots and the report projection normalize metadata again. Custom providers without metadata remain supported.

This improves auditability, not repeatability guarantees or semantic selection. Do not backfill version 0.0.3 records or replace its private tarball. Offline adapter, runtime, report and consumer checks verify this increment; no new paid measurement is authorized by implementing it.

Final records also attach both attempt and event assessments to one wrong action. The old `wrongEffects` summary counted assessment rows, doubling a single observed wrong action. In 0.0.4 define `wrongEffects` explicitly as distinct affected events; additionally expose distinct assessed wrong attempts and raw wrong-assessment count. Preserve the raw assessments. Private final analysis already counts one boolean per slot and is unaffected. Offline regression must retain an earlier wrong assessment after a later correct one. This is a reporting correction, not changed empirical selection.

## D25 supersedes simplified context/selection choices for 0.0.5

Use the thesis additive ranking components for click/fill: old-selector overlap 15, step overlap 10, tag 5, role 8, stable attributes 2–6, visibility +3/hidden -20/disabled -20, duplicate penalty capped 20 with generic-icon penalty 30, exact identity 25–50, text 8/6 plus 12, row 8/12, parent 5/5, container step 8. Task scope is folded into step meaning. Extract sanitized attributes/text and generic row/parent/container context. Retain action-compatible controls; this pre-filter replaces the prototype's broader framework-specific scan and is declared as a deviation. Hidden/disabled candidates may be ranked but cannot pass runtime checks.

Prefer id, test attributes, name, ARIA, placeholder, text and class selectors, including scoped variants where a generic semantic container identifies an entity. No positional selector is generated. The model receives sanitized old selector and failure classification plus candidate features. Runtime may normalize supported text/CSS/XPath forms; each variant requires one visible/enabled compatible live target. Model-generated program code remains forbidden. Rejected variants/counts/reasons feed the next bounded request, without oracle data. Record original proposal and each validation, not only accepted output.

Clean a DOM clone by removing noise/evaluator subtrees, values and non-allowlisted attributes, then apply text redaction. If the retained candidate list is 1–4 use a cleaned supplement capped at half DOM budget; if empty use bounded cleaned fallback. Sanitize before ranking and fallback, never after selection alone. Enforce combined candidate+HTML context and whole serialized request limits on every retry: trim supplement first, then low-ranked candidates; if essential failure/feedback cannot fit, fail visibly. Keep initial context as initial input and record per-attempt coverage/hash separately. Coverage does not prove target inclusion.

No bit-for-bit or performance-parity claim: strong privacy filtering, action pre-filter, generic containers, strict parser, finite normalization, transport fail-stop and supported wrappers are explicit differences. A later ablation is needed to attribute D24 errors to a particular removed component.

D25 restores bounded full-mode retries after a null selection, as in the thesis. A null is not a provider exception; repeated nulls end as abstention, transport failures remain fail-stop.


## D26 optional target-spec contracts

The target contract is a bounded, data-only record linked to a Markdown requirement: schemaVersion=1, requirementId, revision, intent, action(click/fill), status(active/retired/unknown), and allOf evidence clauses. Each clause specifies an allowlisted set of observable feature names and acceptable phrases (anyOf). Every clause must have positive evidence; unmatched/ambiguous evidence yields unknown, not proof of a deleted feature. Retired contracts stop recovery; revision mismatch is unknown. No arbitrary predicates, JS, mutation IDs, expected outcomes or repair selectors are accepted. The loader reads an explicit consumer-owned file and extracts a fenced self-healing-contract block; it does not crawl application source or execute instructions. This is a manual adapter contract, not an assertion that standard OpenSpec supplies executable semantics.

Options targetSpec={mode:context|enforce, contract:TargetContract|null, expectedRevision:string}. Context and enforce receive the same sanitized spec/evidence data and same conditional instruction. No-contract sessions preserve 0.0.5 prompts and context. Existing clean/rank signals remain unchanged. Optional spec mode adds observable href/form action where available to both B/C; the gate rechecks the resolved element and records evidence before invoking recovery. Policy is generic phrase/token matching over declared UI features; it is deliberately conservative and is not semantic-proof or a novel LLM reasoning claim. Identity terms are fixed before UI mutation. No certificate/account special cases exist in library code.

After original locator failure: collect context, attach applicable spec, select normally, validate browser actionability, then (enforce only) apply all evidence clauses to the same resolved element. Refusal/unknown is terminal for semantic admission, never retried until the model guesses. Report candidate proposal, gate decision, action and independent outcome separately. Native original success remains outside recovery-only scope.

A=core without spec, B=spec context only, C=same spec data with gate. Live budget and full schedule are recorded in D26. Independent evaluators never pass true target/new selector/verdict into runtime input. Existing private application fixtures stay in their own repo/worktree. Holdout authors may inspect the public contract schema but do not tune engine or observe live outcomes before freeze.

## D27 supersedes defective candidate mechanics in 0.0.7

Use the actual rendered DOM to exclude hidden/unavailable click/fill candidates, including closed-dialog descendants and hidden inputs, before ranking. Keep offscreen scrollable controls and legitimate accessible labels. Clean hidden context and fallback from the live DOM, preserving local semantic group identity across wrappers (label/form/fieldset/legend/nav/dialog/row/card) without mixing neighboring entities or consulting evaluator attributes.

Generate non-positional interactive-host locators that support nested text. Check proposed suggestions with the Playwright selector engine and verify they resolve uniquely to their originating node. A candidate without a verified unique locator must not be advertised as a verified locator; retain an explicit audit count for this loss. Identity verification is not semantic proof; original runtime validation and optional spec admission still precede every recovery action.

Ranking uses unique meaningful locator tokens, avoids multiplying structural tag matches, preserves local semantic identity across wrappers, and does not penalize a unique stable control just because a class is common. Distinct entity nodes remain distinct. Compact provider candidate projection retains useful action/identity/scope/selector data while removing empty/redundant fields. The same projection defines candidate character budgeting; the whole serialized request remains capped. Canonical context/evaluator snapshots retain candidate identity and honest stage/omission metadata. B/C share exact inputs within the corrected version; A uses this same corrected core without spec.

Normalize explicit no-selection strings as abstention rather than trying a selector named null, without executing arbitrary output or concealing model attempts. Configuration/model/attempt limits and independent assertions remain unchanged. Test generic layouts before live use; preserve every prior dataset and report before/after results with separate denominators and failures. Reused D26 synthetic tasks are now regression tasks, not a fresh unseen holdout. Record source/package/config/protocol hashes before collection and audit them afterward. All live calls share one fresh D27 $2/980-request ledger; no historic ledger is reset. The latest owner request is authorization for this bounded rerun.

## D29 owner evidence and no-selection policy (0.0.8)

Separate flat `localActionContext`, `ownerContext`, `ownerStatus` (identified/missing/ambiguous), and bounded `ownerSources` provenance. Legacy container/containerContext/rowContext carry owner identity rather than subtree prose. Derive explicit identity from accessible name, own heading/legend or owned row header/identity cell, excluding nested entity/control text. Unnamed generic semantic wrappers are transparent. Nearest strong structural or repeated-card owner is bounded; missing nested owners block borrowing. Named generic boundaries competing with another named owner are explicitly ambiguous. No task/contract-dependent traversal or identity vocabulary. This policy intentionally has limits for semantically indistinguishable markup.

Preserve the initial event context. Each attempt retains `inputContext`, exact serialized `inputSha256` and coverage. After parsed null and with remaining budgets, refresh context once; compare hashes of compact selection input excluding only accounting coverage and validator feedback. Unchanged evidence stops, changed evidence permits one next provider attempt, and second null stops. Invalid-output/selector feedback retry remains bounded as before. Provider exception/spec refusal remain terminal. `observationRefresh` records policy, changed/unchanged/failed/time-limit, duration, hashes and sanitized local diagnostic context. Normal reports expose summary only; all context copies are re-redacted for later known fill values. This supersedes D25 null retry only for the new version.

New regression uses exact frozen D26/D27 synthetic task/contract/oracle files. Version the changed representation; do not infer causal effect of one bundled component from aggregate model outcomes. Native and forced-selector checks distinguish admission mechanics from model choice. Fresh ledger and per-attempt actual payload retention are required before live dispatch. No private-host rerun in this increment; no new unseen holdout claim.

D29 pre-freeze independent correction: same-tag structural peer families also qualify when at least two members have their own controls and at least one has its own heading. This preserves a headed peer when another loses its heading, and makes that missing peer an owner barrier. Title-only siblings and controls owned by nested semantic entities do not establish this family. No task vocabulary participates.

## D30 evaluation design

Use the unchanged D29 core. Scope stratification is declared after exploration and before new outcomes. Preserve 20 private and 16 synthetic conditions, add six prespecified ordinary variants, and retain all business-effect oracles. Use [the D30 protocol](../../../docs/evaluation/scoped-d30-protocol.md) for native checks, freeze, one central capped ledger, per-attempt records and diagnosis. No semantic-gate redesign, fixture answer leakage, contract relaxation or retuning during collection.


## D31 presentation workflow (issue #21)

Wildan requests a presentation-ready A/B/C report and simple commands for the supervisor demo. Add an offline, standalone comparison generated from retained D30 evidence, plus a separate headed walkthrough on the existing independent fixtures. Read historical archives without mutation. Normalize only allowlisted results; never commit private-host raw context. Keep all categories and failures visible, with per-condition detail and actual usage when known. Distinguish historical model evidence, replayed model decisions, and fresh API calls. Default commands do not read credentials or spend API budget. Replay invokes the real current runtime with stored proposals but is not new model-performance evidence. Optional live demonstration creates a separate bounded ledger and is never started implicitly. No changes to core healing, old freezes, or approved study scores.

The report is a self-contained HTML file with embedded sanitized JSON, no CDN or remote scripts. A projector-friendly editorial layout uses navy/teal and plain Indonesian explanations, clear A/B/C definitions, category comparisons, a searchable condition table, paired details and download/print actions. Report generation and walkthrough write to new output directories. Private inputs are selected through an ignored local configuration or CLI arguments; absence is explicit and never substituted with manufactured results.


## D32 inspectable execution report (issue #23)

The owner requests a stage-by-stage audit of each case, A/B/C arm, repetition and attempt. Replace the crowded three-column modal with a spacious single-run inspector: outcome summary, arm/repeat/attempt selectors, stage navigation, readable evidence and expandable exact data. Show original action, observed context/coverage/ranking, actual request messages, available response, basic validation, requirement admission and independent effects. Controls must explicitly show that no AI or recovery stage ran. Distinguish exact retained requests, parsed proposals, replay outputs and unavailable raw material; never fabricate before-clean DOM, scoring components, provider explanations or hidden reasoning.

Retained source adapters and future demonstration capture supply audit data without changing the healing core. The owner's explicit local private-audit option may expose retained diagnostic evidence in an ignored local report; no private audit payload is committed, and ordinary exports exclude it. Only allowlisted request-body/configuration and diagnostic fields are admitted; no headers, environment files or sessions are copied. Escape evidence, verify request hashes, retain all categories and source fingerprints. Read archived outputs without modification and do not issue paid calls. This refines D31 inspection UX; its prior report and research evidence remain historical.


## D34 results-first reports (issue #27)

Implement the owner-approved four-group inspection hierarchy and separate D33/RM1 and D30/RM2 views. Read archived ranking records through a separate adapter. Lead run reports with outcomes and paired per-attempt evidence; keep sources and raw data collapsed, unavailable evidence explicit, and generic library projections private by default. Preserve exact source identities, denominators, historical outcomes and mode labels. Filters govern exports. No recovery-method changes or paid calls. See DESIGN.md and docs/decisions/2026-09-18-report-simplification.md; OBS-011 and tasks16.1–16.3.

## D35 — Shared action inspector

Use an explicit session audit option. Capture the adapter’s actual request body at dispatch and returned output at settlement, with event/attempt identity; retain it outside ordinary snapshots. The snapshot used for local audit applies omissions and labels any redaction, preserving original hashes without asserting altered bytes are exact. Custom providers lacking capture support remain unavailable. Capture is bounded and never passes secrets/headers/HTTP envelopes to the report. Audit errors cannot change selection. No pre-cleansing raw DOM is promised by this increment.

Package the shared browser inspector and language resources in dist. A library report maps each event to an action row; no arm, repetition or study controls are shown. Presentation rows retain their original identity and study controls. Both use the same four-stage renderer. English is default; switching UI language retains selection and does not translate evidence. Summaries and safe JSON stay payload-free. Local diagnostic HTML/downloads require explicit supplied audit; files are isolated with restrictive permissions.

## D33 ranking intervention and experiment audit

Follow the [RM1 protocol](../../../docs/evaluation/rm1-dom-ranking-protocol.md). Optional experiment config selects lexical Jaccard, thesis without relational scoring, or full thesis ranking before top-k/budget on initial and refreshed observations. All use a score-free projection for both metering and wire payload; duplicate and relational fields stay common. An observational deep-cloned audit callback exposes sanitized pre-rank/ranked/final contexts and stage timing without feeding evaluator truth into selection. Native effects and target-node mapping stay in the harness. Freeze inputs before the main study and reconcile all requests and slots. Default library behavior remains compatible; this experiment does not establish generalization.

## D33 continuation design

Companion files under `evaluation/rm1/continuation/` preserve the original experiment sources and output. Hash-anchor old trial/ledger/diagnostic evidence, add explicit verified Vanie routing without changing serialized prompts, and freeze the companion implementation/amendment. Reserve both prior allowances and enforce349new requests / USD2.99816535 (pilot25/main324). The first pilot retry has a unique trial ID and original-payload parity; the other8 and main108 were not started previously. Retain actualTotalCostUsd:null for the historical unknown; any new unknown halts. Pilot acceptance is integrity, not effectiveness. See [amendment](../../../docs/evaluation/rm1-continuation-protocol.md).


## D36 Playwright consumer reporting (issue #33)

Add optional `self-healing-tool/playwright` fixture and `self-healing-tool/reporter` exports. The fixture writes local action reports during teardown, with explicit audit opt-in and attachments; write/attachment failures are diagnostics and never replace the primary test error. The reporter collects final Playwright statuses and per-project/retry identities into one standalone suite index. Preserve immutable per-run directories; optional browser opening occurs once after the run and is disabled in CI. Index status is authoritative after all teardown; action execution and independent correctness remain separate. An action summary leads with original completion, executed recovery, stopped and failed counts. Ship a runnable local consumer example and current full-mode instructions. No recovery algorithm, historical evidence or paid collection changes.


## D37 public distribution boundary

The public GitHub artifact includes reviewed source/tests/examples, synthetic research evidence and provenance. The0.1.0 package remains allowlisted and private:true to prevent unintended npm publication; MIT applies to project-authored software. Generated agent skills leave the current tree, with historical attribution retained. Audit both tracked history and GitHub-visible records before changing visibility. Library algorithms and measured results remain unchanged. See docs/decisions/2026-09-21-public-release.md.
