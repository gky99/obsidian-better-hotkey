# String Parser & Config Manager — Shaping Notes

## Scope

Implement Dev Plan sections 2.4 (String Parser & Types) and 2.5 (Config Manager).

- **2.4**: `ConfigHotkeyEntry` type extending `HotkeyEntry`, `parseHotkeyString()` function, `VALID_MODIFIERS` and `SPECIAL_KEY_MAP` constants
- **2.5**: `ConfigManager` class with file I/O, preset/user/plugin entry management

**Excluded**: Section 2.6 (HotkeyManager.recalculate(), main.ts wiring, emacs.json preset). ConfigManager is standalone.

## Decisions

- **Single `RawHotkeyBinding` type** for both preset and user hotkey JSON entries
- **`PLUGIN_DATA_PATH` as hardcoded constant** in constants.ts, not a constructor parameter
- **`registerPluginHotkeys(pluginName, bindings[])`** — bulk registration with array. Same pluginName replaces all previous entries.
- **`removeHotkey()`** is a placeholder stub (throws "not implemented") — deferred to Settings UI phase
- **`when` clause stored as-is** — no parsing or validation in this phase
- **No keyboard layout translation** at config load time (ADR-010)
- **Plugin-level object, not singleton** — created in main.ts (phase 2.6)

## Context

- **Visuals:** None
- **References:** HotkeyManager pattern (setOnChange callback, CRUD), KeyboardLayoutService test patterns
- **Product alignment:** Core infrastructure for user-configurable keybindings
