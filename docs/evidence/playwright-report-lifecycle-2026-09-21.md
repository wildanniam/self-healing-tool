# D36 — Automatic Playwright consumer reports

Issue #33, tasks19.1–19.3, INT-007 and OBS-013. The owner authorized implementation of the audited library/report workflow and verification before reporting completion.

## Delivered

- Optional packaged Playwright Test fixture: configure session options once, opt into audit, use healing click/fill, and save/attach reports during teardown. Core imports stay runner-independent.
- Packaged suite reporter: project/test/file/retry identity, final runner status, all retry attempts, unavailable/skipped records, standalone report copies and a bilingual suite index. At most one local opener call after the suite; no opening when CI is set.
- Execution-first action summary; independently assessed correctness remains separate. The reporter adds final Playwright status to copied action HTML without changing recorded evidence.
- Report/attachment failures are diagnostics and do not replace the original test failure or fail an otherwise passing test. Attachment bodies survive Playwright's cleanup of successful-test folders.
- Current integration guide, automatic-report quick start and a complete local profile example. Earlier integration notes are preserved in integration-history.md.

## Verification

Local environment: macOS arm64, Node25.8.2, Playwright/Chromium1.62.1. No model calls or research collection.

- Typecheck/build passed.
- Existing unit suite including four new reporter/policy tests:58/58 passed.
- Browser regressions:90/90 passed; presentation:20/20 passed; audit:7/7 passed.
- Core tarball consumer passed with unchanged root API and shared audit inspector.
- Installed Playwright consumer:12 synthetic tests /19 attempts; verifies original success, recovery, refusal, provider failure, assertion failure, retries, parallel workers, skipped and timed-out tests, audit off, failed writer/attachment, and successful reports despite preserveOutput=failures-only. Expected failed tests are asserted as failed; the verification command passes only after examining their statuses/errors and artifacts.
- Complete local example command passed with ranker-only recovery, starting/stopping its own app and creating the suite index.
- Suite/action browser checks cover EN/ID, links, escaping and mobile overflow; local preview is outside Git.

Initial tests exposed missing reporter export resolution and loss of passed-test reports after runner cleanup. Both were fixed and the corresponding consumer checks rerun. The first push CI also exposed two existing report tests with a 100 ms action/count budget; the same commit passed PR CI. Report-focused tests now allow 750 ms for browser round-trips, including the new consumer fixture, without changing production timeouts or removing assertions. The affected report cases passed 20 repeated local runs, and the installed consumer passed again with 12 cases/19 attempts; a fresh full CI run follows. No recovery-core source or frozen research file is changed. Live-provider walkthrough remains unexecuted; provider/capture behavior is tested with offline transport, not represented as new model effectiveness.

## Limits

Only the supported Playwright/Chromium configuration is verified. Abrupt process termination can prevent teardown/index creation. Audit is explicitly configured; missing capture remains missing. Per-test report bodies can contain application context and are local diagnostic artifacts. Final Playwright status does not prove every recovered action correct. Publication/licensing and future merge are separate from this implementation.


## Quick-start documentation follow-up

The owner authorized the documentation audit corrections: one primary start page, explicit automatic versus manual reporting, and a complete empty-project setup. README now points to docs/playwright.md; that guide includes the package build, sibling ESM consumer, exact config/test file paths, a self-contained profile page, run command and expected report. Research/demo alternatives stay separate. Its clone selects the integration branch while PR34 is pending; this is a development-package path, not a public npm release.

Verification on macOS/Node25.8.2 used the shell commands and TypeScript snippets extracted directly from the revised Markdown, with a fresh remote clone of runtime202191f and a separate empty consumer. No source changes or hidden application/server setup were needed. All install/build commands and the documented test passed. The generated suite/action HTML was opened in Chromium: one passing test, one recovered fill to #display-name, one original click, two unassessed actions and zero provider invocations. The index link, displayed counts and provider-not-called panel matched the guide. CI=1 suppressed opening the OS browser during this check; automatic local opening was verified in the preceding implementation check.

The optional full-mode configuration loaded and discovered the test with playwright test --list using a placeholder credential. No test action or model request was executed in this configuration check. All35 local links/anchors across README and current setup/integration guides passed; strict spec/traceability and git diff --check passed. The library runtime and frozen study evidence are unchanged by this follow-up.
