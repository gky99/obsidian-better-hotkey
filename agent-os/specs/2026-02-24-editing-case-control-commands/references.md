# References for Editing, Case & Control Commands

## Similar Implementations

### Cursor Movement Commands (2.3.2)

- **Location:** `src/commands/cursor-commands.ts`
- **Relevance:** Establishes the CM6 direct-call wrapper pattern reused by basic editing commands
- **Key patterns:** `cm6CursorCommand()` helper, `createCursorCommands()` factory, constant-based IDs

### Cursor Commands Tests

- **Location:** `src/commands/__tests__/cursor-commands.test.ts`
- **Relevance:** Test pattern for CM6 direct-call commands
- **Key patterns:** `vi.hoisted()` for mock declarations, `vi.mock()` for CM6 modules, `describe.each()` for parameterized tests, `createMockContext()` helper

### ADR-009: CM6 Command Integration Strategy

- **Location:** `.AI/ADR/ADR-009 CM6 Command Integration Strategy.md`
- **Relevance:** Defines the two integration strategies (CM6 Direct Call vs Custom Implementation)
- **Key patterns:** EditorView access via `(editor as any).cm`, word range computation using CM6 selection commands
