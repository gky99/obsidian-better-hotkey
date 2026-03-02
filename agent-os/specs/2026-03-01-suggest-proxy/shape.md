# SuggestProxy — Shaping Notes

## Scope

Proxy Obsidian's `PopoverSuggest` and `SuggestModal` by monkey-patching `open`/`close` on their prototypes to capture/clear instance references and set boolean context keys on `ContextEngine`.

## Decisions

- **Two separate classes**: `SuggestModalProxy` and `PopoverSuggestProxy` — each owns its own patching, reference storage, and cleanup
- **Location**: `src/components/execution-context/` — follows component-folders standard, aligns with WorkspaceContext's deferred TODOs
- **Method naming**: `patch()` / `restore()` — clearer than install/dispose
- **Full object instance captured** (not just DOM element) — enables future features like accessing chooser, scope, values
- **Separate context keys**: `suggestModalOpen` and `popoverSuggestOpen` — allows independent targeting in `when` clauses
- **Single-reference tracking** (not ref-counted) — sufficient for boolean context; upgradeable to `Set` later
- **try/finally pattern** for patching — ensures context is always updated even if original throws
- **Idempotent** `patch()` / `restore()` via `patched` boolean guard

## Context

- **Visuals:** None (code-level change, no UI)
- **References:** obsidian-quick-select plugin (`/Users/gky/Documents/obsidian-test-playground/.obsidian/plugins/obsidian-quick-select/src/main.ts`)
- **Product alignment:** Phase 2 feature — WorkspaceContext.ts has deferred TODOs for this exact capability
