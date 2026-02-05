# References for CommandRegistry Refactoring

## Similar Implementations

### ExecutionContext Constructor Pattern

- **Location**: [src/components/execution-context/ExecutionContext.ts:20](../../../src/components/execution-context/ExecutionContext.ts#L20)
- **Relevance**: Demonstrates constructor-based App initialization pattern
- **Key patterns**:
  ```typescript
  constructor(app: App) {
    this.killRing = new KillRing();
    this.workspaceContext = new WorkspaceContext(app);
  }
  ```
  - Accepts App as constructor parameter
  - Creates sub-components with app dependency
  - No separate initialization method needed

### WorkspaceContext Constructor Pattern

- **Location**: [src/components/execution-context/WorkspaceContext.ts:18](../../../src/components/execution-context/WorkspaceContext.ts#L18)
- **Relevance**: Shows private app field pattern
- **Key patterns**:
  ```typescript
  private app: App;

  constructor(app: App) {
    this.app = app;
  }
  ```
  - Stores App as private field
  - Simple assignment in constructor
  - Used throughout component methods

### Current CommandRegistry Pattern (to be changed)

- **Location**: [src/components/CommandRegistry.ts:14-25](../../../src/components/CommandRegistry.ts#L14-L25)
- **Current pattern**:
  ```typescript
  private app: App | null = null;

  constructor() {
    // No dependencies
  }

  setApp(app: App): void {
    this.app = app;
  }
  ```
- **Usage in main.ts**:
  ```typescript
  this.commandRegistry = new CommandRegistry();
  this.commandRegistry.setApp(this.app);
  ```

### Target Pattern

**New CommandRegistry pattern (following ExecutionContext/WorkspaceContext)**:
```typescript
private app: App;

constructor(app: App) {
  this.app = app;
}
```

**Usage in main.ts**:
```typescript
this.commandRegistry = new CommandRegistry(this.app);
```

## Test File Reference

### CommandRegistry.test.ts

- **Location**: [src/components/__tests__/CommandRegistry.test.ts](../../../src/components/__tests__/CommandRegistry.test.ts)
- **Test sections requiring updates**:
  - Line 24: beforeEach - Add mock App to constructor
  - Line 49-58: Duplicate test - Change from "overwrites" to "prevents and returns null"
  - Line 345-366: setApp tests - Remove entirely
  - Line 368-392: loadObsidianCommands tests - Update to assume app is set
- **Pattern to maintain**: Helper functions, nested describe blocks, spy mocking
