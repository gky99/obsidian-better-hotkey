# HotkeyManager Recalculate + Preset Migration — Shaping Notes

## Scope

Task 2.6 from Development Plan. Connect ConfigManager (task 2.5) to HotkeyManager by adding a `recalculate()` method that replaces the entire hotkey table in a single batch operation, processes user removal directives, and triggers a single Matcher rebuild. Migrate the hardcoded TypeScript preset (`src/presets/default.ts`) to a JSON file on disk (`presets/emacs.json`).

## Decisions

- **Preset location**: JSON preset files live at plugin root (`presets/emacs.json`), NOT in `src/`. The plugin directory IS the data path, so ConfigManager reads them directly via DataAdapter.
- **Removal semantics**: Only removal entries WITH a hotkeyString take effect (remove specific binding by canonical sequence + command). Removal entries without a hotkeyString are silently ignored.
- **Batch operation**: `recalculate()` operates directly on the internal Map to avoid per-entry onChange fires. Triggers `triggerOnChange()` exactly once at the end.
- **Config metadata stripping**: `recalculate()` strips ConfigHotkeyEntry metadata (`removal`, `hotkeyString`) before storing — HotkeyManager's table contains plain `HotkeyEntry` objects only.
- **Existing methods preserved**: `insert()`, `remove()`, `clear()` remain unchanged for future Phase 3.4 hot-update support.
- **HotkeyPreset type removed**: No longer needed — preset data comes from ConfigManager as `ConfigHotkeyEntry[]`, not as a `HotkeyPreset` object.

## Context

- **Visuals:** None — backend/wiring task
- **References:** HotkeyManager.ts, ConfigManager.ts, HotkeyContext.ts, Architecture.md §4-5
- **Product alignment:** N/A
