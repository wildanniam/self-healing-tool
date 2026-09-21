# Documentation

## Start using the tool

1. [Quick start](playwright.md): install from source, run a self-contained test and inspect its automatic report.
2. [Core integration](integration.md): manual lifecycle control, provider configuration and optional target rules.
3. [Report and demo guide](presentation.md): retained research results and explicitly labeled replay.
4. [Release notes](../CHANGELOG.md) and [MIT license](../LICENSE).

The main quick start requires no private application or model credential. Full mode is optional and requires the user's own provider configuration. The package is installed from a local archive; it is not published to npm yet.

## Repository map

| Location | Purpose |
| --- | --- |
| `src/` | Library and packaged report implementation |
| `examples/` | Independent local applications and usage examples |
| `tests/`, `scripts/`, `.github/` | Verification and CI |
| `docs/` | User guides, method explanation, decisions and evidence |
| `evaluation/`, `presentation/` | Synthetic research fixtures, analyzers and report/replay support |
| `openspec/` | Requirements, changes and evidence traceability |

These development/research folders are not all included in the installed package. The reviewed manifest is described in [public-release evidence](evidence/public-release-2026-09-21.md).

## Research and reproducibility

- [Method alignment](implementation/thesis-method-alignment.md): DOM preparation, ranking and explicit deviations.
- [RQ1 ranking results](evidence/rm1-continuation-results-2026-09-18.md): 108 retained main executions; do not interpret equal full/Jaccard results as full-ranker superiority.
- [RQ2 scoped results](evidence/scoped-evaluation-2026-09-15.md): 378 evaluation slots with separately reported controls and failure categories.
- [Research/development chronology](../DEVELOPMENT.md), [decisions](decisions/2026-09-07-foundation.md) and [historical integration notes](integration-history.md).

The repository includes independent synthetic fixtures and selected portable evidence. Private application source, credentials, sessions and raw private runs are excluded. Some historical analyzers require owner-local frozen inputs and cannot fully reproduce private results from a public clone. Missing inputs remain explicit; do not fabricate or silently substitute them. Closed research ledgers are not authorization for new paid runs.

## Contributing

Use Node 24/25 and the pinned Playwright 1.62.1/Chromium configuration. Install with `npm ci`, then `npx playwright install chromium`. Relevant commands are `npm run check`, `npm run test:audit`, `npm run typecheck`, `npm run test:unit`, `npm run test:browser`, `npm run test:presentation`, `npm run test:consumer` and `npm run test:lifecycle`.

Open an issue for a substantive change, work on a branch and submit a PR with the relevant checks. Keep source changes separate from frozen research artifacts. Live API calls are not part of offline checks. See [audit workflow](audit-workflow.md) and the current [working agreement](../AGENTS.md).
