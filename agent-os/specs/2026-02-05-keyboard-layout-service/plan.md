# Keyboard Layout Service — Implementation Plan

**Spec folder:** `agent-os/specs/2026-02-05-keyboard-layout-service/`
**Scope:** Development Plan section 2.7 only (no InputHandler/Config Loader integration)

---

## Task 0: Create git worktree

Call `/using-git-worktrees` to create an isolated workspace branching from `Phase-2`.

## Task 1: Save spec documentation

Create `agent-os/specs/2026-02-05-keyboard-layout-service/` with:

- `plan.md` — This plan
- `shape.md` — Shaping notes from our conversation
- `standards.md` — Relevant standards content
- `references.md` — Code references

## Task 2: Create KeyboardLayoutService skeleton with layout map + fallback

**Create:** `src/components/KeyboardLayoutService.ts`

### Internal type interfaces (not exported)

Needed because the DOM lib types don't include the Keyboard API:
- `KeyboardLayoutMap` — minimal interface for the map returned by `getLayoutMap()`
- `NavigatorKeyboard` — interface for `navigator.keyboard` with `getLayoutMap()`

### Internal constant

`DIGIT_CODES` — maps digit strings to physical key codes:
```
"0" → "Digit0", "1" → "Digit1", ..., "9" → "Digit9"
```
Used by `translateNumber()` to look up the base character for each digit's physical key.

### Class structure

```typescript
export class KeyboardLayoutService {
    // Cached layout map: physical code → base character
    private layoutMap: Map<string, string> | null = null;

    // Reverse set of base characters (for isBaseKey)
    private baseCharSet: Set<string> | null = null;

    // Digit → base character mapping (built from DIGIT_CODES + layoutMap)
    private digitToChar: Map<string, string> | null = null;

    // Detected layout name (heuristic), or null
    private detectedLayoutName: string | null = null;

    // Single layout change callback (simplified from Set)
    private onLayoutChangeCallback: (() => void) | null = null;

    // Whether the Keyboard API is available
    private apiAvailable: boolean = false;

    // Whether initialization has completed
    private initialized: boolean = false;
}
```

### Methods

**`async initialize(): Promise<void>`**

1. Check if `navigator.keyboard?.getLayoutMap` exists
2. If yes: set `apiAvailable = true`, call `refreshLayoutMap()`
3. Register **window focus listener** to detect layout changes (see Task 5)
4. Set `initialized = true`

**`private async refreshLayoutMap(): Promise<void>`**

1. If API available: call `getLayoutMap()`, build `layoutMap`, `baseCharSet`, `digitToChar`
2. If unavailable or throws: set all maps to `null` (identity fallback), log warning

**`dispose(): void`** — remove focus listener, clear all state

### Singleton export

```typescript
export const keyboardLayoutService = new KeyboardLayoutService();
```

Pattern from ContextEngine.ts. Instantiated at module load, `initialize()` called explicitly by plugin `onload()`.

### Barrel export

**Edit:** `src/components/index.ts` — add `export { KeyboardLayoutService } from "./KeyboardLayoutService"` in Global section.

## Task 3: Implement character translation methods

**`getBaseCharacter(code: string): string | null`**
- With layout map: `layoutMap.get(code) ?? null`
- Fallback: heuristic — `"KeyA"` → `"a"`, `"DigitN"` → `"N"`, others → `null`

**`isBaseKey(character: string): boolean`**
- With layout map: `baseCharSet.has(character)`
- Fallback: `true` for lowercase a-z, 0-9, common QWERTY base symbols

Build `baseCharSet` in `refreshLayoutMap()` by collecting all layout map values into a Set.

## Task 4: Implement number translation

**Build `digitToChar` map** in `refreshLayoutMap()`:
```
for each (digit, code) in DIGIT_CODES:
    baseChar = layoutMap.get(code)
    if baseChar: digitToChar.set(digit, baseChar)
```

Example on Programmer's Dvorak: `layoutMap.get("Digit3")` → `"}"`, so `digitToChar.set("3", "}")`

**`translateNumber(digit: string): string`**
- Validate input is "0"-"9", else return unchanged
- With map: `digitToChar.get(digit) ?? digit`
- Fallback: return `digit` unchanged (identity)

## Task 5: Implement layout change detection (window focus)

Since the `layoutchange` event has no reliable browser support, detect changes via **window focus**:

1. In `initialize()`: register `window.addEventListener("focus", handler)`
2. Handler: call `getLayoutMap()`, compare with cached map
3. If different: rebuild all maps, notify callback
4. Remove listener in `dispose()`

**`getLayoutName(): string | null`** — returns `detectedLayoutName`
- Heuristic: check KeyQ/KeyW/KeyZ mappings → QWERTY/AZERTY/QWERTZ/Dvorak/null

**`onLayoutChange(callback: () => void): Disposable`**
- Sets `this.onLayoutChangeCallback = callback`
- Returns `{ dispose: () => { this.onLayoutChangeCallback = null } }`

## Task 6: Write tests

**Create:** `src/components/__tests__/KeyboardLayoutService.test.ts`

### Mocking strategy

- Create mock `KeyboardLayoutMap` from `[string, string][]` entries
- Install mock `navigator.keyboard` via `Object.defineProperty`
- Clean up in `afterEach`
- Fresh `new KeyboardLayoutService()` per test (not the singleton)

### Test groups

- `initialization` — API available, API unavailable, getLayoutMap rejection, focus listener registration
- `getBaseCharacter` — QWERTY map, Dvorak map, fallback mode, unknown codes
- `isBaseKey` — with map (true/false), fallback mode
- `translateNumber` — QWERTY identity, Dvorak translation, fallback, invalid input
- `getLayoutName` — before/after init, unknown layout
- `onLayoutChange` — callback invoked on focus-triggered change, disposed callback not invoked, map rebuilt before callback
- `dispose` — removes focus listener, clears state

---

## Key design decisions

1. **Synchronous public API**: `getBaseCharacter`, `isBaseKey`, `translateNumber` are all sync. They use cached data from async `initialize()`. If queried before init, fallback applies.
2. **Window focus detection**: Instead of the unsupported `layoutchange` event, re-check layout map on window focus.
3. **Single callback**: `onLayoutChange` supports one callback. Currently only Config Loader will register.
4. **Identity fallback**: When API unavailable, assumes QWERTY.
5. **No main.ts changes yet**: Service created but not wired — that's section 2.8.
