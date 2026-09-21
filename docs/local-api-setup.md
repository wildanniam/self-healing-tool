# Local OpenAI setup

The owner selected the reference prototype's non-secret configuration on 2026-09-08. [Decision D18](decisions/2026-09-08-local-api.md) records the scope. These settings now drive the explicit runtime configuration and provider adapter. Offline verification and a synthetic demo are available; no live request has been made for this increment.

## Configure locally

Open the Git-ignored `.env` at the repository root and fill `OPENAI_API_KEY` locally. A blank-key file was created for the owner; an existing file must be preserved. For a fresh clone, copy [the template](../.env.example) only when `.env` does not exist. The template deliberately contains no credential.

| Variable | Initial value | Meaning |
|---|---|---|
| `OPENAI_MODEL` | `gpt-4o-mini` | Selected development model alias |
| `OPENAI_MAX_TOKENS` | `500` | Output token cap per model response, not total input/output token usage |
| `OPENAI_TEMPERATURE` | `0` | Requested sampling setting; not a guarantee of identical outcomes |
| `HEALING_MAX_RETRIES` | `3` | At most three healing attempts in the reference orchestrator (1 through 3), rather than three additional attempts |
| `HEALING_DOM_MAX_CHARS` | `8000` | Reference DOM-context text limit, not a cap on every token in the complete model request |

The reference uses the OpenAI SDK's Chat Completions API. The new adapter retains Chat Completions and these names using an explicit HTTP transport with no hidden retries. It validates configuration, bounds execution and records known/unknown usage. Unknown model values must produce an explicit error rather than silently copying the reference's fallback behavior. Final model/version, timeout, complete-payload limits and experiment budget remain part of the later protocol freeze.

## What works at this stage

`npm run check` and `npm run test:audit` validate the specification workspace without loading `.env` or calling OpenAI. Entering a key does not start a request. Runtime/provider validation now has offline tests. The full live demo requires an explicit request cap as well as the key; a key alone does not authorize a paid run.

The five non-secret values were compared with the reference configuration. A shared model/response limit does not define an overall spending ceiling: total usage also depends on input context, attempts, cases and repetitions. Prepare a budget estimate before live collection and use any authorization already supplied for that scope.

`.env` and `.env.*` are ignored by Git except `.env.example`. Keep credentials and authentication state in their own local environments. This library setup does not require application login credentials or runtime GitHub automation tokens. Do not copy an old application's entire environment into this package.

## Provenance

- Owner request dated 2026-09-08: use the same API configuration as the reference thesis prototype; the owner will enter their own key.
- Read-only inspection of the reference's `src/self-healing/config.ts` and `src/self-healing/openai/llm-client.ts`, plus an allowlisted comparison of the five non-secret environment values. No credential values or private application settings are reproduced.
- [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-4o-mini), checked 2026-09-08. Model availability in documentation does not prove this local key/account has been tested.

## New runtime limits

The initial implementation adds these defaults without modifying the owner's existing `.env`: action timeout 1000 ms, recovery budget 15000 ms, provider timeout 5000 ms, complete-payload cap 12000 characters and 30 candidates. Candidate JSON retains the 8000-character limit. See [integration instructions](integration.md) for definitions and supported configuration.

`npm run demo:offline` does not read `.env`. After a bounded live run is authorized, `npm run demo:live` explicitly uses Node's environment-file support; set `HEALING_LIVE_MAX_REQUESTS` (1–9) and `HEALING_LIVE_BATCH_FILE` pointing to a new explicitly initialized persistent budget ledger. The script rejects missing keys/caps before model requests. Do not run the live command merely to check that a key exists. A mock transport test does not establish account access or actual model accuracy.
