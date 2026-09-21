# Component origin and inclusion inventory

Prepared for OpenSpec task 1.1 / INT-005 under issue #5. This is an engineering inventory, not a legal determination or public-release approval.

| Component/category | Origin | Current inclusion decision |
| --- | --- | --- |
| Package contract, new click/fill adapter, new runtime/context/report modules | Newly authored in this repository from its agreed functional specifications and documented public Playwright/Node/OpenAI interfaces | Include in the private development package; public license/release remains an owner decision |
| Independent fixture/demo and verification scripts | Newly authored synthetic examples in this repository | Include selected source in the repository; exclude tests and raw outputs from the npm tarball |
| Reference wrapper, orchestrator, validator, ranker, DOM extractor, prompt/parser, metrics and results store | Earlier thesis prototype; categories inspected for portability in the foundation audit | HOLD: no source copied or imported; component-level distribution eligibility remains unresolved |
| Reference patcher, Git services and PR automation | Earlier prototype maintenance automation | EXCLUDE: outside runtime scope regardless of technical portability |
| Reference application tests, DOM/snapshots, screenshots, records, report metadata and repository history | Restricted historical application/evaluation material | EXCLUDE: never copy into this package or demo |
| Private evaluation-host application, tests, auth helpers and sessions | Separate private repository | EXCLUDE from this repository/package; future integration stays in that host |
| OpenSpec, TypeScript, Playwright, Node types | Public npm packages with their own notices/licenses | Development dependencies or consumer peer; do not vendor their source/history |
| Local API credential, environment and generated diagnostic/report outputs | Owner environment and future runtime | EXCLUDE from Git/package |

Reference-origin filenames/categories are provenance metadata only; neither historical source nor raw artifacts are reproduced. No reference component has been marked approved. Extraction is selective at the architectural level; implementation here is new, not a renamed copy. Public eligibility of the final package will be reviewed under task 8.1.
