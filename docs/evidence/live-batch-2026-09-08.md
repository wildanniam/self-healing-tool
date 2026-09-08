# Authorized live-batch checkpoint — 2026-09-08

Historical checkpoint: D22 later approved the specific disclosure and the private pilot executed. See [the subsequent evidence](pilot-followup-2026-09-08.md); pending statements below describe the earlier command rejection.

Authority: [D20/D21](../decisions/2026-09-08-live-pilot.md); issue #5/draft PR #6 and private-host issue #174/draft PR #175. Runtime source commit `50595a7768a0091f7bacd1174c5291a77f4b37a8`, package 0.0.1; private harness commit `021c268`. No merge or public release.

## Verified preparation

Node 24.18.0, TypeScript 5.9.3, Playwright 1.62.1/Chromium. Unit/transport/ledger tests 18/18 PASS; browser regression 18/18 PASS; clean-consumer install/import/recovery PASS with 22 allowlisted files; strict OpenSpec and audit regression 7/7 PASS. CI on the runtime commit passed [run 34233114171](https://github.com/wildanniam/self-healing-tool/actions/runs/34233114171) and [34233120281](https://github.com/wildanniam/self-healing-tool/actions/runs/34233120281).

The first consumer smoke at 80 ms timed out during a present native fill while browsers were starting. It now uses the normal 1000 ms action default; its same expected outcome passes in an isolated rerun. This is an installation/mechanism check, not study performance data; no healing rule or expected result was weakened.

The opt-in ledger reserves before dispatch and keeps phase/total/request/cost reservations across processes. Tests prove refusal on exhausted phase/cost limits, active locks, pending requests, changed model, missing usage, and overwrite attempts. No credential is stored in it. Missing ledger/key/cap demo configurations fail before services/provider calls.

## Actual independent live demo

Command: `HEALING_LIVE_MAX_REQUESTS=6 HEALING_LIVE_BATCH_FILE=<approved-absolute-ledger> npm run demo:live`. The process loaded the existing environment file without exposing the key. Configuration was gpt-4o-mini, temperature 0, output 500, attempts 3, context 8000 characters and complete payload 12000 characters. Loopback synthetic application only; server-side OpenAI requests were explicitly authorized.

Run `06e55f73-7b3b-44db-a77a-05c180d6730c`: one normal action with no provider call, then correct profile and entity recovery, one provider request each. Two correct recovery events, zero observed wrong effects. The normal event retains semantic `unassessed`; do not count it as a third assessed repair. Internal/total recovery times were 2940/3954 ms for profile and 1710/2736 ms for entity. Provider intervals include payload-audit/ledger overhead.

Observed usage: 882 input and 110 output tokens across two requests; no unknown usage. Cost using the recorded standard uncached price assumption (input US$0.15/million, output US$0.60/million) is **US$0.0001983**. This is usage-based calculation, not invoice reconciliation. Source: [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-4o-mini), checked 2026-09-08.

Raw demo reports and request-body audit files remain in ignored local output. The shared D21 ledger retains two completed demo reservations, zero pilot dispatches and no halted/unreconciled usage at this checkpoint. Phase caps stay demo 6/private pilot 9; total 15 and US$0.25.

## Private pilot status and evidence boundary

D20 case review is complete. All five provider-interface offline rehearsal checks and all five fresh ranker-only instrumentation checks passed using the same private harness. Independent payload inspection confirms expected target presence for the two recoverable cases, absence for the negative case, and omission of evaluator sentinel/email/key patterns. Wrong-field outcome is retained. Case meanings, raw payloads, identifiers and full reports remain with private PR #175; none is copied into this library repository.

The live private phase has not executed: automatic approval review rejected its command because disclosure of private-derived UI payload to OpenAI was considered insufficiently specific in the existing authorization. The user has been shown a concrete request for approval of UI labels/descriptions, candidate-selector structure and synthetic names; budget/model/case approvals remain valid. There is no pilot request or execution manifest from the rejected command. Do not bypass this block or treat the synthetic demo as private-host LLM evidence.

## Task accounting

Task 5.4 is now complete with actual live-smoke evidence and missing-configuration refusal checks. Task 6.2 is complete with prepared/verified cases and explicit D20 owner acceptance. Task 6.3 remains unchecked until the private live pilot, instrumentation audit and owner result review are complete. Final manifest/collection, practitioner evidence and release remain pending. The initial milestone count advances from 19 to 21 of 30 tasks; this is not a paper-readiness percentage.
