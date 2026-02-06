# ADR-008: Keyboard Layout Normalization

**Status:** Accepted

## Context

The plugin needs to handle keyboard input consistently across different keyboard layouts and operating systems. Key challenges:

1. **macOS Option key behavior**: Pressing Option+character produces altered characters (e.g., Option+e produces é), which breaks hotkey matching
2. **Non-QWERTY layouts**: The same physical key produces different characters on different layouts (e.g., QWERTY "3" vs Programmer's Dvorak "{")
3. **Symbol availability**: Some symbols available as base keys on QWERTY require modifiers on other layouts (e.g., backtick on Programmer's Dvorak)

## Decision

Implement a **Keyboard Layout Service** that:

1. **Detects the keyboard layout** using the Web Keyboard API (`navigator.keyboard.getLayoutMap()`)
2. **Normalizes key input** by translating physical key codes to base characters on the detected layout
3. **Translates number keys in presets** to their corresponding base characters
4. **Skips unavailable symbols** when loading presets

### Key Normalization Rules

- **Input normalization**: Use `event.code` (physical key) → look up base character from layout map
- **Modifiers are separate**: Shift/Ctrl/Alt/Meta are tracked independently; they don't affect the recognized base character
- **macOS Option handling**: By using the physical code → layout map approach, we bypass OS-level character transformation

### Preset Loading Rules

- **Number keys (0-9)**: Two-step translation using hardcoded digit-to-physical-key mapping:
  1. Map digit N → physical key code `DigitN` (hardcoded; `getLayoutMap()` only returns base/unshifted characters, so reverse lookup is not possible)
  2. Look up `layoutMap.get("DigitN")` to get the base character on the current layout
  - Example: "ctrl+3" on QWERTY → "ctrl+{" on Programmer's Dvorak
    - Step 1: digit "3" → physical key `Digit3`
    - Step 2: `layoutMap.get("Digit3")` → "{" (base character on Programmer's Dvorak)

- **Symbol keys**: If the symbol requires a modifier on the user's layout, skip the hotkey
  - Example: "ctrl+`" is skipped on Programmer's Dvorak (backtick requires shift)

### Display

- Settings UI shows the **actual key** users should press (translated form)
- Example: A preset defining "ctrl+3" shows as "ctrl+{" on Programmer's Dvorak

### Layout Change Handling

The Keyboard Layout Service monitors for layout changes:

- Listens for window `focus` events (the `layoutchange` event has no reliable browser support)
- On focus: re-checks layout map via `getLayoutMap()` and compares with cached map
- If layout changed: rebuilds maps and notifies callback to reload presets with new translations
- This ensures hotkeys remain correct when user switches keyboard layouts

## Options Considered

| Option                       | Pros                          | Cons                                                      |
| ---------------------------- | ----------------------------- | --------------------------------------------------------- |
| Use event.key directly       | Simple                        | macOS Option alters characters; layout-dependent behavior |
| Physical code matching only  | Consistent position           | Unintuitive for users; can't show meaningful key labels   |
| Layout-aware normalization   | Correct behavior; good UX     | Requires layout detection; more complex                   |

## Consequences

- New component: **Keyboard Layout Service** (global singleton)
- Input Handler uses layout service for key normalization
- Config Loader uses layout service for preset translation
- Settings UI shows translated hotkeys
- Layout changes trigger automatic hotkey re-translation
- Fallback behavior needed if Keyboard API unavailable (mobile, older browsers)
