# Standards for Command Registry Test Cases

The following testing standards apply to this work.

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
