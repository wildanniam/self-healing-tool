# Planned verification

This is an acceptance plan, not experiment results. [Traceability](traceability.json) maps every requirement to exact scenarios and implementation tasks. Evidence is added only after checks actually run.

| Area | Verification needed | Retained evidence |
|---|---|---|
| INT | Tarball install in clean consumer; explicit click/fill with native assertions; config rejection; supported compatibility; source inventory | Consumer environment/commands, inventory and package listing |
| HEAL | Missing-locator gate and bypass errors; attempt/time limits; intent preservation; malformed/code output; candidate/action distinction; provider failures | Offline contract/browser checks linked to scenarios |
| CTX | Action compatibility; card/table/dialog context; sentinel oracle exclusion in actual primary/fallback payload; truncation and target coverage | Synthetic fixtures, sanitized payload checks and coverage records |
| OBS | Separate run directories; all attempt effects; total/internal timing; unknown usage and cost denominators; omission/redaction and HTML escaping | Deterministic event fixtures and report checks |
| DEMO | Fresh clone without private host; localhost/redirect/request guard; isolated reset; offline/live separation; distribution inventory | Setup/browser checks and reviewed release manifest |
| EVAL | Independent oracle; fair method inputs; pilot/final separation; frozen manifest; missing/failure accounting; equal human-maintenance endpoints | Private run/study records with appropriate references and permitted summaries |

The prototype's previous results cannot establish any of these new requirements. A CI pass for this repository setup only establishes document/tooling checks. Unit or fake-provider tests establish mechanics, not empirical LLM effectiveness.

## Research review before collection

Wildan reviews whether cases represent the intended maintenance problem and whether the independent oracle checks both intended results and wrong effects. Freeze the manifest, methods, budget and analysis before final outcome inspection. The initial 20-case and six-participant proposals are scoped planning estimates, not a power analysis or generalizability guarantee.

If pilot results require a scope change, update the active change and decision record, then recheck affected scenarios. If a practitioner study is omitted, record the decision and remove unsupported practical-effort claims. A context ablation is necessary for a causal context-improvement claim; ranker-only alone does not isolate every design choice.
