# Standards for InputHandler Tests

The following standards apply to this work.

---

## testing/file-organization

Tests use the `__tests__/` directory pattern at component level.

```
src/components/
├── hotkey-context/
│   ├── HotkeyManager.ts
│   ├── ChordSequenceBuffer.ts
│   └── __tests__/
│       ├── HotkeyManager.test.ts
│       └── ChordSequenceBuffer.test.ts
```

**Rules:**
- Place test files in `__tests__/` directory at the same level as the component
- Name test files: `ComponentName.test.ts`
- Mirror the component structure within `__tests__/`
- Import from parent directory: `import { Component } from '../Component'`

**Why:** Follows Jest/Vitest convention for automatic test discovery

---

## testing/test-structure

**Structure tests with nested describe blocks:**

```typescript
describe('ComponentName', () => {
  let instance: ComponentType;

  beforeEach(() => {
    // Fresh instance per test for isolation
    instance = new ComponentType();
  });

  describe('methodName', () => {
    it('describes specific behavior being tested', () => {
      // Test implementation
    });
  });
});
```

**Rules:**
- Group tests by component/method using nested `describe` blocks
- Use `beforeEach` to create fresh instances — prevents test pollution
- Use descriptive test names: what behavior is tested, not generic "works"
- One assertion focus per test

**Critical:** Tests must not share state. Each test gets fresh instances via `beforeEach`.

---

## development/string-constants

Define reusable strings as constants, never hard-code.

```typescript
// constants.ts
export const COMMAND_NAMES = {
  YANK: "editor:yank",
  YANK_POP: "editor:yank-pop",
} as const;

export const CONTEXT_KEYS = {
  LAST_ACTION_WAS_YANK: "lastActionWasYank",
} as const;

// Usage
import { COMMAND_NAMES, CONTEXT_KEYS } from "../../constants";

if (command === COMMAND_NAMES.YANK) { ... }
contextEngine.getContext(CONTEXT_KEYS.LAST_ACTION_WAS_YANK);
```

**Rules:**
- Command IDs, context keys, and shared identifiers must be constants
- Group related constants in objects with `as const`
- Use SCREAMING_SNAKE_CASE for constant names
- Import from `constants.ts`, never duplicate strings

**Exceptions:**
- One-off UI strings (error messages, labels)
- Test-specific data
- Local scope strings not shared

**Why:** Type safety, autocomplete, single source of truth, prevents typo bugs
