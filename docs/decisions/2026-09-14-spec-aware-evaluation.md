# Spec-aware method evaluation — 2026-09-14

### D26 — Execute all four method-validation stages
Wildan explicitly requested actual execution: diagnose the restored core on known cases, implement a generic target-spec prototype, compare core/context-only/enforced arms, freeze the method and evaluate new tasks. This authorizes the engineering and bounded new local evaluation required by that request. It does not authorize publication, merge, production targets or changing historical D24 artifacts.

Use a new persisted ledger, at most US$2, at most 980 requests, with separate baseline/development/holdout phases. Use approved gpt-4o-mini, temperature 0, output 500, at most three attempts. No automatic top-up or new ledger after a halt. Preserve unknown billing and partial results. Phase maxima: baseline 180, development 360, holdout 432, smoke 8. Historical 20 conditions are known regression data (3 repeats per arm); independent synthetic holdout comprises 16 conditions (3 repeats per arm), authored separately before core freeze. Reserve groups and all failures remain visible.

B/C receive identical requirement, applicability and evidence-policy data; only C enforces the generic policy. A without a spec preserves 0.0.5 payload/selection behavior. No source-specific branching, answer selectors or mutation IDs enter the contract. Versioned contracts are consumer-maintained testing input; the prototype does not automatically infer executable truth from arbitrary Markdown.

The owner-approved API configuration and local synthetic UI disclosure are reused within the newly requested study. Source/spec snippets sent as context are limited to synthetic test requirements and public UI descriptions; private source and raw application documents stay local.

Issue: https://github.com/wildanniam/self-healing-tool/issues/13. Stacked on PR #12; no merge or release.
