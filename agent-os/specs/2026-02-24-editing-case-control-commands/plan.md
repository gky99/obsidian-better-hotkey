# Plan: Implement Tasks 2.3.3, 2.3.4, 2.3.5 — Basic Editing, Case Transformation, Control Commands

## Context

Phase 2 of the Obsidian Emacs-like Hotkey plugin needs 10 new editor commands across 3 groups. Cursor movement commands (2.3.2) are already implemented and establish the pattern. These 3 groups complete the Phase 2 command set (29 total commands).

## Scope

| Group | Commands | Strategy |
|---|---|---|
| 2.3.3 Basic Editing | `delete-char` (C-d), `transpose-chars` (C-t), `open-line` (C-o) | CM6 Direct Call |
| 2.3.4 Case Transform | `upcase-word` (A-u), `downcase-word` (A-l), `upcase-region` (C-x C-u), `downcase-region` (C-x C-l) | Custom (`view.dispatch`) |
| 2.3.5 Control | `keyboard-quit` (C-g), `recenter-top-bottom` (C-l), `undo` (C-/, C-x u) | Custom / Obsidian API |

**Note:** Meta commands use `alt` modifier in the key() helper (not `meta`).

## Design Decisions

1. **keyboard-quit chord buffer**: InputHandler already clears chord buffer on exact match (line 110). The command only needs to: clear editor selection + reset `lastActionWasYank` context.
2. **Case word boundary**: Find the full word under cursor — search both forward and backward from cursor to word separators. If cursor is between words/at whitespace, find the next word forward.
3. **recenter cycle state**: Use a context key in ContextEngine (`recenterCyclePosition`). InputHandler resets it after every non-recenter command execution.
4. **File organization**: 2 command files + 1 control file. Basic editing and case transformation grouped into a single `editing-commands.ts`. Control commands in separate `control-commands.ts`.
5. **Constants grouping**: Basic editing + case transform share one `EDITING_COMMANDS` constant object. Control commands get their own `CONTROL_COMMANDS`.

---

## Task 1: Save Spec Documentation

Create `agent-os/specs/2026-02-24-editing-case-control-commands/` with:
- `plan.md` — this plan
- `shape.md` — shaping notes
- `references.md` — reference implementation pointers
- `standards.md` — applicable standards

## Task 2: Add Command ID Constants

**File:** `src/constants.ts`

Add 2 constant objects:
```typescript
export const EDITING_COMMANDS = {
    // Basic Editing (2.3.3) — CM6 Direct Call
    DELETE_CHAR: "editor:delete-char",
    TRANSPOSE_CHARS: "editor:transpose-chars",
    OPEN_LINE: "editor:open-line",
    // Case Transformation (2.3.4) — Custom
    UPCASE_WORD: "editor:upcase-word",
    DOWNCASE_WORD: "editor:downcase-word",
    UPCASE_REGION: "editor:upcase-region",
    DOWNCASE_REGION: "editor:downcase-region",
} as const;

export const CONTROL_COMMANDS = {
    KEYBOARD_QUIT: "editor:keyboard-quit",
    RECENTER_TOP_BOTTOM: "editor:recenter-top-bottom",
    UNDO: "editor:undo",
} as const;
```

Add new context key:
```typescript
export const CONTEXT_KEYS = {
    LAST_ACTION_WAS_YANK: "lastActionWasYank",
    RECENTER_CYCLE_POSITION: "recenterCyclePosition",
} as const;
```

## Task 3: Implement Editing Commands (2.3.3 + 2.3.4)

**Create:** `src/commands/editing-commands.ts`

Contains both CM6 direct-call and custom commands:

**CM6 Direct Call** (basic editing) — same helper pattern as `cursor-commands.ts`:
- `delete-char` → `deleteCharForward`
- `transpose-chars` → `transposeChars`
- `open-line` → `splitLine`

**Custom** (case transformation):

**`caseWordCommand(id, name, transform)`** — for `upcase-word`, `downcase-word`:
- Get EditorView from context
- For each selection range: find the full word under cursor (search backward to word start + forward to word end using `\w` boundary)
- If cursor is at whitespace/between words, find the next word forward
- Apply `transform(text)` via `view.dispatch({ changes, selection })`
- Move cursor to end of transformed word

**`caseRegionCommand(id, name, transform)`** — for `upcase-region`, `downcase-region`:
- Get EditorView from context
- Use `state.changeByRange()` to transform selected text
- No-op if no selection

Export `createEditingCommands(): Command[]` (returns all 7).

**Create:** `src/commands/__tests__/editing-commands.test.ts`

