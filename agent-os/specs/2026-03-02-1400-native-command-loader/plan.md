# Plan: Load Native Obsidian Commands into CommandRegistry

## Context

The plugin currently registers 29 custom Emacs-style commands (cursor, kill/yank, editing, control) but cannot rebind any of Obsidian's native or other plugin commands through its hotkey system. The `CommandRegistry.loadObsidianCommands()` method exists as a TODO stub. This feature loads ALL commands from Obsidian's internal `app.commands.commands` registry, wraps them into our `Command` interface, and registers them — enabling any Obsidian command to be rebound through our system.

**Key decisions from shaping:**
- Load ALL commands (native + other plugins), skip `mobileOnly === true`
- Two callback interfaces: empty input (`callback`/`checkCallback`) and editor input (`editorCallback`/`editorCheckCallback`) — derive editor + context from workspace
- Respect Obsidian's callback priority: `editorCheckCallback` > `editorCallback` > `checkCallback` > `callback`
- Pre-check `checkCallback(true)` before executing — if unavailable, pass keypress through to Obsidian

---

## Task 1: Create worktree via `/using-git-worktrees`

Mandatory worktree isolation before implementation.

## Task 2: Save Spec Documentation

Create `agent-os/specs/2026-03-02-1400-native-command-loader/` with:
- **plan.md** — This full plan
- **shape.md** — Shaping notes (scope, decisions, context)
- **standards.md** — Relevant standards
- **references.md** — Pointers to reference implementations

## Task 3: Add `canExecute` to Command interface

**File:** `src/types.ts`

Add optional `canExecute` method to `Command`:
```typescript
export interface Command {
    id: string;
    name: string;
    execute(args?: Record<string, unknown>, context?: ExecutionContext): void | Promise<void>;
    canExecute?(): boolean;  // Optional pre-check for command availability
}
```

This enables check callbacks to signal "I can't execute right now" without breaking existing commands (it's optional).

## Task 4: Update CommandRegistry.execute() to respect canExecute

**File:** `src/components/CommandRegistry.ts`

Modify `execute()` to call `canExecute()` before executing:
```typescript
execute(commandId, args?, context?): boolean {
    const command = this.getCommand(commandId);
    if (!command) return false;

    // Pre-check: if command has canExecute and it returns false, skip
    if (command.canExecute && !command.canExecute()) {
        return false;
    }

    // ... existing try/catch execute logic
}
```

Returns `false` when command is not applicable, enabling InputHandler to pass through.

## Task 5: Update InputHandler to pass through on failed execution

**File:** `src/components/InputHandler.ts`

In `handleMatchResult`, check return value of `commandRegistry.execute()`:
```typescript
case 'exact': {
    const executed = this.commandRegistry.execute(
        result.entry.command, result.entry.args, this.executionContext,
    );

    if (!executed) {
        // Command unavailable — pass through to Obsidian
        this.hotkeyContext.chordBuffer.clear();
        this.hotkeyContext.statusIndicator.clear();
        return; // undefined = pass through
    }

    // ... rest of existing logic (clear buffer, killRing update, etc.)
    return false; // Suppress
}
```

## Task 6: Create ObsidianCommandLoader module

**New file:** `src/components/ObsidianCommandLoader.ts`

Stateless utility — single exported function `loadObsidianCommands(app: App): Command[]`.

**Types:**
- Use Obsidian's public `Command` type (aliased as `ObsidianCommand`) — it already includes all callback fields (`callback`, `checkCallback`, `editorCallback`, `editorCheckCallback`, `mobileOnly`)
- Only define one private API type for the `app.commands` accessor:

```typescript
import type { Command as ObsidianCommand } from 'obsidian';

/** Private API: app.commands registry accessor */
interface AppWithCommands extends App {
    commands: { commands: Record<string, ObsidianCommand> };
}
```

**Wrapping logic per callback priority:**

| Priority | Callback | `canExecute()` | `execute()` |
|----------|----------|----------------|-------------|
| 1 (highest) | `editorCheckCallback` | Get view, return `ecCb(true, editor, view) !== false` | `ecCb(false, editor, view)` |
| 2 | `editorCallback` | Return `view !== null` | `eCb(editor, view)` |
| 3 | `checkCallback` | Return `cCb(true) !== false` | `cCb(false)` |
| 4 (lowest) | `callback` | *(not defined — always available)* | `cb()` |

For editor callbacks, derive `editor` and `view` via `app.workspace.getActiveViewOfType(MarkdownView)` at execution time (live query, not cached).

Commands with no usable callback → skip (return `null`).

## Task 7: Wire loader into CommandRegistry.loadObsidianCommands()

**File:** `src/components/CommandRegistry.ts`

Replace the TODO stub:
```typescript
import { loadObsidianCommands as loadFromObsidian } from './ObsidianCommandLoader';

loadObsidianCommands(): void {
    const obsidianCommands = loadFromObsidian(this.app);
    for (const cmd of obsidianCommands) {
        this.registerCommand(cmd); // Duplicates silently rejected (custom commands win)
    }
}
```

## Task 8: Call loadObsidianCommands in main.ts

**File:** `src/main.ts`

Add after custom command registration (line ~63), before keyboard layout init:
```typescript
// Load native Obsidian commands (wrapped) — AFTER custom commands so ours take priority
this.commandRegistry.loadObsidianCommands();
```

## Task 9: Write unit tests

**New file:** `src/components/__tests__/ObsidianCommandLoader.test.ts`

Test cases:
- **Filtering:** skip `mobileOnly`, skip no-callback, include valid commands
- **Callback priority:** verify highest-priority callback is selected
- **Editor wrappers:** derive editor/view from workspace, no-op when no view
- **Pre-check (`canExecute`):** `checkCallback(true)` returns false → `canExecute()` returns false; `editorCheckCallback(true, ...)` returns false → `canExecute()` returns false
- **Non-editor wrappers:** `callback` called directly, `checkCallback(false)` called
- **Shape:** preserves id, name; conforms to Command interface

**Update:** `src/components/__tests__/CommandRegistry.test.ts`
- Expand `loadObsidianCommands` tests: verify delegation, verify custom commands take priority
- Test `canExecute` pre-check in `execute()` method

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types.ts` | Modify | Add optional `canExecute?()` to Command |
| `src/components/ObsidianCommandLoader.ts` | Create | Loader: types + `loadObsidianCommands()` + wrapping logic |
| `src/components/CommandRegistry.ts` | Modify | Import loader, replace stub, add canExecute check in execute() |
| `src/components/InputHandler.ts` | Modify | Check execute() return value, pass through on false |
| `src/main.ts` | Modify | Add `loadObsidianCommands()` call |
| `src/components/__tests__/ObsidianCommandLoader.test.ts` | Create | Unit tests |
| `src/components/__tests__/CommandRegistry.test.ts` | Modify | Expand tests |

## Verification

1. `npm run build` — compiles without errors
2. `npm run test` — all existing + new tests pass
3. Manual: Open Obsidian, load plugin, check console for command count logged
4. Manual: Bind a native command (e.g., `app:open-settings`) to a custom hotkey, verify it fires
5. Manual: Bind an editor command (e.g., `editor:toggle-bold`) — verify it only fires when editor is active, passes through otherwise
