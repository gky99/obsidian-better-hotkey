# Active Editor Accessor — Shaping Notes

## Scope

Implement active editor tracking for the Workspace Context component (Dev Plan task 2.1). Introduces `MarkdownEditorProxy` — a persistent wrapper class that tracks the last active markdown view and provides safe access to both Obsidian's `Editor` and CM6's `EditorView`. Listens to `active-leaf-change` workspace event to maintain tracking state.

## Decisions

- **Class name: `MarkdownEditorProxy`** — chosen over `EditorHandle`, `EditorRef`, and `EditorViewHandle`. "Proxy" emphasizes the delegation pattern: stands in for the actual MarkdownView/EditorView.
- **Persistent proxy object** — created once by WorkspaceContext, always exists (never null). Internal `MarkdownView` reference is updated via `updateView()`. Avoids creating/discarding proxy instances on every leaf change.
- **Visibility check (`isVisible()`)** — queries `workspace.getLeavesOfType('markdown')` each time. Returns true if the view exists in any workspace leaf (including non-active tabs in split panes). Not cached, because leaves can close asynchronously.
- **Eager initialization** — proxy constructor checks `getActiveViewOfType(MarkdownView)` to handle the common case of plugin loading with an active editor already open.
- **Plugin propagation** — `WorkspaceContext` constructor changes from `App` to `Plugin` parameter. This enables `plugin.registerEvent()` for auto-cleanup of workspace event listeners. Ripples through `ExecutionContext` constructor.
- **Existing `getActiveEditor()` unchanged** — editor mutation methods (hasSelection, getSelection, etc.) continue querying live workspace state. The proxy serves a different purpose: persistent CM6 access for direct-call commands.

## Context

- **Visuals:** None (backend/service component)
- **References:** WorkspaceContext.ts (existing editor operations), KeyboardLayoutService.ts (event listener registration pattern)
- **Product alignment:** Enables Phase 2 editor commands (2.3.2 cursor movement, 2.3.3 basic editing, 2.3.4 case transformation)

## Standards Applied

- architecture/component-folders — MarkdownEditorProxy goes in `execution-context/` domain
- testing/file-organization — tests in `execution-context/__tests__/`
- testing/test-structure — nested describe blocks, beforeEach isolation
