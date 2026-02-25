# ADR-001: Key Representation

**Status:** Accepted

## Context

The plugin needs to represent keyboard input internally. Two fundamental approaches exist: matching by the character the key produces (e.g., `x`, `s`) or by the physical key position (scan-code, e.g., `KeyX`, `KeyS`). The choice affects how bindings behave across different keyboard layouts.

Emacs users expect `C-x` to mean "Ctrl + whatever key produces 'x'" — on a QWERTY layout that's the physical X key, but on AZERTY it's a different position. This is the character-based model.

Some users on non-Latin layouts may prefer bindings tied to physical position instead.

## Decision

Use **character-based matching by default**, with scan-code as an opt-in feature deferred to P2.

## Update: Physical Code-Based Matching (ADR-008, Task 2.8)

The original character-based decision has been superseded. Matching now uses **physical key codes** (`KeyPress.code`), not character values:

- **Hotkey definitions** are stored as character-based strings in config (e.g., `"ctrl+k"`)
- **HotkeyManager** translates characters to physical key codes at load time via `keyboardLayoutService.getCode()` and a special key code map
- **HotkeyMatcher** builds its matching table keyed by code-based canonical strings (e.g., `"C-KeyK"`) and matches input by `event.code`
- **Input Handler** sets `KeyPress.key` from the layout service (for display in status indicator) and `KeyPress.code` from `event.code` (for matching)
- **KeyPress.key** is for display only — it is NOT used for matching

This approach:
- Bypasses OS-level character transformations (e.g., macOS Option key producing é instead of e)
- Handles digit/symbol collisions on non-QWERTY layouts (e.g., both `ctrl+3` and `ctrl+{` map to `Digit3` on Programmer's Dvorak)
- Config files remain layout-independent — layout translation happens at runtime

## Options Considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| Character-based only | Simple, matches Emacs user expectation | Bindings shift with layout; macOS Option breaks matching |
| Scan-code only | Consistent physical position across layouts | Unintuitive for Emacs users |
| Both (character default, scan-code opt-in) | Flexible, handles all use cases | Slightly more complex internal representation |
| **Physical code matching with character config** | Correct across layouts; config stays readable | Requires translation layer in HotkeyManager |

## Consequences

- `KeyPress` stores both `key` (display character from layout service) and `code` (physical key code for matching)
- Matching uses `KeyPress.code` via code-based canonicalization
- HotkeyManager translates config characters → physical codes at load time
- Input Handler derives `key` from layout service's `getBaseCharacter(event.code)` for display
- On layout change, config is reloaded to re-translate codes
- Scan-code matching as an opt-in feature (P2) may no longer be needed
