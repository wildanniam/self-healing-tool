# Component origin and inclusion inventory

Origin inventory started under task 1.1/INT-005 (issue #5). The current inclusion decisions are updated for the owner-authorized MIT GitHub release 0.1.0 (D37/issue #35); npm publication remains excluded.

| Component/category | Origin | Current inclusion decision |
| --- | --- | --- |
| Package contract, new click/fill adapter, new runtime/context/report modules | Newly authored in this repository from its agreed functional specifications and documented public Playwright/Node/OpenAI interfaces | Include project-authored source and compiled package under owner-selected MIT for release 0.1.0 |
| Independent fixture/demo and verification scripts | Newly authored synthetic examples in this repository | Include selected source in the repository; exclude tests and raw outputs from the npm tarball |
| Reference wrapper, orchestrator, validator, ranker, DOM extractor, prompt/parser, metrics and results store | Earlier thesis prototype; categories inspected for portability in the foundation audit | HOLD: no source copied or imported; component-level distribution eligibility remains unresolved |
| Reference patcher, Git services and PR automation | Earlier prototype maintenance automation | EXCLUDE: outside runtime scope regardless of technical portability |
| Reference application tests, DOM/snapshots, screenshots, records, report metadata and repository history | Restricted historical application/evaluation material | EXCLUDE: never copy into this package or demo |
| Private evaluation-host application, tests, auth helpers and sessions | Separate private repository | EXCLUDE from this repository/package; future integration stays in that host |
| OpenSpec, TypeScript, Playwright, Node types | Public npm packages with their own notices/licenses | Development dependencies or consumer peer; do not vendor their source/history |
| Local API credential, environment and generated diagnostic/report outputs | Owner environment and future runtime | EXCLUDE from Git/package |

Reference-origin filenames/categories are provenance metadata only; neither historical source nor raw artifacts are reproduced. No reference component has been marked approved. Extraction is selective at the architectural level; implementation here is new, not a renamed copy. The final package review is recorded under task 8.1 in [the public-release evidence](../evidence/public-release-2026-09-21.md).

D25/0.0.5 independently restores documented method components; reference source remains held out. See [method matrix](thesis-method-alignment.md). Excluding source/history was not a justification for omitting method signals. No distribution eligibility change is inferred.

## Shared reporting modules

`src/report-inspector.js`, `report-language.js`, `report-style.js` and `library-report.js` are packaged offline UI modules shared with the research presentation. `audit-capture.ts` records opt-in bounded provider evidence, and `report-adapter.ts` maps library actions without study controls. They introduce no dependency on archived research files. JavaScript browser clients use `allowJs` for emission and declarations; behavior is verified in browser and installed-package tests.


## D37 public release review

The owner selected MIT and authorized public GitHub distribution of this independently implemented tool on 21 September 2026. The excluded reference/private-host categories above remain excluded. Current-tree generated agent skills are removed; their historical third-party notice is retained. Repository history, GitHub records and package contents are reviewed separately; the review is an engineering audit, not a legal determination about external reference material.
