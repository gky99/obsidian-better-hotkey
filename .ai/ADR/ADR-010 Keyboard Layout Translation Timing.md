# ADR-010: Keyboard Layout Translation Timing

**Status:** Accepted

## Context

The plugin stores hotkey definitions in JSON preset files and user override files using a string notation (e.g., `"ctrl+x ctrl+s"`). These stored definitions must work correctly across different keyboard layouts (QWERTY, Dvorak, etc.).

A key question arises: **when** does keyboard layout translation happen? There are two possible approaches:

1. **At config load time**: Translate stored hotkey strings through the Keyboard Layout Service when loading presets, store translated `KeyPress` objects. Re-translate when layout changes.
2. **At match time**: Store hotkeys as-is from their source. Translate the user's keyboard input at the moment they press a key, then match against the stored (untranslated) hotkeys.

## Decision

Keyboard layout-based hotkey translation happens at **match time** (in the Input Handler) and **display time** (in the Settings UI), **NOT** at config load time.

Hotkey definitions in presets and user overrides are stored in their original string notation without any keyboard layout transformation. The Config Manager parses string notation into `KeyPress` objects but performs no layout-aware translation.

### Translation Points

1. **Match time (Input Handler)**: When the user presses a key, `InputHandler.normalize()` uses the Keyboard Layout Service to translate the physical key event (`event.code`) into the base character on the user's current layout. This translated input is then matched against stored hotkeys.

2. **Display time (Settings UI)**: The Settings page translates stored `hotkeyString` values through the Keyboard Layout Service for display, showing what physical key the user would press on their current layout.

3. **Config load time**: No translation. Config Manager parses `"ctrl+k"` into `KeyPress { modifiers: Set(ctrl), key: "k", code: "" }` and stores it as-is.

## Options Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Translate at load time | Matching is a simple equality check | Must re-translate all entries on layout change; Config Manager depends on Keyboard Layout Service; config reload needed on layout switch |
| **Translate at match time** | Config files are layout-independent; no re-translation needed; simpler Config Manager | Matching requires layout-aware normalization in Input Handler (already exists) |

## Consequences

- **Config Manager has no dependency on Keyboard Layout Service** — it is a pure data provider
- **Layout changes do not require config reload** — the stored data stays the same; only the Input Handler's normalization changes
- **Config files remain layout-independent** — a preset written on QWERTY works on Dvorak without modification
- **Input Handler is responsible for all layout translation** — this is where the Keyboard Layout Service is used for hotkey matching
- **Settings UI is responsible for display translation** — showing the physical key the user would press
- **Supersedes parts of ADR-008** — ADR-008's "Preset Loading Rules" (number key translation, symbol skipping at load time) no longer apply to Config Manager. Those translations happen at match time in Input Handler instead.
