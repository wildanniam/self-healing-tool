# Pilot follow-up and provider-stop regression — 2026-09-08

Authority: D20/D21/D22/D23 in [the decision record](../decisions/2026-09-08-live-pilot.md). Work: issue #7, based on PR #6; private pilot belongs to private issue #174/PR #175, follow-up preparation #176. No final study or release.

## Actual pilot (package 0.0.1)

After explicit D22 disclosure consent, the previously rejected command was executed once. Five local instrumentation tests completed in 53.9 seconds. Two normal controls were correct with zero provider calls; two recoverable tasks were correct with one request each. The absent-target task encountered a provider timeout: no wrong action, no correct refusal, operational failure retained. The previous ranker-only negative false heal remains separate. These five cases do not establish LLM superiority or general effectiveness.

Private run IDs, payloads, effects and exact case meanings remain only in the private host. Candidate audit confirmed target inclusion for the recoverable tasks and absence for the negative; actual payloads omitted evaluator sentinels/email/key patterns. All attempt observations are retained. The negative provider interface was invoked three times, but only the first reached transport; later two were refused by the halted ledger. Runtime's timeout race recorded the first dispatch as unknown; the independently inspected ledger confirms transport was attempted. Neither source supplies the missing token usage.

Private phase: **three transport requests**, two with known usage (3193 input, 206 output tokens; observed cost US$0.00060255) and one aborted request with unknown usage/cost. Including the earlier synthetic demo, the ledger contains five transport requests, observed known cost US$0.00080085 and one unknown cost; total actual cost is **unknown**, not the known subtotal. The aborted reservation is US$0.0008991 under the recorded price assumption, not an invoice. The existing D21 ledger is halted for unreconciled usage and remains untouched. No live rerun occurred.

## Corrective engineering (package 0.0.2)

Provider/transport/budget exceptions now stop the current recovery event. Candidate attempts no longer repeatedly invoke an unavailable provider or halted budget guard. The stop reason is `provider-failure`, unless the global deadline expires (`time-limit`). Parse/validation retry behavior remains bounded and verified. Ranking, prompt and default timeout values are unchanged.

The deadline race intentionally remains bounded: a late response cannot trigger an action or mutate the completed report. Unknown dispatch/usage remains unknown when the adapter has not settled. Ledger audit may establish dispatch separately; it never invents token usage. The 0.0.1 pilot remains historical and is not relabeled as 0.0.2 evidence.

## Verification

Node 24.18.0, TypeScript 5.9.3, Playwright 1.62.1/Chromium, macOS arm64. `npm run test:unit`: 18/18 PASS. `npm run test:browser`: 20/20 PASS, including terminal budget/HTTP/provider failure and valid late-response cases; existing parse/validation retries still pass. `npm run test:consumer`: clean import, normal fill, recovery and 22-file allowlist PASS. Checks are offline with synthetic fixtures/fake transport; no key or model request is used.

OpenSpec HEAL-006-S1 now explicitly requires termination without another provider invocation or late action. The new passing regression evidence supports that refinement. Tasks 6.3 and 7.1 remain unchecked until their owner-review portions are complete; delivering a review package is not owner acceptance.
