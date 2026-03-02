# InputHandler handleKey Patch — Shaping Notes

## Scope

Replace the InputHandler's `pushScope`-based event interception with a `Scope.prototype.handleKey` monkey-patch via a new `ScopeProxy` class. This ensures the plugin's hotkey pipeline always runs before any scope's default handler, including newly pushed modal scopes.

## Decisions

- **Extract patching into ScopeProxy class** — Separates "how we intercept" from "what we do when intercepted"
- **ScopeProxy has no constructor params** — `patch(callback)` takes a callback with `(scope: Scope, evt: KeyboardEvent) => any`; `restore()` puts back the original
- **Top-scope check in InputHandler, not ScopeProxy** — ScopeProxy is a generic patching utility; the `scope === keymap.scope` check belongs in InputHandler's callback
- **Remove pushScope entirely** — No fallback layer; handleKey patch is the sole interception mechanism
- **Preserve ADR-005 content** — Add revision section rather than replacing existing document

## Context

- **Visuals:** None
- **References:** ADR-005 Event Interception Strategy, existing experimental patch in InputHandler.ts:59-74, original scope API spec (`agent-os/specs/2026-02-24-input-handler-scope-api/`)
- **Product alignment:** Aligns with mission — "Single interception point that handles keyboard input across all Obsidian contexts"

## Standards Applied

- **development/git-worktree-workflow** — Worktree isolation before implementation
- **testing/test-structure** — Nested describe blocks, beforeEach for isolation
- **testing/file-organization** — Tests in `__tests__/` at component level
