# Self-healing tool working agreement

Reply to Wildan in Indonesian. Write specifications, code identifiers and project docs in English.

## Current state and reading order

Presentation checkpoint D32 (16 September): issue #23 replaces crowded case details with per-case/arm/repeat/attempt stage inspection. Read `docs/evidence/inspectable-report-2026-09-16.md` and `docs/presentation.md`. Exact provider bodies are checked against retained hashes. F-C01 is a native control: no AI invocation. Independent historical responses retain parsed proposals only; never synthesize raw responses. `--private-audit` or ignored local `privateAudit: true` authorizes local diagnostic inclusion only; generated HTML/JSON and explicit per-run downloads are private. Ordinary summary export strips private diagnostics. New replay/live demos capture request and returned text, explicitly labeled by evidence mode. No core-method change or paid study occurred.

Presentation checkpoint D31 (16 September): issue #21 adds `npm run demo` for retained A/B/C evidence and `npm run demo:walkthrough -- --step` for real browser actions with recorded model decisions. Read `docs/presentation.md` and `docs/evidence/presentation-demo-2026-09-16.md`. Always label replay; never count it as fresh model performance. Full private outcomes load from ignored local configuration; no private raw payloads enter committed assets. The optional live comparison creates a fresh ledger, requires explicit intent/key and is not run automatically. Core D30 results and publication boundaries below remain unchanged.

Latest checkpoint: D30 completed all 378 scoped evaluation slots on unchanged 0.0.8. Private C recovery 36/36; ordinary synthetic C30/36 with no wrong effects, while misleading-label stress still produces six wrong effects. Read `docs/evidence/scoped-evaluation-2026-09-15.md` first. Scope was frozen before this run after prior exploration; six new variants are from known mini applications, not independent-app validation. Preserve both freezes and closed ledger. Ordinary paraphrase remains a recorded limitation. Wildan authorized issue creation, branch pushes and draft PRs on 15 September 2026. Review is tracked in issue #19 and draft PR #20, with private companion Koderea issue #184 / draft PR #185. No merge, release, submission or new paid batch is authorized.

Latest checkpoint: D29 / 0.0.8 under issue #17 completed 144 known synthetic slots and 126 actual requests. C valid recovery stays 15/24; wrong effects rise 3→6 due to h2-05 ambiguity regression, while h2-03 owner loss is fixed. Read `docs/evidence/owner-evidence-evaluation-2026-09-14.md` first. Do not call this an overall improvement or replace D27 results. Preserve all 74 frozen inputs and closed ledgers. Keep exact attempt inputs separate from initial context; owner extraction must exclude sibling/nested borrowing and test asymmetric peer headings. The gate is lexical, not full OpenSpec semantics. Further input changes require a separate declared experiment; no merge/release/submission is authorized.

Latest checkpoint: D27 on 0.0.7 completed 324 known regression slots and 372 real provider requests. Private C recovery is 36/36 with no wrong effects; synthetic C recovery is 15/24 with three wrong effects. CTX-007-S2 has a nested-semantic-container counterexample; task 11.1 is reopened, so engineering/release are not complete. Read `docs/evidence/candidate-recovery-evaluation-2026-09-14.md` before the historical checkpoints below. Preserve frozen D27 inputs/results and the read-only final ledger; do not retune and rerun the same study as unseen evidence.


This repository has a verified library and an audited five-case private live pilot; D24 final evaluation completed all 120 slots; owner interpretation/release are pending. Package 0.0.3 remains the frozen measurement; 0.0.5 is a separate offline-verified thesis-method restoration after 0.0.4 reporting fixes. Do not rerun the fixed batch. Consult dated evidence and D24. Read `README.md`, `docs/decisions/2026-09-07-foundation.md`, `docs/audit-workflow.md`, current `openspec/specs/`, and the active `build-self-healing-tool` proposal/specs/design/tasks before implementation. Read the relevant Atlas Vault project hub/latest decision note for research context when available.

The audit workflow is established. Runtime/demo task completion is recorded only where acceptance evidence exists; use the register and dated evidence for exact coverage. Do not infer implementation from an OpenSpec artifact marked done.

## Issue-driven implementation

Classify work as trivial, standard or high-risk. Standard/high-risk work requires a real issue and a short feature branch; implementation increments reference the OpenSpec change, task numbers and requirement IDs. Make the smallest complete change, run relevant checks, commit, push and open a PR linked with `Closes #N`. Do not merge without Wildan's explicit approval. Use a draft PR for high-risk work when appropriate. Avoid direct meaningful changes on `main`.

## Specification and evidence rules

