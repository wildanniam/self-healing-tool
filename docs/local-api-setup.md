# Local OpenAI setup

The owner selected the reference prototype's non-secret configuration on 2026-09-08. [Decision D18](decisions/2026-09-08-local-api.md) records the scope. These settings prepare development; this repository does not yet contain the runtime loader, provider adapter, or runnable healing demo.

## Configure locally

Open the Git-ignored `.env` at the repository root and fill `OPENAI_API_KEY` locally. A blank-key file was created for the owner; an existing file must be preserved. For a fresh clone, copy [the template](../.env.example) only when `.env` does not exist. The template deliberately contains no credential.

| Variable | Initial value | Meaning |
|---|---|---|
| `OPENAI_MODEL` | `gpt-4o-mini` | Selected development model alias |
| `OPENAI_MAX_TOKENS` | `500` | Output token cap per model response, not total input/output token usage |
| `OPENAI_TEMPERATURE` | `0` | Requested sampling setting; not a guarantee of identical outcomes |
| `HEALING_MAX_RETRIES` | `3` | At most three healing attempts in the reference orchestrator (1 through 3), rather than three additional attempts |
| `HEALING_DOM_MAX_CHARS` | `8000` | Reference DOM-context text limit, not a cap on every token in the complete model request |

The reference uses the OpenAI SDK's Chat Completions API. The initial adapter should preserve that interface and these names, then implement INT-003 validation, bounded execution and accurate resource accounting. Unknown model values must produce an explicit error rather than silently copying the reference's fallback behavior. Final model/version, timeout, complete-payload limits and experiment budget remain part of the later protocol freeze.

## What works at this stage

`npm run check` and `npm run test:audit` validate the specification workspace without loading `.env` or calling OpenAI. Entering a key does not start a request. Runtime/provider validation is still task 2.1 and remains unchecked.

The five non-secret values were compared with the reference configuration. A shared model/response limit does not define an overall spending ceiling: total usage also depends on input context, attempts, cases and repetitions. Prepare a budget estimate before live collection and use any authorization already supplied for that scope.

`.env` and `.env.*` are ignored by Git except `.env.example`. Keep credentials and authentication state in their own local environments. This library setup does not require application login credentials or runtime GitHub automation tokens. Do not copy an old application's entire environment into this package.

## Provenance

- Owner request dated 2026-09-08: use the same API configuration as the reference thesis prototype; the owner will enter their own key.
- Read-only inspection of the reference's `src/self-healing/config.ts` and `src/self-healing/openai/llm-client.ts`, plus an allowlisted comparison of the five non-secret environment values. No credential values or private application settings are reproduced.
- [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-4o-mini), checked 2026-09-08. Model availability in documentation does not prove this local key/account has been tested.
