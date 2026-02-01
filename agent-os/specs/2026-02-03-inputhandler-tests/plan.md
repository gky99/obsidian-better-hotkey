# InputHandler Test Implementation Plan

## Overview

Implement comprehensive test suite for the InputHandler component (Phase 1.5 of development plan). InputHandler is the main orchestrator of the hotkey pipeline, coordinating between ChordSequenceBuffer, HotkeyMatcher, StatusIndicator, CommandRegistry, and ExecutionContext.

**Scope:** Focus on pipeline orchestration, match flow handling, and timeout/escape handling. **Explicitly skip testing** the `normalize()` function, which will be refactored in Phase II.

---

## Context

### User Requirements
- Write test cases for InputHandler
- Focus areas: Pipeline orchestration, Match flow handling, Timeout & escape handling
- **DO NOT test** the `normalize()` function (will be updated in Phase II)

### InputHandler Responsibilities
The main orchestrator that:
1. Registers/unregisters global keydown listener
2. Processes keyboard events through pipeline: normalize → buffer → match → execute
3. Handles different match outcomes: exact, prefix, no-match
4. Manages event propagation (suppress vs. pass through)
5. Coordinates state cleanup across components

### Architecture Flow
```
KeyboardEvent
  → normalize to KeyPress
  → ChordSequenceBuffer.append(keypress)
  → HotkeyMatcher.match(sequence)
  → Handle match result:
      Exact:  Execute command, clear buffer, update yank tracking, suppress event
      Prefix: Show pending, suppress event, keep buffer
      None:   Clear buffer, conditionally suppress event
```

---

## Critical Files

### Files to Create
- `src/components/__tests__/InputHandler.test.ts` - Main test file

### Files to Reference
- `src/components/InputHandler.ts` - Component under test
- `src/components/hotkey-context/__tests__/ChordSequenceBuffer.test.ts` - Pattern reference for fake timers
- `src/components/execution-context/__tests__/KillRing.test.ts` - Pattern reference for mocking
- `src/types.ts` - Type definitions for test data
- `src/constants.ts` - Command names and context keys
- `agent-os/standards/testing/*.md` - Testing standards

---

## Implementation Tasks

### Task 1: Save Spec Documentation

Create `agent-os/specs/2026-02-03-xxxx-inputhandler-tests/` with:
- **plan.md** - This plan
- **shape.md** - Shaping notes from conversation
- **standards.md** - Relevant testing standards
- **references.md** - Test patterns from ChordSequenceBuffer and KillRing tests

### Task 2: Create Test File Structure

**File:** `src/components/__tests__/InputHandler.test.ts`

**Setup:**
- Import test utilities from vitest
- Import InputHandler and dependencies
- Import types from `src/types.ts`
- Import constants from `src/constants.ts`

**Structure:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputHandler } from '../InputHandler';
import { COMMAND_NAMES } from '../../constants';
import type { KeyPress, MatchResult } from '../../types';
import { Priority } from '../../types';
import type { App } from 'obsidian';
```

### Task 3: Implement Helper Functions

Create minimal helper functions following existing test patterns:

**3.1 KeyPress Factory** (from existing tests)
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

**3.2 Mock Factory Functions**
```typescript
function createMockHotkeyContext() {
  return {
    chordBuffer: {
      append: vi.fn().mockReturnValue([key('x')]),
      clear: vi.fn(),
      setTimeoutCallback: vi.fn(),
    },
    hotkeyMatcher: {
      match: vi.fn().mockReturnValue({ type: 'none', isChord: false }),
      isEscape: vi.fn().mockReturnValue(false),
    },
    statusIndicator: {
      showPending: vi.fn(),
      clear: vi.fn(),
    },
  };
}

