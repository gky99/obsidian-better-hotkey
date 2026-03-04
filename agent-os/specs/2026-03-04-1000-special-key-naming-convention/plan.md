# Special Key Naming Convention — Implementation Plan

## Context

Special keys in hotkey notation lack a consistent naming standard. Currently arrow keys use bare words (`up`, `down`, `left`, `right`) and single-word keys use lowercase (`escape`, `backspace`, etc.). The fix establishes **UpperCamelCase (= `KeyboardEvent.key` values) as the canonical format** for all special keys in config strings and settings UI. This eliminates most translation work since config notation matches `KeyboardEvent.key` directly. Clean break — old lowercase format is no longer accepted.

## Complete Special Key Mapping

| Config notation (new) | `KeyPress.key` = `KeyboardEvent.key` | Physical code | Identity? |
|-----------------------|--------------------------------------|---------------|-----------|
| `Space`               | `' '` (space char)                   | `Space`       | ✗ (only exception) |
| `Backspace`           | `Backspace`                          | `Backspace`   | ✓ |
| `Tab`                 | `Tab`                                | `Tab`         | ✓ |
| `Enter`               | `Enter`                              | `Enter`       | ✓ |
| `Escape`              | `Escape`                             | `Escape`      | ✓ |
| `Delete`              | `Delete`                             | `Delete`      | ✓ |
| `ArrowUp`             | `ArrowUp`                            | `ArrowUp`     | ✓ |
| `ArrowDown`           | `ArrowDown`                          | `ArrowDown`   | ✓ |
| `ArrowLeft`           | `ArrowLeft`                          | `ArrowLeft`   | ✓ |
| `ArrowRight`          | `ArrowRight`                         | `ArrowRight`  | ✓ |
| `PageUp`              | `PageUp`                             | `PageUp`      | ✓ |
| `PageDown`            | `PageDown`                           | `PageDown`    | ✓ |
| `Home`                | `Home`                               | `Home`        | ✓ |
| `End`                 | `End`                                | `End`         | ✓ |
| `F1` – `F12`          | `F1` – `F12`                         | `F1` – `F12`  | ✓ |

Only `Space` requires non-identity translation (`Space → ' '`). All other special keys are passed through as-is.

---

## Spec Folder

`agent-os/specs/2026-03-04-1000-special-key-naming-convention/`

---

## Task 1: Set up git worktree

Use `/using-git-worktrees` skill to create an isolated worktree before any code changes.

---

## Task 2: Save spec documentation

Create `agent-os/specs/2026-03-04-1000-special-key-naming-convention/` with `plan.md`, `shape.md`, `standards.md`, `references.md`.

---

## Task 3: Check existing ADRs for conflicts

Read relevant ADRs before writing ADR-011:
- **ADR-001** (Key Representation): defines config as character-based strings — our change is a rename within that notation, no conflict
- **ADR-008** (Keyboard Layout Normalization): special keys bypass layout translation via `SPECIAL_KEY_CODE_MAP` — no conflict, we extend the map
- **ADR-010** (Translation Timing): config translated at load time — no conflict

---

## Task 4: Update `src/utils/hotkey.ts`

Since UpperCamelCase config notation = `KeyboardEvent.key` for almost all special keys, only `Space → ' '` needs an explicit translation. Everything else passes through as-is.

**Replace `SPECIAL_KEY_MAP` with two exports:**

```typescript
/**
 * Special key tokens that are valid in config notation and pass through
 * unchanged as KeyPress.key (their token = KeyboardEvent.key value).
 */
export const SPECIAL_KEYS: ReadonlySet<string> = new Set([
    'Backspace', 'Tab', 'Enter', 'Escape', 'Delete',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'PageUp', 'PageDown', 'Home', 'End',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
]);

/**
 * Special key tokens that require translation to their KeyboardEvent.key value.
 * Only 'Space' differs: config token is 'Space', but KeyPress.key is ' '.
 */
export const SPECIAL_KEY_TRANSLATIONS = {
    Space: ' ',
} as const;
```

