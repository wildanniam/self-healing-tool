# D27 candidate-recovery engineering verification

Engineering evidence for decision D27 / issue #15. Empirical effectiveness is reported separately after frozen collection. This document is not manuscript text.

## Implementation

- `src/dom-context.ts` shares live-node evidence extraction between candidate collection and admission. Hidden/inert/closed-dialog/disabled/readonly action targets are excluded before ranking; explicitly referenced accessible labels and scrollable controls remain available. Generic semantic ancestors survive wrappers without incorporating a neighboring entity as the target's identity.
- `src/context.ts` ranks eligible descriptors, then verifies the best available primary locator with Playwright for uniqueness and identity of the originating node. A per-snapshot locator cache avoids repeated engine queries. Separate descriptors are never merged merely because labels/classes match; unavailable suggestions remain explicit omissions.
- `src/ranking.ts` retains thesis-derived additive signals while preventing repeated structural tokens and shared classes from dominating identity evidence.
- `src/provider.ts` projects canonical evidence to a compact wire representation used by both budget measurements and actual dispatch; source names and explicit false values remain. The string `null` means no selection.
- `src/selectors.ts` rejects positional syntax while preserving similar-looking text inside quoted literals. Supported candidates still receive ordinary action validation and optional contract admission.
- `src/privacy.ts` consistently excludes reserved evaluator lines and encoded representations of known omitted values. `src/runtime.ts` re-redacts earlier retained context after later fill values become known; original request measurements/hashes remain unchanged. No changes were needed to the original missing-locator classifier or admission decision algorithm.

## Verification record

Runtime: macOS arm64, Node24.18.0, Playwright1.62.1 Chromium. A preliminary clean-consumer smoke also passed on Node25.8.2, but the frozen experiment uses Node24 matching D26. Commands and retained logs are under `output/d27/verification/` (ignored local audit artifacts).

- Unit: `npm run test:unit`, 40/40 PASS.
- Final browser: `npm run test:browser -- --workers=1`,63/63 PASS (45.9 seconds).
- Clean consumer: `npm run test:consumer`, PASS on Node24.18.0: package import, normal fill, ranker recovery and contract admission.
- OpenSpec strict validation, traceability audit and audit-regression suite: `npm run check` PASS; `npm run test:audit`,7/7 PASS.
- Synthetic native preflight:222 checks,16 conditions/two groups,0 healer runs and0 provider calls. Fixture files/contracts remain byte-identical to D26; the new freeze additionally checks the native report's full fixture bundle against current files.
- Private harness audit:419 D26 files unchanged; exact cases, schedule, contracts, mutation logic and primary scoring retained. Production application build/typecheck and guarded local test-database preparation passed; the exact-artifact 25/25-check rehearsal passed before private freeze and repeated successfully within collection.

The initial sandboxed browser attempt did not execute test bodies because macOS denied Chromium bootstrap. The subsequent Node24 run completed56/59, exposing three new-test failures: overly broad generic-card inference around fields, insufficiently precise heading scope, and an incorrectly sized test feedback fixture. The code defects and test fixture were corrected; the final complete rerun above supersedes those implementation attempts without deleting their logs. All46 pre-existing browser tests passed during that initial authorized run, so previous D26 short-timeout failures were not reproduced under this environment/worker count.

Independent review added privacy, encoded omission, positional-literal and oversized-DOM checks. A300-entity/600-control stress fixture originally took about25 seconds with27 of30 shortlisted descriptors unaddressable; generic scoped identity and cached single-suggestion verification reduced this to about10.8 seconds with30/30 addressable. These are local diagnostic measurements on successive development builds, not D26-versus-D27 empirical metrics or isolated performance estimates.

## Bounds and remaining limits

Snapshot enumeration stops at20000 traversed elements or5000 candidate nodes. Text clones cap node visits, depth and text length; truncation is reported. These bounds are not a hard CPU or attribute-byte guarantee for the browser's native selector engine. The300-entity stress result leaves little room within the default15-second recovery budget; the unchanged study profile uses45 seconds. Consumers with large pages may still encounter context/time limits.

One unique locator proves structural identity at observation time, not business intent. Contract admission remains lexical and may reject valid repairs or accept a semantically wrong one. Known regression tasks cannot establish unseen generalization. Newly successful recovery must be assessed together with every wrong effect and unnecessary stop; no100% success or zero-risk claim is implied by passing engineering checks.

## Subsequent empirical counterexample

The frozen D27 synthetic rerun exposed a remaining CTX-007-S2 failure: the nearest semantic `aside` in h2-03 omits the shipment identity on its outer `section`. The correct locator is available and selected, but admission rejects it for missing entity evidence. The engineering passes above remain valid for their fixtures; they do not cover this nested-semantic case. Task 11.1 is reopened and CTX-007 is marked implemented rather than verified in the final traceability update. See the separate D27 evaluation evidence for complete outcomes, including a wrong admission on duplicate labels.
