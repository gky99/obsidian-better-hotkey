# Migrate InputHandler to Obsidian Scope API

## Context

The InputHandler currently uses `registerDomEvent(window, 'keydown', ...)` to intercept keyboard events. However, Obsidian's internal `Keymap` registers its own `keydown` capture listener on `window` before any plugin loads, so it always fires first. `stopPropagation()` cannot stop other listeners on the same element. ADR-005 specifies migrating to Obsidian's Scope API (`pushScope`/`popScope`), which intercepts keys inside Obsidian's own event processing pipeline — before Obsidian's native shortcuts execute.

## Task 0: Set up git worktree

Use `/using-git-worktrees` to create an isolated worktree for this work. Run `pnpm install` and verify tests pass before starting implementation.

## Task 1: Save Spec Documentation

Create `agent-os/specs/2026-02-24-input-handler-scope-api/` with:
- **plan.md** — This plan
- **shape.md** — Shaping notes (scope, decisions, context)
- **standards.md** — Relevant standards
- **references.md** — ADR-005 and current implementation references

## Task 2: Rewrite InputHandler to use Scope API

**File:** `src/components/InputHandler.ts`

### 2a. Update imports and add new fields

```typescript
import type { Plugin, App, KeymapEventHandler, KeymapContext } from 'obsidian';
import { Scope } from 'obsidian';  // value import — instantiated with new
```

Add fields: `app: App`, `scope: Scope | null`, `scopeHandler: KeymapEventHandler | null`

Extract `app` from `plugin.app` in constructor (no constructor signature change needed).

### 2b. Rewrite `start()` → Scope-based

```
new Scope(app.scope) → scope.register(null, null, handler) → app.keymap.pushScope(scope)
```

### 2c. Add `stop()` method

```
app.keymap.popScope(scope) → null out scope/handler references
```

### 2d. Replace `onKeyDown` with `handleScopeEvent`

New signature: `(evt: KeyboardEvent, ctx: KeymapContext) => false | undefined`

Same pipeline logic (normalize → skip modifiers → escape → chord → match → handle), but:
- Returns `undefined` to pass through (modifier-only, escape, errors)
- Returns the result of `handleMatchResult()`

### 2e. Change `handleMatchResult` return semantics

Return `false` (suppress) or `undefined` (pass through) instead of calling `preventDefault()`/`stopPropagation()`:

| Match result | Return | Effect |
|---|---|---|
| Exact match | `false` | Execute command, suppress Obsidian |
| Prefix match | `false` | Show pending status, suppress |
| No match (isChord) | `false` | Suppress (consumed by chord system) |
| No match (!isChord) | `undefined` | Pass through (normal typing) |

### 2f. Delete old `onKeyDown` method

Fully replaced by `handleScopeEvent`.

## Task 3: Update main.ts lifecycle

**File:** `src/main.ts`

- Use `this.register(() => this.inputHandler.stop())` in `onload()` after `start()` — Obsidian's `register()` helper auto-calls the teardown callback on plugin unload
- Remove stale comment about registerDomEvent cleanup

## Task 4: Rewrite InputHandler tests

**File:** `src/components/__tests__/InputHandler.test.ts`

### Test infrastructure changes
- Mock `Scope` constructor in the `vi.mock('obsidian', ...)` block
- Mock `app.scope` and `app.keymap` (`pushScope`, `popScope`) on the mock plugin
- Capture the handler from `scope.register(null, null, handler)` instead of from `registerDomEvent`
- Invoke handler directly: `capturedHandler(event, { vkey: event.key })` instead of `window.dispatchEvent(event)`
- Remove window listener setup/teardown in `afterEach`

### Assertion pattern changes
- `expect(event.defaultPrevented).toBe(true)` → `expect(result).toBe(false)`
- `expect(event.defaultPrevented).toBe(false)` → `expect(result).toBeUndefined()`

### New test cases
- `start()` creates `Scope` with `app.scope` as parent
- `start()` registers catch-all handler `(null, null, fn)`
- `start()` calls `app.keymap.pushScope(scope)`
- `stop()` calls `app.keymap.popScope(scope)`
- `stop()` is idempotent when not started

## Task 5: Update ADR-005

Mark the implementation status as "implemented" (currently says "Accepted (revised)").

## Task 6: Run tests and verify build

- `pnpm vitest run` — all tests pass
- `pnpm run build` — builds without errors

## Applicable Standards

- **testing/test-structure** — Nested describe blocks, beforeEach for isolation
- **testing/file-organization** — Tests in `__tests__/` at component level
- **architecture/component-folders** — InputHandler stays in `src/components/`

## Critical Files

| File | Change scope |
|---|---|
| `src/components/InputHandler.ts` | Major rewrite of start/stop/handler |
| `src/main.ts` | Use `register()` for auto-cleanup of scope |
| `src/components/__tests__/InputHandler.test.ts` | Major test rewrite |
| `.ai/ADR/ADR-005 Event Interception Strategy.md` | Status update |