**`parseStep` function** — updated lookup order:
```typescript
// 1. Translation needed (e.g. Space → ' ')
// 2. Identity passthrough for known special keys (e.g. Backspace, ArrowUp)
// 3. Lowercase for regular letter/symbol keys
const key =
    keyPart in SPECIAL_KEY_TRANSLATIONS
        ? SPECIAL_KEY_TRANSLATIONS[keyPart as keyof typeof SPECIAL_KEY_TRANSLATIONS]
        : SPECIAL_KEYS.has(keyPart)
            ? keyPart
            : keyPart.toLowerCase();
```

**`SPECIAL_KEY_CODE_MAP`** — add new entries (existing entries are already UpperCamelCase):
```typescript
PageUp: 'PageUp', PageDown: 'PageDown',
Home: 'Home', End: 'End',
F1: 'F1', F2: 'F2', ... F12: 'F12',
```

Update JSDoc example: `"escape" → bare special key` → `"Escape" → bare special key`

**Remove `SPECIAL_KEY_MAP` export** — update test file import to use `SPECIAL_KEYS` and `SPECIAL_KEY_TRANSLATIONS` instead.

---

## Task 5: Update `presets/emacs.json`

- `"alt+backspace"` → `"alt+Backspace"` (2 entries)

---

## Task 6: Update tests

**`src/utils/__tests__/parseHotkeyString.test.ts`:**
- Update import: `SPECIAL_KEY_MAP` → `SPECIAL_KEYS`, `SPECIAL_KEY_TRANSLATIONS`
- All lowercase special key inputs → UpperCamelCase: `'escape'` → `'Escape'`, `'space'` → `'Space'`, `'backspace'` → `'Backspace'`, `'tab'` → `'Tab'`, `'enter'` → `'Enter'`, `'delete'` → `'Delete'`, `'up'` → `'ArrowUp'`, `'down'` → `'ArrowDown'`, `'left'` → `'ArrowLeft'`, `'right'` → `'ArrowRight'`
- Update `ctrl+space` → `ctrl+Space`
- Replace `SPECIAL_KEY_MAP` constant assertions with tests for `SPECIAL_KEYS` set membership and `SPECIAL_KEY_TRANSLATIONS.Space === ' '`
- Add tests for `PageUp`, `PageDown`, `Home`, `End`, `F1`, `F12`

**`src/components/hotkey-context/__tests__/HotkeyManager.test.ts`:**
- Line 427: `configEntry('keyboard-quit', 'escape', ...)` → `configEntry('keyboard-quit', 'Escape', ...)`

---

## Task 7: Create `.AI/ADR/ADR-011 Special Key Naming Convention.md`

Document:
- **Decision**: UpperCamelCase = `KeyboardEvent.key` value is the canonical notation for all special keys in config strings and settings UI
- Full mapping table (all rows from the table above)
- Rationale: config notation now matches `KeyboardEvent.key` directly; only `Space → ' '` requires translation
- Relation to ADR-001: refines the config string format defined there
- **Clean break**: lowercase forms (`escape`, `backspace`, `up`, etc.) are no longer accepted

---

## Task 8: Run tests and build

```bash
pnpm test
pnpm build
```

---

## Key Files

| File | Change |
|------|--------|
| `src/utils/hotkey.ts` | UpperCamelCase keys in SPECIAL_KEY_MAP, updated parseStep logic, extended SPECIAL_KEY_CODE_MAP |
| `src/utils/__tests__/parseHotkeyString.test.ts` | Update all lowercase special key inputs + add new key tests |
| `src/components/hotkey-context/__tests__/HotkeyManager.test.ts` | Update `'escape'` → `'Escape'` |
| `presets/emacs.json` | `backspace` → `Backspace` |
| `.AI/ADR/ADR-011 Special Key Naming Convention.md` | New design record |
| `agent-os/specs/2026-03-04-1000-special-key-naming-convention/` | Spec docs |
