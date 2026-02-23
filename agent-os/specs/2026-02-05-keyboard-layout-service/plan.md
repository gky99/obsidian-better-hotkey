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

### Internal constants

`DIGIT_CODES` — maps digit strings to physical key codes:
```
"0" → "Digit0", "1" → "Digit1", ..., "9" → "Digit9"
```

`QWERTY_LAYOUT` — predefined `[string, string][]` with full QWERTY key-to-character mapping, used as fallback when Keyboard API is unavailable.

### Class structure

```typescript
export class KeyboardLayoutService {
    // Cached layout map: physical code → base character
    private layoutMap: Map<string, string> | null = null;

    // Reverse map: base character → physical key code (includes virtual digit entries)
    private charToCode: Map<string, string> | null = null;

    // Set of base characters (for isBaseKey), includes virtual digit entries
    private baseCharSet: Set<string> | null = null;

    // Single layout change callback (simplified from Set)
    private onLayoutChangeCallback: (() => void) | null = null;

    // Whether initialization has completed
    private initialized: boolean = false;
}
```

### Methods

**`async initialize(): Promise<void>`**

1. Call `refreshLayoutMap()` — always succeeds (QWERTY fallback)
2. Inline check: if `navigator.keyboard` exists, register **window focus listener** for layout change detection
3. Set `initialized = true`

**`private async refreshLayoutMap(): Promise<void>`**

1. Call `getLayoutMap()` — always succeeds (tries API, falls back to QWERTY data)
2. Build `layoutMap`, `charToCode` (reverse map + virtual digit entries), and `baseCharSet`

**`private async getLayoutMap(): Promise<Map<string, string>>`**

1. Try `navigator.keyboard.getLayoutMap()`, convert API result to `Map<string, string>`
2. On failure or API unavailable: return `new Map(QWERTY_LAYOUT)`
3. Always succeeds

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
- Returns actual layout base character for all codes, including digit codes
- `layoutMap?.get(code) ?? null`

**`getCode(character: string): string | null`**
- Reverse lookup: base character → physical key code
- `charToCode?.get(character) ?? null`
- Digits 0-9 always resolve to their DigitN codes via virtual entries

**`isBaseKey(character: string): boolean`**
- `baseCharSet?.has(character) ?? false`
- Includes both actual layout base characters and virtual digit entries

Build `charToCode` in `refreshLayoutMap()`: reverse each layoutMap entry (char→code), then add virtual digit entries from `DIGIT_CODES`. Build `baseCharSet` from `charToCode.keys()`.

## Task 5: Implement layout change detection (window focus)

Since the `layoutchange` event has no reliable browser support, detect changes via **window focus**:

1. In `initialize()`: register `window.addEventListener("focus", handler)` if `navigator.keyboard` exists
2. Handler: call `refreshLayoutMap()`, compare with previous map
3. If different: notify callback
4. Remove listener in `dispose()`

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

- `initialization` — API available, API unavailable (QWERTY fallback), getLayoutMap rejection (QWERTY fallback), focus listener registration
- `getBaseCharacter` — QWERTY map, Dvorak map (actual layout chars for digit codes), QWERTY fallback mode, unknown codes
- `getCode` — QWERTY map, Dvorak map (virtual digit entries), QWERTY fallback mode, unknown chars
- `isBaseKey` — with map (true/false, virtual digit entries), QWERTY fallback mode
- `onLayoutChange` — callback invoked on focus-triggered change, disposed callback not invoked, map rebuilt before callback
- `dispose` — removes focus listener, clears state

---

## Key design decisions

1. **Synchronous public API**: `getBaseCharacter`, `getCode`, and `isBaseKey` are sync. They use cached data from async `initialize()`. Before init, maps are null so methods return conservative defaults.
2. **Digit virtual entries**: `getBaseCharacter()` returns actual layout base characters for all codes. Digits are accessible via `getCode()` with virtual entries — `getCode("2")` always returns `"Digit2"`. `baseCharSet` includes both actual layout chars and virtual digits.
3. **QWERTY data fallback**: When API unavailable, `getLayoutMap()` returns predefined QWERTY data. No separate fallback functions.
4. **Window focus detection**: Instead of the unsupported `layoutchange` event, re-check layout map on window focus.
5. **Single callback**: `onLayoutChange` supports one callback. Currently only Config Loader will register.
6. **No main.ts changes yet**: Service created but not wired — that's section 2.8.
