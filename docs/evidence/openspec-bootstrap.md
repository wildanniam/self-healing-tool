# OpenSpec bootstrap verification — 2026-09-07

Scope: repository setup, specification structure and traceability tooling only. Runtime implementation, recovery benchmarks, paid model calls and practitioner studies have not been performed in this repository.

The runtime traceability evidence arrays deliberately remain empty. The following checks were executed locally on 2026-09-07:

| Check | Actual result |
|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund --offline` using the prepared local cache | PASS: lockfile installation, 80 packages |
| `npm run spec:validate` with telemetry/update checks disabled | PASS: strict validation of `audit-workflow` and `build-self-healing-tool`, two items, zero failures |
| `npm run audit:check` | PASS: 36 requirements, 73 scenarios, 30 tasks, zero completed implementation tasks |
| `npm run test:audit` | PASS: seven tests, including omitted requirement/scenario, unknown decision, unsupported verified status, unchecked evidence, broken link, and a synthetic positive completion fixture |
| Local `openspec status --change build-self-healing-tool --json` | All four planning artifact types complete; no runtime completion inferred |
| Local `openspec instructions apply --change build-self-healing-tool --json` | Ready to start, 30 total tasks, zero complete, 30 remaining; command only inspected progress |
| `git diff --cached --check` | PASS after normalizing the copied third-party license's trailing blank line |
| Targeted scan of staged files | No matches for prior/private application identifiers, owner absolute paths or common key/token patterns; not a comprehensive security audit |

Checker test fixtures are temporary synthetic copies and are not recorded as actual runtime evidence. This report does not claim branch protection, independent scientific validation, or recovery effectiveness. GitHub CI results are linked from the pull request; consult the latest commit's run rather than treating this local report as proof of remote CI.

## Setup notes

- OpenSpec is pinned locally at `1.12.0`; installation uses `npm ci --ignore-scripts` (or initial `npm install` with the same restrictions).
- Local setup used Node.js `20.20.2` and npm `11.11.1`; CI is configured for Node.js 24. Neither declares a tested future library compatibility range.
- Codex core skills were generated locally. Initialization attempted legacy global prompt cleanup, but filesystem permissions prevented those deletions. Existing global prompts and the global OpenSpec installation were left intact; local skills and executable are the intended workflow.
- GitHub Actions references are pinned to commits resolved from the official `actions/checkout` and `actions/setup-node` v4 refs on this date.
- No automatic merge, branch protection configuration, public visibility change, npm publication, private-app migration or experiment run is part of this setup.
