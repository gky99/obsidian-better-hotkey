# References for Special Key Naming Convention

## SPECIAL_KEY_MAP (before this change)

- **Location**: `src/utils/hotkey.ts` lines 21–32
- **Relevance**: The map being replaced; shows the old lowercase keys and their display value targets
- **Key patterns**: parseStep does `keyPart.toLowerCase()` before lookup — this changes to case-sensitive lookup

## parseStep

- **Location**: `src/utils/hotkey.ts` lines 91–121
- **Relevance**: The function that consumes SPECIAL_KEY_MAP; logic changes to check SPECIAL_KEY_TRANSLATIONS first, then SPECIAL_KEYS set, then lowercase fallback

## emacs.json preset

- **Location**: `presets/emacs.json`
- **Relevance**: Only preset file; uses `backspace` (→ `Backspace`) in two entries

## HotkeyManager test

- **Location**: `src/components/hotkey-context/__tests__/HotkeyManager.test.ts` line 427
- **Relevance**: Only non-test-file reference to a lowercase special key in config strings
