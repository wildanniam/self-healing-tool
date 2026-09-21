# D32 inspectable report

### D32 — Inspect method execution with source-backed evidence

Wildan explicitly requests deeper inspection of every case/method and improved report UX on 16 September: AI input/system prompt/output, DOM cleansing/ranking, rejection reasons and why an outcome is correct. Implement under issue #23 on the D31 branch. This authorizes local inspection of the designated private archive, not public disclosure of it. Keep diagnostic content in ignored local outputs and out of ordinary exports.

Operational design: a single-run inspector with case/arm/repeat/attempt controls and stage navigation. Preserve the original overview, evidence modes and all outcomes. Do not invent data absent from old archives. F-C01 is a control with no AI call; explicitly show skipped stages and independent outcome flags. Archived independent responses may retain only parsed proposals; label that limitation.

No core-method changes, paid evaluation, archive mutation, merge or release are included. OBS-010 and tasks15.1–15.3 define acceptance.
