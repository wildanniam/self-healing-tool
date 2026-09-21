# Self-healing tool working agreement

Reply to Wildan in Indonesian. Write specifications, code identifiers and project docs in English.

## Current state and reading order

This repository is at the specification stage. Read `README.md`, `docs/decisions/2026-09-07-foundation.md`, `docs/audit-workflow.md`, current `openspec/specs/`, and the active `build-self-healing-tool` proposal/specs/design/tasks before implementation. Read the relevant Atlas Vault project hub/latest decision note for research context when available.

Only the audit workflow is currently established. All runtime/demo/evaluation requirements and implementation tasks remain proposed until evidence is recorded. Do not infer implementation from an OpenSpec artifact marked done.

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
