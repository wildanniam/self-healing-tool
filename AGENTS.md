# Working agreement

Reply to the owner in Indonesian; write code and project documentation in English.

## Current scope

The owner authorized the public GitHub release under D37/issue #35 and selected MIT. Integrate verified PR #34 and the reviewed release branch, then verify public access. npm publication, paid inference, paper edits and a new GUI are not included. See `docs/decisions/2026-09-21-public-release.md` and `docs/evidence/public-release-2026-09-21.md`.

## Development

- Read README, `docs/index.md` and the relevant decision/specification before editing. Classify meaningful work, create/reuse an issue, use a branch, verify and submit a linked PR. Merge only within explicit owner authorization.
- Maintain OpenSpec task/requirement/evidence links. `npm run check` verifies structure; behavioral checks remain necessary. Do not mark pending practitioner/paper work complete or archive the change just because a release exists.
- Use Node 24/25, ESM and pinned Playwright 1.62.1/Chromium. Run the relevant typecheck, unit, browser, presentation, consumer and audit checks listed in the documentation index.
- Preserve default method behavior and frozen studies. Source/reference boundaries and historical authorizations live in `docs/decisions`, `DEVELOPMENT.md` and the component inventory. Never turn offline verification into an empirical effectiveness claim.
- Keep credentials, private-host source, sessions, raw diagnostic outputs and unrelated history out of Git/package. Do not run live demos or reopen closed study ledgers without a fresh authorized budget.

## Library, reports and documentation

- Keep core imports independent of Playwright Test; fixture/reporter imports are optional. Successful test status does not prove every recovered action correct. Capture remains explicit.
- Preserve primary failures when report/attachment/opener work fails. Attach HTML/summary bodies so Playwright cleanup cannot remove passing-test evidence before collection. Keep retry/project identities separate. Validate packaged integration with `npm run test:lifecycle`.
- Keep one canonical Playwright quick start with project initialization, exact file paths and a self-contained first test. Separate automatic fixture reporting from manual core API calls. Recheck commands, links and clean consumer setup when changing this path.
- Public GitHub visibility and npm publication are separate. Keep `private: true` until npm publication is explicitly authorized. Include LICENSE and required notices in distribution.
- Record meaningful owner decisions and actual progress in the private Atlas Vault without copying its private discussion content into public artifacts.
