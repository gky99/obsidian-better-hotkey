# CommandRegistry Refactoring — Phase II Preparation

## Overview

Refactor the CommandRegistry component before Phase II implementation to:
1. Simplify initialization by accepting App in constructor (remove setApp method)
2. Add duplicate command name prevention (log warning and return null)

## Scope

**Two refactoring changes to CommandRegistry:**

### Change 1: Constructor-based App Initialization
- Move App dependency into constructor parameter (following ExecutionContext/WorkspaceContext pattern)
- Remove the `setApp()` method
- Store app as private field during construction
- Update main.ts to pass app during instantiation

### Change 2: Duplicate Command Prevention
- Check if command ID already exists before registration
- If duplicate detected:
  - Log warning to console: `console.warn()`
  - Return `null` instead of Disposable
- Update return type: `registerCommand(): Disposable | null`

## Context

**Why now?** These changes prepare the codebase for Phase II (Execution Context + Configuration) by:
- Simplifying the initialization flow in main.ts
- Preventing configuration loading bugs from duplicate command registration
- Aligning with established patterns (ExecutionContext, WorkspaceContext)

**Product alignment:** Phase I (Core Infrastructure) is complete. This refactoring clears technical debt before Phase II begins (see Development Plan.md lines 115-191).

## Reference Implementations

