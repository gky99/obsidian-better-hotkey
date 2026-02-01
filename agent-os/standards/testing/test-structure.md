# Test Structure

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
