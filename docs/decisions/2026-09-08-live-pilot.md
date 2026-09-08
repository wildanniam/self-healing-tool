# Pilot case and live API authorization — 2026-09-08

### D20 — Five development case meanings accepted

After reviewing the browser steps, controlled mutations and independent outcomes, Wildan explicitly accepted the five private pilot cases: two normal controls, profile locator drift, ambiguous entity-trigger drift and an absent target. The accepted scope is development-pilot task meaning, not the final twenty-case manifest, a desired success rate or a public-release decision. Case details remain in the private-host issue #174/PR #175.

### D21 — One bounded live development batch authorized

Wildan explicitly approved proposal P01: use the configured OpenAI key/model for one synthetic-demo plus private-local-pilot batch, **at most US$0.25 inference spending and 15 total requests including retries/failures/timeouts**. Phase caps are six demo requests and nine private-pilot requests. Two normal private controls require zero provider calls. Model is the existing D18 gpt-4o-mini profile, output cap 500 and three recovery attempts; no model fallback. This authorization persists: do not ask again before individual calls/cases within it.

Prepare and verify the batch limiter and payload audit before dispatch. Preserve failed/incomplete runs and unknown usage; an unreconciled request stops further spending. Record all outcomes without success-driven reruns. Offline engineering and baseline runs remain independently authorized by D19. Final evaluation, additional spending beyond this batch, merge, release, participant contact and submission are separate decisions; none is implied here.

Use the local environment file only in the execution process; never print or commit the key. The private host retains its app source, auth helpers, raw context and reports. No production target or top-up is authorized. See Atlas Vault's pilot approval/budget note for conversation provenance and the official pricing source.
