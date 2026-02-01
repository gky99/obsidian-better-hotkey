# References for InputHandler Tests

## Similar Implementations

### ChordSequenceBuffer Tests

- **Location:** `src/components/hotkey-context/__tests__/ChordSequenceBuffer.test.ts`
- **Relevance:** Timeout handling, buffer management, fake timers
- **Key patterns to borrow:**
  - Fake timers setup (`vi.useFakeTimers()`, `vi.useRealTimers()`)
  - Timeout callback testing with `vi.advanceTimersByTime()`
  - Helper `key()` factory for creating KeyPress objects
  - Nested describe blocks for logical grouping
  - beforeEach/afterEach for test isolation

**Example pattern:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  buffer = new ChordSequenceBuffer(2000);
});

afterEach(() => {
  vi.useRealTimers();
});

it('invokes onTimeout callback when timeout elapses', () => {
  const onTimeout = vi.fn();
  buffer.setTimeoutCallback(onTimeout);
  buffer.append(key('a', 'KeyA'));

  vi.advanceTimersByTime(2000);
  expect(onTimeout).toHaveBeenCalledTimes(1);
});
```

### KillRing Tests

- **Location:** `src/components/execution-context/__tests__/KillRing.test.ts`
- **Relevance:** Module mocking, async operations, integration patterns
- **Key patterns to borrow:**
  - Module mocking with `vi.mock()`
  - Property mocking for browser APIs (`Object.defineProperty`)
  - Async testing with `await new Promise(resolve => setTimeout(resolve, 0))`
  - Mock clearing in afterEach
  - Typed mocks with `vi.mocked()`

**Example patterns:**
```typescript
// Module mocking
vi.mock('../../ContextEngine', () => ({
  contextEngine: {
    getContext: vi.fn(),
    setContext: vi.fn(),
  },
}));

// Property mocking
mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue(''),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
  configurable: true,
});

// Async testing
it('syncs to clipboard', async () => {
  killRing.push('test text');
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
});
```

## Key Helper Functions

### KeyPress Factory (from ChordSequenceBuffer.test.ts)

```typescript
function key(
  key: string,
  code?: string,
  modifiers: Array<'ctrl'|'alt'|'shift'|'meta'> = []
): KeyPress {
  return {
    key,
    code: code ?? key,
    modifiers: new Set(modifiers),
  };
}
```

**Usage:**
```typescript
key('a', 'KeyA')  // Simple key
key('x', 'KeyX', ['ctrl'])  // Ctrl+X
key('c', 'KeyC', ['ctrl', 'shift'])  // Ctrl+Shift+C
```

## Common Test Patterns

### Test Structure

```typescript
describe('ComponentName', () => {
  let instance: ComponentType;

  beforeEach(() => {
    instance = new ComponentType();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('feature group', () => {
    it('specific behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Mock Verification

```typescript
// Method called with specific args
expect(mock.method).toHaveBeenCalledWith(expectedArg);

// Method called specific number of times
expect(mock.method).toHaveBeenCalledTimes(1);

// Method NOT called
expect(mock.method).not.toHaveBeenCalled();
```

### Mock Setup

```typescript
const mockDependency = {
  method1: vi.fn().mockReturnValue(value),
  method2: vi.fn().mockResolvedValue(asyncValue),
};
```

## Testing Framework

- **Framework:** Vitest 4.0.17
- **Config:** `vitest.config.ts`
- **Pattern:** Files in `src/**/__tests__/*.test.ts`
- **Commands:**
  - `pnpm test` - Run all tests
  - `pnpm test:watch` - Watch mode
  - `pnpm test InputHandler` - Run specific test file

## Type Definitions

- **KeyPress:** `src/types.ts`
- **MatchResult:** `src/types.ts`
- **HotkeyEntry:** `src/types.ts`
- **Priority:** `src/types.ts` (enum)
- **Constants:** `src/constants.ts` (COMMAND_NAMES, CONTEXT_KEYS)
