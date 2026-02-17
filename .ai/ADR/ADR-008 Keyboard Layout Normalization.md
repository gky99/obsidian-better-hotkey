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
2. **Normalizes key input at match time** by translating physical key codes to base characters on the detected layout
3. **Provides translation utilities** for number keys and symbol availability checks
4. **Supports display translation** for showing layout-appropriate key labels in the Settings UI

### Key Normalization Rules

- **Input normalization**: Use `event.code` (physical key) → look up base character from layout map
- **Modifiers are separate**: Shift/Ctrl/Alt/Meta are tracked independently; they don't affect the recognized base character
- **macOS Option handling**: By using the physical code → layout map approach, we bypass OS-level character transformation

### Input Normalization at Match Time

Layout-based translation happens when the user presses a key, **not** when loading presets. See [ADR-010](ADR-010%20Keyboard%20Layout%20Translation%20Timing.md) for the full rationale.

The Input Handler uses the Keyboard Layout Service at match time to:

- **Translate number keys (0-9)**: Two-step translation using hardcoded digit-to-physical-key mapping:
  1. Map digit N → physical key code `DigitN` (hardcoded; `getLayoutMap()` only returns base/unshifted characters, so reverse lookup is not possible)
  2. Look up `layoutMap.get("DigitN")` to get the base character on the current layout
  - Example: User presses Ctrl+Digit3 on Programmer's Dvorak → normalized to "ctrl+{" → matches against stored hotkey

- **Handle symbol availability**: If a symbol key requires a modifier on the user's layout, the normalization accounts for this

### Display

- Settings UI shows the **actual key** users should press (translated form via Keyboard Layout Service)
- Example: A preset defining "ctrl+3" shows as "ctrl+{" on Programmer's Dvorak

### Layout Change Handling

The Keyboard Layout Service monitors for layout changes:

- Listens for window `focus` events (the `layoutchange` event has no reliable browser support)
- On focus: re-checks layout map via `getLayoutMap()` and compares with cached map
- If layout changed: rebuilds internal maps and notifies callbacks
- Stored hotkey definitions are NOT re-translated — they remain in their original notation. The Input Handler automatically uses the updated layout map for subsequent key normalizations

## Options Considered

| Option                       | Pros                          | Cons                                                      |
| ---------------------------- | ----------------------------- | --------------------------------------------------------- |
| Use event.key directly       | Simple                        | macOS Option alters characters; layout-dependent behavior |
| Physical code matching only  | Consistent position           | Unintuitive for users; can't show meaningful key labels   |
| Layout-aware normalization   | Correct behavior; good UX     | Requires layout detection; more complex                   |

## Consequences

- New component: **Keyboard Layout Service** (global singleton)
- Input Handler uses layout service for key normalization at match time
- Settings UI uses layout service for display translation
- Config Manager does **not** use layout service — stores hotkeys in original notation (see [ADR-010](ADR-010%20Keyboard%20Layout%20Translation%20Timing.md))
- Layout changes update the Input Handler's normalization automatically; no config reload needed
- Fallback behavior needed if Keyboard API unavailable (mobile, older browsers)
