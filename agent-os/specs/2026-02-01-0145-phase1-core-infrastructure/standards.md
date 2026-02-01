# Standards for Phase 1 Core Infrastructure

The following standards apply to this work.

---

## architecture/component-folders

**Source:** `agent-os/standards/architecture/component-folders.md`

### Component Folder Organization

Organize components by **domain context**, not by technical layer or feature.

#### Structure

```
src/components/
├── index.ts              # Root: Global orchestrators
├── InputHandler.ts
├── ContextEngine.ts
├── hotkey-context/       # Hotkey processing domain
│   ├── HotkeyManager.ts
│   ├── ChordSequenceBuffer.ts
│   └── ...
└── execution-context/    # Command execution domain
    ├── KillRing.ts
    └── ...
```

#### Rules

- **Context = separate folder** — Each domain context gets its own subdirectory
- **Root for orchestrators** — Global coordinators live at `src/components/` root
- **No cross-context imports within same level** — `hotkey-context/` should not import from `execution-context/`

#### Why

- Reflects domain model separation (each context is a distinct concept)
- Makes dependencies explicit (prevents circular dependencies between contexts)

---

## development/stub-implementations

**Source:** `agent-os/standards/development/stub-implementations.md`

### Explicit Stub Implementations

Mark stub methods with inline comments explaining the limited behavior.

#### Format

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

#### Rules

- **Inline comment** — Mark stub methods with "(STUB - behavior)" in JSDoc
- **Include TODO** — Reference when full implementation is planned
- **Don't stub silently** — Never leave partial implementations undocumented

#### Why

- Prevents confusion about behavior (developers won't think it's a bug)
- Makes incremental development visible

---

## development/todo-comments

**Source:** `agent-os/standards/development/todo-comments.md`

### Phase-Aware TODO Comments

Reference **specific development phases** in TODO comments.

#### Format

```typescript
// TODO: Implement real parsing in Phase 3.1
// TODO manual reindex for batch update (Phase 2.3)
// TODO: Initialize this callback to StatusIndicator.clear() when wiring components
```

#### Rules

- **Include phase number** when work is scheduled for a specific phase
- **Include integration context** when TODO depends on wiring/setup
- **No generic TODOs** — Avoid "TODO: fix this later" without context

#### Why

- Prevents premature implementation (clear when something should be deferred)
- Aligns with Development Plan.md phases
- Helps AI agents understand priority and current phase scope

---

## testing/file-organization

**Source:** `agent-os/standards/testing/file-organization.md`

### Test File Organization

Tests use the `__tests__/` directory pattern at component level.

```
src/components/
├── hotkey-context/
│   ├── HotkeyManager.ts
│   ├── ChordSequenceBuffer.ts
│   └── __tests__/
│       ├── HotkeyManager.test.ts
│       └── ChordSequenceBuffer.test.ts
```

#### Rules

- Place test files in `__tests__/` directory at the same level as the component
- Name test files: `ComponentName.test.ts`
- Mirror the component structure within `__tests__/`
- Import from parent directory: `import { Component } from '../Component'`

#### Why

Follows Jest/Vitest convention for automatic test discovery

---

## testing/test-structure

**Source:** `agent-os/standards/testing/test-structure.md`

### Test Structure

Structure tests with nested describe blocks:

```typescript
describe('ComponentName', () => {
  let instance: ComponentType;

  beforeEach(() => {
    // Fresh instance per test for isolation
    instance = new ComponentType();
  });

  describe('methodName', () => {
    it('describes specific behavior being tested', () => {
      // Test implementation
    });
  });
});
```

#### Rules

- Group tests by component/method using nested `describe` blocks
- Use `beforeEach` to create fresh instances — prevents test pollution
- Use descriptive test names: what behavior is tested, not generic "works"
- One assertion focus per test

#### Critical

Tests must not share state. Each test gets fresh instances via `beforeEach`.

---

## Application to Phase 1 Work

### component-folders

**Status:** ✅ Already applied

Existing codebase already follows this standard:
- `src/components/hotkey-context/` - ChordSequenceBuffer, HotkeyManager, HotkeyMatcher, StatusIndicator
- `src/components/execution-context/` - KillRing, WorkspaceContext
- `src/components/` (root) - InputHandler, ContextEngine, CommandRegistry

**Action:** Maintain this structure. New files (presets, commands) should follow similar domain-based organization.

### stub-implementations

**Status:** ⚠️ Needs verification

Must verify that ContextEngine.evaluate() is properly documented as stub:

```typescript
/**
 * Evaluate "when" clause (STUB - always returns true)
 * TODO: Implement real parsing in Phase 3.1
 */
private evaluate(whenClause: string): boolean {
  return true; // Stub implementation
}
```

**Action:** Review ContextEngine.ts in Task 2. Ensure stub documentation is clear.

### todo-comments

**Status:** ⚠️ Needs application

Existing TODOs in codebase should reference specific phases:

**Before:**
```typescript
// TODO: Take Context Engine as input for context checking
```

**After:**
```typescript
// TODO: Integrate Context Engine for context checking (Phase 1 - Task 6)
```

**Action:** Update TODOs during implementation to reference Development Plan.md phases. New TODOs must include phase references.

---

## Compliance Checklist

- [ ] All components organized by domain context (hotkey-context/, execution-context/)
- [ ] No cross-context imports at same level
- [ ] ContextEngine.evaluate() documented as stub with phase reference
- [ ] All new TODOs include phase numbers
- [ ] Integration TODOs explain wiring dependencies
- [ ] No silent stubs (all partial implementations documented)