Two test groups:
- **Basic editing**: Follow `cursor-commands.test.ts` pattern — `vi.hoisted()` mocks, `describe.each()` over 3 CM6 commands. Test: name, CM6 call, no-op without context, no-op with null EditorView.
- **Case transformation**: Mock EditorView with `state.doc`, `state.selection`, `dispatch()`. Test:
  - Word transform: cursor in middle of word transforms full word
  - Word transform: cursor at whitespace skips to next word
  - Region transform with selection, no-op with empty selection
  - No-op without context / null EditorView

## Task 4: Implement Control Commands (2.3.5)

**Create:** `src/commands/control-commands.ts`

Three inline command definitions:

**`keyboard-quit`**:
- `contextEngine.setContext(CONTEXT_KEYS.LAST_ACTION_WAS_YANK, false)`
- Collapse all selections to cursors at head via `view.dispatch({ selection })`

**`recenter-top-bottom`**:
- Read cycle position from `contextEngine.getContext(CONTEXT_KEYS.RECENTER_CYCLE_POSITION)` (default 0)
- Cycle through `["center", "start", "end"]`
- `view.dispatch({ effects: EditorView.scrollIntoView(head, { y }) })`
- Write next position to context: `contextEngine.setContext(CONTEXT_KEYS.RECENTER_CYCLE_POSITION, (current + 1) % 3)`

**`undo`**:
- `context.workspaceContext.getEditorProxy().getEditor()?.undo()`

Export `createControlCommands(): Command[]`.

**Create:** `src/commands/__tests__/control-commands.test.ts`

Mock `contextEngine`, EditorView, Editor. Test:
- keyboard-quit: context reset + selection collapse
- recenter: cycle through 3 positions via context key reads/writes
- undo: calls `editor.undo()`
- All: no-op without context / null EditorView

## Task 5: Add Recenter Cycle Reset to InputHandler

**Modify:** `src/components/InputHandler.ts`

In the `handleMatchResult` exact-match case (after command execution), reset recenter cycle position if the executed command is not `recenter-top-bottom`:

```typescript
// TODO: Phase 3+ — consider optimizing this per-command check (e.g., command metadata flags)
// Reset recenter cycle if command is not recenter-top-bottom
if (result.entry.command !== CONTROL_COMMANDS.RECENTER_TOP_BOTTOM) {
    contextEngine.setContext(CONTEXT_KEYS.RECENTER_CYCLE_POSITION, 0);
}
```

Import `contextEngine` and `CONTROL_COMMANDS`, `CONTEXT_KEYS` from constants.

## Task 6: Wire Commands — Exports, Registration, Preset

**Modify:** `src/commands/index.ts` — add 2 new exports (`createEditingCommands`, `createControlCommands`)

**Modify:** `src/main.ts` — register 2 new command groups in `onload()` (same pattern as cursor commands)

**Modify:** `src/presets/default.ts` — add 11 hotkey entries:
- 3 basic editing: C-d, C-t, C-o
- 4 case transform: A-u, A-l, C-x C-u, C-x C-l (use `alt` modifier, not `meta`)
- 4 control: C-g, C-l, C-/, C-x u (undo has dual binding)

Import `EDITING_COMMANDS`, `CONTROL_COMMANDS` from `../constants`.

## Task 7: Run Tests & Build Verification

- `pnpm test` — all tests pass
- `pnpm build` — clean build
- `pnpm lint` — no lint errors

## Critical Files

| File | Action |
|---|---|
| `src/constants.ts` | Modify — add `EDITING_COMMANDS`, `CONTROL_COMMANDS`, `RECENTER_CYCLE_POSITION` context key |
| `src/commands/editing-commands.ts` | Create — 7 commands (3 CM6 + 4 custom) |
| `src/commands/control-commands.ts` | Create — 3 commands |
| `src/commands/index.ts` | Modify — add 2 exports |
| `src/main.ts` | Modify — register 2 command groups |
| `src/presets/default.ts` | Modify — add 11 hotkey entries |
| `src/components/InputHandler.ts` | Modify — add recenter cycle reset |
| `src/commands/__tests__/editing-commands.test.ts` | Create |
| `src/commands/__tests__/control-commands.test.ts` | Create |

## Reference Files (patterns to follow)

| File | Why |
|---|---|
| `src/commands/cursor-commands.ts` | CM6 direct-call pattern |
| `src/commands/__tests__/cursor-commands.test.ts` | Test pattern with `vi.hoisted()`, `describe.each()` |
| `src/components/ContextEngine.ts` | Global singleton, `setContext()`/`getContext()` for recenter + keyboard-quit |
| `src/components/InputHandler.ts` | Exact-match handler where recenter reset goes |
| `src/components/execution-context/MarkdownEditorProxy.ts` | `getEditorView()`, `getEditor()` access |
