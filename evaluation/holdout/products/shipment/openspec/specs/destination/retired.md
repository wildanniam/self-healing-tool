# Shipment destination management: dispatch handoff

## Requirement SHIP-DEST-01: Discontinue destination editing from the board

For dispatch-2026-10, destination edits are handled through a separate approved amendment process. The shipment board must not open a destination editor. Dispatchers may still preview destination information or edit origin information. The previous destination-edit click must not be redirected to either operation.

```self-healing-contract
{
  "schemaVersion": 1,
  "requirementId": "SHIP-DEST-01",
  "revision": "dispatch-2026-10",
  "intent": "Destination editing from the shipment board is discontinued; previews and origin editing are different operations.",
  "action": "click",
  "status": "retired",
  "allOf": []
}
```
