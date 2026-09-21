# Auditing a change

The audit chain is **decision → requirement → acceptance scenario → implementation task → issue/PR → verification evidence**. OpenSpec supplies the change lifecycle; Git records revisions; the project traceability register makes missing links detectable.

## Sources of truth

- [Decision register](decisions/2026-09-07-foundation.md): rationale, scope, assumptions, owners and supersession.
- `openspec/specs/`: current specifications. At bootstrap this contains only the repository audit workflow, not the planned runtime.
- `openspec/changes/build-self-healing-tool/`: proposed runtime/evaluation behavior, design and unchecked tasks.
- [Traceability register](traceability.json): stable requirement/scenario IDs, decisions, task references, planned verification and actual evidence links.
- Atlas Vault: durable discussion/research context and checkpoints linking back here. Resolve conflicts with a dated decision, then update both representations.

## Working sequence

1. Read `AGENTS.md`, current specs, active change, and relevant decisions. Reuse or create an issue for the concrete increment and branch from the appropriate reviewed base.
2. Update the change before implementing a material requirement or scope change. Use `$openspec-propose` for a new change and `$openspec-update-change` for a revised one. Keep stable requirement IDs; document removals or supersession rather than losing history.
3. Use `$openspec-apply-change` to implement the named subset of tasks after implementation is requested. Do not interpret an implementation-ready proposal as authorization to run paid experiments, contact participants, publish, or merge.
4. Add implementation and acceptance evidence as work completes. Reference the task, scenario IDs, command, environment, result, and retained artifact or CI run. Private-host evidence stays private; record an appropriately scoped reference and access limitation here.
5. Run `npm run check` plus the behavioral checks relevant to the changed capability. Create a PR with the issue, affected requirements/tasks, verification and risks. Mark tasks complete only with evidence; owner approval is required to merge.
6. After implementation and review, synchronize deltas and archive using the OpenSpec workflow. Before `$openspec-archive-change`, verify every affected requirement and remaining task. Do not archive this foundation change during specification setup.
7. Record meaningful decisions, corrections and completed milestones in Atlas Vault. Do not store credentials or raw private artifacts in either documentation system.

## Status semantics

| Status | Meaning |
|---|---|
| `established` | Repository process baseline exists; human compliance still requires review |
| `planned` | Requirement and planned checks exist; no implementation claim |
| `implemented` | Implementation is present and linked, but acceptance verification is incomplete |
| `verified` | Recorded acceptance evidence covers every scenario for the declared environment |

`openspec status` reports artifact readiness, not feature completion. Checked task boxes alone do not prove correctness. The traceability checker rejects malformed/missing links and unsupported completion records, but cannot determine whether a test oracle is scientifically valid or a human actually followed the workflow.

## What is automatically checked

- OpenSpec structure for the baseline and active changes.
- Registered requirement and scenario coverage, decision IDs, task links, owner and planned verification.
- Evidence record structure and completion consistency; local evidence file references must exist.
- Relative Markdown file links in authored project documentation.

CI runs these checks on pushes and pull requests. Branch protection and mandatory reviewer policies are **not configured by this setup**; CI is an observable check, not a guarantee that GitHub prevents bypass. Review quality, source rights, experiment fairness, private evidence access, and public release eligibility require substantive review.

## Evidence record format

Each requirement's `evidence` array may contain records with `id`, `kind` (`implementation` or `verification`), `ref` (repository path or accessible HTTPS reference), `summary`, and `scenarios` (IDs covered). Add `command`, `environment`, `result`, and `date` for verification records. A `verified` requirement needs passing verification records covering all its scenarios. Evidence links can record a failure without supporting verification. Record private-access limitations in the summary; never fabricate a public reproduction.

For completed tasks, use `completedTasks` in the register with a record `{ "task": "1.1", "evidence": ["EV-..."] }`. Evidence may support several related requirements/tasks; keep its ID and metadata consistent. Uncompleted tasks remain unchecked. The initial traceability register has no runtime evidence or completed implementation tasks.

## Changing or archiving the foundation

Preserve the traceability file and task/evidence history when archiving. Update `change` and spec paths to the archived change or current baseline as appropriate, and keep archived tasks readable. The checker resolves both active and archived changes. New capabilities and changes must be registered; unrelated future changes can introduce separate registers/checker support in their own reviewed increment. Do not disable checks to hide missing history.

## Tooling

Use `npm ci --ignore-scripts` and repository scripts, which resolve the pinned OpenSpec version. For direct commands, use `./node_modules/.bin/openspec`. Set `OPENSPEC_TELEMETRY=0` and `OPENSPEC_NO_UPDATE_CHECK=1` when checking offline/CI. The generated `.agents/skills/` provide Codex integration. Global OpenSpec settings, skills and legacy prompts are outside this repository's ownership.

Reference: [official CLI guide](https://openspec.dev/docs/cli). OpenSpec is not an experiment runner, immutable evidence ledger, or substitute for review.