- Use the repository-local OpenSpec executable, pinned by `package-lock.json`; use `npm run check` for structure/traceability checks.
- Use Codex's generated local skills for propose/update/apply/sync/archive. Keep global OpenSpec settings and legacy prompts outside this repo untouched.
- Change the proposal/spec/design before implementing material scope changes. Preserve stable requirement/scenario/task IDs and record supersession.
- Keep `docs/traceability.json` current. For completed tasks or implemented/verified requirements, add genuine implementation/verification evidence, including commands, environment and results where applicable.
- CI validates structure and links; also run relevant behavioral checks. Never present a stub, offline mock, pilot or historical result as new empirical model performance.
- Do not archive incomplete work or synchronize planned runtime requirements into the current baseline merely to make status look complete.
- Update meaningful decisions/progress in Atlas Vault and cross-link the repository checkpoint. Preserve prior rationale; resolve conflicting notes explicitly.

## Boundaries

Initial runtime scope is explicit click/fill wrappers, bounded locator recovery and inspectable reports. Test intent and assertions belong to the consumer. Do not add autonomous test rewriting, commits/PRs, production targeting, or a SaaS without an explicit scope change.

The private evaluation host, business source, tests, account state and raw evidence stay in their own repository/environment. Use independent synthetic fixtures here. Component portability does not establish distribution rights. Do not copy old repository history or restricted experiment artifacts. Hold uncertain components outside release pending a concrete decision.

Private-host edits follow that repository's own instructions and issue/PR workflow. Live API spending, participant contact, public release and submission need the applicable owner authorization; prepare the concrete materials first and honor any authorization already given. This setup does not authorize those actions.

Do not commit credentials, raw sensitive context or browser sessions. The eventual demo must run against declared localhost services. The generic library's integration contract is distinct from the supplied demo runner's local-target restrictions.

## Runtime development commands and boundaries

Use `npm run typecheck`, `npm run test:unit`, `npm run test:browser`, `npm run test:consumer`, `npm run check` and `npm run test:audit` for relevant increments. `npm run demo:offline` is a synthetic ranker-only walkthrough. All these commands avoid reading `.env` or making paid requests. Do not run `demo:live` without the applicable live-run budget authorization. Preserve an existing `.env` and never print it.

The package currently uses ESM, Node 24/25, Playwright 1.62.1 and Chromium. Keep provider/session configuration consistent, context allowlisted, emitted model output as data only, assessments out of selection inputs, and browser retries within budget. Distribution is allowlisted and private until owner review. See `docs/integration.md` and the component inventory.

Provider/transport/budget failure terminates an event; parse/validation retries remain bounded. Keep the halted D21 pilot ledger and unknown usage intact. D22 permits the specified private pilot UI disclosure; D23 authorizes autonomous engineering to a concrete final-protocol review package. Neither needs repeated permission for the same scope. Final collection follows the separate reviewed protocol/budget.

D24 accepts the 20-condition protocol, paired three-repeat comparison and one US$2/144-request final batch including the acknowledged old reservation. Consult docs/decisions/2026-09-09-final-evaluation.md; do not request the same approval again, reset the old ledger or automatically create additional paid batches. Retain frozen results before later engineering increments.

D25 corrects unproven method simplification. Before claiming a thesis-method migration or running a new study, maintain docs/implementation/thesis-method-alignment.md with component-level parity, explicit deviations, source fingerprints and verification. Portability/privacy refactoring does not authorize silently changing research signals, weights, prompt context or retry semantics. Never call offline regression passes improved empirical effectiveness. Preserve D24 and audit the changed payload contract before private live use.


D26 explicitly authorizes the four-stage spec-aware method evaluation: restored 0.0.5 regression, generic contract prototype, matched A/B/C comparison, and independent frozen holdout. See `docs/decisions/2026-09-14-spec-aware-evaluation.md`. The fresh study ledger is bounded at US$2 / 980 requests and is separate from historical ledgers. Preserve all outcomes and unknown usage. Never tune the method after held-out outcomes are revealed or describe the lexical gate as a semantic correctness guarantee. Keep private application contracts and raw runs in the private host; only independent synthetic fixtures belong in this repository.

D26 collection is complete: 180 known private slots and 144 synthetic holdout slots, with all 516 actual provider requests settled. See `docs/evidence/spec-aware-evaluation-2026-09-14.md`. Retained ledgers are closed study evidence, not authority for further calls. A later change must preserve these outcomes and use fresh independent tasks for transfer claims. Spec context also adds DOM observations, so do not attribute A/B differences exclusively to specification prose.

D27 (docs/decisions/2026-09-14-candidate-recovery.md) explicitly authorizes the diagnosed candidate/locator fixes and a fresh bounded regression rerun under issue15. Preserve D26; all A/B/C arms use the corrected declared core. Reused synthetic tasks are known regression evidence. Run offline checks before freeze/live collection; no release or merge is included.
