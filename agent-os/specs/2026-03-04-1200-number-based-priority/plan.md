# Number-Based Hotkey Priority System

## Context

The current priority system (Priority enum: User=0, Preset=1, Plugin=2) resolves conflicts based solely on *who defined* the hotkey. This breaks down in practice: a user-defined editor hotkey always beats a preset-defined widget hotkey, even though widget operations (popover suggestions) should semantically outrank editor operations regardless of source.

The new system introduces numeric priorities where **higher number = higher priority**, combining a category-based base priority with an index offset to preserve source ordering.

**Formula:** `finalPriority = basePriority + indexInAggregatedList`

**Categories:**
| Category | basePriority | Examples |
|----------|-------------|---------|
| Editor / input element | 0 | `editor:*`, textarea ops |
| Widget | 1000 | popover suggest, suggestion modal |
| Global | 2000 | open command palette, open file |
| Extension (plugin) | 3000 | plugin-registered ops (default, overrideable) |

**Aggregation order:** preset → plugin → user (same as current). Index increases across the full list, so user entries always have higher index than preset/plugin entries with the same basePriority.

---

## Task 1: Create git worktree

Run `/using-git-worktrees` to create an isolated workspace before any code changes. Branch name suggestion: `number-based-priority`.

---

## Task 2: Save spec documentation

Create `agent-os/specs/2026-03-04-1200-number-based-priority/` with plan.md, shape.md, standards.md, references.md.

**Files to create:**
- `agent-os/specs/2026-03-04-1200-number-based-priority/plan.md` (this plan)
- `agent-os/specs/2026-03-04-1200-number-based-priority/shape.md`
- `agent-os/specs/2026-03-04-1200-number-based-priority/standards.md` (git-worktree-workflow, testing/test-structure, testing/file-organization, development/todo-comments)
- `agent-os/specs/2026-03-04-1200-number-based-priority/references.md`

---

## Task 3: Update types in `src/types.ts`

**Remove** `Priority` enum entirely.

**Add** `BasePriority` constants:
```typescript
export const BasePriority = {
    Editor: 0,
    Widget: 1000,
    Global: 2000,
    Extension: 3000,
} as const;
```

**Change** `HotkeyEntry.priority` from `Priority` to `number` (final computed priority).

**`ConfigHotkeyEntry.priority`** stays `number` — holds the raw basePriority read from config (before index is added).

**Update** `RawHotkeyBinding` interface (currently private in ConfigManager) to add:
```typescript
priority?: number; // basePriority; defaults to 0 if omitted
```

---

## Task 4: Update `ConfigManager.ts`

- Remove `Priority` import; remove the `priority: Priority` parameter from `parseBindings()` and `parseConfigEntry()`
- In `parseConfigEntry()`, read `priority` from the raw binding (default 0 if absent)
- In `loadAll()`: stop passing `Priority.Preset` / `Priority.User` to `parseBindings()` — each entry now carries its own basePriority from the JSON
- In `registerPluginHotkeys()`, add optional `defaultBasePriority = BasePriority.Extension` param. Bindings without an explicit `priority` field use this default:
  ```typescript
  registerPluginHotkeys(pluginName: string, bindings: RawHotkeyBinding[], defaultBasePriority = BasePriority.Extension): Disposable
  ```
- `addUserHotkey()` should accept an optional `basePriority = 0` param and store it on the entry

---

## Task 5: Update `HotkeyManager.ts`

- Remove `Priority` import
- `recalculate()`: maintain a running `index` counter across all three source lists. Compute `finalPriority = entry.priority + index` for each non-removal entry:
  ```typescript
  let index = 0;
  // preset loop: finalPriority = entry.priority + index; index++
  // plugin loop: finalPriority = entry.priority + index; index++
  // user loop (non-removal): finalPriority = entry.priority + index; index++
  ```
- `insertEntry(entry, finalPriority: number)`: already overrides priority via spread — just change type from `Priority` to `number`
- `insert(entry: HotkeyEntry, finalPriority: number)`: change param type from `Priority` to `number`
- `clear(priority?: Priority)`: remove the `priority` parameter (make it clear-all only). The selective-by-source clear is no longer meaningful with numeric priorities; source management is handled by `recalculate()` rebuilding from scratch.

---

## Task 6: Update `HotkeyMatcher.ts`

- `selectHighestPriority()`: flip comparison — return entry with **highest** `priority` number (not lowest):
  ```typescript
  return entries.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest
  );
  ```
- Update comment from "Lower number = higher priority" to "Higher number = higher priority"

---

## Task 7: Update `presets/emacs.json`

Add `"priority"` field to each hotkey entry based on the operation category:
- All `editor:*` commands → `"priority": 0`
- Any global actions (open command palette, etc.) → `"priority": 2000`

Example:
```json
{ "command": "editor:forward-char", "key": "ctrl+f", "priority": 0 }
```

---

## Task 8: Update tests

Update `src/components/hotkey-context/__tests__/HotkeyManager.test.ts`:
- Remove all `Priority` enum imports and usages
- Replace `Priority.User/Preset/Plugin` with numeric values in `entry()` / `configEntry()` helpers
- Update `clear()` call sites to remove priority argument
- Update `recalculate()` tests to verify the new `finalPriority = basePriority + index` logic

Update `src/components/hotkey-context/__tests__/HotkeyMatcher.test.ts`:
- Replace `Priority` enum references with plain numbers
- Verify that higher numbers win in conflict resolution

---

## Critical Files

| File | Change |
|------|--------|
| `src/types.ts` | Remove Priority enum, add BasePriority constants, change priority to number |
| `src/components/ConfigManager.ts` | Read priority from config, remove source-based priority assignment |
| `src/components/hotkey-context/HotkeyManager.ts` | Compute finalPriority = basePriority + index in recalculate() |
| `src/components/hotkey-context/HotkeyMatcher.ts` | Flip comparison to prefer highest number |
| `presets/emacs.json` | Add priority field to all entries |
| `src/components/hotkey-context/__tests__/HotkeyManager.test.ts` | Update to numeric priorities |
| `src/components/hotkey-context/__tests__/HotkeyMatcher.test.ts` | Update to numeric priorities |

---

## Verification

1. `pnpm run typecheck` — no TypeScript errors
2. `pnpm test` — all unit tests pass (HotkeyManager, HotkeyMatcher)
3. Manual test: Load Obsidian with emacs preset. Open a suggestion popover (e.g., command palette). Confirm widget-bound keys (priority 1000+) correctly override editor-bound keys (priority 0) when the widget is active.
4. Confirm user-defined editor key still overrides preset editor key for the same command (user index > preset index, same basePriority).
