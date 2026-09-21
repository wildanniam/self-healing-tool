# D37 — Public GitHub release audit

The owner authorized repository cleanup, release finalization/integration and public GitHub visibility, then selected MIT. Issue #35. npm publication is excluded. Version 0.1.0 packages the existing method and D36 report integration; it is not a new research result.

## Reviewed contents

Source, tests, standalone examples, requirements and synthetic research evidence are retained. Generated `.agents` skills are removed from the current tree; the OpenSpec MIT notice remains for historical copies. AGENTS is a concise current agreement; prior engineering decisions remain in docs and Git history. The documentation index separates use, development and research. Restricted reference source and private application source/raw records remain excluded. Owner-local paths, private-host issue links and organization labels in historical provenance do not provide access to those environments.

The npm archive is allowlisted to compiled code, selected guides, README, package metadata, MIT license and third-party notices. `private: true` deliberately prevents registry publication. GitHub visibility is independent. Private evaluation results cannot be fully reproduced from this public source; historical analyzers requiring unshared frozen inputs remain explicitly limited.

## Audit before public visibility

- Gitleaks 8.30.1, obtained from the official release with SHA-256 verified against its checksum manifest, scanned all reachable Git refs: 48 non-merge commit diffs, about 6.35 MB, no findings. The full commit graph also contains merge commits.
- A history path inventory examined 1,052 objects and found no tracked credential files, auth state, generated output folders, package archives or dependency directories matching the reviewed exclusion patterns.
- GitHub metadata export reviewed 35 issue/PR records, comments/review records and all 89 available Actions logs; no logs were unavailable and no Actions artifacts existed. Gitleaks scanned the exported data and commit metadata (about 7.13 MB), with no findings.
- Portable presentation records identify independent synthetic results/replay; no private-host records are loaded in their committed default snapshot. Existing provenance and adverse outcomes are retained.

These are bounded automated and content-review checks, not a guarantee that arbitrary future contributions contain no sensitive material. Raw audit exports stay outside the public repository. The checks below describe the release candidate. CI and anonymous access are separate deployment checks.

## Verification status

Local release-candidate verification on macOS arm64, Node 25.8.2 and Playwright 1.62.1:

- Clean dependency installation, typecheck, OpenSpec/traceability and whitespace checks passed.
- Unit: 58/58; browser: 90/90; presentation: 20/20; audit-regression: 7/7 passed.
- Packaged core consumer passed: independent installation, native action, ranker recovery, target-contract gate, captured request/output integrity and English/Indonesian report.
- Packaged Playwright lifecycle passed: 12 tests / 19 attempts, including retries/parallelism, primary-failure preservation, audit-off, CI opening policy and mobile/bilingual report behavior.
- The installed 0.1.0 archive has 55 files: compiled runtime/declarations, selected guides, README, package metadata and three license/notice files. Research data, scripts, tests, workflow files and secrets are excluded. An initial consumer check caught npm automatically including a nested README; renaming the repository documentation index to `docs/index.md` restored the intended allowlist, then the consumer and lifecycle checks passed.
- Gitleaks scans of the current-tree copy and generated archive returned no findings. The final committed state and GitHub records are checked again before visibility changes.
- PR #34 merged as `70c816e345fac41c62147f1f650f1cfcd659869b`. No runtime source or frozen evaluation data is changed by this release preparation.

Task 8.1 is complete for this reviewed release candidate. Task 8.3 remains pending until the linked release PR and the private Atlas checkpoint are present. The older paper/practitioner tasks remain open; the OpenSpec change is not archived. Public visibility and anonymous installation are not yet claimed by this candidate record. npm publication is outside the authorized scope.
