# RM1 DOM ranking protocol — D33

Status: owner-authorized implementation; freeze is written by the runner before each paid phase. Results are not yet collected. Linked [decision](../decisions/2026-09-18-rm1-dom-ranking.md), [issue25](https://github.com/wildanniam/self-healing-tool/issues/25).

## Question and intervention
How does candidate ranking affect intended-target presence in the LLM input and correct locator recovery under equal maximum input budgets?

R0 `lexical-jaccard`: unique-token Jaccard overlap between meaningful failed-locator + task description/scope tokens and the same lexical candidate fields available to the full ranker (including relations), deterministic DOM-order ties. R1 `thesis-no-relations`: full thesis ranker except row/parent/container tokens are excluded both from pooled overlap and dedicated relational terms. R2 `thesis-full`: unchanged D30 thesis ranking formula.

All arms share extraction/eligibility, sanitization, candidate fields/owner evidence/suggested locators/duplicate counts, prompt/schema, top-k and character caps, supplement policy, validator/parser, action/state reset, feedback/refresh/retry and oracle. Numeric scores are retained in audit but excluded from every experimental wire projection and the matching budget meter. Experimental arm names/ground truth never enter model input. Strategy applies before top-k and budget on initial and every refreshed context. Default production ranking and score-bearing payload remain unchanged. Runtime target contracts are disabled for all arms. The intervention does not isolate cleansing, relation-bearing prompts, or LLM necessity.

## Frozen cases and schedule
Main: warehouse inventory FILL and shipment destination CLICK × attribute drift A / structural-wrapper drift S × small unique U (~8), duplicated-owner D (~16), crowded duplicate L (~80 eligible candidates). Twelve conditions; three independent fresh contexts per arm =108 executions,36/arm. Pilot uses three separately identified development conditions (easy/ambiguous/crowded), three arms once =9 executions, not pooled with main. Both use known synthetic flow families, not independent unseen apps.

For the four crowded main conditions, target candidate zero-based indices are8,24,48,64 respectively for W-A-L,W-S-L,S-A-L,S-S-L. Order is fixed before model outcomes; the target must survive extraction. Every mutation breaks the old locator while keeping the intended operation available. Warehouse fill value731 is deliberately outside all initial values/1–80 control IDs, preventing the shared privacy omission from accidentally redacting unrelated selector cues; this was chosen before ranking or model outcomes. Native preflight checks old selector on pristine page, its failure after mutation, correct-target effect, wrong-target detection including persistence after later correct action, and clean reset. Truth selectors and node mapping are evaluator-only and absent from DOM markers, task descriptions and serialization.

Schedule rotates R0/R1/R2 by case index + repeat, giving each arm each order position across three repeats. Fresh browser context, page and app state for every slot; no outcome-based replacement or successful-only rerun. Original failures and planned-but-unstarted slots remain.

## Configuration and spending
Model gpt-4o-mini-2024-07-18, temperature0, max output500, maxAttempts3, actionTimeout3000ms, providerTimeout15000ms, recoveryTimeout45000ms. maxCandidates30; domMaxChars8000 (candidates plus supplement); payloadMaxChars12000. These are maximum character limits, not equal token counts or guaranteed equal prompt lengths.

One fresh ledger: US$3/351requests, pilot27/main324. No previous ledger may be reused/reset. Price assumption: input$0.15/M, output$0.60/M, ignoring cache discounts (official model page checked18Sep2026). Conservative reservation uses UTF8 bytes+1024 input units plus500 output tokens; maximum351×$0.0076536=$2.6864136 under worstcase4bytes/character. This is a reservation model, not a billing guarantee. Exclusive ledger locks, no transport retries; pending/unknown usage halts collection for reconciliation.

## Stages, evidence and acceptance
1. Validate unchanged default ranker behavior and R0/R1 formulas, common projection/meter/refresh, privacy, bounded retry and budget.
2. Verify every native case and independent full effect oracle; capture offline full/prerank/ranked/trimmed/final contexts. Verify same universe/candidate content across arms and limits for every dispatch. Crowded cases must cause actual shortlist or budget pressure. Do not alter cases/weights based on ranking winners.
3. Freeze pilot inputs and run9development slots. Audit transport/schema/reset/oracle/accounting. Fix only engineering defects, retain pilot evidence and document changes; do not tune to improve outcome.
4. Freeze source/build/fixtures/protocol/config/prompt/oracle/native preflight and runtime identities before main. Collect108slots once; refuse reuse of started phase. Keep exact payload before dispatch, response/usage/returned model, run and audit snapshots. Hash check before and after collection.
5. Independently reconcile all request IDs, payload bytes/reservations/usage, all planned slots and effect outcomes. Preserve infrastructure failures separately and in full denominators.

Offline/attempt metrics: intended target survival extraction→rank/top-k→budget→actual final serialized request; rank/top1/recall@k; raw and sanitized DOM, all candidates and exact payload. Candidate.order maps to actual DOM nodes out of band. Actual-input coverage includes retained HTML supplement, not only candidate array; do not count mere owner text as target representation. A syntactically/structurally valid selector is not semantic correctness.

End-to-end: correct effect on intended entity with no wrong effect; wrong effect; refusal/no-selection; execution/validation failure; infrastructure failure. Report conditional correctness when target represented with explicit denominator, and separately any target representation on subsequent requests. Count actual tokens, requests/cost including retries, extraction/ranking/verification/model/wrapper time. Character reduction is descriptive only. Zero denominators are null/undefined.

## Analysis and boundaries
Analyze main separately from pilot and D30. Per-arm totals36, per-condition correctness0–3, paired R2−R0 and R2−R1 and improved/same/worse counts across12conditions. Report profile/mutation/family strata, coverage and rank differences, all incorrect/refusal/failure examples, token/timing distributions. Repeats are not108 independent cases. Use descriptive comparisons; no forced p-values or broad superiority claims. Two handcrafted known flow families, one model snapshot, small fixed sample and maximum-character budgets limit transfer. Freeze and audit cannot guarantee universally error-free execution; anomalies must remain visible and conclusions conditional on checks.
