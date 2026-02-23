# Keyboard Layout Service — Shaping Notes

## Scope

Implement the Keyboard Layout Service singleton (Development Plan section 2.7). This is a global component that detects the user's keyboard layout and provides translation between physical key codes and base characters. Scoped to the service only — InputHandler integration (2.8) and Config Loader integration (2.9) are separate specs.

## Decisions

### Decision 1: Layout Change Detection
- **Choice**: Window focus event instead of `layoutchange` event
- **Rationale**: The `layoutchange` event has no reliable browser support even in Chrome 138. Window focus detection catches the common case where users switch layouts while Obsidian is in the background.

### Decision 2: Single Callback vs Set
- **Choice**: Single `onLayoutChangeCallback` field instead of `Set<() => void>`
- **Rationale**: Currently only one consumer (Config Loader for preset reload). Simplifies the implementation.

### Decision 3: Synchronous Public API
- **Choice**: All translation methods (`getBaseCharacter`, `getCode`, `isBaseKey`) are synchronous
- **Rationale**: `InputHandler.normalize()` calls `getBaseCharacter()` on every keypress and must be synchronous. The matcher calls `getCode()` to translate hotkey definitions to keycodes at cache time. Methods use cached data from async `initialize()`. Before init completes, maps are null so methods return conservative defaults (null/false).

### Decision 4: Digit Mapping via Reverse Map with Virtual Entries
- **Choice**: `getBaseCharacter()` returns the actual layout base character for all codes, including digit codes. Digits are handled via a reverse map (`charToCode`) with virtual entries — `getCode("2")` always returns `"Digit2"` regardless of layout. `DIGIT_CODES` constant provides the virtual digit → code mappings. `baseCharSet` includes both actual layout base characters and virtual digit entries.
- **Rationale**: On Programmer's Dvorak, pressing Ctrl+Digit2 should match both `ctrl+2` and `ctrl+[` (the actual base char). The matcher translates hotkey character definitions to physical keycodes via `getCode()` and matches at the keycode level. Virtual digit entries ensure digits always resolve to their DigitN codes.

### Decision 5: QWERTY Data Fallback
- **Choice**: When the Keyboard API is unavailable or `getLayoutMap()` fails, `getLayoutMap()` returns a predefined QWERTY layout map. This means `layoutMap` and `baseCharSet` are always populated after initialization — no separate fallback functions needed.
- **Rationale**: Chrome 138 in Obsidian's Electron supports the API. Fallback is for robustness. Since presets are authored for QWERTY, feeding QWERTY data into the same code path is the correct degradation and eliminates branching in `getBaseCharacter()` and `isBaseKey()`.

### Decision 6: Layout Name Detection Removed

- **Choice**: Remove `getLayoutName()`, `detectLayoutName()`, and `detectedLayoutName`. No layout name tracking.
- **Rationale**: There is no reliable way to determine the actual layout name, and no significant consumer for this information. The service translates physical key codes to characters — knowing the layout name adds no value.

### Decision 7: No main.ts Wiring
- **Choice**: Create the service and singleton export, but don't wire into plugin startup
- **Rationale**: Wiring `initialize()` into `onload()` and updating InputHandler is part of section 2.8 (InputHandler Layout Integration).

## Context

- **Visuals**: None (backend service, no UI)
- **References**: ContextEngine.ts singleton pattern, CommandRegistry disposable pattern, InputHandler.normalize() current implementation, Architecture.md, ADR-008
- **Product alignment**: Phase 2 deliverable per roadmap. Enables international keyboard support — core mission goal.

## Standards Applied

- **architecture/component-folders** — Global component at src/components/ root
- **development/string-constants** — DIGIT_CODES constant with `as const`
- **development/git-worktree-workflow** — Task 0 in plan, worktree created before implementation
- **testing/file-organization** — Tests in src/components/__tests__/KeyboardLayoutService.test.ts
- **testing/test-structure** — Nested describe blocks, beforeEach isolation, fresh instances
