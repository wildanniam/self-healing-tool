# D35 packaged bilingual action reports — 20 September 2026

Issue #29; `build-self-healing-tool`, OBS-012, tasks 17.1–17.3. Standard implementation, stacked on D34 / PR #28. The owner authorized report work first and instructed that the paper describe final tool capabilities without migration history. No manuscript, frozen research source, selection formula, prompt or recovery-policy change was made. No paid inference, publication, merge or release occurred.

## Delivered behavior

- `createHealingSession(page, {audit: true, ...})` records actual adapter request bodies and returned output text, associated with event/attempt IDs. `session.audit()` is separate from ordinary snapshots. The built-in and budgeted adapters forward the optional capture sink. Custom adapters without the sink retain missing request evidence.
- Captures have per-entry/session size bounds. Late, unavailable and withheld evidence is explicit. Invalid returned model text is still inspectable. Known omissions, including later fill values, are reapplied with redaction status and original fingerprints. Request hash agreement is archive consistency, not provider attestation.
- `writeReport(snapshot, {directory, audit: session.audit()})` and `renderReport(snapshot, price, {audit})` use the packaged inspector shared with the research report. Both expose four stages and exact attempt selection; consumer reports have action navigation without study controls. Summary JSON remains payload-free; diagnostic HTML/JSON is local, explicitly supplied and owner-readable.
- English defaults with a Bahasa Indonesia selector. Authored labels/explanations are translated; evidence messages, returned text, selectors and recorded descriptions stay unchanged. Selection, filters and open disclosures survive switching. The UI is outcome-first, with long records collapsed and locally scrollable.
- Original success, provider failure, malformed output, null selection, executed-but-unassessed action, wrong effect, replay and missing payloads remain distinct. No evaluator data enters provider inputs.

## Verification

Environment: macOS arm64, Node 25.8.2, Playwright/Chromium 1.62.1. Browser and clean-consumer commands required host launch/npm-cache permissions; the initial sandbox Chromium launch failed before testing and was rerun with those permissions.

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run build` | Passed |
| `npm run test:unit` | 45/45 passed; includes exact dispatch-body capture using a mocked transport, byte identity, late capture rejection, redaction and bounds |
| `npm run test:browser` | 85/85 passed; includes paired retry input/output, missing custom-adapter request, safe default, duplicate/mismatched identity rejection, native skip, language changes, downloads and mobile layout |
| `npm run test:presentation` | 20/20 passed; existing research behavior, replay/unknown/private boundaries and new bilingual selection/filter/evidence preservation |
| `npm run test:consumer` | Clean tarball installation, real browser normal/recovery/contract actions and full audit report in EN/ID passed; no research archives/presentation fixtures enter package |
| `npm run check`, `npm run test:audit` | Strict OpenSpec/traceability passed; 7/7 audit tests |
| Read-only local archive preview | Prepared D34 snapshot remains 108 RM1 rows and 378 RM2 rows; RM1 R0/R2 correct 36/36, R1 correct 30/36, wrong 3, stopped 3 |
| Source integrity | Consumed D34 snapshot and selected D33 source-record hashes unchanged around rendering; input objects unchanged. This is not a fresh scientific collection or a new audit of all original source files |
| Browser/visual | Desktop 1440×900 and mobile 390×844 inspected; no document overflow or page errors in tested paths. Current Chrome previews show the same S-A-L/R1/repeat-1 request/output and wrong effect in both report shells |

The generic-report regression now exercises the new inspector navigation rather than the removed inline disclosure layout. Its privacy, escaping and unassessed assertions remain. Legacy Indonesian presentation tests explicitly switch language after asserting the new English default; a separate test checks the bilingual path and byte-exact request download. Provider-failure copy is checked on the rendered browser page rather than by searching a static HTML substring.

## Limits

Pre-cleansing raw DOM and individual score contributions are not automatically captured by this library increment. Existing research records can show additional retained observations; missing evidence is never reconstructed. A custom adapter must supply its actual request body to expose it. Generated local diagnostic reports may contain application context; review before sharing. The optional capture adds diagnostic work inside the existing recovery deadline, so its timing must not be treated as a measurement-identical rerun of frozen experiments. No live API request was used for verification, and no usability study or new model-performance claim is made.

Implementation: `src/audit-capture.ts`, `report-adapter.ts`, `library-report.js`, `report-inspector.js`, `report-language.js`, `report-style.js`, the provider/runtime hooks, and `presentation/report.mjs`. Tests: `tests/audit-capture.test.mjs`, `tests/audit-report.spec.ts`, presentation regression tests and `scripts/check-consumer.mjs`. Local preview/provenance are ignored under `output/d35-preview/`; visual captures are `output/d35-*.png`. See [integration guide](../integration.md#local-action-audit-reports), [design](../../DESIGN.md) and [decision D35](../decisions/2026-09-07-foundation.md#d35--packaged-bilingual-action-inspection-20-september-2026).
