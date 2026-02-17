# References for Active Editor Accessor

## Similar Implementations

### WorkspaceContext (existing)

- **Location:** `src/components/execution-context/WorkspaceContext.ts`
- **Relevance:** The component being modified. Currently queries `getActiveViewOfType(MarkdownView)` per operation with no persistent tracking.
- **Key patterns:** Private `getActiveEditor()` method, App-based constructor, editor operation methods.

### KeyboardLayoutService

- **Location:** `src/components/KeyboardLayoutService.ts`
- **Relevance:** Demonstrates event listener registration pattern using window focus events. Shows how to detect state changes via event monitoring.
- **Key patterns:** Window focus listener for layout change detection, `dispose()` cleanup method, singleton export pattern.

### KillRing

- **Location:** `src/components/execution-context/KillRing.ts`
- **Relevance:** Existing execution-context component with comprehensive tests. Demonstrates the test mocking pattern for this domain.
- **Key patterns:** `__tests__/KillRing.test.ts` shows mock structure for Obsidian APIs, beforeEach isolation.
