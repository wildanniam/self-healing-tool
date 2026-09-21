# Thesis method alignment — D25 / 0.0.5

The earlier standalone version was a new simplified implementation, not a faithful extraction of the thesis algorithm. Portability and exclusion of restricted source/history were valid goals; silently dropping method components was not justified by those goals. No comparison established the simplification as superior. D24's 0.0.3 findings must remain labeled as evidence for that variant.

## Component audit

| Component | D24 / 0.0.3 | Restored in 0.0.5 | Boundary / equivalence limit |
| --- | --- | --- | --- |
| DOM noise removal | Candidate labels cleaned; no HTML fallback | Noise/evaluator subtrees and disallowed attributes/values removed; sanitized bounded sparse supplement/fallback | Browser clone cleaning replaces regex cleaning; stronger privacy exclusion intentionally retained |
| Action-aware extraction | Small generic control scan | Relevant click/fill controls with semantic/stable attributes and state | Still an action pre-filter, not the prototype's broader framework-specific scan; other wrappers excluded |
| Ranking | Label/container word overlap | Thesis additive old/step, tag/role, stable attributes, state, duplicates, exact match, text, row/parent/container signals and documented weights | Generic containers, sanitized fields, whitespace repair and task scope folded into step meaning alter feature population; no bitwise parity claim |
| Old locator | Report only | Sanitized original selector passed to ranking and LLM | Unsafe/overlong selectors can be omitted; task title/page URL/raw exception stack are not copied |
| Entity context | One container field | Separate row/parent/container features plus generic scoped locator alternatives | No application-specific identifiers/framework classes; not a guarantee of semantic identity |
| Locator suggestions | Structural nth-of-type paths | Stable id/test/name/ARIA/placeholder/text/class choices; generic scoped alternatives | No generated positional locator; order/available candidates differs from prototype |
| Prompt | Select one supplied structural path | Prefer supplied stable locators; permit specific CSS/XPath composition with strict runtime validation | Wording/JSON contract are new; not the identical old prompt |
| Normalization | Strict parser only | Text pseudo, simple text XPath and text-engine alternatives, each browser-validated | Explicit finite subset; no arbitrary code or full historical normalization equivalence claim |
| Rejection feedback | Not supplied to LLM | Rejected selector/count/reason passed to next request and retained per attempt | Sanitized feedback; every retry payload is bounded and hashed |
| Null response retry | Immediate abstention | Full mode retries null within maxAttempts, then abstains if still null | Provider exceptions still stop immediately; they are not null candidates |
| Validation/reporting | Independent outcomes and budgets | Preserved and extended with original proposal, rejected variants and per-request coverage/hash | One-match/visibility/enabled/action checks do not establish semantic correctness |
| Patching/extra actions | Excluded | Remain excluded | No read/select wrappers, source rewriting, Git actions, frame/shadow expansion |

The thesis text Chapter 3 describes the methodological reference. The prototype was inspected to clarify parameter/detail meanings; no source/history or historical application artifacts were copied. Changes are independently implemented from the documented behavior. Reference source fingerprint is recorded separately in `thesis-method-reference-2026-09-09.json`.

## Ranking contract

Old-selector overlap 15/token; task/step overlap 10/token; compatible tag 5 and role 8; stable attributes: testid6/test5/cy5/id4/name4/aria3/placeholder2; visible +3, hidden -20, disabled -20; duplicate penalty min(2×count,20), unmentioned generic icon penalty30; exact id50, name/test attributes30, placeholder25; text old8/step6 plus12 for two-word overlap; row old8/step12; parent old5/step5; container step8. These are engineering weights from the thesis, not calibrated probabilities or proof of correctness. Tie-breaking remains DOM order. Sanitization precedes scoring.

## Context and retry budget

