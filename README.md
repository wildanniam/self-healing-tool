# Self-healing tool

A planned reusable Playwright locator-recovery library with an independent synthetic local demo, prepared for a scoped software-engineering tool demonstration study.

**Status: OpenSpec foundation prepared; runtime, demo and experiments are not implemented here yet.** This repository starts private. The working name is provisional; package licensing/public release remain later decisions. No private evaluation-application source or E2E suite is distributed here.

## Start here

1. [Proposal](openspec/changes/build-self-healing-tool/proposal.md) — what the tool will do and why.
2. [Design](openspec/changes/build-self-healing-tool/design.md) — boundaries, recovery flow, alternatives and evaluation design.
3. [Implementation tasks](openspec/changes/build-self-healing-tool/tasks.md) — ordered work with owner, requirement IDs and completion evidence.
4. [Decision register](docs/decisions/2026-09-07-foundation.md) — agreed direction, assumptions and pending decisions.
5. [Audit workflow](docs/audit-workflow.md) and [traceability register](docs/traceability.json) — how changes and evidence are linked.
6. [Verification plan](docs/verification-plan.md) and [bootstrap evidence](docs/evidence/openspec-bootstrap.md) — planned behavioral checks versus checks actually performed.

## Check the specification workspace

Install Node.js 24 (recommended for this workspace) and npm. OpenSpec `1.12.0` is an exact development dependency and requires Node.js at least `20.19.0`; this does not declare the future library's compatibility range.

```sh
npm ci --ignore-scripts
export OPENSPEC_TELEMETRY=0
export OPENSPEC_NO_UPDATE_CHECK=1
npm run check
./node_modules/.bin/openspec status --change build-self-healing-tool
```

The checks validate OpenSpec structure and traceability, not recovery effectiveness. There is no runnable healing/demo command yet and no model credential is required for this setup.

## Local API configuration

A blank-key environment template and [local setup guide](docs/local-api-setup.md) now document the owner-selected reference settings. Fill `OPENAI_API_KEY` only in your ignored local `.env`; preserve any existing file. Runtime loading and API calls are not implemented yet.

## Specification map

| Capability | Requirement prefix | Status |
|---|---|---|
| [Audit workflow](openspec/specs/audit-workflow/spec.md) | AUD | Repository process baseline |
| [Library integration](openspec/changes/build-self-healing-tool/specs/library-integration/spec.md) | INT | Planned |
| [Runtime recovery](openspec/changes/build-self-healing-tool/specs/runtime-recovery/spec.md) | HEAL | Planned |
| [Context selection](openspec/changes/build-self-healing-tool/specs/context-selection/spec.md) | CTX | Planned |
| [Recovery reporting](openspec/changes/build-self-healing-tool/specs/recovery-reporting/spec.md) | OBS | Planned |
| [Local demo](openspec/changes/build-self-healing-tool/specs/local-demo/spec.md) | DEMO | Planned |
| [Evaluation protocol](openspec/changes/build-self-healing-tool/specs/evaluation-protocol/spec.md) | EVAL | Planned |

Codex integrations are checked in under `.agents/skills/`. Use `$openspec-propose` for a new proposal, `$openspec-update-change` for a revision and `$openspec-apply-change` when starting an authorized implementation increment. Keep the foundation change open while its tasks are incomplete.

The first implementation increment is component provenance and the independent package/consumer boundary (tasks 1.1–1.3), followed by runtime and offline verification. The five-case pilot comes after a functioning library, local demo and separate private-host integration.

OpenSpec reference: [official setup guide](https://openspec.dev/docs/setup). Contribution rules: [AGENTS.md](AGENTS.md).
