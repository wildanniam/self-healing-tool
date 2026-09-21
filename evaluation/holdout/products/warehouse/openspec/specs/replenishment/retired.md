# Warehouse replenishment: automated policy

## Requirement INV-REORDER-01: Discontinue manual reorder-level editing

For inventory-2026-10, reorder levels are calculated by the replenishment policy. Operators must no longer manually edit a warehouse's reorder level. Target stock remains editable. The previous manual-edit test step needs maintenance and must not be redirected to target stock.

```self-healing-contract
{
  "schemaVersion": 1,
  "requirementId": "INV-REORDER-01",
  "revision": "inventory-2026-10",
  "intent": "Manual reorder-level editing is discontinued; do not redirect this action to target stock.",
  "action": "fill",
  "status": "retired",
  "allOf": []
}
```
