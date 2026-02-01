# Test Cases for CommandRegistry

## Overview

Create comprehensive test coverage for the CommandRegistry component, following existing test patterns and standards in the codebase.

## Context

- **Component**: [CommandRegistry.ts](src/components/CommandRegistry.ts)
- **Test Location**: `src/components/__tests__/CommandRegistry.test.ts` (to be created)
- **Testing Framework**: Vitest
- **Scope**: Command registration, retrieval, execution flow, and error handling

## Test Coverage Requirements

Based on the user's requirements, the test cases should cover:

1. **Command registration and retrieval**
   - Register commands and verify storage
   - Retrieve commands by ID
   - Handle duplicate registrations
   - Verify Disposable pattern for unregistration

2. **Command execution flow**
   - Execute synchronous commands successfully
   - Execute asynchronous (Promise-based) commands
   - Pass arguments and execution context correctly
   - Return appropriate success/failure boolean

3. **Edge cases and error handling**
   - Handle missing/non-existent command IDs
   - Catch and handle synchronous execution errors
   - Catch and handle async Promise rejections
   - Handle null/undefined edge cases
   - Verify error logging behavior

## Reference Implementation

The CommandRegistry exposes these methods:
- `setApp(app: App): void`
- `registerCommand(command: Command): Disposable`
- `getCommand(id: string): Command | null`
- `execute(commandId: string, args?: Record<string, unknown>, context?: ExecutionContext): boolean`
- `loadObsidianCommands(): void` (TODO/stub)
- `getAllCommandIds(): string[]`
- `getAllCommands(): Command[]`

## Existing Test Patterns

Tests should follow the established patterns from:
- [ContextEngine.test.ts](src/components/__tests__/ContextEngine.test.ts) - Simple unit test structure
- [HotkeyManager.test.ts](src/components/hotkey-context/__tests__/HotkeyManager.test.ts) - Callback testing patterns
- Testing standards: file-organization.md, test-structure.md

Key patterns to follow:
- Helper functions for creating test data (e.g., `createCommand()`)
- `beforeEach()` for fresh instances
- Nested `describe()` blocks for organization
- `vi.fn()` for mocking callbacks
- Descriptive test names (action-oriented)

## Implementation Tasks

### Task 1: Save Spec Documentation

Create `agent-os/specs/2026-02-03-1957-command-registry-hotkey-tests/` with:
- `plan.md` - This complete plan document
- `shape.md` - Shaping notes (scope, decisions, context)
- `standards.md` - Relevant testing standards
- `references.md` - Pointers to reference implementations

### Task 2: Create CommandRegistry.test.ts

Create `src/components/__tests__/CommandRegistry.test.ts` with these test suites:

#### 2.1 Test Structure Setup
- Import statements (Vitest, CommandRegistry, types)
- Helper function `createCommand()` for test data generation
- Fresh CommandRegistry instance in `beforeEach()`

#### 2.2 Command Registration Tests
- Registers command and returns Disposable
- Allows retrieving registered command
- Handles duplicate command IDs
- Disposable.dispose() removes command

#### 2.3 Command Retrieval Tests
- Returns registered command by ID
- Returns null for non-existent command
- Returns correct command after multiple registrations

#### 2.4 Command Execution Tests
- Executes synchronous command successfully
- Executes async/Promise command successfully
- Passes arguments to command.execute()
- Passes execution context to command.execute()
- Returns true on successful execution
- Returns false when command not found
- Returns false when execution throws error
- Handles async rejection (Promise.reject)
- Logs errors to console (verify with vi.spyOn)

#### 2.5 Utility Methods Tests
- getAllCommandIds: Returns empty array when no commands
- getAllCommandIds: Returns all registered command IDs
- getAllCommands: Returns empty array when no commands
- getAllCommands: Returns all registered commands

#### 2.6 App Integration Tests
- setApp: Stores app reference

### Task 3: Run Tests and Verify

- Run `pnpm test` to execute the test suite
- Verify all tests pass
- Check test output for any warnings or issues
- Confirm tests follow established patterns and standards

## Critical Files

- **Implementation**: [CommandRegistry.ts](src/components/CommandRegistry.ts)
- **New Test File**: `src/components/__tests__/CommandRegistry.test.ts`
- **Type Definitions**: [types.ts](src/types.ts)
- **Reference Tests**:
  - [ContextEngine.test.ts](src/components/__tests__/ContextEngine.test.ts)
  - [HotkeyManager.test.ts](src/components/hotkey-context/__tests__/HotkeyManager.test.ts)

## Standards Applied

- **testing/file-organization**: Place tests in `__tests__/` directory, name as `CommandRegistry.test.ts`
- **testing/test-structure**: Use nested describe blocks, beforeEach for isolation, descriptive test names

## Success Criteria

- [ ] All test cases pass when running `pnpm test`
- [ ] Test coverage includes registration, retrieval, execution, and error handling
- [ ] Tests follow existing patterns and conventions
- [ ] No test pollution (fresh instances via beforeEach)
- [ ] Helper functions reduce boilerplate
- [ ] Descriptive test names that explain behavior being tested
