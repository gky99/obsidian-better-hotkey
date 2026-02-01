# InputHandler Tests — Shaping Notes

## Scope

Write comprehensive test cases for the InputHandler component, focusing on:
- Pipeline orchestration (keydown → buffer → matcher → command execution)
- Match flow handling (exact, prefix, no-match scenarios)
- Timeout & escape handling (clearing buffer/status)

**Explicitly skip testing** the `normalize()` function, as it needs to be updated and corrected in Phase II.

## Context

**Development Phase**: Phase 1 (Core Infrastructure), specifically Phase 1.5 Input Handler
**Component**: `src/components/InputHandler.ts`

**User Request**: "We are continuing to work on the Phase 1 line of development. Please write the test case for input handler. We don't want to test the normalize function because this normalization needs to be updated and corrected in Phase II."

## Decisions

1. **Normalize Function Handling**: Use real `normalize()` implementation in tests but don't assert on its behavior
   - Why: Allows realistic KeyboardEvent → KeyPress conversion
   - Why: Avoids testing implementation details that will change in Phase II
   - Alternative considered: Mock normalize completely (rejected as less realistic)

2. **Helper Functions**: Minimal approach, only for frequently reused patterns
   - Keep `key()` helper from existing tests (simple KeyPress factory)
   - Create mock factories for dependencies (hotkeyContext, commandRegistry)
   - Create MatchResult and KeyboardEvent inline (too simple for factories)
   - Feedback from user: Avoid over-engineering factories for simple data structures

3. **Test Focus**: Integration testing, not unit testing
   - Test pipeline flow, not individual method implementations
   - Mock all dependencies, focus on InputHandler orchestration
   - Verify correct method calls to dependencies, not implementation details

4. **Test Organization**: Follow existing patterns from ChordSequenceBuffer and KillRing tests
   - Nested describe blocks for logical grouping
   - beforeEach for test isolation
   - Fake timers for timeout testing
   - Module mocking with vi.mock() and vi.fn()

## Test Patterns Studied

**From ChordSequenceBuffer.test.ts**:
- Fake timers usage (`vi.useFakeTimers()`, `vi.advanceTimersByTime()`)
- Timeout callback testing
- Helper `key()` factory for KeyPress objects
- Nested describe blocks for feature grouping

**From KillRing.test.ts**:
- Module mocking with `vi.mock()`
- Property mocking for browser APIs (`Object.defineProperty(navigator, 'clipboard', ...)`)
- Async testing patterns
- Mock clearing in afterEach

## Standards Applied

**testing/file-organization**:
- Test location: `src/components/__tests__/InputHandler.test.ts`
- Naming: `ComponentName.test.ts` format
- Import from parent directory

**testing/test-structure**:
- Nested describe blocks
- beforeEach for fresh instances
- Descriptive test names (behavior-focused)
- One assertion focus per test

**development/string-constants**:
- Use COMMAND_NAMES from `src/constants.ts`
- Use CONTEXT_KEYS from `src/constants.ts`
- Never hard-code command strings in tests

## Architecture References

**Pipeline Flow** (from Architecture.md):
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

**Match Result Outcomes**:
- Exact match → Clear buffer, execute command, update yank tracking, suppress event
- Prefix match → Buffer key, show pending in Status Indicator, suppress event
- No match (chord) → Clear buffer, suppress event
- No match (non-chord) → Clear buffer, let event propagate to Obsidian

## Expected Outcomes

- 60-70 test cases covering all pipeline flows
- Tests follow existing patterns from ChordSequenceBuffer and KillRing
- All tests use standards from agent-os/standards/testing/
- normalize() function used but not tested
- All tests pass with pnpm test InputHandler

## Development Time Estimate

5-6 hours total, broken into phases:
1. Foundation (30 min): File structure, helpers, setup
2. Basic Tests (1 hour): Lifecycle, pipeline, modifiers, escape
3. Core Flows (1.5 hours): Exact, prefix, no-match flows
4. Integration (1 hour): All dependency integrations
5. Complex & Edge Cases (1.5 hours): Timeout, errors, rapid sequences, args
6. Verification (30 min): Run tests, fix issues, verify coverage