function createMockCommandRegistry() {
  return {
    execute: vi.fn().mockReturnValue(true),
  };
}
```

**Note:**
- KeyboardEvent objects created inline when needed (not complex enough for factory)
- MatchResult objects created inline (simple data structures)
- Only create helpers for frequently reused patterns

### Task 4: Implement Core Test Suites

#### 4.1 Lifecycle Management Tests
**Describe block:** "Lifecycle Management"

Tests:
- `start()` registers keydown listener
- `start()` is idempotent (multiple calls don't duplicate listeners)
- `stop()` removes keydown listener
- `stop()` is safe when not started

**Mocking approach:** Spy on `window.addEventListener` and `window.removeEventListener`

#### 4.2 Pipeline Orchestration Tests
**Describe block:** "Pipeline Orchestration"

Tests:
- Basic key press flows through pipeline
- Modifier-only keys are skipped (Control, Alt, Shift, Meta)
- Escape key clears buffer and status
- Escape key clears buffer even with pending sequence

**Mocking approach:**
- Mock `hotkeyContext.chordBuffer.append()` to return sequences
- Mock `hotkeyContext.hotkeyMatcher.isEscape()` for escape detection
- Use real `normalize()` but don't assert on its behavior

#### 4.3 Match Result Handling Tests

**Describe block:** "Match Result Handling"

**Nested describe: "Exact match flow"**
- Executes command via commandRegistry
- Prevents event propagation (preventDefault, stopPropagation)
- Clears buffer and status
- Updates lastActionWasYank flag
- Passes execution context to command
- Passes command args to registry

**Nested describe: "Prefix match flow"**
- Shows pending status with sequence
- Prevents event propagation
- Does NOT clear buffer (keeps pending sequence)
- Waits for next key before executing

**Nested describe: "No match - chord (isChord: true)"**
- Clears buffer
- Prevents event propagation
- Clears status

**Nested describe: "No match - non-chord (isChord: false)"**
- Clears buffer
- Allows event propagation (normal typing)
- Clears status

**Mocking approach:**
- Mock `hotkeyContext.hotkeyMatcher.match()` to return different MatchResult types
- Mock `commandRegistry.execute()` to verify calls
- Spy on event methods to verify preventDefault/stopPropagation

### Task 5: Implement Integration Tests

**Describe block:** "Integration with Dependencies"

**Test suites:**
- ChordSequenceBuffer integration (append, clear, sequence building)
- HotkeyMatcher integration (isEscape, match calls)
- StatusIndicator integration (showPending, clear)
- CommandRegistry integration (execute with correct args)
- ExecutionContext integration (killRing.updateLastActionWasYank)

**Verification focus:** Correct method calls with correct arguments to mocked dependencies

### Task 6: Implement Edge Cases & Complex Scenarios

**Describe block:** "Edge Cases & Complex Scenarios"

**Nested describes:**

**6.1 Timeout handling** (use fake timers)
- Timeout callback clears pending chord sequence
- Timeout clears status indicator
- Completing chord before timeout cancels timeout

**Setup:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

**6.2 Rapid key sequences**
- Handles rapid single keys correctly
- Handles rapid chord completion

**6.3 Error handling**
- Catches errors in onKeyDown and clears state
- Catches errors in normalize (if malformed event)
- Catches errors in matcher and clears state
- Command execution errors handled gracefully

**6.4 Command execution with args**
- Passes args to command execution
- Handles undefined args gracefully

**6.5 State management**
- Clears state after error before processing next key
- Maintains clean state between unrelated keys

### Task 7: Run Tests and Fix Issues

**Commands:**
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run in watch mode during development
- `pnpm test InputHandler` - Run only InputHandler tests

**Fix approach:**
- Address mock setup issues
- Fix assertion failures
- Adjust for actual InputHandler behavior
- Ensure all tests pass

---

## Mock Setup Strategy

### Dependencies to Mock

**HotkeyContext:** Contains chordBuffer, hotkeyMatcher, statusIndicator
```typescript
const mockHotkeyContext = {
  chordBuffer: {
    append: vi.fn().mockReturnValue([key('x')]),
    clear: vi.fn(),
    setTimeoutCallback: vi.fn(),
  },
  hotkeyMatcher: {
    match: vi.fn().mockReturnValue(noMatch(false)),
    isEscape: vi.fn().mockReturnValue(false),
  },
  statusIndicator: {
    showPending: vi.fn(),
    clear: vi.fn(),
  },
};
```

**CommandRegistry:**
```typescript
const mockCommandRegistry = {
  execute: vi.fn().mockReturnValue(true),
};
```

**ExecutionContext:** Created internally by InputHandler
- Don't need to mock constructor
- Access via `inputHandler.executionContext` if needed
- Mock `killRing.updateLastActionWasYank()`

**App (Obsidian):**
```typescript
const mockApp = {} as App;
```

### Normalize Function Approach

**Chosen approach:** Use real `normalize()` implementation but don't test its behavior

- Tests verify pipeline flow, not normalization specifics
- Allows realistic KeyboardEvent → KeyPress conversion
- Avoids testing implementation details that will change in Phase II

---

## Test Organization Pattern

### BeforeEach Setup
```typescript
describe('InputHandler', () => {
  let inputHandler: InputHandler;
  let mockHotkeyContext: any;
  let mockCommandRegistry: any;
  let mockApp: App;

  beforeEach(() => {
    mockHotkeyContext = createMockHotkeyContext();
    mockCommandRegistry = createMockCommandRegistry();
    mockApp = {} as App;

    inputHandler = new InputHandler(
      mockCommandRegistry,
      mockHotkeyContext,
      mockApp
    );
  });

  afterEach(() => {
    inputHandler.stop();
    vi.clearAllMocks();
  });
});
```

### Test Isolation Principles
- Each test gets fresh InputHandler instance
- Clear all mocks in afterEach
- Use fake timers only for timeout tests
- Avoid testing private methods (focus on public API)

---

## Verification Patterns

### Common Assertions
```typescript
// Method called with specific args
expect(mock.method).toHaveBeenCalledWith(expectedArg);

// Method called specific number of times
expect(mock.method).toHaveBeenCalledTimes(1);

// Method NOT called
expect(mock.method).not.toHaveBeenCalled();

// Event prevented
expect(event.defaultPrevented).toBe(true);