**Similar constructor patterns in codebase:**
- [ExecutionContext.ts:20](src/components/execution-context/ExecutionContext.ts#L20) - Accepts App in constructor, stores as dependency
- [WorkspaceContext.ts:18](src/components/execution-context/WorkspaceContext.ts#L18) - Accepts App in constructor, stores as private field

**Current initialization in main.ts:**
```typescript
// Lines 21-22 (current pattern to be changed)
this.commandRegistry = new CommandRegistry();
this.commandRegistry.setApp(this.app);
```

**Target pattern (like ExecutionContext at line 36):**
```typescript
this.executionContext = new ExecutionContext(app);
```

## Standards Applied

- **architecture/component-folders**: CommandRegistry stays in `src/components/` (no change)
- **testing/test-structure**: Update existing tests to match new behavior (beforeEach, nested describe blocks)
- **testing/file-organization**: Tests remain in `src/components/__tests__/CommandRegistry.test.ts`

## Critical Files

### Files to Modify
- [CommandRegistry.ts](src/components/CommandRegistry.ts) - Update constructor, registerCommand, remove setApp
- [main.ts](src/main.ts) - Update CommandRegistry instantiation (lines 21-22)
- [InputHandler.ts](src/components/InputHandler.ts) - No changes needed (doesn't create CommandRegistry)
- [CommandRegistry.test.ts](src/components/__tests__/CommandRegistry.test.ts) - Update test cases

### Tests Requiring Updates
- **Line 24**: `beforeEach` - Pass mock App to constructor
- **Line 49-58**: "overwrites duplicate command IDs" - Change to "prevents duplicate registration and returns null"
- **Line 345-366**: `setApp` describe block - Remove entirely
- **Line 368-392**: `loadObsidianCommands` describe block - Update to assume app is set in constructor

## Implementation Plan

### Task 1: Save Spec Documentation

Create `agent-os/specs/2026-02-04-1600-command-registry-refactor/` with:
- **plan.md** — This complete plan document
- **shape.md** — Shaping notes (scope, decisions, user requirements)
- **standards.md** — Relevant standards content
- **references.md** — Pointers to ExecutionContext and WorkspaceContext patterns

### Task 2: Update CommandRegistry Implementation

**2.1: Update constructor and private fields**
```typescript
export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private app: App; // Remove | null, always initialized

  constructor(app: App) { // Add app parameter
    this.app = app;
  }

  // Remove setApp() method entirely
}
```

**2.2: Add duplicate prevention to registerCommand**
```typescript
registerCommand(command: Command): Disposable | null {
  // Check for duplicate
  if (this.commands.has(command.id)) {
    console.warn(
      `CommandRegistry: Command "${command.id}" is already registered. ` +
      `Registration refused.`
    );
    return null;
  }

  // Register command
  this.commands.set(command.id, command);
  return {
    dispose: () => {
      this.commands.delete(command.id);
    },
  };
}
```

**2.3: Update loadObsidianCommands**
```typescript
loadObsidianCommands(): void {
  // Remove app null check - app is always set via constructor
  // TODO: Iterate through app.commands.commands and register them
  // This will be implemented during integration phase
  // For now, this is a placeholder
}
```

### Task 3: Update main.ts Initialization

**Change lines 21-22 from:**
```typescript
this.commandRegistry = new CommandRegistry();
this.commandRegistry.setApp(this.app);
```

**To:**
```typescript
this.commandRegistry = new CommandRegistry(this.app);
```

### Task 4: Update CommandRegistry.test.ts

**4.1: Update beforeEach (line 22-25)**
```typescript
beforeEach(() => {
  const mockApp = {} as App;
  registry = new CommandRegistry(mockApp);
});
```

**4.2: Update duplicate test (lines 49-58)**
```typescript
it('prevents duplicate registration and returns null', () => {
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const cmd1 = createCommand('duplicate-id');
  const cmd2 = createCommand('duplicate-id');

  const disposable1 = registry.registerCommand(cmd1);
  const disposable2 = registry.registerCommand(cmd2);

  expect(disposable1).not.toBeNull();
  expect(disposable2).toBeNull();
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    expect.stringContaining('already registered')
  );
  expect(registry.getCommand('duplicate-id')).toBe(cmd1);

  consoleWarnSpy.mockRestore();
});
```

**4.3: Remove setApp describe block (lines 345-366)**
- Delete entire section - setApp no longer exists

**4.4: Update loadObsidianCommands tests (lines 368-392)**
```typescript
describe('loadObsidianCommands', () => {
  it('does not throw when called', () => {
    // App is always set via constructor now
    expect(() => registry.loadObsidianCommands()).not.toThrow();
  });
});
```

**4.5: Add import for App type (top of file)**
```typescript
import type { App } from 'obsidian';
```

### Task 5: Run Tests and Build

**5.1: Run test suite**
```bash
pnpm test
```

**5.2: Run build**
```bash
pnpm run build
```

**5.3: Verify no type errors**
```bash
pnpm run type-check
```

## Verification

### Success Criteria

- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm run build`)
- [ ] No TypeScript errors
- [ ] CommandRegistry accepts App in constructor
- [ ] setApp method removed
- [ ] Duplicate registration returns null and logs warning
- [ ] main.ts instantiation simplified to single line
- [ ] Test coverage maintained (all test cases updated correctly)

### Manual Testing

After implementation:
1. Load plugin in Obsidian dev vault
2. Check console for any initialization errors
3. Attempt to register duplicate commands programmatically
4. Verify warning appears in console
5. Verify original command remains registered (not overwritten)

## Decisions Made

### Decision 1: Return Type for Duplicate Registration
**User requirement:** "Log a warning and skip. But also the return should provide a null to indicate the registration failed."

**Implementation:**
- Return type: `Disposable | null`
- On duplicate: `console.warn()` + `return null`
- On success: return Disposable as before

**Rationale:** Allows callers to detect registration failure without throwing exceptions

### Decision 2: Constructor vs setApp
**Pattern chosen:** Constructor-based initialization (following ExecutionContext/WorkspaceContext)

**Rationale:**
- Eliminates two-step initialization
- Ensures app is always available (no null checks in loadObsidianCommands)
- Consistent with other components that depend on App
- Simplifies main.ts initialization code

### Decision 3: Which Command Property for Duplicate Detection
**Choice:** Use `command.id` for duplicate detection

**Rationale:**
- Command IDs are the primary key (used in Map<string, Command>)
- ID is used throughout system (HotkeyEntry.command references ID)
- Name can be duplicated (display name vs internal ID)

## Notes

- **Breaking change**: Callers of `registerCommand()` should check for null return
- **No migration needed**: This is Phase I (MVP), no external plugins using API yet
- **Future consideration**: When Plugin API is exposed (Phase 3), document the null return behavior clearly

## Estimated Effort

- **Task 1**: 10 minutes (documentation)
- **Task 2**: 15 minutes (CommandRegistry changes)
- **Task 3**: 2 minutes (main.ts update)
- **Task 4**: 20 minutes (test updates)
- **Task 5**: 5 minutes (verification)

**Total: ~50 minutes**
