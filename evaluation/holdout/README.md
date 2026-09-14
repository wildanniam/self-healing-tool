# Independently authored D26 holdout

This directory owns two synthetic applications and their evaluator. It imports no library implementation or provider. Contracts were written and fingerprinted before fixture implementation. The author read the public D26 schema, not the new core implementation. No healer/model execution is permitted before the parent freezes the core, configuration and protocol.

`createCases()` in `cases.mjs` returns the public interface in `interface.mjs`. There are 16 conditions, eight in each of two application-level holdout groups. Keep all variants of each application together. The applications use different layout, event handling and state: a table/fieldset inventory form with explicit persistence versus a card/lane dispatch board with an entity-bound editor reducer. No network assets, production data or source from other applications are used.

## Boundary

Only `action`, `originalSelector`, optional `value`, legitimate `task`, and the explicitly loaded contract/deployment revision belong in runtime input. Case identifiers, classifications, `expectation`, `nativeReferences`, state readers, expected dispositions and assessments are evaluator-only. The source files and native reports reveal oracle details; freeze the core before inspecting them for method design. Run metadata must never be serialized as provider context.

`setup(page)` and `reset(page)` require a runner-provided loopback HTTP(S) URL and replace the page using standalone HTML/scripts. Reset creates a fresh application state and event journal. For fill, call `afterAction(page)` only when the wrapped action succeeded; this is the consumer's normal save step. Do not call it after a refused/failed wrapper. Click needs no follow-up. The optional event argument of `assess` is deliberately unused: the application state, not the healer's verdict, determines business effects.

## Endpoints

`goalExpected` is `action` where the intended operation is available, and `refusal` where preserving state is the correct outcome. `intendedRecoverable` describes physical/behavioral availability, not the gate's confidence. Missing/stale specifications are still behaviorally recoverable fixtures; `expectedAdmission: unknown` identifies the separate conservative contract-policy endpoint. Refusing those cases is safe but does not accomplish the business task. Do not silently count it as completed task success or collapse the policy and business outcomes.

Every case also provides evaluator-only `expectation` before setup, so planned denominators retain setup and assessment failures. Its `goalExpected` and `intendedRecoverable` match the oracle endpoints. `recoveryExpected` denotes whether the original locator is expected to fail and excludes normal controls. `specApplicable` means an active, revision-matching contract is available for attempting this action; it is false for missing, stale, and retired contracts. A retired document can correctly apply to the release while its former action is no longer allowed: this field does not label that retirement document erroneous. Physical recoverability and policy permission are distinct, and an unknown/no-action decision remains separate from business-task completion.

`semantic` is correct only when the intended state is reached, or the expected no-action state is preserved, and no wrong effect occurred. `wrongEffect` considers the whole event journal, including wrong interactions subsequently corrected. Inventory assessment reads stored application state after the consumer save, independent of the input locator. Shipment assessment reads entity/section bindings and the action journal, independent of button identity. These are evaluator-specific state APIs, never model inputs.

The generic adapter phrases are fallible observable evidence. Contracts are unchanged across UI-only variants. They are not extended with paraphrase aliases or exception rules after inspecting holdout performance. Equivalent UI can therefore expose false refusals; ambiguous controls can expose incorrect admissions. DOM evidence is not a guarantee of business identity. The explicitly retired contracts state that the particular manual action is discontinued, rather than inferring prohibition from a missing requirement.

## Native verification only

Run `node evaluation/holdout/native-preflight.mjs` from the repository root. It checks contract fingerprints, schema shape, original-locator controls/zero-match mutations, pristine and mutated native mappings, negative-state preservation, deliberately wrong actions, persistence of wrong-effect evidence after subsequent success, complete resets, and local resource confinement. Reports are timestamped under `evidence/` and labelled `native-preflight-only`, with zero healer runs/provider calls. Native checks are validity evidence, not model performance, and are not additional independent cases.

`preflight-status.json` exposes only aggregate status, counts and report/bundle hashes for the parent freeze check. It and the timestamped `evidence/` directory are excluded from the source bundle hash to avoid recursive/self-changing hashes; the status pins the report separately. Planned expectation metadata is checked against native observations and parsed contracts without importing the healer.

The practical suite is exploratory and covers bounded click/fill recovery. It does not estimate a population-level error rate, include arbitrary workflows, prove that specifications are complete, or test proactive conformance when the original locator still works. No snapshot baseline is required by these applications.
