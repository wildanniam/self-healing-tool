# D38 — Usability work for the next release

## Owner authorization

On 29 October 2026 the owner approved a three-part plan after an evaluation of installation and the report: (A) installation compatibility and the quick start, (B) a report-code cleanup with no visual change, and (C) a report redesign. Work proceeds through issues, branches and reviewed PRs, starting with A in issue #38. npm publication, paid inference and paper edits are not included.

## Installation and quick start (issue #38)

v0.1.0 pinned Playwright to exactly 1.62.1, so projects on newer releases failed with `ERESOLVE`, and installing from Git produced a package without `dist/`. Peer dependencies now accept `>=1.62.1 <2` and are both optional, so npm keeps the Playwright version that `@playwright/test` brings; a `prepare` script builds the package on Git installation, and Node.js 22 is supported after the full suite passed on 22.23.4. CI checks the packaged library on Node.js 22 and 24 with Playwright 1.62.1 and the newest 1.x release. The README holds the canonical quick start; `docs/playwright.md` continues from it and documents how to reproduce v0.1.0.

## Boundaries

v0.1.0 remains the version evaluated in the APSEC 2026 paper and stays tagged. These changes alter packaging, CI and documentation only; recovery behavior, ranking, prompts and frozen research outcomes are unchanged. Versions inside the peer range other than those checked in CI are accepted but not individually verified.
