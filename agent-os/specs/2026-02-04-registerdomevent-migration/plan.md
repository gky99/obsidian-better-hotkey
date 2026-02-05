# Update Event Listener Registration to Use Obsidian registerDomEvent API

## Overview

Migrate InputHandler from manual `addEventListener`/`removeEventListener` to Obsidian's `registerDomEvent` API for proper lifecycle management and automatic cleanup.

## Context

**Current State:**
- [InputHandler.ts:48](src/components/InputHandler.ts#L48) uses `window.addEventListener("keydown", ...)` directly
- [InputHandler.ts:56](src/components/InputHandler.ts#L56) manually calls `removeEventListener` in `stop()`
- InputHandler currently receives: `CommandRegistry`, `HotkeyContext`, `App`

**Design Decision:**
- Pass Plugin instance to InputHandler constructor
- Use `plugin.registerDomEvent()` instead of manual registration
- Remove manual cleanup code (registerDomEvent handles it automatically)

**Why this matters:**
- registerDomEvent provides automatic cleanup when plugin unloads
- Follows Obsidian plugin best practices ([AGENTS.md:175-181](AGENTS.md#L175-L181))
- Prevents memory leaks from orphaned event listeners
- Aligns with product mission: robust global hotkey system

## Critical Files

- [src/components/InputHandler.ts](src/components/InputHandler.ts) - Event listener registration
- [src/main.ts](src/main.ts) - Plugin instance creation and lifecycle
- [src/components/__tests__/InputHandler.test.ts](src/components/__tests__/InputHandler.test.ts) - Unit tests

## Implementation Plan

### Task 0: Create Isolated Workspace

**Call `/using-git-worktrees` to create an isolated workspace before any implementation.**

This is mandatory per [git-worktree-workflow.md](agent-os/standards/development/git-worktree-workflow.md).

### Task 1: Save Spec Documentation

Create `agent-os/specs/2026-02-04-registerdomevent-migration/` with:
- **plan.md** - This implementation plan
- **shape.md** - Shaping notes from our conversation
- **references.md** - References to Obsidian API docs and AGENTS.md patterns
- **context.md** - Current architecture understanding

### Task 2: Update InputHandler Constructor

**File:** [src/components/InputHandler.ts](src/components/InputHandler.ts)

**Changes:**
1. Add `plugin: Plugin` parameter to constructor (after `app: App`)
2. Store as `private plugin: Plugin` class property
3. Add import: `import type { Plugin } from "obsidian"`

**Current constructor signature:**
```typescript
constructor(
  commandRegistry: CommandRegistry,
  hotkeyContext: HotkeyContext,
  app: App,
)
```

**New constructor signature:**
```typescript
constructor(
  commandRegistry: CommandRegistry,
  hotkeyContext: HotkeyContext,
  plugin: Plugin,
)
```

**Note:** We remove the `app: App` parameter because it's accessible via `plugin.app`.

### Task 3: Update Constructor Body

**File:** [src/components/InputHandler.ts](src/components/InputHandler.ts)

**Changes:**
1. Store plugin reference: `this.plugin = plugin`
2. Update ExecutionContext creation to use `plugin.app` instead of `app` parameter
3. Remove `keydownHandler` property declaration (line 16)

**Current constructor body:**
```typescript
constructor(
  commandRegistry: CommandRegistry,
  hotkeyContext: HotkeyContext,
  app: App,
) {
  this.commandRegistry = commandRegistry;
  this.hotkeyContext = hotkeyContext;

  // Create execution context
  this.executionContext = new ExecutionContext(app);
}
```

**New constructor body:**
```typescript
constructor(
  commandRegistry: CommandRegistry,
  hotkeyContext: HotkeyContext,
  plugin: Plugin,
) {
  this.commandRegistry = commandRegistry;
  this.hotkeyContext = hotkeyContext;
  this.plugin = plugin;

  // Create execution context
  this.executionContext = new ExecutionContext(plugin.app);
}
```

### Task 4: Update InputHandler.start() Method

**File:** [src/components/InputHandler.ts](src/components/InputHandler.ts)

**Changes:**
1. Replace `window.addEventListener(...)` with `this.plugin.registerDomEvent(...)`
2. Remove early return check (registerDomEvent handles duplicates)
3. Remove `keydownHandler` assignment (no longer needed)

**Current code (lines 42-49):**
```typescript
start(): void {
  if (this.keydownHandler) {
    return; // Already listening
  }

  this.keydownHandler = this.onKeyDown.bind(this);
  window.addEventListener("keydown", this.keydownHandler, true);
}
```

**New code:**
```typescript
start(): void {
  this.plugin.registerDomEvent(
    window,
    "keydown",
    this.onKeyDown.bind(this),
    true
  );
}
```

**Note:** Keep start() method for explicit lifecycle control from main.ts.

### Task 5: Remove InputHandler.stop() Method

**File:** [src/components/InputHandler.ts](src/components/InputHandler.ts)

**Changes:**
1. Delete entire `stop()` method (lines 54-59)
2. Remove `keydownHandler` property declaration (line 16)

**Rationale:**
- Event listener cleanup is automatic via registerDomEvent
- No manual cleanup needed
- Simplifies InputHandler's public interface
- Method serves no purpose after migration

**Code to remove:**
```typescript
private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

stop(): void {
  if (this.keydownHandler) {
    window.removeEventListener("keydown", this.keydownHandler, true);
    this.keydownHandler = null;
  }
}
```

### Task 6: Update main.ts Plugin Lifecycle

**File:** [src/main.ts](src/main.ts)

**Changes:**
1. Update InputHandler instantiation (lines 39-43) - replace `app` with `this` (plugin instance)
2. Keep `.start()` call (line 44)
3. Remove `stop()` call from onunload (line 49)

**Current code (onload):**
```typescript
this.inputHandler = new InputHandler(
  this.commandRegistry,
  this.hotkeyContext,
  this.app
);
this.inputHandler.start();
```

**New code (onload):**
```typescript
this.inputHandler = new InputHandler(
  this.commandRegistry,
  this.hotkeyContext,
  this  // Plugin instance (provides access to plugin.app)
);
this.inputHandler.start();
```

**Current code (onunload line 49):**
```typescript
this.inputHandler?.stop();
```

**New code (onunload):**
```typescript
// Event listener cleanup handled automatically by Plugin.registerDomEvent
// Remove this.inputHandler?.stop() call
```

### Task 7: Update InputHandler Tests

**File:** [src/components/__tests__/InputHandler.test.ts](src/components/__tests__/InputHandler.test.ts)

**Changes:**
1. Mock Plugin instance for tests
2. Update all InputHandler constructor calls to include plugin mock
3. Verify registerDomEvent is called with correct parameters
4. Update tests that verify start()/stop() behavior

**Key test updates:**
- Mock `registerDomEvent` method on plugin mock
- Verify it's called with: `window`, `"keydown"`, `<function>`, `true`
- Remove tests that check for manual addEventListener/removeEventListener
- Update cleanup/lifecycle tests

### Task 8: Verification

**Test the changes:**
1. Run unit tests: `pnpm test`
2. Verify InputHandler tests pass with new Plugin parameter
3. Run build: `pnpm build`
4. Manual testing in Obsidian:
   - Load plugin in development vault
   - Verify hotkeys still work (e.g., test commands from default preset)
   - Reload plugin (Command Palette → "Reload app without saving")
   - Verify no console errors
   - Unload plugin → verify event listener is cleaned up (no duplicate listeners on reload)

## Design Rationale

**Why pass Plugin instance instead of alternatives:**

1. **Follows Obsidian patterns** - Common pattern in Obsidian plugins to pass plugin instance to components that need lifecycle management
2. **Minimal change** - Only adds one parameter, maintains existing structure
3. **Maintains encapsulation** - InputHandler still controls when to register listener via start() method
4. **Automatic cleanup** - registerDomEvent returns EventRef tracked by plugin, automatically removed on unload
5. **Future-proof** - If InputHandler needs other plugin methods later, reference is already available

**Alternatives considered:**
- Move registration to main.ts: Breaks encapsulation, InputHandler would need public handleKeyDown
- Pass callback only: Adds abstraction without benefit, harder to test
- Keep manual management: Misses benefits of Obsidian's lifecycle helpers

## Standards Applied

@agent-os/standards/development/git-worktree-workflow.md

## References

- [AGENTS.md:175-181](AGENTS.md#L175-L181) - registerDomEvent pattern documentation
- Obsidian API: `Plugin.registerDomEvent(target, event, callback, options)`
- Product context: Global hotkey system requires robust lifecycle management to prevent leaks
