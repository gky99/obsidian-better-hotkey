# References for String Parser & Config Manager

## HotkeyManager pattern

- **Location:** `src/components/hotkey-context/HotkeyManager.ts`
- **Relevance:** Same plugin-level object pattern with `setOnChange()` callback
- **Key patterns:** CRUD operations, composite key format, onChange wiring

## HotkeyManager tests

- **Location:** `src/components/hotkey-context/__tests__/HotkeyManager.test.ts`
- **Relevance:** Test structure, helper functions (`key()`, `entry()`), mock patterns
- **Key patterns:** `vi.fn()` for mocking callbacks, beforeEach isolation

## Existing hotkey utils

- **Location:** `src/utils/hotkey.ts`
- **Relevance:** Where `parseHotkeyString()` and constants will be added
- **Key patterns:** `canonicalizeKeyPress()`, `canonicalizeSequence()`

## Types

- **Location:** `src/types.ts`
- **Relevance:** `KeyPress`, `HotkeyEntry`, `Priority`, `Disposable` — all reused
