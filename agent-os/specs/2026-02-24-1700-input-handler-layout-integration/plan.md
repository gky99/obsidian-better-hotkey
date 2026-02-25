# Spec: Task 2.8 — Input Handler Layout Integration

## Context

The Keyboard Layout Service (task 2.7) is complete but not yet integrated into the hotkey pipeline. Currently, `InputHandler.normalize()` uses `event.key` (browser-produced character) which breaks on:

- **macOS Option key**: Option+e produces é instead of e
- **Non-QWERTY layouts**: Same physical key produces different characters

The system should use **physical key codes** for matching. Hotkey definitions (stored as character-based strings like `"ctrl+k"`) are translated to physical codes when loaded into HotkeyManager. Input events provide `event.code` directly. The Matcher compares by physical code.

This updates the matching strategy from character-based to code-based (ADR-001 update required).

## Design Summary

**Translation flow:**

```text
Config ("ctrl+k")
  → ConfigManager parses to KeyPress { key: "k", code: "" }
  → HotkeyManager.recalculate() translates: layoutService.getCode("k") → "KeyK"
    → HotkeyEntry stored with KeyPress { key: "k", code: "KeyK" }
  → Matcher.rebuild() builds table keyed by code-based canonical ("C-KeyK")

User presses Ctrl+K physical key:
  → InputHandler.normalize(): KeyPress { key: "k" (from getBaseCharacter, for display), code: "KeyK" (from event.code) }
  → Matcher.match(): canonicalizes by code → "C-KeyK" → match found
```

**Key field purpose:** `KeyPress.key` is populated by layout service for **display only** (status indicator shows pending chord). It is NOT used for matching.

**Special keys:** Space, Backspace, Escape, Enter, Tab, Delete, ArrowUp/Down/Left/Right have their `event.code` values already correctly named (e.g., `"Space"`, `"Escape"`). The layout service returns null for these, so `key` uses `event.key` as-is. For HotkeyManager translation, a `SPECIAL_KEY_CODE_MAP` is needed to map parsed key values (e.g., `" "` → `"Space"`, `"Backspace"` → `"Backspace"`).

**On layout change:** `keyboardLayoutService.setOnLayoutChange()` → trigger `configManager` onChange → `hotkeyManager.recalculate()` (re-translates all codes) → `matcher.rebuild()`

## Tasks

### Task 1: Save spec documentation

Create `agent-os/specs/2026-02-24-input-handler-layout-integration/` with spec files.

### Task 2: Update `normalize()` in InputHandler

**File:** [InputHandler.ts](src/components/InputHandler.ts)

Import the global `keyboardLayoutService` singleton (no constructor injection needed). Update `normalize()`:

```typescript
private normalize(event: KeyboardEvent): KeyPress {
    const modifiers = new Set<'ctrl' | 'alt' | 'shift' | 'meta'>();
    if (event.ctrlKey) modifiers.add('ctrl');
    if (event.altKey) modifiers.add('alt');
    if (event.shiftKey) modifiers.add('shift');
    if (event.metaKey) modifiers.add('meta');

    const { code } = event;

    // Layout-aware normalization: derive display key from physical code
    // For letter/symbol keys: layout service returns base char (e.g., "a", "[")
    // For special keys (Escape, Enter, etc.): returns null, use event.key
    const key = keyboardLayoutService.getBaseCharacter(code) ?? event.key;

    return { modifiers, key, code };
}
```

No special-casing for single chars, space, etc. — the layout service handles letter/symbol keys, and special keys already have correct `event.key` and `event.code` values.

### Task 3: Add special key code map and code-based canonicalization

**File:** [hotkey.ts](src/utils/hotkey.ts)

Add `SPECIAL_KEY_CODE_MAP` — maps parsed key values to physical codes for keys not in the layout service:

```typescript
export const SPECIAL_KEY_CODE_MAP: Record<string, string> = {
    ' ': 'Space',
    'Backspace': 'Backspace',
    'Tab': 'Tab',
    'Enter': 'Enter',
    'Escape': 'Escape',
    'Delete': 'Delete',
    'ArrowUp': 'ArrowUp',
    'ArrowDown': 'ArrowDown',
    'ArrowLeft': 'ArrowLeft',
    'ArrowRight': 'ArrowRight',
};
```

Add `canonicalizeKeyPressByCode()` and `canonicalizeSequenceByCode()` — same structure as existing functions but uses `keyPress.code` instead of `keyPress.key`. Existing character-based functions stay for display/HotkeyManager composite key.

### Task 4: Translate hotkey codes in HotkeyManager

**File:** [HotkeyManager.ts](src/components/hotkey-context/HotkeyManager.ts)

Import `keyboardLayoutService` singleton and `SPECIAL_KEY_CODE_MAP`. In `insertEntry()`, translate each `KeyPress.key` → physical code:

```typescript
private translateCode(key: string): string {
    // Try layout service first (letter/symbol keys)
    const code = keyboardLayoutService.getCode(key);
    if (code !== null) return code;
    // Try special key map
    if (key in SPECIAL_KEY_CODE_MAP) return SPECIAL_KEY_CODE_MAP[key];
    // Unknown key — return empty
    return '';
}

private insertEntry(entry: ConfigHotkeyEntry, priority: Priority): void {
    const hotkeyEntry: HotkeyEntry = {
        command: entry.command,
        key: entry.key.map(kp => ({
            ...kp,
            code: this.translateCode(kp.key),
        })),
        priority,
        ...(entry.when !== undefined && { when: entry.when }),
        ...(entry.args !== undefined && { args: entry.args }),
    };
    const compositeKey = makeCompositeKey(hotkeyEntry);
    this.hotkeyTable.set(compositeKey, hotkeyEntry);
}
```

