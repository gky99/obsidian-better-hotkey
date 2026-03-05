# Number-Based Priority System — Shaping Notes

## Scope

Replace the source-based `Priority` enum (User=0, Preset=1, Plugin=2) with a numeric priority system where higher numbers win. Each hotkey carries a `basePriority` (category-based), and the final priority is `basePriority + indexInAggregatedList`.

## Decisions

- **Higher number = higher priority** (reversed from current)
- **BasePriority categories:** Editor=0, Widget=1000, Global=2000, Extension=3000
- **Index offset** preserves source ordering: user entries appended last → always beat same-category preset/plugin entries
- **`priority` field in config JSON** is the basePriority; optional, defaults to 0
- **`Priority` enum fully replaced** by `BasePriority` constants in `types.ts`
- **`HotkeyEntry.priority`** becomes `number` (final computed value)
- **`ConfigHotkeyEntry.priority`** holds raw basePriority; `recalculate()` adds index offset when inserting into the table
- **`clear(priority?: Priority)` simplified** to `clear()` — source-selective clearing is no longer meaningful with numeric priorities
- **`registerPluginHotkeys()`** gets optional `defaultBasePriority = 3000` param

## Context

- **Visuals:** None
- **References:** VSCode keybinding priority system (similar concept)
- **Product alignment:** Fixes real-world breakage where user-defined editor hotkeys incorrectly override widget operations like popover suggestions

## Standards Applied

- development/git-worktree-workflow — worktree created before any implementation
- testing/test-structure — nested describe, beforeEach isolation
- testing/file-organization — tests stay in `__tests__/` at component level
- development/todo-comments — phase references in any new TODOs
