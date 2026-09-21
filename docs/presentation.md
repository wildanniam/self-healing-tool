# Supervisor presentation

The presentation workflow compares A (LLM without requirement rules), B (rules supplied as model context), and C (the B input plus checks before recovery actions). It uses the unchanged D30 / 0.0.8 core. The Indonesian HTML report is standalone and works offline.

## Show the existing evaluation

From this repository:

```sh
npm run demo
```

This creates a new `output/presentation/historical-*/results.json` and `report.html`, then opens the HTML in the default browser. It does not rerun the study, load `.env`, or call an AI provider. A new directory is created each time; existing files are never overwritten. `-- --no-open` disables the browser opener.

The report includes:

- A/B/C comparison, separate recovery and wrong-action denominators;
- controls, ordinary changes, unavailable/retired targets, misleading-label stress, and insufficient requirements;
- application/category/search filters and a wrong-action filter;
- an Inspeksi view with one case, A/B/C arm, repeat and attempt at a time;
- stage-by-stage DOM context/ranking, exact AI messages, available output, validator decisions, requirement clauses and independent effects;
- request counts, recorded token usage, and cost estimates using the retained D30 rate assumption;
- JSON/CSV export, printing of all filtered conditions, and source fingerprints.

The bundled snapshot contains all 198 independent-app executions. On the owner's prepared workstation, ignored `.presentation.local.json` connects the original independent archive and the separate private-host archive, yielding all 378 executions. A clone without the private archive explicitly reports its absence. It never invents the other 180 rows or fetches the private application.

For a different local setup:

```sh
npm run demo -- --synthetic /path/to/synthetic/results.json --private /path/to/private/run-directory
```

Alternatively, put `synthetic` and `privateDirectory` paths in ignored `.presentation.local.json`. For the independent data alone, omit the private source. Existing normalized report JSON can be reopened directly through its sibling HTML or loaded with `--snapshot` when no duplicate private source is configured.

By default, the private adapter copies outcome/accounting fields only. For authorized local diagnosis, add `--private-audit` or set `"privateAudit": true` in ignored `.presentation.local.json`. This includes allowlisted private task/context, selectors, recorded request/response bodies, rules and observed effects. It never loads browser sessions or provider credentials. `--summary-only` overrides the setting and omits private diagnostics. Generated diagnostic HTML/JSON and explicit per-run downloads are private local artifacts; do not share them as public examples. Packaging the library excludes presentation and private evaluation assets.

## Inspect a case

Click **Inspeksi** beside a condition. Select A, B or C, a repetition and (if available) a healing attempt. The left navigation shows eight stages:

1. **Aksi awal**: intended task, action, original locator and failure classification.
2. **DOM & ranking**: recorded attempt context, coverage counts, ranked candidates, features and any cleaned DOM supplement.
3. **Input ke AI**: the stored system prompt and user message, model settings, byte count and SHA-256 checks. Download the original body for independent comparison.
4. **Output AI**: recorded provider text when available and the separately recorded parsed locator.
5. **Validasi locator**: technical admission, rejected variants and feedback sent to that attempt.
6. **Aturan requirement**: B supplies context; C additionally checks declared clauses before action. Each available clause result shows evidence and its matched source.
7. **Bukti hasil**: independent outcome assessment and observed effects, separate from the AI's choice or the validator's admission.
8. **Sumber & batas**: source identity, stored configuration and gaps in capture.

Start with **F-C01 → Aksi awal**: the original locator succeeds, so AI and candidate-check stages are explicitly skipped. **F-R01 → Input ke AI** demonstrates an actual platform recovery request. **h1-06 → C → Aturan requirement** shows a rejected candidate; compare B on the same condition. **h1-05 → Bukti hasil** retains the misleading-label failure.

Some older data cannot support a complete trace: raw DOM before cleansing, discarded nodes and per-feature score contributions were not recorded. The 180 independent historical requests retain only parsed responses; the 144 private-host requests also retain raw output. These gaps are labeled, never reconstructed as original evidence. New replay/live presentation captures store the provider input and returned text; replay text remains labeled replay. Successful request hash verification confirms agreement with retained fingerprints, not independent attestation by the provider.

