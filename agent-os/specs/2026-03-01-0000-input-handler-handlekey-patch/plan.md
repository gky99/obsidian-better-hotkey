# Replace pushScope with Scope.prototype.handleKey Patch

## Context

The InputHandler currently uses Obsidian's Scope API (`pushScope`/`popScope`) to intercept keyboard events. While this works for normal use, **newly pushed scopes (modals, command palette, etc.) run before our handler**, so the plugin loses interception priority when these are active. The existing experimental code in `InputHandler.ts:59-74` demonstrates a `Scope.prototype.handleKey` patch that runs before any scope's default handler. By checking `this === keymap.scope`, we can determine if we're on the top scope and avoid re-processing on lower scopes (parent chain propagation).

**Intended outcome:** Our hotkey pipeline always runs first, regardless of what scope is on top. If no match, we pass through to the original `handleKey` so normal scope processing continues.

## Spec Folder

`agent-os/specs/2026-03-01-0000-input-handler-handlekey-patch/`

---

## Task 0: Set up git worktree

Use `/using-git-worktrees` to create an isolated worktree. Run `pnpm install` and verify tests pass before starting.

## Task 1: Save Spec Documentation

Create `agent-os/specs/2026-03-01-0000-input-handler-handlekey-patch/` with:
- **plan.md** — This plan
- **shape.md** — Shaping notes
- **standards.md** — Applicable standards
- **references.md** — ADR-005, original scope API spec, current InputHandler code

## Task 2: Create ScopeProxy class

**New file:** `src/components/ScopeProxy.ts`

Extract the monkey-patching logic into a dedicated class that encapsulates all `Scope.prototype.handleKey` patching concerns. This separates the "how we intercept" from the "what we do when intercepted" (which stays in InputHandler).

### ScopeProxy responsibilities

- Save/restore original `Scope.prototype.handleKey`
- `patch(callback)` replaces `handleKey` with a version that calls the callback, passing the Scope instance
- `restore()` puts back the original `handleKey`
- No constructor params — stateless until `patch()` is called

### ScopeProxy interface

```typescript
import { Scope } from 'obsidian';

export class ScopeProxy {
    private originalHandleKey: Function | null = null;

    /**
     * Patch Scope.prototype.handleKey. The callback receives the Scope instance
     * that handleKey was called on, plus the original arguments.
     * Return false from callback to suppress; return undefined to pass through
     * to the original handleKey.
     */
    patch(callback: (scope: Scope, evt: KeyboardEvent) => any): void {
        const originalHandle = (Scope.prototype as any).handleKey as Function;
        this.originalHandleKey = originalHandle;

        function patchedHandleKey(evt: KeyboardEvent, info: unknown) {
            // `this` is the Scope instance, passed by Obsidian's keymap dispatcher
            const result = callback(this, evt);
            if (result === false) {
                return false;
            }
            return originalHandle.apply(this, [evt, info]);
        }

        (Scope.prototype as any).handleKey = patchedHandleKey;
    }

    /**
     * Restore original Scope.prototype.handleKey.
     */
    restore(): void {
        if (this.originalHandleKey) {
            (Scope.prototype as any).handleKey = this.originalHandleKey;
            this.originalHandleKey = null;
        }
    }
}
```

Note: The top-scope check (`scope === keymap.scope`) is NOT in ScopeProxy — it belongs in InputHandler's callback, since ScopeProxy is a generic patching utility.

### ScopeProxy tests

**New file:** `src/components/__tests__/ScopeProxy.test.ts`

Tests for the proxy in isolation:

- `patch()` replaces `Scope.prototype.handleKey`
- `restore()` puts back the original `handleKey`
- Calls callback with the Scope instance and event
- Calls original `handleKey` when callback returns `undefined`
- Does NOT call original `handleKey` when callback returns `false`
- `restore()` is idempotent

---

## Task 3: Update InputHandler.ts to use ScopeProxy

**File:** `src/components/InputHandler.ts`

### 3a. Update imports

Remove `KeymapEventHandler`, `KeymapContext`, and `Scope` imports (no longer directly needed). Add `ScopeProxy` import.

```typescript
import type { Plugin, App } from 'obsidian';
import { ScopeProxy } from './ScopeProxy';
```

### 3b. Replace Scope-related fields

Remove:
```typescript
private scope: Scope | null = null;
private scopeHandler: KeymapEventHandler | null = null;
```

Add field and initialize in constructor:
```typescript
private scopeProxy = new ScopeProxy();
```

### 3c. Rewrite `start()`

InputHandler does the top-scope check in its callback to ScopeProxy:

```typescript
start(): void {
    const keymap = this.app.keymap;

    this.scopeProxy.patch((scope, evt) => {
        // Only run pipeline on the top scope to avoid double-processing
        if (scope === (keymap as any).scope) {
            return this.handleKeyEvent(evt);
        }
        // Non-top scope — pass through to original handleKey
        return;
    });

    this.plugin.register(() => this.stop());
}
```

### 3d. Rewrite `stop()`

```typescript
stop(): void {
    this.scopeProxy.restore();
}
```

### 3e. Rename `handleScopeEvent` → `handleKeyEvent`

Remove `ctx: KeymapContext` parameter. Remove the debug `console.log` line. Pipeline logic stays identical:

