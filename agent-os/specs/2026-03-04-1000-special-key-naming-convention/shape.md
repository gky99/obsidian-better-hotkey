# Special Key Naming Convention — Shaping Notes

## Scope

Establish UpperCamelCase (matching `KeyboardEvent.key`) as the canonical format for all special keys in:
- Serialized config strings (preset JSON, user config)
- Hotkey settings UI display

Clean break — old lowercase format (`escape`, `backspace`, `up`, `down`, etc.) no longer accepted.

## Decisions

- **UpperCamelCase over lowerCamelCase**: UpperCamelCase matches `KeyboardEvent.key` values directly, eliminating translation for most keys. Only `Space → ' '` is an exception.
- **Clean break (no backward compat)**: Simplified implementation; no migration shim.
- **Arrow keys renamed**: `up/down/left/right` → `ArrowUp/ArrowDown/ArrowLeft/ArrowRight` (matches browser standard).
- **New keys added**: `PageUp`, `PageDown`, `Home`, `End`, `F1`–`F12`.
- **Two exports replace one**: `SPECIAL_KEYS` (set of all valid identity tokens) + `SPECIAL_KEY_TRANSLATIONS` (only the non-identity case: `Space → ' '`).
- **ADR-011 documents the decision** in `.AI/ADR/`.

## Context

- **Visuals**: None
- **References**: `src/utils/hotkey.ts` (SPECIAL_KEY_MAP, parseStep), `presets/emacs.json`
- **Product alignment**: N/A (infrastructure/convention change)

## Standards Applied

- `development/string-constants` — special key names defined as exported constants