// Event propagation stopped
const stopPropSpy = vi.spyOn(event, 'stopPropagation');
expect(stopPropSpy).toHaveBeenCalled();
```

---

## Standards to Follow

From `agent-os/standards/testing/`:

**File Organization:**
- Test file location: `src/components/__tests__/InputHandler.test.ts`
- Naming: `ComponentName.test.ts` format
- Import from parent: `import { InputHandler } from '../InputHandler'`

**Test Structure:**
- Nested describe blocks for logical grouping
- Use beforeEach for test isolation
- Descriptive test names (behavior, not generic "works")
- One assertion focus per test

**String Constants:**
- Use `COMMAND_NAMES` from `src/constants.ts` for command IDs
- Use `CONTEXT_KEYS` from `src/constants.ts` for context keys
- Never hard-code command strings in tests

---

## What NOT to Test

- **normalize() function behavior** - Will be refactored in Phase II
  - Don't assert on specific normalization logic
  - Don't test modifier canonicalization
  - Don't test special key handling

## What TO Test

- **Pipeline orchestration** - Data flows correctly through components
- **Match result handling** - Correct actions for exact/prefix/none
- **State management** - Cleanup, isolation, error recovery
- **Event propagation** - When to suppress vs. pass through
- **Dependency integration** - Correct calls to mocked dependencies

---

## Implementation Sequence

### Phase 1: Foundation (30 min)
1. Create test file with imports and structure
2. Implement helper functions (key factories, mock factories)
3. Implement beforeEach/afterEach setup

### Phase 2: Basic Tests (1 hour)
4. Lifecycle management tests (start/stop)
5. Basic pipeline test (one key, no match)
6. Modifier-only key handling tests
7. Escape key handling tests

### Phase 3: Core Flows (1.5 hours)
8. Exact match flow tests (all assertions)
9. Prefix match flow tests
10. No match flow tests (chord vs. non-chord)

### Phase 4: Integration (1 hour)
11. Dependency integration tests
12. ChordSequenceBuffer integration
13. StatusIndicator integration

### Phase 5: Complex & Edge Cases (1.5 hours)
14. Timeout handling tests (fake timers)
15. Error handling tests
16. Rapid sequence tests
17. Args passing tests
18. State management tests

### Phase 6: Verification (30 min)
19. Run full test suite
20. Fix any failing tests
21. Verify coverage meets expectations
22. Clean up and document any test limitations

**Total estimated time:** 5-6 hours

---

## Expected Test Count

Approximately 60-70 test cases organized into:
- Lifecycle Management: 4 tests
- Pipeline Orchestration: 5 tests
- Match Result Handling: 15 tests
- Integration with Dependencies: 15 tests
- Edge Cases & Complex Scenarios: 20-25 tests

---

## Verification

**How to verify the implementation is complete:**

1. **Run tests:** `pnpm test InputHandler`
   - All tests should pass
   - No console errors or warnings

2. **Check coverage:** Tests should cover:
   - ✅ start/stop lifecycle
   - ✅ onKeyDown pipeline flow
   - ✅ handleMatchResult for all match types
   - ✅ Integration with all dependencies
   - ✅ Error handling and recovery
   - ✅ Timeout behavior
   - ❌ normalize() function (intentionally skipped)

3. **Review test output:** Should show nested describe structure:
   ```
   InputHandler
     Lifecycle Management
       ✓ start() registers keydown listener
       ✓ stop() removes keydown listener
     Pipeline Orchestration
       ✓ basic key press flows through pipeline
       ✓ escape key clears buffer and status
     Match Result Handling
       Exact match flow
         ✓ executes command
         ✓ prevents event propagation
         ...
   ```

4. **Validate against standards:**
   - File location matches standard (src/components/__tests__/)
   - Naming matches standard (InputHandler.test.ts)
   - Test structure uses nested describes and beforeEach
   - Uses COMMAND_NAMES constants, not hard-coded strings

5. **End-to-end validation:**
   - Tests work with the actual InputHandler implementation
   - Mocks integrate correctly with real component
   - No test pollution (state leakage between tests)

---

## Success Criteria

- [ ] Test file created at correct location
- [ ] All helper functions implemented
- [ ] All test suites implemented (60-70 tests)
- [ ] Tests follow existing patterns from ChordSequenceBuffer and KillRing tests
- [ ] Tests use standards from agent-os/standards/testing/
- [ ] All tests pass (`pnpm test InputHandler`)
- [ ] No testing of normalize() function
- [ ] Pipeline orchestration fully tested
- [ ] Match flow handling fully tested
- [ ] Timeout and escape handling fully tested
- [ ] Documentation saved to spec folder

---

## Notes

- This test suite focuses on **integration testing** the pipeline flow, not unit testing individual methods
- The `normalize()` function is used but not tested, as it will be refactored in Phase II
- Test patterns follow established conventions from ChordSequenceBuffer and KillRing test files
- All mocking uses vitest's `vi.fn()` and `vi.mock()` utilities
- Fake timers are used only for timeout-related tests
- Tests maintain clean state isolation through beforeEach/afterEach hooks