**Unduh ringkasan JSON** omits private diagnostic objects; **Unduh bukti run** explicitly includes the selected run's locally loaded audit. Both retain source/evidence labels. JSON details expand on demand. Keyboard navigation and Escape/back return to the overview; the layout adapts to mobile.

## Walk through browser actions

```sh
npm run demo:walkthrough -- --step
```

A visible Chromium window runs three illustrative conditions, each in A/B/C:

| Condition | Intended lesson |
|---|---|
| Attribute change (`h1-02`) | A broken locator can recover to the intended field. |
| Target removed (`h1-06`) | A/B perform a wrong action; C stops in the retained example. |
| Misleading label (`h1-05`) | All three still act incorrectly; the method has a known limit. |

Press Enter in the terminal before each configuration and after inspecting its result. The result panel is added after recovery and outcome assessment, so it cannot influence candidate extraction. Screenshots and a separate JSON/HTML report are saved under a new `replay-*` directory. The report opens when all nine steps finish. Without `--step`, the sequence advances automatically with a short pause.

**This mode replays recorded model decisions.** Browser interactions, library checks and independent assessments actually run; model inference does not. Each model request must match the original serialized-input SHA-256 before its recorded decision can be consumed. Mismatches remain visible and produce a nonzero exit. It is a repeatable presentation, not new model-performance evidence.

The applications here are independent test fixtures for inventory and shipping, not Koderea screens. The full historical report includes the separately collected platform results. There is no production login, magic-link dependency or production traffic in this walkthrough.

## Optional fresh model inference

Only when intentionally running a new paid demonstration:

```sh
npm run demo:live:compare -- --env-file /absolute/path/to/.env --step
```

This runs the same nine slots with fresh model calls and a new ledger per invocation (maximum 27 transport requests and US$0.10 using retained rate assumptions). Existing experiment ledgers are never reused. The D30 model/settings are retained; `.env` supplies the key and is not printed. Without a key, the command fails before opening services or sending requests. Results can differ from replay and are saved separately under `live-*`. Do not repeatedly run it as though it were free.

No paid live comparison was executed while implementing this workflow. Its missing-key guard and underlying provider/budget behavior were checked offline; the nine-step browser replay was executed. This distinction should remain visible in the presentation.

## Suggested five-minute sequence

1. Open `npm run demo`. Explain A/B/C and that 378 means repeated executions of 42 conditions, not 378 independent cases.
2. Show ordinary C recovery: 36/36 platform and 30/36 independent apps. Keep their denominators separate.
3. Show negative wrong actions: 15/24, 9/24, 0/24. Open the risk example to explain why executing an action is different from hitting the intended target.
4. Run the step walkthrough if time allows. State that the model decisions are replayed while the browser and checks run now.
5. Show the misleading-label limit: six wrong actions per arm in the historical stress category. Ask for methodological feedback without suggesting all false healing has been solved.

## Setup and troubleshooting

- Node 24/25 and Chromium for Playwright 1.62.1 are required for the walkthrough. On a fresh checkout: `npm ci --ignore-scripts`, then `npx playwright install chromium`.
- If automatic opening fails, open the printed `report.html` path directly.
- `--step` needs an interactive terminal. Use the default automatic mode in noninteractive runners.
- For unattended verification: `npm run demo:walkthrough -- --headless --no-open --pause 0`.
- A missing configured source fails with its path error; it does not silently replace a full comparison with incomplete data.
- A replay mismatch means the recorded input no longer matches this checkout. Do not edit the expected result to force a pass; use the matching D30 core/fixtures or record a separately authorized new demonstration.
- Press Ctrl-C to stop. Intermediate progress is retained; an interrupted sequence is not a complete report.

See [D32 inspection verification](evidence/inspectable-report-2026-09-16.md), [D32 decision](decisions/2026-09-16-inspector.md), and historical [D31 verification](evidence/presentation-demo-2026-09-16.md).
