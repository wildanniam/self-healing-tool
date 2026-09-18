# Supervisor presentation

The standalone offline report starts with execution outcomes. Historical evidence has separate RM1 (DOM ranking, D33) and RM2 (target rules, D30) studies. Their denominators, model input settings and conclusions are not pooled. Presentation and generic library reports use the D34 four-group hierarchy; the recovery core remains D30 / 0.0.8.

## Show the existing evaluation

```sh
npm run demo
```

This creates a new `output/presentation/historical-*/results.json` and `report.html`, then opens the HTML in the default browser. It does not rerun research, load `.env`, or call an AI provider. Output refuses overwrite. Add `-- --no-open` to suppress the browser opener.

The default portable snapshot contains 198 independent D30 executions. The owner's ignored local configuration adds 180 private-host D30 executions and the 108 archived D33 main executions. Missing sources are stated explicitly; a configured but unreadable source fails instead of silently replacing it. D33 pilot records are excluded.

```sh
npm run demo -- --ranking /path/to/d33/main/records --synthetic /path/to/d30/results.json --private /path/to/private/run-directory
```

The ignored `.presentation.local.json` accepts `rankingDirectory`, `synthetic`, `privateDirectory` and `privateAudit`. Ranking is a read-only adapter over existing D33 main files, not a new experiment or a migration of the D33 research runtime. A clone without that archive displays a missing RM1 notice; it does not fabricate a portable copy.

The **Hasil eksekusi** view shows one button for each available arm/repeat. Search, application, category and wrong-action filters affect both JSON and CSV export. The wrong-action filter retains all arms of matching cases for comparison. Pagination affects only the screen; printing and exports include all filtered cases. JSON also records source count, selection, source fingerprints, evaluation date and price assumptions. A filtered snapshot is labeled when reopened.

**Perbandingan studi** is secondary and uses all loaded rows of the selected study, independent of case-list filters. RM1 shows target coverage, correct recovery, wrong actions and stopping. RM2 separates controls, ordinary recovery, negative cases, misleading-label stress and missing/stale requirements. Recorded tokens, time and cost assumptions are collapsed. Repeated executions are not independent cases; do not describe a combined RM1/RM2 success rate.

Reopen either a complete schema-2 report bundle or a filtered schema-1 export without injecting locally configured source rows:

```sh
npm run demo -- --snapshot /path/to/results.json --no-open
```

Private diagnostics require explicit local opt-in: `--private-audit` or `"privateAudit": true` in local configuration. `--summary-only` overrides that setting. Snapshot reopening ignores the local opt-in unless `--private-audit` is explicitly passed. Generated diagnostic HTML/JSON and explicit run downloads remain private local artifacts. Ordinary JSON export strips private audit objects; CSV uses outcome fields only. The library package excludes presentation/evaluation assets.

## Inspect the selected execution

Click a specific result, for example **S-S-L / R1 / repeat 2**. The inspector opens that exact identity, not an arbitrary default C run. Switch arm, repeat or attempt to compare related evidence. The original locator and that attempt's replacement appear next to the outcome. Four groups organize the process:

1. **Konteks DOM**: initial action/failure, retained coverage and candidate order, selected DOM fields, and available raw/cleaned DOM. D33 target rank, top-30 and post-budget annotations are evaluator evidence, not AI inputs.
2. **Input dan jawaban AI**: paired request/response from one attempt. Expand system/user messages or download/copy the stored request. Model, limits, hashes and response metadata are collapsed; raw response and parsed locator remain distinct.
3. **Pemeriksaan**: basic locator admission, rejected variants, feedback and optional target-rule decisions. Contract checks are disabled for all RM1 strategies. In RM2, B supplies context and C also enforces declared clauses before action.
4. **Hasil aksi**: independently assessed effects. Successful execution alone does not establish correctness; native controls, unassessed actions, rejected candidates and wrong effects have separate labels.

Source identity, configuration and capture limitations are available in a separate collapsed disclosure. Escape returns focus to the result that opened the inspector. Keyboard operation and mobile layouts are supported; mobile tables scroll locally while keeping the case identity visible.

Useful examples: **F-C01** is a native control with no AI call; **S-A-L/R1** loses its target after the character budget; **S-S-L/R1** loses it outside top-30 and returns null. In RM2, **h1-06/C** stops after rule rejection, while **h1-05/C** retains the misleading-label failure.

Capture limits are preserved. D30 lacks pre-cleansing raw DOM and per-feature score contributions. Its 180 independent requests retain parsed responses only; 144 private-host requests retain raw output. D33 main retains all 108 original request bodies and raw outputs plus raw DOM, but not individual feature-score contributions. Byte/hash agreement verifies consistency with the retained fingerprint, not provider attestation. No missing response or internal AI reasoning is reconstructed. Replay stays explicitly labeled.

Generic reports produced by `writeReport()` also show outcome and four collapsed groups, using the existing safe `reportView`. They intentionally do not gain archived full provider bodies or raw DOM just for presentation parity; these absences are stated. Their safe JSON projection and normal download files remain available.

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

1. Open `npm run demo`. Show RM1 target coverage, then switch to RM2. Explain R0/R1/R2 and A/B/C separately: 108 and 378 are repeated executions, not independent cases.
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

See [D34 simplification verification](evidence/report-simplification-2026-09-18.md), [D34 decision](decisions/2026-09-18-report-simplification.md), historical [D32 inspection verification](evidence/inspectable-report-2026-09-16.md), [D32 decision](decisions/2026-09-16-inspector.md), and historical [D31 verification](evidence/presentation-demo-2026-09-16.md).
