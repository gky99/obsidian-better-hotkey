# References for Kill & Yank Commands

## Similar Implementations

### Cursor Movement Commands

- **Location:** `src/commands/cursor-commands.ts`
- **Relevance:** CM6 wrapper pattern — `cm6CursorCommand()` factory wrapping `@codemirror/commands` functions
- **Key patterns:** `createCursorCommands()` factory function, ExecutionContext parameter, EditorView access via `context.workspaceContext.getEditorProxy().getEditorView()`

### Test Commands (Prototype Kill/Yank)

- **Location:** `src/commands/test-commands.ts`
- **Relevance:** Prototype implementations of delete-word and yank, being replaced by proper commands
- **Key patterns:** Kill ring push/yank flow, WorkspaceContext.insertAtCursor for yank range tracking

### Kill Ring

- **Location:** `src/components/execution-context/KillRing.ts`
- **Relevance:** Core API for kill/yank operations
- **Key patterns:** `push(text)`, `yank()` (async, clipboard sync), `yankPop()`, `setYankRange(range)`, `getYankRange()`, `updateLastActionWasYank(command)`

### Workspace Context

- **Location:** `src/components/execution-context/WorkspaceContext.ts`
- **Relevance:** Editor operations for yank/yank-pop (EditorRange format)
- **Key patterns:** `insertAtCursor(text)` returns EditorRange, `replaceRange(range, text)` returns EditorRange

### ADR-009: CM6 Command Integration Strategy

- **Location:** `.ai/ADR/ADR-009 CM6 Command Integration Strategy.md`
- **Relevance:** Defines two strategies — CM6 Direct Call (cursor commands) and Custom Implementation (kill/yank commands)
- **Key patterns:** EditorView access via `(editor as any).cm`, external dependencies provided by Obsidian

### Cursor Commands Test

- **Location:** `src/commands/__tests__/cursor-commands.test.ts`
- **Relevance:** Test mock patterns for CM6 commands
- **Key patterns:** `vi.hoisted()` for mock functions, `createMockContext()` factory, EditorView mocking
