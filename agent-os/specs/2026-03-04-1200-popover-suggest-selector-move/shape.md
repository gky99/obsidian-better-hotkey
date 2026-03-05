# Popover Suggest Selector Move — Shaping Notes

## Scope

Implement `moveUp` / `moveDown` navigation for Obsidian's `PopoverSuggest` (inline suggestion popovers, e.g. wikilinks `[[`). The `SuggestionSelector` interface already exists and is used by `SuggestModalProxy`; this change wires the same interface to `PopoverSuggestProxy` using the private `instance.suggestions` API.

## Decisions

- **Separate command namespace**: `popover-suggest:next-option` / `popover-suggest:prev-option` (not shared with suggest-modal commands)
- **Context key**: reuse existing `popoverSuggestOpen` — popovers never receive DOM focus so no new focus state needed
- **Scope**: navigation only (`moveUp` / `moveDown`) — no text editing commands for popovers
- **Rename**: existing suggest modal commands renamed from `suggest:*` to `suggest-modal:*` namespace for clarity

## Context

- **Visuals:** None
- **References:** `SuggestModalProxy` implementation — mirrors same prototype-patching pattern
- **Product alignment:** N/A

## Standards Applied

- type-safe-private-apis — accessing `instance.suggestions` (private Obsidian API) requires proper interface typing
