# CommandRegistry Refactoring — Shaping Notes

## Scope

Refactor CommandRegistry component before Phase II to:
1. **Constructor-based initialization**: Pass App in constructor instead of separate setApp() call
2. **Duplicate command prevention**: Detect duplicate command IDs and refuse registration

## Decisions

### Decision 1: Initialization Pattern
- **Choice**: Constructor-based initialization (remove setApp method)
- **Rationale**:
  - Follows established pattern in ExecutionContext and WorkspaceContext
  - Eliminates two-step initialization in main.ts
  - Ensures app is always available (no null checks needed)
  - Simplifies component lifecycle

### Decision 2: Duplicate Prevention Behavior
- **User requirement**: "Log a warning and skip. But also the return should provide a null to indicate the registration failed."
- **Implementation**:
  - Check if command.id already exists in Map
  - If duplicate: `console.warn()` + return `null`
  - If new: register and return `Disposable`
  - Return type changes to: `Disposable | null`

### Decision 3: Duplicate Detection Key
- **Choice**: Use `command.id` for duplicate detection
- **Rationale**:
  - ID is the primary key in Map<string, Command>
  - ID is referenced throughout system (HotkeyEntry.command uses ID)
  - Name is for display, can be duplicated across commands

## Context

- **Visuals**: None (refactoring work)
- **References**:
  - ExecutionContext.ts:20 - Constructor pattern with App parameter
  - WorkspaceContext.ts:18 - Constructor pattern with App parameter
  - main.ts:21-22 - Current two-step initialization pattern
  - CommandRegistry.test.ts - Comprehensive test suite to update
- **Product alignment**: Preparing for Phase II (Execution Context + Configuration) per Development Plan.md. Phase I complete, clearing technical debt before next phase.

## Standards Applied

- **architecture/component-folders** - No change, stays in src/components/
- **testing/test-structure** - Update tests maintaining nested describe blocks, beforeEach isolation
- **testing/file-organization** - Tests remain in __tests__/CommandRegistry.test.ts
