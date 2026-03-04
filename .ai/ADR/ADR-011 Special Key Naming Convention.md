# ADR-011: Special Key Naming Convention

**Status:** Accepted

## Context

The plugin needs a consistent notation for special keys (non-printable keys) in config strings and the hotkey settings UI. Previously, some keys used lowercase bare words (`escape`, `backspace`, `up`) while arrow keys were abbreviated (`up`, `down`, `left`, `right`). This was inconsistent and didn't align with browser standards.

## Decision

Use **UpperCamelCase matching `KeyboardEvent.key` values** as the canonical notation for all special keys in:
- Serialized config (preset JSON, user overrides)
- Hotkey settings display

### Complete Mapping

| Config notation | `KeyPress.key` (`KeyboardEvent.key`) | Physical code |
|-----------------|--------------------------------------|---------------|
| `Space`         | `' '` (literal space)                | `Space`       |
| `Backspace`     | `Backspace`                          | `Backspace`   |
| `Tab`           | `Tab`                                | `Tab`         |
| `Enter`         | `Enter`                              | `Enter`       |
| `Escape`        | `Escape`                             | `Escape`      |
| `Delete`        | `Delete`                             | `Delete`      |
| `ArrowUp`       | `ArrowUp`                            | `ArrowUp`     |
| `ArrowDown`     | `ArrowDown`                          | `ArrowDown`   |
| `ArrowLeft`     | `ArrowLeft`                          | `ArrowLeft`   |
| `ArrowRight`    | `ArrowRight`                         | `ArrowRight`  |
| `PageUp`        | `PageUp`                             | `PageUp`      |
| `PageDown`      | `PageDown`                           | `PageDown`    |
| `Home`          | `Home`                               | `Home`        |
| `End`           | `End`                                | `End`         |
| `F1` – `F12`    | `F1` – `F12`                         | `F1` – `F12`  |

### Implementation

Two exports replace the old `SPECIAL_KEY_MAP` in `src/utils/hotkey.ts`:

- **`SPECIAL_KEYS`** (`ReadonlySet<string>`): All valid special key tokens that pass through as-is (token = `KeyboardEvent.key`)
- **`SPECIAL_KEY_TRANSLATIONS`** (`{ Space: ' ' }`): Only the one key requiring translation

Parser logic in `parseStep`:
1. Check `SPECIAL_KEY_TRANSLATIONS` → use translated value (`Space → ' '`)
2. Check `SPECIAL_KEYS` → pass through as-is (e.g., `Backspace`, `ArrowUp`)
3. Otherwise → lowercase (regular letter/symbol key)

## Relation to ADR-001

ADR-001 defines that config strings use character-based notation (e.g., `"ctrl+k"`). This ADR refines the notation for special key tokens within that format. The underlying matching strategy (physical code-based) is unchanged.

## Consequences

- Old lowercase forms (`escape`, `backspace`, `up`, `down`, `left`, `right`, `space`) are **no longer accepted** — clean break, no backward compatibility
- Config notation for special keys now directly matches `KeyboardEvent.key`, eliminating translation for all keys except `Space → ' '`
- Preset files and user configs must use UpperCamelCase special key tokens
