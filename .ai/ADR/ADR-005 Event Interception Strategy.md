# ADR-005: Event Interception Strategy

**Status:** Implemented (revised 2026-03-01)

## Context

The plugin needs to intercept keyboard events before Obsidian processes them, so that Emacs-style bindings can suppress or override built-in behavior. The interception mechanism must work everywhere in the Obsidian UI — not just the editor, but also the file explorer, modals, sidebars, and settings.

The component responsible for this is the **Input Handler** — the main orchestrator of the hotkey pipeline. It captures keyboard input, drives the matching/execution flow, and decides whether to suppress or pass through each event.

### Problem with the original approach

The original decision was to use a global `keydown` capture-phase listener on `window` via `plugin.registerDomEvent()`. However, Obsidian's internal `Keymap` also registers a `keydown` capture listener on `window` during app initialization — before any plugin loads. Since both listeners are on the **same element** in the **same phase**, they fire in FIFO (registration) order, meaning Obsidian's handler always fires first.

`stopPropagation()` only prevents events from reaching **other elements** — it cannot stop other listeners on the **same element**. Even `stopImmediatePropagation()` can only stop listeners that haven't yet fired, making it useless when Obsidian's listener is already first in line.

Reordering the listeners (remove + re-add) was investigated but rejected because Obsidian's handler reference is not exposed on `app.keymap` as a public property, and `getEventListeners()` is a DevTools-only API unavailable at runtime.

## Decision

Use **Obsidian's Scope API** (`Scope` + `Keymap.pushScope`) to intercept keys inside Obsidian's own event processing pipeline, rather than racing its event listener.

The Input Handler creates a `Scope` (with `app.scope` as its parent for fallthrough), registers a catch-all handler via `scope.register(null, null, handler)`, and pushes the scope onto the keymap stack via `app.keymap.pushScope()`. When Obsidian's keydown handler fires, it checks the active scope first — our handler runs and returns `false` (handled, auto-preventDefault) or `undefined` (pass through to Obsidian's normal processing).

## Options Considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| CodeMirror 6 integration | Deep editor integration | Limited to editor view only |
| Global `keydown` capture listener | Works everywhere | Obsidian registers first on `window` — handler always fires after Obsidian's; can't reorder without internal handler reference |
| Obsidian command override | Uses existing infrastructure | Limited flexibility, can't intercept arbitrary keys |
| Listener reorder (remove + re-add) | Would give our handler FIFO priority | Handler reference not programmatically accessible (`getEventListeners` is DevTools-only) |
| Electron `before-input-event` | Fires before all DOM events | Requires main process access; not available to Obsidian plugins |
| **Obsidian Scope API** | **Works inside Obsidian's own dispatch; clean lifecycle; no monkey-patching** | **Relies on Scope semantics (catch-all with `null, null`)** |

## Implementation

```
start():  new Scope(app.scope) → scope.register(null, null, handler) → app.keymap.pushScope(scope)
stop():   app.keymap.popScope(scope)
```

The handler returns:

| Match result | Return | Effect |
| --- | --- | --- |
| Exact match | `false` | Execute command, suppress Obsidian |
| Prefix match | `false` | Show pending status, suppress Obsidian |
| No match (has modifiers) | `false` | Suppress (consumed by chord system) |
| No match (no modifiers) | `undefined` | Pass through to Obsidian (normal typing) |
| Modifier-only / Escape | `undefined` | Pass through to Obsidian |

## Consequences

- Emacs hotkeys work globally across all Obsidian views and modals.
- Events matched by the plugin are suppressed before Obsidian's native shortcuts execute.
- Unmatched non-chord keys pass through to Obsidian normally.
- Unmatched chord keys (keys with modifiers) are suppressed to prevent Obsidian from partially handling a sequence.
- Modal scopes (command palette, settings, etc.) push on top of our scope and take priority when open — correct behavior.
- Scope lifecycle is clean: `pushScope` on plugin load, `popScope` on unload.
- No monkey-patching, no internal API access, no listener reordering hacks.

---

## Revision: Scope.prototype.handleKey Patch (2026-03-01)

### Problem with pushScope

The pushScope approach works for normal use, but newly pushed scopes (modals, command palette, etc.) run **before** our handler. When Obsidian opens a modal and pushes a new scope onto the keymap stack, that modal scope becomes the top scope and processes events first. Our scope only runs if the modal scope passes through — meaning the plugin loses interception priority while modals are active.

### Revised Decision

Replace pushScope-based registration with a `Scope.prototype.handleKey` monkey-patch, encapsulated in a `ScopeProxy` class (`src/components/ScopeProxy.ts`).

The `ScopeProxy.patch(callback)` method replaces `Scope.prototype.handleKey` with a version that calls the provided callback before the original handler. The callback receives the Scope instance and the KeyboardEvent, allowing the caller (InputHandler) to check whether the scope is the top scope (`scope === keymap.scope`) and decide whether to run the pipeline.

### Revised Implementation

```
start():  scopeProxy.patch(callback) → plugin.register(() => stop())
stop():   scopeProxy.restore()
```

The callback inside InputHandler:
- If `scope === keymap.scope` (top scope): run hotkey pipeline
  - If match: return `false` (suppress — original handleKey is NOT called)
  - If no match: return `undefined` (pass through — original handleKey IS called)
- If not top scope (parent chain propagation): return `undefined` (pass through)

### Trade-offs

- **Pro:** Guaranteed first-handler execution regardless of what scope is active
- **Pro:** Works correctly with modals — our handler intercepts first, passes through if no match
- **Con:** Uses monkey-patching on `Scope.prototype.handleKey` (internal API)
- **Mitigation:** ScopeProxy encapsulates the patch; `restore()` cleanly reverts on plugin unload
