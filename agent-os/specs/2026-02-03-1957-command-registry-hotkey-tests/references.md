# References for Command Registry Test Cases

## Similar Test Implementations

### ContextEngine.test.ts
- **Location**: `src/components/__tests__/ContextEngine.test.ts`
- **Relevance**: Demonstrates simple unit test structure for a registry-like component
- **Key patterns**:
  - Fresh instance creation in beforeEach()
  - Testing getter/setter methods
  - Edge case coverage (falsy values, missing keys)
  - ~284 lines showing comprehensive coverage

### HotkeyManager.test.ts
- **Location**: `src/components/hotkey-context/__tests__/HotkeyManager.test.ts`
- **Relevance**: Shows callback/function mock testing with vi.fn()
- **Key patterns**:
  - Using vi.fn() for callback mocks
  - Testing entry management (insert, remove, clear)
  - Testing onChange callback invocation
  - ~142 lines of focused test coverage

### KillRing.test.ts
- **Location**: `src/components/execution-context/__tests__/KillRing.test.ts`
- **Relevance**: Demonstrates async testing and module mocking
- **Key patterns**:
  - Mocking external modules with vi.mock()
  - Testing async operations (clipboard API)
  - Using vi.spyOn() for verification

## Implementation Under Test

### CommandRegistry.ts
- **Location**: `src/components/CommandRegistry.ts`
- **Public API**:
  - `registerCommand(command: Command): Disposable`
  - `getCommand(id: string): Command | null`
  - `execute(commandId: string, args?, context?): boolean`
  - `getAllCommandIds(): string[]`
  - `getAllCommands(): Command[]`
  - `setApp(app: App): void`
  - `loadObsidianCommands(): void` (TODO stub)
- **Key Features**:
  - Map-based storage for O(1) lookups
  - Disposable pattern for cleanup
  - Error handling with try-catch
  - Support for sync and async commands
