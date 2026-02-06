# References for Keyboard Layout Service

## Similar Implementations

### ContextEngine (singleton pattern)

- **Location:** `src/components/ContextEngine.ts`
- **Relevance:** Establishes the singleton export pattern used throughout the codebase
- **Key patterns:**
  - Class exported alongside singleton instance: `export const contextEngine = new ContextEngine()`
  - Disposable return from registration methods (`declareContext` returns `Disposable`)
  - Global key-value state tracking with Map

### CommandRegistry (disposable pattern)

- **Location:** `src/components/CommandRegistry.ts`
- **Relevance:** Shows Disposable pattern for registration/deregistration
- **Key patterns:**
  - `registerCommand()` returns `Disposable | null`
  - Constructor-based initialization with App parameter

### InputHandler (current normalization)

- **Location:** `src/components/InputHandler.ts`
- **Relevance:** Contains the `normalize()` method that will be updated in section 2.8 to use KeyboardLayoutService
- **Key patterns:**
  - Currently uses `event.key` directly (line 168)
  - Stores `event.code` in KeyPress but doesn't use it for character resolution
  - Synchronous normalization — requires synchronous `getBaseCharacter()`

### ContextEngine Tests (test pattern reference)

- **Location:** `src/components/__tests__/ContextEngine.test.ts`
- **Relevance:** Template for test file structure
- **Key patterns:**
  - Fresh instance per test via `beforeEach` (line 28-31)
  - Nested describe blocks per method
  - Helper functions for test data creation

## Architecture Documents

### ADR-008: Keyboard Layout Normalization

- **Location:** `.ai/ADR/ADR-008 Keyboard Layout Normalization.md`
- **Relevance:** Primary design decision document for this component
- **Key decisions:** Layout-aware normalization using `navigator.keyboard.getLayoutMap()`, physical code → base character translation, digit key remapping, symbol availability checking

### Architecture.md

- **Location:** `.ai/Architecture.md`
- **Relevance:** Defines the service's API surface and position in the system
- **Key sections:** Section 3 (Components > Global > Keyboard Layout Service), Section 4 (Key Data Flow > Hotkey Processing, Preset Translation, Layout Change Handling)
