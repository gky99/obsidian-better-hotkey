# Reuse Hierarchy

Before creating new types, abstractions, or implementations, check existing code in this order:

1. **Project internals first** — Check existing components, proxies, and context objects
2. **Library public types second** — Use types exported by dependencies (e.g., `Command` from `obsidian`)
3. **Create new only as last resort** — Only when nothing existing fits

**Examples:**
- Need active MarkdownView? Use `WorkspaceContext.getActiveMarkdownView()`, not `app.workspace.getActiveViewOfType()`
- Need Obsidian command shape? Import `Command` from `obsidian`, don't redefine the interface
- Need editor access? Use `MarkdownEditorProxy.getEditor()`, not direct property access

**Why:** Prevents duplicate abstractions, ensures consistency, and leverages existing visibility guards and lifecycle management.
