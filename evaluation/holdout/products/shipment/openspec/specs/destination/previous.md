# Shipment destination management: previous revision

## Requirement SHIP-DEST-01: Open a shipment's destination editor

This is the preserved dispatch-2026-08 contract. A dispatcher can open the destination editor for shipment CN-804 without opening a preview, origin editing, or another shipment. The current deployment's revision must be checked separately before this preserved document is applied.

```self-healing-contract
{
  "schemaVersion": 1,
  "requirementId": "SHIP-DEST-01",
  "revision": "dispatch-2026-08",
  "intent": "Open the destination editor for shipment CN-804 without opening origin editing, a preview, or another shipment.",
  "action": "click",
  "status": "active",
  "allOf": [
    { "sources": ["text", "label", "ariaLabel", "title", "name"], "anyOf": ["destination"] },
    { "sources": ["rowContext", "parentContext", "containerContext"], "anyOf": ["CN-804"] }
  ]
}
```
