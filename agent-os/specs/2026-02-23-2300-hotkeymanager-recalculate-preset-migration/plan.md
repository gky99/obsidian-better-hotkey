# Task 2.6: HotkeyManager Recalculate + Preset Migration

## Context

Currently, HotkeyContext takes a TypeScript `HotkeyPreset` object in its constructor and loads hotkeys via `loadPreset()` which manually inserts entries one-by-one. ConfigManager (task 2.5) was built to load presets from JSON files and fire an `onChange(preset[], plugin[], user[])` callback — but nothing consumes that callback yet.

This task connects ConfigManager to HotkeyManager by adding a `recalculate()` method that replaces the entire hotkey table in a single batch operation, processes user removal directives, and triggers a single Matcher rebuild. It also migrates the hardcoded TypeScript preset to a JSON file on disk.

---

## Task 0: Create isolated worktree

Call `/using-git-worktrees` to create an isolated workspace before any implementation.

## Task 1: Save spec documentation

Create `agent-os/specs/2026-02-23-2300-hotkeymanager-recalculate-preset-migration/` with:
- **plan.md** — This full plan
- **shape.md** — Shaping notes (scope, decisions, context)
- **standards.md** — All 5 applicable standards
- **references.md** — Pointers to reference implementations

## Task 2: Create `presets/emacs.json`

Create the JSON preset file at the **plugin root** (NOT in `src/`). Per Architecture.md section 5, ConfigManager reads from `{pluginDataPath}/presets/{presetName}.json` and the plugin directory IS the data path.

15 bindings matching the current `src/presets/default.ts` converted to string notation. Command IDs match `constants.ts` values (string-constants standard).

## Task 3: Delete `src/presets/default.ts` and `src/presets/index.ts`

Both files become unnecessary. Remove the entire `src/presets/` directory.

## Task 4: Add `recalculate()` to HotkeyManager

**File:** `src/components/hotkey-context/HotkeyManager.ts`

Add import for `ConfigHotkeyEntry` and `Priority` from types. Add three methods:

### `recalculate(preset, plugin, user)`
Batch replace the entire hotkey table. Operates directly on internal Map to avoid per-entry onChange fires. Calls `triggerOnChange()` exactly once at the end.

```
1. Clear hotkeyTable
2. Insert preset entries (Priority.Preset) — skip removal entries
3. Insert plugin entries (Priority.Plugin) — skip removal entries
4. Process user entries in order:
   - If removal=false → insert with Priority.User
   - If removal=true → call applyRemoval()
5. Call triggerOnChange() once
```

### `private insertEntry(entry, priority)`
Insert into table without triggering onChange. Strips ConfigHotkeyEntry metadata (`removal`, `hotkeyString`) — stores plain `HotkeyEntry` only.

### `private applyRemoval(entry)`
Single removal mode (per Architecture.md section 5):
- **With hotkeyString** (key.length > 0): Build composite key from canonical sequence + command, delete that specific entry
- **Without hotkeyString** (key.length === 0): Silently ignored — a removal entry without a key has no effect

Existing `insert()`, `remove()`, `clear()` methods remain unchanged — still needed for future Phase 3.4 hot-update.

## Task 5: Update HotkeyContext — remove preset param

**File:** `src/components/hotkey-context/HotkeyContext.ts`

- Remove `preset: HotkeyPreset` from constructor signature
- Remove `import type { HotkeyPreset }` and `import { Priority }`
- Remove `loadPreset()` method entirely
- Remove `this.loadPreset(preset)` call from constructor
- Constructor becomes: `constructor(chordTimeout: number, statusBarItem: HTMLElement)`

HotkeyManager is now populated externally via `recalculate()` wired from ConfigManager.onChange in main.ts.

## Task 6: Update main.ts — wire ConfigManager

**File:** `src/main.ts`

- Remove `import { defaultPreset } from './presets'`
- Add ConfigManager import and field
- Create HotkeyContext without preset
- Create ConfigManager with vault adapter and plugin data path
- Wire onChange to recalculate
- Call loadAll(selectedPreset) which triggers the full chain
- Add dispose to onunload

## Task 7: Update settings and cleanup types

- settings.ts: Change default preset from 'default' to 'emacs', update dropdown
- types.ts: Remove HotkeyPreset interface and HotkeyPresetMeta type

## Task 8: Tests for recalculate

Add describe('recalculate') to HotkeyManager.test.ts with 9 test cases plus integration test with HotkeyMatcher.

---

## Verification

1. `pnpm vitest run` — all existing + new tests pass
2. `pnpm tsc --noEmit` — no type errors
3. `pnpm run build` — builds successfully
4. Manual: load plugin in Obsidian, verify cursor movement commands still work via JSON preset

## Files Modified

| File | Action |
|------|--------|
| `presets/emacs.json` | **Create** |
| `src/presets/default.ts` | **Delete** |
| `src/presets/index.ts` | **Delete** |
| `src/components/hotkey-context/HotkeyManager.ts` | **Modify** — add recalculate, insertEntry, applyRemoval |
| `src/components/hotkey-context/HotkeyContext.ts` | **Modify** — remove preset param, remove loadPreset |
| `src/main.ts` | **Modify** — wire ConfigManager, remove preset import |
| `src/settings.ts` | **Modify** — default preset to 'emacs' |
| `src/types.ts` | **Modify** — remove HotkeyPreset, HotkeyPresetMeta |
| `src/components/hotkey-context/__tests__/HotkeyManager.test.ts` | **Modify** — add recalculate tests |
