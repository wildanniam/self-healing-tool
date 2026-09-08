# Initial offline runtime evidence — 2026-09-08

OpenSpec: `build-self-healing-tool`. Implementation issue: [#5](https://github.com/wildanniam/self-healing-tool/issues/5). Branch: `codex/5-standalone-runtime`, based on API-setup PR #4. This increment is newly authored; no restricted reference source/history, private-host tests or historical run artifacts were copied.

## Executed checks

Local environment: macOS arm64, Node **25.8.2** and **24.18.0**, npm **11.11.1**, TypeScript **5.9.3**, Playwright **1.62.1**, bundled Chromium.

| Command | Actual result | Meaning |
| --- | --- | --- |
| `npm run typecheck` | PASS | Runtime source typechecks under the pinned compiler/types |
| `npm run test:unit` | 11/11 PASS | D18 validation, strict output parser, intercepted provider transport and failure/resource accounting; live-mode missing-key/cap refusal |
| `npm run test:browser` | 18/18 PASS (Node 24; 17-test pre-extension suite also passed Node 25) | Actual Chromium synthetic behavior, supported error gate, missing fill, malformed/invalid selectors, accepted-but-failed click, provider timeout, entity context, oracle separation, reports/diagnostics and demo confinement/reset |
| `npm run test:consumer` | PASS | Prepared tarball installs offline in an isolated temporary consumer; public import, normal fill and ranker recovery pass with no private repository or key |
| `npm run demo:offline` | PASS | Control fill, mutated profile field and repeated-entity action pass in the independent local demo |

The consumer tarball contains 20 allowlisted files: compiled JS/declarations, package metadata, README, integration instructions and the component inventory. It contains no source/Git automation, application suite, `.env`, sessions or run outputs. The check verifies the actual manifest rather than only the `files` field.

Retained local synthetic demo run: `cb347007-5a04-44c5-b3fc-40da1fbf20ff`, under ignored `output/demo/`. Raw generated outputs are not versioned as distributable data; the source and command reproduce the mechanism check. Subsequent runs receive distinct IDs.

## Acceptance mapping and scope

| Tasks | Requirements/scenarios exercised | Evidence source |
| --- | --- | --- |
| 1.1 | INT-005-S1/S2: inventory and held/excluded categories; no reference components admitted | `docs/implementation/component-inventory.md`, package allowlist check, review of newly authored source/import graph |
| 1.2 | INT-001-S1/S2, INT-004-S1/S2: clean package and documented interface/compatibility | `scripts/check-consumer.mjs`, `docs/integration.md` |
| 1.3 | INT-002-S1/S2, HEAL-003-S1/S2: zero provider calls on normal actions; native assertions and original fill input retained | `tests/runtime.spec.ts`, parser/consumer tests |
| 2.1 | INT-003-S1/S2: defaults, model/limit errors and provider/session consistency without secrets | `tests/config-provider.test.mjs`, `tests/runtime.spec.ts` |
| 2.2 | HEAL-001-S1/S2: zero-match timeout only; invalid/multiple/disabled/hidden/closed failures stay native | `tests/runtime.spec.ts` |
| 2.3 | HEAL-002-S1/S2, HEAL-003-S1/S2: retained rejected attempts, explicit stop reason, aborted request, preserved fill | `tests/runtime.spec.ts` |
| 2.4 | HEAL-005-S1/S2: constrained JSON, incompatible/nonunique rejection and no code evaluation | `tests/runtime.spec.ts`, `tests/config-provider.test.mjs` |
| 2.5 | HEAL-004-S1/S2, HEAL-006-S1/S2: accepted/action/semantic separation; provider failures and unknown usage | `tests/runtime.spec.ts`, unit accounting/transport checks |
| 3.1 | CTX-001-S1/S2, CTX-004-S1/S2: action candidates, complete serialized payload caps/coverage and out-of-band coverage assessment | `tests/runtime.spec.ts` |
| 3.2 | CTX-002-S1/S2: article/table/div/native-dialog entity labels | Four browser fixture checks in `tests/runtime.spec.ts` |
| 3.3 | CTX-003-S1/S2: reserved oracle/answer metadata omitted from actual serialization; legitimate entity identity retained; no fallback path | `tests/runtime.spec.ts`, serializer used by the adapter |
| 3.4 | EVAL-003-S1: full and ranker-only receive equivalent candidate context; ranker makes zero provider calls | `tests/runtime.spec.ts`; final comparison/results are not present |
| 4.1 | OBS-001-S1/S2, OBS-002-S1/S2: independent run IDs/lineage, overwrite refusal, append-only wrong-effect records, unassessed semantics | Browser report checks and unit accounting; wrong-field fixture exercises retention, private per-attempt oracle instrumentation remains later |
| 4.2 | OBS-003-S1/S2: original/internal/retry timing, failed-request usage and undefined cost-per-repair with no clean success | Browser timing and `tests/accounting.test.mjs` |
| 4.3 | OBS-004-S1/S2, OBS-005-S1/S2: whitelisted report, separate explicit diagnostic file, owner-only mode, escaped markup/manual-review output | Browser report checks and report implementation |
| 5.1 | DEMO-001-S1/S2, DEMO-004-S1: independent synthetic app, no private-host dependency or model calls | Offline demo plus package/fixture imports review; fresh-checkout CI execution recorded separately |
| 5.2 | DEMO-002-S1/S2: remote target refusal, redirect inspection and undeclared application-request blocking | Browser guard test uses a second local server and verifies **zero hits** |
| 5.3 | DEMO-003-S1/S2: synthetic browser-only state and mismatched-instance reset refusal | Browser demo reset check; no real account/admin/database is created by this demo |

These checks establish the initial engineering behavior under synthetic conditions. They do not establish effectiveness across applications, a live model success rate, the quality of a permanent source repair, or practitioner productivity. A candidate CSS path can still become structurally stale and a runtime-valid action can target the wrong entity.

## Findings corrected during development

The first browser pass exposed missing separators between adjacent label text nodes; entity names merged with button text and ranking lost the intended entity. Extraction now joins text nodes with spaces. Annotation filtering was also corrected to ignore mutation attributes without discarding legitimate controls. An isolated browser test separates the post-blocked-navigation page from a subsequent fetch check. The initial 80 ms fixture action timeout proved too short under parallel browser startup; it is now 300 ms while explicit provider/recovery-budget tests retain their bounded assertions. These changes did not alter expected task outcomes or remove failures from study data; no final study data exists.

## Pending work and actual authorization boundaries

Task 5.4 remains unchecked: missing-configuration refusal and offline/live instructions are tested, but an owner-budgeted live smoke has not run. No real credential was read/displayed by the agent and no paid request was sent. Tasks 6.x–8.x remain pending: private-host integration/pilot, protocol freeze, final collection, practitioner sessions, reviewed release and closure. Source-distribution rights for held reference components are unresolved; public licensing, merge and publication are not approved by engineering completion.

The active change is not archived and runtime specs are not promoted wholesale to the current baseline. Individual task/evidence status is in `docs/traceability.json`. CI/audit results and PR links will be recorded after they actually complete.

Repository audit after evidence updates: `npm run check` PASS (36 requirements, 73 scenarios, 30 tasks, 18 completed); `npm run test:audit` 7/7 PASS; `git diff --check` PASS.
