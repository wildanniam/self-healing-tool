# Foundation decisions — 2026-09-07

Source: Wildan's thesis-to-tool-demonstration discussion and explicit request to create a new repository using OpenSpec for auditable requirements and process. This is a sanitized engineering record. The private Atlas Vault retains research context and discussion history. No restricted source, raw experiment artifacts, or business records are reproduced here.

These decisions establish direction, not implemented behavior or measured results. A later decision must identify what it supersedes and why; do not silently rewrite the historical rationale.

### D01 — Tool Demonstration paper
Target APSEC 2026 Tool Demonstration. A runnable, understandable tool and evidence of practical use guide the scope; acceptance is not guaranteed.

### D02 — Keep the research topic
Keep locator self-healing for existing Playwright tests. Combining an LLM and ranking alone is not claimed as a new research contribution.

### D03 — New evaluation object
Use the owner's separate real application as the practical evaluation object. Its source and evaluation suite belong in their private repository.

### D04 — Local synthetic evaluation
Evaluate a local instance with synthetic identities and state, without targeting production.

### D05 — Planned distributable artifact
Prepare a reusable library and an independent synthetic localhost demo. Public distribution is a later, explicit release action.

### D06 — Private application boundary
Do not distribute the private application's source, business logic, E2E suite, sessions, or credentials with the tool.

### D07 — Reusability is not universal effectiveness
An installable interface supports reuse. It does not establish measured effectiveness across arbitrary applications.

### D08 — Bounded practical validation
The initial paper has a scoped practical evaluation. Cross-application generalization is future work unless scope and evidence are expanded.

### D09 — Semantic outcome matters
Retain controlled E2E tests and independently assess task correctness. Locator acceptance, action completion, and semantic success are distinct.

### D10 — Pilot before freeze
Use five development cases to validate integration, mutation, reset, oracle, and instrumentation before the final protocol is frozen.

### D11 — Provisional final coverage
Start planning with 20 cases: 12 recoverable, four negatives, four normal controls. Adjust for coverage before final collection. Neither 20 cases nor three proposed repetitions establishes statistical sufficiency.

### D12 — Practical maintenance comparison
Prioritize an exploratory manual-versus-assisted practitioner study if feasible. Both conditions must reach a comparable maintenance endpoint; participant availability and final procedure are not yet settled.

### D13 — Technical supporting comparison
Keep ranker-only as a supporting comparison for the incremental role of the model. Add a context ablation if causal context benefits are claimed; a state-of-the-art superiority claim requires relevant external comparators.

### D14 — No reuse of restricted historical evidence
The earlier partner's restriction includes identity, data, and artifacts. An anonymous label does not authorize reuse. Component redistribution rights must be checked separately from technical portability.

### D15 — Claims follow complete evidence
Retain unsuccessful runs, wrong effects, costs, and reproducibility limits. Report new evidence as new, historical evidence as historical, and proposed numbers as plans.

### D16 — Preserve decision memory
Record meaningful decisions and progress in Atlas Vault proactively. The repository is authoritative for versioned engineering requirements, changes, tasks, and code evidence; Atlas Vault preserves rationale and research continuity. Cross-link updates and resolve conflicts explicitly.

### D17 — Adopt OpenSpec and issue-driven audit
**New owner instruction in this request:** create a separate repository and use OpenSpec so requirements and the development process can be audited. The authorized output is repository setup and specifications. Each implementation increment will link decisions, requirements, scenarios, tasks, issue/PR, and verification evidence. OpenSpec validation checks document structure, not software correctness.

## Working assumptions made for this setup

- Repository working name: `self-healing-tool`; final tool/paper branding remains open.
- Repository starts private. This does not supersede D05's planned public artifact.
- Repository artifacts are English; discussion with Wildan is Indonesian.
- Repository-local OpenSpec is pinned to `1.12.0` with a lockfile; the existing global installation is left unchanged.
- Use the default `spec-driven` workflow, one foundation runtime change, and Codex skills. No separate spec store, custom schema, hosted audit service, or new paid infrastructure is needed.
- Repository setup is tracked by [issue #1](https://github.com/wildanniam/self-healing-tool/issues/1). The unchecked runtime/research tasks are future work, not deliverables claimed by that issue.

## Decisions still required at their relevant milestones

| Decision | Owner | Evidence prepared first |
|---|---|---|
| Distribution eligibility and eventual license | Wildan | Concrete component and package inventory; uncertain components held out |
| Initial API settings selected in D18; final model/version, time/payload limits and API budget remain open | Wildan with engineering recommendation | See [the dated refinement](2026-09-08-local-api.md); pilot configuration and cost estimate before paid final runs |
| Final case coverage and protocol | Wildan / academic supervisor | Pilot findings, manifest, oracle checks and analysis rules |
| Practitioner availability, permitted assistants and protocol | Wildan | Comparable tasks, instructions, timing rules and data handling plan |
| Public release / paper submission | Wildan / coauthors | Reviewable package, evidence, limitations, and final text |

## Sources

- [OpenSpec documentation](https://openspec.dev/docs/setup)
- [OpenSpec project configuration](https://openspec.dev/docs/project-config)
- [APSEC Tool Demonstration call](https://conf.researchr.org/track/apsec-2026/apsec-2026-tool-demonstration)
- Owner-approved discussion dated 2026-09-07, captured in the private Atlas Vault decision lock. This source is intentionally not copied as an application artifact or claimed to be publicly accessible.

### D35 — Packaged bilingual action inspection (20 September 2026)

The owner authorizes issue #29: implement shared per-action evidence inspection for library and research reports, English/Indonesian UI and concise layout. Capture actual request/returned output prospectively via an explicit local audit option. Preserve ordinary safe projections and missing historical evidence. Share presentation components in the package; study aggregates remain separate. No recovery-method, research-data, manuscript, paid-run, merge or release change. Paper will describe final capabilities only, without migration history. This supersedes D34’s prohibition on optional rich library reports, not the safe default or private-evidence boundaries.
