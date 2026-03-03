# Suggest Modal Operations — Shaping Notes

## Scope

Two TypeScript interfaces for controlling Obsidian's SuggestModal:
1. **SuggestionSelector** — wraps chooser.moveUp/moveDown for option navigation
2. **InputFieldEditor** — primitive text input operations on inputEl (HTMLInputElement)

High-level operations (kill, yank, word movement) are implemented as helper functions that consume the primitive interface.

## Decisions

- **Implementation in proxy class**: SuggestModalProxy implements both interfaces (already tracks active instance)
- **Primitive InputFieldEditor**: Exposes basic elements (cursor position via InputSelection, text content, insert/delete) — not high-level commands
- **InputSelection type**: `{ from: number; to: number }` for selection range on single-line input
- **Shared KillRing**: Kill/yank operations share the existing KillRing via explicit parameter passing (not constructor injection)
- **Helper function pattern**: Generic functions take interface parameters, making them reusable for PopoverSuggestProxy later
- **Command IDs**: `suggest:` prefix (e.g., `suggest:next-option`, `suggest:forward-char`)
- **SuggestModal first**: Design for reusability with PopoverSuggest, implement SuggestModal only
- **HotkeyMatcher specificity**: At equal priority, prefer entry with `when` clause over entry without
- **No confirm action**: Selection interface covers only moveUp/moveDown (no selectActiveSuggestion)

## Context

- **Visuals:** None (interface/API design, no UI)
- **References:** Demo test commands in `src/commands/control-commands.ts` (test:next, test:prev)
- **Product alignment:** Extends Phase 2 suggest proxy work (SuggestModalProxy already captures instances)

## Standards Applied

- architecture/component-folders — new code in `src/components/execution-context/`
- development/private-api-types — typed SuggestChooser interface for `chooser` property
- development/string-constants — SUGGEST_COMMANDS constant with `as const`
- development/eslint-disable-policy — minimize eslint-disable usage
- testing/file-organization — tests in `__tests__/` directories
- testing/test-structure — nested describe blocks, beforeEach isolation
