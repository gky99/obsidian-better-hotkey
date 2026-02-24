# References for HotkeyManager Recalculate + Preset Migration

## Similar Implementations

### ConfigManager (already implemented)

- **Location:** `src/components/ConfigManager.ts`
- **Relevance:** The data provider that fires `onChange(preset[], plugin[], user[])` — the callback that `recalculate()` will consume
- **Key patterns:** `parseBindings()` for parsing JSON → ConfigHotkeyEntry, `fireOnChange()` for callback invocation, `Disposable` return from `registerPluginHotkeys()`

### HotkeyManager existing CRUD

- **Location:** `src/components/hotkey-context/HotkeyManager.ts`
- **Relevance:** `insert()`, `remove()`, `clear()` show the table manipulation pattern. `recalculate()` builds on this but operates in batch (no per-entry onChange).
- **Key patterns:** `makeCompositeKey()` for `${canonical}::${command}` keys, `triggerOnChange()` for single callback invocation

### HotkeyContext.loadPreset()

- **Location:** `src/components/hotkey-context/HotkeyContext.ts`
- **Relevance:** The method being replaced. Shows the current flow: clear by priority → insert each entry individually → onChange fires per insert.
- **Key patterns:** Priority.Preset usage, per-entry insert loop (replaced by batch recalculate)

### Architecture.md Configuration Loading Flow

- **Location:** `.ai/Architecture.md` §4
- **Relevance:** Defines the exact data flow: ConfigManager → onChange → HotkeyManager.recalculate() → Matcher rebuild
- **Key patterns:** Three-source merge (preset, plugin, user), removal entry processing, single Matcher rebuild
