# InputHandler Scope API Migration — Shaping Notes

## Scope

Rework how the InputHandler registers for keyboard events. Replace the current `registerDomEvent(window, 'keydown', ...)` approach with Obsidian's Scope API (`pushScope`/`popScope`), so the plugin intercepts keys inside Obsidian's own event processing pipeline rather than racing its event listener.

## Decisions

- **No constructor signature change:** Extract `app` from `plugin.app` internally rather than adding a new parameter
- **Return-value semantics:** Handler returns `false` (suppress, auto-preventDefault) or `undefined` (pass through) instead of calling `preventDefault()`/`stopPropagation()` directly
- **Auto-cleanup via `register()`:** Use Obsidian's `plugin.register(() => inputHandler.stop())` for automatic scope teardown on unload, instead of manual `stop()` in `onunload()`
- **Pipeline logic unchanged:** The normalize → skip modifiers → escape → chord → match → execute pipeline stays identical; only the interception mechanism and suppression semantics change
- **Catch-all handler pattern:** `scope.register(null, null, handler)` — undocumented but widely used in the Obsidian plugin community (vim mode plugins, etc.)

## Context

- **Visuals:** None
- **References:** ADR-005 Event Interception Strategy (`.ai/ADR/ADR-005 Event Interception Strategy.md`)
- **Product alignment:** N/A

## Standards Applied

- **testing/test-structure** — Test rewrite follows nested describe blocks and beforeEach for isolation
- **testing/file-organization** — Tests remain in `__tests__/` at component level
- **architecture/component-folders** — InputHandler stays in `src/components/`
