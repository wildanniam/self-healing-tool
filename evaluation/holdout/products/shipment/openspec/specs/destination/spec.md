# Shipment destination management

## Requirement SHIP-DEST-01: Open a shipment's destination editor

A dispatcher can open the destination editor for shipment CN-804. Opening the editor must select that shipment and the destination section. It must not open another shipment, select origin editing, or merely display a shipment preview. The visible arrangement and implementation identifiers of shipment controls may change.

### Scenario: Start editing a destination

Given a dispatcher is viewing the shipment board, when the dispatcher requests destination editing for CN-804, the application opens the destination editor bound to CN-804 and leaves other shipments unchanged.

The adapter below states intended behavior and observable evidence, not an executable proof of destination-editor binding.

```self-healing-contract
{
  "schemaVersion": 1,
  "requirementId": "SHIP-DEST-01",
  "revision": "dispatch-2026-09",
  "intent": "Open the destination editor for shipment CN-804 without opening origin editing, a preview, or another shipment.",
  "action": "click",
  "status": "active",
  "allOf": [
    { "sources": ["text", "label", "ariaLabel", "title", "name"], "anyOf": ["destination"] },
    { "sources": ["rowContext", "parentContext", "containerContext"], "anyOf": ["CN-804"] }
  ]
}
```
