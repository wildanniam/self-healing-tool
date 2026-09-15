# D30 evaluation protocol

## Authorization and scope

On 15 September Wildan explicitly accepted the proposed evaluation and requested execution, per-step checks, root-cause investigation of unexpected results, and a concise report. Work is standard evaluation engineering; local database preparation is restricted to the existing dedicated loopback guard. The GitHub issue creation was rejected by automatic approval review as external publication, so work proceeds on local branch codex/d30-scoped-evaluation with review-ready issue/PR text only. Do not bypass that restriction.

Use the unchanged 0.0.8 core from f10477b (runtime source identical to 94e55b6). Keep all old cases, contracts and effect oracles. Freeze a new plan before any AI outcome: 180 known private slots and 198 synthetic slots (16 known plus six new ordinary-change variants, three arms and three repeats). New variants use existing application families and are not independent application evidence.

The operational cap is one fresh US$2 / 980-request ledger, phases baseline180, development360, holdout540. It is a ceiling, not expected spending. Keep model gpt-4o-mini, temperature0, maxTokens500, maxAttempts3, timeouts3000/45000/15000ms and budgets8000/12000chars with maxCandidates30. Retain unknown usage and halt; no automatic top-up or repeating failed collections.

Report controls, ordinary recovery, unavailable/retired refusal, misleading-label stress, and missing/stale contract separately. The classification is declared after exploratory D26–D29 results and before D30 outcomes. Old aggregate scores are not overwritten. Paraphrase remains in scope even if it fails. No method/prompt/contract/scoring changes during collection; diagnosis is separate and subsequent fixes need an identified later experiment.

Private source/raw outputs remain in their own repository. Synthetic observations only in this repository. No production, merge, release, external email or conference submission. No universal accuracy claim or score target is guaranteed.

## Frozen workload and outcome rules

Known synthetic h1/h2-01 are controls; -02/-03/-04 ordinary attribute/structure/wording recovery; -05 deliberately misleading-label stress; -06/-07 unavailable/retired; -08 missing/stale prerequisite. Six new variants n1/n2-01/-02/-03 cover changed attributes, rewrapped/reordered controls, and ordinary wording, without altering business handlers or contracts. Native execution must prove every intended action and wrong-effect oracle before collection. Repeated labels with distinguishable owners remain present.

Use a fresh browser context/reset per arm and balanced A/B/C rotations. A omits the target contract; B supplies context; C adds admission. B/C first-payload and contract hashes are audited. Runtime sees only task/failed locator/observed UI plus the applicable contract, never case IDs, expected selector, state oracle or result.

For ordinary recovery, success requires original failure, healing action, independently correct business effect and no wrong action. No provider/setup failure is silently discarded. Report planned/started/completed counts, normal no-AI behavior, ordinary correct and false healing, stress outcomes, refusal/unknown, time, requests/tokens/cost, and all failures by condition. Report known and fresh variants separately; repeats are not independent cases.

Before collection: engineering checks, native/oracle preflight, exact payload/privacy/budget checks, core/fixture/harness/config/protocol/runtime freeze. After collection: frozen hash recheck, exact request/ledger ownership and complete outcome audit. Root-cause claims require replay/source evidence; AI decision causality remains uncertain without isolation.

Precollection correction: the initial draft request ceiling 1,134 exceeded the unchanged library maximum of 1,000 and ledger creation was rejected before any dispatch. The corrected ceiling is 980: at most 324 non-control slots × three attempts = 972. The core limit is retained.
