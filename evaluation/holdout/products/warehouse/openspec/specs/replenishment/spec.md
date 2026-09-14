# Warehouse replenishment

## Requirement INV-REORDER-01: Maintain warehouse reorder levels

An inventory operator can change the reorder level of Harbor warehouse. The operation changes that warehouse's reorder level only. Target stock and the reorder level of other warehouses must retain their previous values. A field's visual position or implementation identifier does not define its business purpose.

### Scenario: Adjust a warehouse reorder level

Given an inventory operator is viewing warehouse replenishment settings, when the operator supplies a new reorder level for Harbor warehouse and saves the settings, that warehouse's stored reorder level changes and unrelated replenishment settings remain unchanged.

The following adapter contains expected intent and observable evidence phrases. It is not a complete semantic oracle and does not establish that matching DOM text implies correct business behavior.

```self-healing-contract
{
  "schemaVersion": 1,
  "requirementId": "INV-REORDER-01",
  "revision": "inventory-2026-09",
  "intent": "Change the reorder level of Harbor warehouse while preserving target stock and all other warehouses' settings.",
  "action": "fill",
  "status": "active",
  "allOf": [
    { "sources": ["label", "nearestLabel", "ariaLabel", "name"], "anyOf": ["reorder"] },
    { "sources": ["rowContext", "parentContext", "containerContext"], "anyOf": ["Harbor warehouse"] }
  ]
}
```
