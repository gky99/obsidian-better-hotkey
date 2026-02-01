# Explicit Stub Implementations

Mark stub methods with inline comments explaining the limited behavior.

## Format

```typescript
export class ContextEngine {
  /**
   * Evaluate "when" clause (STUB - always returns true)
   * TODO: Implement real parsing in Phase 3.1
   */
  private evaluate(whenClause: string): boolean {
    return true; // Stub implementation
  }
}
```

## Rules

- **Inline comment** — Mark stub methods with "(STUB - behavior)" in JSDoc
- **Include TODO** — Reference when full implementation is planned
- **Don't stub silently** — Never leave partial implementations undocumented

## Why

- Prevents confusion about behavior (developers won't think it's a bug)
- Makes incremental development visible
