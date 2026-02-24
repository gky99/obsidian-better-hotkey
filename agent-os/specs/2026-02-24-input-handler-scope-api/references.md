# References for InputHandler Scope API Migration

## ADR-005: Event Interception Strategy

- **Location:** `.ai/ADR/ADR-005 Event Interception Strategy.md`
- **Relevance:** Defines the target architecture — use Obsidian's Scope API instead of DOM event listeners
- **Key patterns:**
  - `new Scope(app.scope)` with app.scope as parent for fallthrough
  - `scope.register(null, null, handler)` as catch-all
  - `app.keymap.pushScope(scope)` / `app.keymap.popScope(scope)` for lifecycle
  - Return `false` to suppress, `undefined` to pass through

## Current InputHandler Implementation

- **Location:** `src/components/InputHandler.ts`
- **Relevance:** The file being migrated — current approach uses `registerDomEvent(window, 'keydown', handler, true)`
- **Key patterns to preserve:**
  - Pipeline: normalize → skip modifiers → escape → chord buffer → match → execute
  - Error handling: catch errors, clear state, log to console
  - ExecutionContext integration: killRing.updateLastActionWasYank on exact match

## Obsidian Scope API (from obsidian.d.ts)

- **Location:** `node_modules/obsidian/obsidian.d.ts`
- **Key types:**
  - `Scope` class: `constructor(parent?: Scope)`, `register(modifiers, key, func)`, `unregister(handler)`
  - `Keymap` class: `pushScope(scope)`, `popScope(scope)`
  - `KeymapEventListener`: `(evt: KeyboardEvent, ctx: KeymapContext) => false | any`
  - `KeymapContext`: extends `KeymapInfo` with `vkey: string`
  - `App`: has `keymap: Keymap` and `scope: Scope`