```typescript
private handleKeyEvent(event: KeyboardEvent): false | undefined {
    // Same pipeline: normalize → skip modifiers → escape → chord → match → handle
    // Returns false (suppress) or undefined (pass through)
}
```

### 3f. No changes to `handleMatchResult`, `isOnlyModifier`, `normalize`

These are independent of the interception mechanism.

---

## Task 4: Update main.ts

**File:** `src/main.ts`

Update comment on line 93 from:
```
// Create and start Input Handler (uses Obsidian Scope API per ADR-005)
```
to:
```
// Create and start Input Handler (patches Scope.prototype.handleKey per ADR-005)
```

No structural changes needed.

---

## Task 5: Rewrite InputHandler tests

**File:** `src/components/__tests__/InputHandler.test.ts`

### 5a. New obsidian mock

Replace Scope constructor mock with a minimal mock that has `handleKey` on its prototype:

```typescript
vi.mock('obsidian', () => {
    const MockScope = class MockScope {
        constructor(parent?: any) {}
        register() { return {}; }
        unregister() {}
    };
    (MockScope.prototype as any).handleKey = vi.fn();
    return { Scope: MockScope, MarkdownView: vi.fn(), App: vi.fn(), Plugin: vi.fn() };
});
```

### 5b. Update mock plugin factory

Remove `pushScope`/`popScope`. Add `keymap.scope` as a reference to the "top scope":

```typescript
function createMockPlugin() {
    const mockTopScope = {};
    const mockApp = {
        scope: {},
        keymap: { scope: mockTopScope },
        workspace: { ... },
    };
    ...
}
```

### 5c. New handler invocation pattern

Replace `capturedScopeHandler` capture with direct prototype access:

```typescript
function invokeHandler(event: KeyboardEvent): any {
    const patchedHandleKey = (Scope.prototype as any).handleKey;
    const topScope = (mockPlugin.app as any).keymap.scope;
    return patchedHandleKey.call(topScope, event, {});
}

function invokeHandlerOnNonTopScope(event: KeyboardEvent): any {
    const patchedHandleKey = (Scope.prototype as any).handleKey;
    return patchedHandleKey.call({}, event, {}); // different scope object
}
```

### 5d. Replace "Scope Lifecycle" → "handleKey Patch Lifecycle"

New tests:
- `start()` patches `Scope.prototype.handleKey` (function changed)
- `start()` registers teardown callback via `plugin.register`
- `stop()` restores original `Scope.prototype.handleKey`
- `stop()` is idempotent when not started
- `stop()` is idempotent after already stopped

### 5e. New "Top Scope Routing" describe block

- Runs pipeline when called on top scope
- Skips pipeline when called on non-top scope
- Calls original `handleKey` when called on non-top scope
- Calls original `handleKey` on top scope when no match (pass through)
- Does NOT call original `handleKey` on top scope when match found (suppress)

### 5f. Existing test blocks stay

"Pipeline Orchestration", "Match Result Handling", "Integration with Dependencies", "Edge Cases", "Layout-aware normalization" — all keep their test logic, only the invocation mechanism changes (`invokeHandler` uses the new pattern).

### 5g. Remove obsolete code

- Remove `ScopeConstructorSpy`, `mockScopeInstance`, `capturedScopeHandler`, `ctx()` helper
- Remove `KeymapContext` import

---

## Task 6: Update ADR-005

**File:** `.ai/ADR/ADR-005 Event Interception Strategy.md`

**Preserve the existing document.** Add a revision section or addendum that documents the evolution:

1. Add a **Revision** section after the existing content:
   - Date and reason for revision
   - Explain the limitation of pushScope (newly pushed scopes run before our handler)
   - Document the new approach: `Scope.prototype.handleKey` patch via `ScopeProxy` class
   - Updated implementation pattern: `ScopeProxy.patch()` / `ScopeProxy.restore()`
   - Note the trade-off: monkey-patching for guaranteed first-handler execution

2. Update **Status** to: `Implemented (revised 2026-03-01)`

3. Keep the original Decision, Options, Implementation, and Consequences sections intact for historical context.

---

## Task 7: Update Development Plan

**File:** `.AI/Development Plan.md`

Add a new row in section 1.5 (Input Handler) noting the handleKey migration. Preserve existing content.

---

## Task 8: Run tests and verify build

- `pnpm vitest run` — all tests pass
- `pnpm run build` — builds without errors

---

## Critical Files

| File | Change Scope |
|---|---|
| `src/components/ScopeProxy.ts` | **New** — encapsulates handleKey patching |
| `src/components/__tests__/ScopeProxy.test.ts` | **New** — ScopeProxy unit tests |
| `src/components/InputHandler.ts` | Major — use ScopeProxy, rename handler, remove Scope instantiation |
| `src/components/__tests__/InputHandler.test.ts` | Major — new mock infrastructure, new routing tests |
| `src/main.ts` | Minor — comment update |
| `.ai/ADR/ADR-005 Event Interception Strategy.md` | Addendum — revision section preserving original |
| `.AI/Development Plan.md` | Minor addition |
| `agent-os/specs/2026-03-01-0000-input-handler-handlekey-patch/` | **New** — spec docs |

## Verification

1. `pnpm vitest run` — all existing + new tests pass
2. `pnpm run build` — clean build
3. Manual test in Obsidian: verify hotkeys work in editor, AND while modals (command palette, settings) are open — our handler should intercept first, then pass through to modal if no match
