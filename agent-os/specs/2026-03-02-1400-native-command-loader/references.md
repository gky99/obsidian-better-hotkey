# References for Native Obsidian Command Loader

## Similar Implementations

### CommandRegistry

- **Location:** `src/components/CommandRegistry.ts`
- **Relevance:** Target for registering wrapped commands; has loadObsidianCommands() stub
- **Key patterns:** Map-based storage, duplicate detection, execute with args/context

### Cursor Commands Wrapping Pattern

- **Location:** `src/commands/cursor-commands.ts`
- **Relevance:** Shows how to wrap external functions (CM6) into our Command interface
- **Key patterns:** Factory function creates Command with execute() that derives EditorView from context

### WorkspaceContext

- **Location:** `src/components/execution-context/WorkspaceContext.ts`
- **Relevance:** Shows how to derive editor + view from workspace state at runtime
- **Key patterns:** `app.workspace.getActiveViewOfType(MarkdownView)` for live workspace query
