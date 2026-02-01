# ADR-005: Event Interception Strategy

**Status:** Accepted

## Context

The plugin needs to intercept keyboard events before Obsidian processes them, so that Emacs-style bindings can suppress or override built-in behavior. The interception mechanism must work everywhere in the Obsidian UI — not just the editor, but also the file explorer, modals, sidebars, and settings.

The component responsible for this is the **Input Handler** — the main orchestrator of the hotkey pipeline. It captures keyboard input, drives the matching/execution flow, and decides whether to suppress or pass through each event. The event listener is an implementation detail within it.

## Decision

Use a **global `keydown` listener** (inside the Input Handler) attached at a higher priority than Obsidian's own handlers, with `stopPropagation()` / `preventDefault()` for matched hotkeys.

## Options Considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| CodeMirror 6 integration | Deep editor integration | Limited to editor view only |
| Global `keydown` listener | Works everywhere, including sidebars and modals | Must carefully manage propagation |
| Obsidian command override | Uses existing infrastructure | Limited flexibility, can't intercept arbitrary keys |

## Consequences

- Emacs hotkeys work globally across all Obsidian views and modals.
- Events matched by the plugin are suppressed before Obsidian sees them — Obsidian's native shortcuts effectively become shadowed for those keys.
- Unmatched non-chord keys pass through to Obsidian normally.
- Unmatched chord keys (keys with modifiers like Ctrl) are suppressed to prevent Obsidian from partially handling a sequence.
- The listener must be registered and torn down cleanly on plugin load/unload.
