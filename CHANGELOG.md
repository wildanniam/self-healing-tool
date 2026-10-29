# Changelog

## Unreleased

- Peer dependencies accept Playwright `>=1.62.1 <2` instead of exactly 1.62.1, so projects on newer releases no longer fail with `ERESOLVE`.
- Installing from GitHub builds the package (`prepare`), so `npm install --save-dev github:wildanniam/self-healing-tool` works in one step.
- Node.js 22 is supported (22–25).
- CI checks the packaged library on Node.js 22 and 24 with Playwright 1.62.1 and the newest 1.x release; `npm test` runs the full offline suite.
- The README quick start is now the canonical first run, with report screenshots. The Playwright guide covers next steps and reproducing v0.1.0.

## 0.1.0 — 2026-09-21

First public GitHub source release, licensed under MIT. No npm registry publication is included.

- Bounded Playwright click/fill recovery with DOM preparation, ranking and optional target checks.
- Automatic per-test reports and one suite index through optional Playwright fixture/reporter entry points; English and Indonesian interfaces.
- Preserved test errors, separate action/correctness outcomes, parallel/retry identities and optional audit evidence.
- Complete quick start, a runnable local example, reviewed package contents and clearer user/research navigation.

The release packages the existing recovery method and the verified report integration. It does not change or add to frozen research outcomes. Historical 0.0.x measurements retain their recorded versions and limitations; see [research evidence](docs/index.md#research-and-reproducibility).