`makeCompositeKey()` stays **character-based** — it's for internal dedup/storage, keeping `ctrl+3` and `ctrl+{` as distinct entries even when they map to the same physical code.

`applyRemoval()` also stays character-based (matches by config identity).

### Task 5: Update HotkeyMatcher to match by code

**File:** [HotkeyMatcher.ts](src/components/hotkey-context/HotkeyMatcher.ts)

- `rebuild()`: Build matching table using `canonicalizeSequenceByCode()` (entries already have `code` populated by HotkeyManager)
- `match()`: Canonicalize input sequence by code
- `hasPrefix()`: Use code-based canonical strings
- `isEscape()`: Use `key.code === 'Escape'` instead of `key.key === 'Escape'`

### Task 6: Wire layout service in main.ts

**File:** [main.ts](src/main.ts)

1. Import `keyboardLayoutService` singleton
2. `await keyboardLayoutService.initialize()` during onload (before config loading)
3. Wire layout change → ConfigManager reload:

    ```typescript
    keyboardLayoutService.setOnLayoutChange(() => {
        this.configManager.loadAll(this.settings.selectedPreset);
    });
    ```

4. `keyboardLayoutService.dispose()` on unload

No constructor injection needed for InputHandler or HotkeyManager — they import the singleton directly.

### Task 7: Update ADR-001 and Architecture.md

**File:** [ADR-001](.ai/ADR/ADR-001%20Key%20Representation.md)

Update the "Update: Layout-Aware Normalization" section:

- Matching now uses `KeyPress.code` (physical key code), not `KeyPress.key`
- `KeyPress.key` is set via layout service for display only (status indicator)
- HotkeyManager translates character → code at load time via layout service + special key map

**File:** [Architecture.md](.ai/Architecture.md)

- Section 3 HotkeyManager: Add code translation responsibility
- Section 4 "Layout Change Handling": Update to `configManager.loadAll()` trigger
- Section 6 "Key Constraints": Change "matching uses layout-normalized characters" to "matching uses physical key codes"

### Task 8: Tests

**InputHandler tests** ([InputHandler.test.ts](src/components/__tests__/InputHandler.test.ts)):

- normalize() uses layout service `getBaseCharacter(code)` for key field
- normalize() uses event.key for special keys (getBaseCharacter returns null)
- normalize() handles macOS Option scenario (event.key=é, code=KeyE → key='e')
- normalize() preserves event.code as-is

**HotkeyManager tests** ([HotkeyManager.test.ts](src/components/hotkey-context/__tests__/HotkeyManager.test.ts)):

- insertEntry() populates KeyPress.code via layout service
- Special keys get correct codes via SPECIAL_KEY_CODE_MAP
- Entries in hotkeyTable have correct physical codes

**HotkeyMatcher tests** ([HotkeyMatcher.test.ts](src/components/hotkey-context/__tests__/HotkeyMatcher.test.ts)):

- match() compares by physical code
- Non-QWERTY: hotkey entry with code "KeyK" matches input with code "KeyK"

**Canonicalization tests** ([hotkey.test.ts](src/utils/__tests__/hotkey.test.ts)):

- canonicalizeKeyPressByCode uses code field
- canonicalizeSequenceByCode joins by space

## Critical Files to Modify

| File                                                                                       | Change                                          |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| [InputHandler.ts](src/components/InputHandler.ts)                                          | Import singleton, update normalize()            |
| [HotkeyManager.ts](src/components/hotkey-context/HotkeyManager.ts)                        | Import singleton, translate key → code           |
| [HotkeyMatcher.ts](src/components/hotkey-context/HotkeyMatcher.ts)                        | Code-based rebuild + match                      |
| [hotkey.ts](src/utils/hotkey.ts)                                                           | Add SPECIAL_KEY_CODE_MAP + code canonicalization |
| [main.ts](src/main.ts)                                                                     | Wire layout service init + layout change        |
| [ADR-001 Key Representation.md](.ai/ADR/ADR-001%20Key%20Representation.md)                 | Update to code-based matching                   |
| [Architecture.md](.ai/Architecture.md)                                                     | Update constraints + layout change flow         |
| Test files                                                                                 | New tests for all changed components            |

## Files NOT Modified

| File                                                                    | Reason                                    |
| ----------------------------------------------------------------------- | ----------------------------------------- |
| [KeyboardLayoutService.ts](src/components/KeyboardLayoutService.ts)     | Already complete from task 2.7            |
| [types.ts](src/types.ts)                                                | KeyPress already has both key and code    |
| [ConfigManager.ts](src/components/ConfigManager.ts)                     | No layout translation at config time      |

## Verification

1. `pnpm vitest run` — all existing + new tests pass
2. `pnpm run build` — no compilation errors
3. Manual: On QWERTY, Ctrl+K still triggers kill-line
4. Conceptual: On non-QWERTY, hotkey matches by physical key position
