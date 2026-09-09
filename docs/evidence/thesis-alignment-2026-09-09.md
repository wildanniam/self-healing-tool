# D25 method-restoration verification — 0.0.5

Owner request: correct unexplained simplification of the thesis method. Issue #11; [decision](../decisions/2026-09-09-thesis-alignment.md); [method matrix](../implementation/thesis-method-alignment.md). This is independent implementation of documented mechanisms, not copied restricted prototype source and not empirical superiority/equivalence evidence.

## Implementation and scope

`src/context.ts` now extracts sanitized stable/semantic attributes, generic row/parent/container information and bounded cleaned supplement/fallback. `src/ranking.ts` implements the documented additive thesis signals/weights; `src/selectors.ts` offers a finite validated textual-normalization set. `src/runtime.ts` supplies sanitized old-locator context, retries null within the limit, passes rejected variants/counts/reasons to subsequent full requests, and records per-attempt request hashes/coverage. Report fields retain proposals and rejected variants. Positional selectors are not generated or accepted by the recovery normalizer. Model/provider defaults and original action/assertions are unchanged.

Every emitted request is fitted after feedback, with HTML trimmed before low-ranked candidates and visible failure when essential data cannot fit. Stable locator composition is no longer limited to exact prelisted structural strings; each resulting locator still requires one visible/enabled compatible live target. Privacy and semantic assessment remain separate. See the matrix for pre-filter/generic-container/parser/normalizer/wrapper differences; do not claim complete prototype parity.

## Verification

Environment: macOS arm64, Node 24.18.0, TypeScript 5.9.3, Playwright 1.62.1 Chromium. All runtime checks below avoid `.env` and paid model requests.

- Typecheck/build: pass.
- `npm run test:unit`: 21 passing tests (provider/request caps, usage/unknown accounting, metadata and report summaries).
- `npm run test:browser`: 29 passing tests, including eight new D25 cases plus 21 prior regressions. Checks cover exact illustrative ranking weights, old-selector attribute discrimination, duplicate/entity context and unique non-positional locator use; primary/sparse/empty fallback exclusion of script/style/SVG/evaluator/form/textarea/editable/hidden/email/token sentinels; actual second provider input with ambiguous count/reason; normalization before browser click; bounded requests on a noisy page; oversized feedback refusal; positional rejection; null retry and bounded exhaustion.
- `npm run test:consumer`: clean tarball install/import, normal fill and ranker recovery passed; 27-file allowlist includes the method-deviation document. No private application source, old prototype files or sessions are packed.
- `npm run demo:offline`: passed, output `output/demo/bda2d7f8-0a1e-45cf-b97b-96ea0b1275f0/report.html`; offline mechanism evidence only.
- Private D24 `validateFreeze(...)`: true after the increment; installed package/source hashes and the historical unknown ledger remain unchanged. No private E2E rerun or new API calls.

The initial browser run exposed three regressions: adjacent container text nodes joined a person's name with the button caption, destroying token boundaries. Text-node separators were restored, and all three entity regressions passed without changing expectations. Subsequent full run passed after adding explicit null retry. No private final-case outcome was used as a new passing test result.

## What remains

The tests establish the listed mechanisms and limits, not that LLM accuracy improved or that omitted context caused D24 failures. D24 already had preprocessing, low observed cost and complete recoverable target coverage. The revised method can use richer context up to the same caps; actual token/accuracy tradeoffs require separate live measurement. Method identity and the documented deviations need owner research review before a paper labels this the TA method. A later private experiment must audit the changed payload and freeze a new version/protocol/budget; do not overwrite D24, re-use its batch ID or selectively discard its wrong outcomes.
