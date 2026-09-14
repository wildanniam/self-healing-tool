# Self-healing tool

A reusable Playwright locator-recovery development library with an independent synthetic local demo, prepared for a scoped software-engineering tool demonstration study.

**Current result: 0.0.8 D29 evaluated; an ambiguity regression remains.** All 144 known synthetic slots completed. C correct recovery stays 15/24 while wrong effects rise 3→6. The nested-owner defect is fixed, but the increment is not an overall method improvement. See [D29 results and limitations](docs/evidence/owner-evidence-evaluation-2026-09-14.md). The following D27 numbers are historical; private Koderea was not rerun on 0.0.8.

**Historical checkpoint: 0.0.7 D27 regression collected and audited; follow-up correction required.** See [the complete before/after evidence](docs/evidence/candidate-recovery-evaluation-2026-09-14.md). Contract-enforced recovery increased from 15/36 to 36/36 on the known private workload, with zero wrong effects there. On the known synthetic workload, recovery fell from 18/24 to 15/24 and three wrong effects occurred. The nested-group context task is reopened; passing engineering checks does not establish general safety. Owner interpretation and public release remain pending. The working name, distribution eligibility and license remain undecided; private application source and E2E tests are not distributed here.

D25 corrects methodological drift: [method matrix](docs/implementation/thesis-method-alignment.md). D24 evaluated the earlier simplified variant, not an exact replay of the TA method.

Historical D24 [findings and limits](docs/evidence/final-evaluation-2026-09-09.md): the earlier full and ranker-only variants both achieved 33/36 recoverable cases; absent-target refusal 0/12 vs 3/12. These are different versions/protocols from D26 and must not be pooled or presented as current 0.0.6 performance. No LLM superiority or reliable unattended healing is established.

## Start here

1. [Proposal](openspec/changes/build-self-healing-tool/proposal.md) — what the tool will do and why.
2. [Design](openspec/changes/build-self-healing-tool/design.md) — boundaries, recovery flow, alternatives and evaluation design.
3. [Implementation tasks](openspec/changes/build-self-healing-tool/tasks.md) — ordered work with owner, requirement IDs and completion evidence.
4. [Decision register](docs/decisions/2026-09-07-foundation.md) — agreed direction, assumptions and pending decisions.
5. [Audit workflow](docs/audit-workflow.md) and [traceability register](docs/traceability.json) — how changes and evidence are linked.
6. [Verification plan](docs/verification-plan.md) and [bootstrap evidence](docs/evidence/openspec-bootstrap.md) — planned behavioral checks versus checks actually performed.

## Check the specification workspace

Install Node.js 24 (recommended for this workspace) and npm. OpenSpec `1.12.0` is an exact development dependency and requires Node.js at least `20.19.0`; the library supports Node 24/25 and Playwright 1.62.1 (Chromium), with evidence and limitations in the integration guide.

```sh
npm ci --ignore-scripts
export OPENSPEC_TELEMETRY=0
export OPENSPEC_NO_UPDATE_CHECK=1
npm run check
./node_modules/.bin/openspec status --change build-self-healing-tool
```

The checks validate OpenSpec structure and traceability, not recovery effectiveness. No model credential is required for offline verification.

## Local API configuration

A blank-key environment template and [local setup guide](docs/local-api-setup.md) now document the owner-selected reference settings. Fill `OPENAI_API_KEY` only in your ignored local `.env`; preserve any existing file. Environment loading is explicit in the live demo; offline commands do not load a key. The adapter has offline transport checks and a bounded live demo/pilot; read the dated evidence for outcomes and missing usage.

## Specification map

| Capability | Requirement prefix | Status |
|---|---|---|
| [Audit workflow](openspec/specs/audit-workflow/spec.md) | AUD | Repository process baseline |
| [Library integration](openspec/changes/build-self-healing-tool/specs/library-integration/spec.md) | INT | Development package verified; release pending |
| [Runtime recovery](openspec/changes/build-self-healing-tool/specs/runtime-recovery/spec.md) | HEAL | Initial offline behavior verified |
| [Context selection](openspec/changes/build-self-healing-tool/specs/context-selection/spec.md) | CTX | Synthetic checks and private final study audited |
| [Recovery reporting](openspec/changes/build-self-healing-tool/specs/recovery-reporting/spec.md) | OBS | Offline report checks verified |
| [Local demo](openspec/changes/build-self-healing-tool/specs/local-demo/spec.md) | DEMO | Offline/live demo verified; release pending |
| [Evaluation protocol](openspec/changes/build-self-healing-tool/specs/evaluation-protocol/spec.md) | EVAL | Technical collection complete; interpretation/practitioner study pending |

Codex integrations are checked in under `.agents/skills/`. Use `$openspec-propose` for a new proposal, `$openspec-update-change` for a revision and `$openspec-apply-change` when starting an authorized implementation increment. Keep the foundation change open while its tasks are incomplete.

The first implementation increment covers tasks 1.1–5.3. D21 authorizes one bounded live batch; task 5.4 now has actual independent live-demo evidence. The five-case pilot follows separate private-host integration and case review. See [integration instructions](docs/integration.md), [component inventory](docs/implementation/component-inventory.md) and [runtime evidence](docs/evidence/offline-runtime-2026-09-08.md).

## Try the independent demo

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run demo:offline
```

The command prints the path to a local HTML/JSON report. It runs controls, a profile locator drift and an ambiguous entity action in its own synthetic local app. It does not contact a model or the private evaluation application.

Development checks: `npm run typecheck`, `npm run test:unit`, `npm run test:browser`, `npm run test:consumer`, `npm run check`, `npm run test:audit`. Runtime results from fake providers/ranking establish mechanism checks only.

OpenSpec reference: [official setup guide](https://openspec.dev/docs/setup). Contribution rules: [AGENTS.md](AGENTS.md).

The optional persisted live-budget API and package 0.0.1 enforce shared phase/request reservations across instances. See [D20/D21](docs/decisions/2026-09-08-live-pilot.md) and [integration instructions](docs/integration.md).

Latest: [live batch checkpoint](docs/evidence/live-batch-2026-09-08.md), 21/30 tasks complete; private live execution subsequently completed after D22; see [pilot and provider-stop follow-up](docs/evidence/pilot-followup-2026-09-08.md).

The D23 checkpoint prepares [the final evaluation review package](docs/evaluation/final-review-package.md): private native preflight and a draft protocol/budget. Final collection and its owner-review tasks remain pending.
