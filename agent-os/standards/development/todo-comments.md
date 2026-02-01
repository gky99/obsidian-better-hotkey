# Phase-Aware TODO Comments

Reference **specific development phases** in TODO comments.

## Format

```typescript
// TODO: Implement real parsing in Phase 3.1
// TODO manual reindex for batch update (Phase 2.3)
// TODO: Initialize this callback to StatusIndicator.clear() when wiring components
```

## Rules

- **Include phase number** when work is scheduled for a specific phase
- **Include integration context** when TODO depends on wiring/setup
- **No generic TODOs** — Avoid "TODO: fix this later" without context

## Why

- Prevents premature implementation (clear when something should be deferred)
- Aligns with Development Plan.md phases
- Helps AI agents understand priority and current phase scope
