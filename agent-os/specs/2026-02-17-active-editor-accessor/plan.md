# Active Editor Accessor (Dev Plan Task 2.1)

## Context

The Workspace Context component needs active editor tracking to support CM6 direct-call commands (task 2.3.2: cursor movement, task 2.3.3: basic editing, task 2.3.4: case transformation). Currently, `WorkspaceContext` queries `getActiveViewOfType(MarkdownView)` on every operation — it has no persistent tracking of the active leaf or last markdown view. This task introduces:

1. **`MarkdownEditorProxy`** — a wrapper class around `MarkdownView` providing safe access to both Obsidian's `Editor` and CM6's `EditorView`
2. **Active leaf change tracking** — listens to `active-leaf-change` workspace event, saves the current leaf and last active markdown view

---

## Task 1: Save Spec Documentation

Create `agent-os/specs/2026-02-17-active-editor-accessor/` with:
- `plan.md` — this plan
- `shape.md` — shaping decisions and context
- `standards.md` — applicable standards
- `references.md` — reference implementations

## Task 2: Add `@codemirror/view` devDependency

`@codemirror/view` is already in esbuild externals (Obsidian provides it at runtime) but not in `devDependencies`. Add it for TypeScript type resolution:

```bash
pnpm add -D @codemirror/view
```

## Task 3: Create `MarkdownEditorProxy` class

**New file:** `src/components/execution-context/MarkdownEditorProxy.ts`

A **persistent, long-lived object** that tracks the last active markdown view. Created once by WorkspaceContext and updated when the active leaf changes. Always exists (never null) — the internal `view` reference may be null if no markdown view has been active yet.

Constructor takes `(app: App)` and eagerly initializes from `app.workspace.getActiveViewOfType(MarkdownView)`.

Public API:
- `updateView(view: MarkdownView): void` — called by WorkspaceContext when active leaf switches to a markdown view
- `isVisible(): boolean` — checks if the tracked view is still visible by querying `workspace.getLeavesOfType('markdown')`
- `getEditor(): Editor | null` — returns the Obsidian Editor if visible, null otherwise
- `getEditorView(): EditorView | null` — returns CM6 EditorView via `(editor as any).cm` if visible (uses `@ts-expect-error`)
- `getMarkdownView(): MarkdownView | null` — returns the tracked view reference (may be null)

## Task 4: Update `WorkspaceContext` — Plugin propagation + active leaf tracking

**Modify:** `src/components/execution-context/WorkspaceContext.ts`

Changes:

1. **Constructor**: `App` → `Plugin` parameter (extracts `plugin.app` internally)
2. **New fields**: `activeLeaf: WorkspaceLeaf | null`, `editorProxy: MarkdownEditorProxy` (always present, never null)
3. **Create proxy in constructor**: `this.editorProxy = new MarkdownEditorProxy(this.app)` — the proxy handles its own eager initialization
4. **`onActiveLeafChange(leaf)`**: updates `activeLeaf`; if leaf's view is `MarkdownView`, calls `this.editorProxy.updateView(leaf.view)`
5. **Register event**: `plugin.registerEvent(app.workspace.on('active-leaf-change', ...))` for auto-cleanup
6. **New accessors**: `getEditorProxy(): MarkdownEditorProxy` (always returns proxy, never null), `getActiveLeaf(): WorkspaceLeaf | null`
7. **`dispose()`**: clears activeLeaf (event cleanup is automatic via Plugin lifecycle)

**Important**: Existing `private getActiveEditor()` stays unchanged — editor mutation methods (hasSelection, getSelection, etc.) should always query live state, not the cached proxy.

## Task 5: Update `ExecutionContext` and `InputHandler`

**Modify:** `src/components/execution-context/ExecutionContext.ts`
- Constructor: `App` → `Plugin` parameter
- Passes `plugin` to `WorkspaceContext(plugin)`

**Modify:** `src/components/InputHandler.ts`
- One-line change: `new ExecutionContext(plugin.app)` → `new ExecutionContext(this.plugin)`

## Task 6: Update `components/index.ts`

Add export for the new class:
```typescript
export { MarkdownEditorProxy } from "./execution-context/MarkdownEditorProxy";
```

## Task 7: Tests

### `src/components/execution-context/__tests__/MarkdownEditorProxy.test.ts` (new)

- Constructor eagerly initializes from current active markdown view
- Constructor with no active view starts with null internal view
- `updateView()` updates the tracked view
- `isVisible()` returns true when tracked view's leaf is in workspace
- `isVisible()` returns false when tracked view is not in workspace (closed)
- `isVisible()` returns false when no view has been set
- `getEditor()` returns Editor when visible, null when not
- `getEditorView()` returns EditorView when visible, null when not
- `getMarkdownView()` returns tracked view or null

### `src/components/execution-context/__tests__/WorkspaceContext.test.ts` (new)

- `getEditorProxy()` always returns a proxy (never null)
- `active-leaf-change` with MarkdownView calls `updateView()` on proxy
- `active-leaf-change` with non-MarkdownView does not change proxy's view
- `active-leaf-change` with null clears activeLeaf but proxy retains view
- `getActiveLeaf()` returns current leaf
- `dispose()` clears activeLeaf
- Existing editor methods still query live workspace state

### Update `src/components/__tests__/InputHandler.test.ts` (modify)
- Add `registerEvent: vi.fn()` and workspace mocks to `createMockPlugin()` factory

## Task 8: Verify — type check + tests

```bash
pnpm tsc --noEmit && pnpm vitest run
```

---

## Key Files

| File | Action |
|------|--------|
| `src/components/execution-context/MarkdownEditorProxy.ts` | New |
| `src/components/execution-context/WorkspaceContext.ts` | Modify |
| `src/components/execution-context/ExecutionContext.ts` | Modify |
| `src/components/InputHandler.ts` | Modify (1 line) |
| `src/components/index.ts` | Modify (1 line) |
| `src/components/execution-context/__tests__/MarkdownEditorProxy.test.ts` | New |
| `src/components/execution-context/__tests__/WorkspaceContext.test.ts` | New |
| `src/components/__tests__/InputHandler.test.ts` | Modify |
| `package.json` | Modify (add devDependency) |

## Design Decisions

1. **MarkdownEditorProxy is persistent** — created once, always exists (never null). Internal view reference is updated via `updateView()`. Eager initialization in constructor handles plugin loading with active editor.
2. **MarkdownEditorProxy is its own file** — will be imported directly by command implementations in 2.3.2+
3. **isVisible() queries workspace each time** — not cached, because leaves can close asynchronously
4. **Existing `getActiveEditor()` unchanged** — editor mutations use live state; proxy is for CM6 access
5. **Plugin propagation through constructor chain** — cleanest approach, all classes are internal
