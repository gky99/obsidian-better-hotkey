# References for Number-Based Priority System

## Similar Implementations

### Current Priority System

- **Location:** `src/types.ts` (Priority enum), `src/components/hotkey-context/HotkeyManager.ts` (recalculate)
- **Relevance:** Being replaced — understand existing flow before changing
- **Key patterns:** `recalculate(preset, plugin, user)` processes in source order; `insertEntry()` overrides priority via spread

### HotkeyMatcher conflict resolution

- **Location:** `src/components/hotkey-context/HotkeyMatcher.ts:87`
- **Relevance:** `selectHighestPriority()` comparison direction needs flipping
- **Key patterns:** `entries.reduce()` to find winner — just flip `<` to `>`

### ConfigManager source tracking

- **Location:** `src/components/ConfigManager.ts`
- **Relevance:** Source tracking (presetEntries, pluginEntries, userEntries) stays unchanged; only priority assignment changes
- **Key patterns:** `parseBindings()` and `parseConfigEntry()` are where priority is currently injected — remove the parameter, read from binding instead