Defaults remain 30 candidates, 8000 combined candidate/HTML characters, 12000 complete-request characters and output500. After ranking and fitting, 1–4 candidates permit a cleaned supplement up to half DOM budget; zero candidates permit full bounded cleaned fallback. Supplement is trimmed before low-ranked candidates. On retry the same limit is reapplied after feedback is added; essential context/feedback overflow fails before dispatch. Character counts are not token counts; actual usage still requires a live response. The code does not promise that the smallest payload is most accurate or that the target always survives truncation.

## What the evidence establishes

Offline synthetic checks establish restoration of selected mechanisms, not equivalence to every old prototype behavior, not improved LLM accuracy and not a causal explanation for D24 false heals. No new live calls were made. D24 already had preprocessing and bounded requests, costing approximately US$0.0178; all recoverable targets were in the candidate list. Missing original-locator/feature/feedback signals are plausible contributors, but a controlled comparison would be needed to isolate their effects.

## Execution and next empirical checkpoint

1. D25 method/code/spec matrix and offline regressions are the current increment.
2. Review this matrix for the intended research-method identity, especially action pre-filter, generic context, finite normalization and stronger privacy. Do not label it exact replication merely because tests pass.
3. Before new private calls, audit the changed actual payload (now including stable attributes, original locator and sanitized HTML fallback), freeze a new package/host/protocol and budget, and retain all failures. Do not upgrade the D24 pinned host in place.
4. A future paired study must compare methods on equal input information; separate method restoration from optional further abstention changes. If causal context benefit is claimed, use an ablation. Do not add cases or repeats merely to obtain a favorable score.

No additional paid batch, publication or merge is authorized by this engineering completion.

## D27 / 0.0.7 correction, superseding affected D25 behavior

Decision [D27](../decisions/2026-09-14-candidate-recovery.md) retains the documented additive signals while removing repeated structural locator tokens and bare-parent-tag overlap. Every meaningful token contributes once; all exact stable-attribute matches can contribute once per attribute. Duplicate penalties use stable identity or meaningful labels; a shared CSS class does not make a unique control a duplicate. Distinct same-label entities remain separate candidates.

Unlike the historical soft visibility penalty, unavailable click/fill targets are excluded before ranking, including closed dialogs, hidden inputs, hidden ancestors, disabled and readonly controls for the relevant action. Referenced accessible labels can remain evidence even when visually hidden. Offscreen controls that can be scrolled into view remain eligible. Semantic ancestor/label evidence survives layout wrappers and is shared between candidate extraction and fresh admission.

Suggestions use stable attributes and generic host-text/container scopes, then Playwright checks both uniqueness and originating-node identity. A descriptor without a verified suggestion remains explicit with an empty selector; ranker-only cannot select an invented fallback. The provider may still compose another locator, so business-oracle checks remain necessary.

The new request projects away empty fields and redundant metadata while retaining nonempty evidence source names, explicit false state values and separate entity candidates. Budgets measure this actual projection, not the larger audit object. Both JSON null and the literal string `null` mean no selection. These are an engineering bundle, not proof of a new research contribution or an isolated explanation of future live outcomes. See the [D27 protocol](../evaluation/candidate-recovery-protocol.md).

D27 retains one verified primary suggestion per descriptor, stopping once Playwright proves its source-node identity. A shared per-snapshot selector cache avoids repeating identical queries across entities. This reduces verification work and repeated locator text; the descriptor and independent entity rows remain available, and full mode can still compose another supported locator. Scan/traversal exhaustion is reported as truncation, not complete coverage.

## D29 / 0.0.8 bounded deviation

[D29](../decisions/2026-09-14-owner-evidence.md) changes owner evidence extraction and null retry. Identity-only legacy owner fields can change rank scores despite unchanged ranking weights. Local action context is separate and has provenance. Unlike thesis/D25 repeated calls on a fixed null context, D29 refreshes observations at most once and requires changed selection evidence for another call. This is a declared method deviation, not a restoration of the original thesis. Contract phrase matching remains unchanged and is not semantic understanding.
