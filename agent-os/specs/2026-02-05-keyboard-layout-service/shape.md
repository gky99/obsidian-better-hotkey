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
- **Choice**: All translation methods (`getBaseCharacter`, `isBaseKey`, `translateNumber`) are synchronous
- **Rationale**: `InputHandler.normalize()` calls `getBaseCharacter()` on every keypress and must be synchronous. Methods use cached data from async `initialize()`. Before init completes, identity fallback applies.

### Decision 4: Digit Mapping Approach
- **Choice**: Hardcoded digit N → physical key DigitN, then look up base character from layout map
- **Rationale**: `getLayoutMap()` only returns base (unshifted) characters. Digits 0-9 always correspond to Digit0-Digit9 physical keys (UI Events spec). The base character of that physical key is what we need for translation.

### Decision 5: Identity Fallback
- **Choice**: Identity mapping (QWERTY-assumed) when API unavailable
- **Rationale**: Chrome 138 in Obsidian's Electron supports the API. Fallback is for robustness. Since presets are authored for QWERTY, identity is correct degradation.

### Decision 6: No main.ts Wiring
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
