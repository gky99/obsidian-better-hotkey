# Suggest Modal Operations — Implementation Plan

## Context

The plugin needs commands to control Obsidian's SuggestModal when it's open — both navigating the suggestion list and editing the input field. Currently, two test commands (`test:next`, `test:prev`) in `control-commands.ts` demonstrate accessing the private `chooser` API. This plan replaces those test commands with two proper interfaces (`SuggestionSelector` and `InputFieldEditor`), implements them in `SuggestModalProxy`, and creates 14 commands with Emacs keybindings gated by `when: "suggestModalOpen"`.

**Key design decisions:**
- Implementation of interfaces lives inside `SuggestModalProxy` (already tracks the active instance)
- `InputFieldEditor` exposes **primitives** (cursor position, text content, insert/delete) — high-level operations (kill, yank, word movement) are helper functions
- Helper functions take interface parameters + explicit `KillRing` when needed (no KillRing injection in proxy constructor)
- Commands pass `context.suggestModalProxy` + `context.killRing` to helpers, making them reusable for `PopoverSuggestProxy` later

---

## Task 0: Create Git Worktree

Use `/using-git-worktrees` to create an isolated worktree for this feature branch.

---

## Task 1: Save Spec Documentation

Create `agent-os/specs/2026-03-02-suggest-modal-operations/` with:
- `plan.md` — this plan
- `shape.md` — shaping notes
- `standards.md` — applicable standards content
- `references.md` — pointer to demo commands in control-commands.ts

---

## Task 2: Define Private API Types + Interfaces

**File:** `src/types.ts`

Add after existing interfaces:

```typescript
// Private chooser API on SuggestModal
export interface SuggestChooser {
    moveUp(event?: KeyboardEvent): void;
    moveDown(event?: KeyboardEvent): void;
}

// Typed access to SuggestModal's private chooser property
// Extends SuggestModal to include the undocumented chooser
export interface SuggestModalWithChooser extends SuggestModal<unknown> {
    chooser: SuggestChooser;
    inputEl: HTMLInputElement;  // redeclared for explicit access
}

// Selection range for single-line input fields
export interface InputSelection {
    from: number;
    to: number;
}

// Interface 1: Selection navigation
export interface SuggestionSelector {
    moveUp(event?: KeyboardEvent): void;
    moveDown(event?: KeyboardEvent): void;
}

// Interface 2: Input field primitives
// Exposes basic elements — high-level ops (kill, yank, word movement)
// are implemented as helper functions in suggest-commands.ts
export interface InputFieldEditor {
    getSelection(): InputSelection;
    setSelection(selection: InputSelection): void;
    getText(): string;
    getTextLength(): number;
    insertText(text: string, from: number, to?: number): void;
    deleteText(from: number, to: number): void;
}
```

---

## Task 3: Add SUGGEST_COMMANDS Constants

**File:** `src/constants.ts`

```typescript
export const SUGGEST_COMMANDS = {
    // Selection navigation
    NEXT_OPTION: 'suggest:next-option',
    PREV_OPTION: 'suggest:prev-option',
    // Cursor movement
    FORWARD_CHAR: 'suggest:forward-char',
    BACKWARD_CHAR: 'suggest:backward-char',
    FORWARD_WORD: 'suggest:forward-word',
    BACKWARD_WORD: 'suggest:backward-word',
    MOVE_BEGINNING_OF_LINE: 'suggest:move-beginning-of-line',
    MOVE_END_OF_LINE: 'suggest:move-end-of-line',
    // Text modification
    DELETE_CHAR: 'suggest:delete-char',
    DELETE_BACKWARD_CHAR: 'suggest:delete-backward-char',
    KILL_LINE: 'suggest:kill-line',
    KILL_WORD: 'suggest:kill-word',
    BACKWARD_KILL_WORD: 'suggest:backward-kill-word',
    YANK: 'suggest:yank',
} as const;
```

---

## Task 4: Implement Interfaces in SuggestModalProxy

**File:** `src/components/execution-context/SuggestModalProxy.ts`

Changes:
1. Class declaration adds `implements SuggestionSelector, InputFieldEditor`
2. **No constructor changes** — constructor stays as-is (no KillRing parameter)
3. Implement 2 `SuggestionSelector` methods + 6 `InputFieldEditor` primitive methods

### SuggestionSelector implementation
```typescript
moveUp(event?: KeyboardEvent): void {
    if (!this.activeInstance) return;
    const chooser = (this.activeInstance as unknown as SuggestModalWithChooser).chooser;
    chooser?.moveUp(event);
}

moveDown(event?: KeyboardEvent): void {
    if (!this.activeInstance) return;
    const chooser = (this.activeInstance as unknown as SuggestModalWithChooser).chooser;
    chooser?.moveDown(event);
}
```

### InputFieldEditor implementation (primitives)
```typescript
getSelection(): InputSelection {
    if (!this.activeInstance) return { from: 0, to: 0 };
    const el = this.activeInstance.inputEl;
    return { from: el.selectionStart ?? 0, to: el.selectionEnd ?? 0 };
}

setSelection(selection: InputSelection): void {
    if (!this.activeInstance) return;
    const el = this.activeInstance.inputEl;
    el.selectionStart = selection.from;
    el.selectionEnd = selection.to;
}

getText(): string {
    if (!this.activeInstance) return '';
    return this.activeInstance.inputEl.value;
}

getTextLength(): number {
    if (!this.activeInstance) return 0;
    return this.activeInstance.inputEl.value.length;
}

insertText(text: string, from: number, to?: number): void {
    if (!this.activeInstance) return;
    const el = this.activeInstance.inputEl;
    el.setRangeText(text, from, to ?? from, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

deleteText(from: number, to: number): void {
    if (!this.activeInstance) return;
    const el = this.activeInstance.inputEl;
    el.setRangeText('', from, to, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
}
```

---

## Task 5: Create suggest-commands.ts

**File (new):** `src/commands/suggest-commands.ts`

Structure:
1. **Word boundary helpers** — `forwardWordEnd(text, pos)`, `backwardWordStart(text, pos)` using `\w` regex
2. **High-level helper functions** — each takes `SuggestionSelector` or `InputFieldEditor` + `KillRing` when needed
3. **`createSuggestCommands()` factory** — returns `Command[]` with 14 commands

Helper functions (examples):
```typescript
// Selection helpers (take SuggestionSelector)
function moveSelectionDown(selector: SuggestionSelector, event?: KeyboardEvent): void {
    selector.moveDown(event);
}

// Cursor helpers (take InputFieldEditor, use InputSelection)
function forwardChar(editor: InputFieldEditor): void {
    const sel = editor.getSelection();
    if (sel.from < editor.getTextLength()) {
        editor.setSelection({ from: sel.from + 1, to: sel.from + 1 });
    }
}

function forwardWord(editor: InputFieldEditor): void {
    const sel = editor.getSelection();
    const target = forwardWordEnd(editor.getText(), sel.from);
    editor.setSelection({ from: target, to: target });
}

// Kill helpers (take InputFieldEditor + KillRing)
function killLine(editor: InputFieldEditor, killRing: KillRing): void {
    const sel = editor.getSelection();
    const len = editor.getTextLength();
    if (sel.from < len) {
        const killed = editor.getText().substring(sel.from);
        killRing.push(killed);
        editor.deleteText(sel.from, len);
    }
}

function yank(editor: InputFieldEditor, killRing: KillRing): void {
    const entries = killRing.getEntries();
    if (entries.length === 0) return;
    const sel = editor.getSelection();
    editor.insertText(entries[0], sel.from);
}
```

Commands pass `context.suggestModalProxy` and `context.killRing` explicitly:
```typescript
{
    id: SUGGEST_COMMANDS.KILL_LINE,
    name: 'Suggest Kill Line',
    execute(_args, context) {
        if (!context) return;
        killLine(context.suggestModalProxy, context.killRing);
    },
}
```

**Also update:** `src/commands/index.ts` — add `export { createSuggestCommands } from './suggest-commands'`

---

## Task 6: Wire into main.ts

**File:** `src/main.ts`

Add import of `createSuggestCommands` and registration block after control commands:
```typescript
const suggestCommands = createSuggestCommands();
for (const cmd of suggestCommands) {
    this.commandRegistry.registerCommand(cmd);
}
```

---

## Task 7: Update HotkeyMatcher for When-Clause Specificity

**File:** `src/components/hotkey-context/HotkeyMatcher.ts`

**Problem:** When suggest and editor commands share the same key (e.g., `ctrl+n`), both pass `contextEngine.filter()` when the modal is open (editor has `TrueExpr`, suggest has `suggestModalOpen`). At equal priority (`Preset`), the current `reduce` picks the first entry — always the editor command.

**Fix:** In `selectHighestPriority`, at equal priority, prefer the entry with a `when` clause (more specific context match):
```typescript
return entries.reduce((highest, current) => {
    if (current.priority < highest.priority) return current;
    if (current.priority > highest.priority) return highest;
    // Same priority: prefer more specific when clause
    if (current.when !== undefined && highest.when === undefined) return current;
    if (current.when === undefined && highest.when !== undefined) return highest;
    return highest;
});
```

---

## Task 8: Update Emacs Preset

**File:** `presets/emacs.json`

Add 13 keybindings with `when: "suggestModalOpen"`:
- `ctrl+n` → suggest:next-option
- `ctrl+p` → suggest:prev-option
- `ctrl+f` → suggest:forward-char
- `ctrl+b` → suggest:backward-char
- `alt+f` → suggest:forward-word
- `alt+b` → suggest:backward-word
- `ctrl+a` → suggest:move-beginning-of-line
- `ctrl+e` → suggest:move-end-of-line
- `ctrl+d` → suggest:delete-char
- `ctrl+k` → suggest:kill-line
- `alt+d` → suggest:kill-word
- `alt+backspace` → suggest:backward-kill-word
- `ctrl+y` → suggest:yank

Note: `suggest:delete-backward-char` omitted — Backspace works natively.

Also remove `test:next` / `test:prev` entries and their bindings.

---

## Task 9: Clean Up Test Commands

**File:** `src/commands/control-commands.ts`

Remove the `test:next` and `test:prev` command objects (lines 16-39). `createControlCommands()` should return exactly 3 commands.

---

## Task 10: Write Tests

**New file:** `src/commands/__tests__/suggest-commands.test.ts`
- 14 commands returned, unique IDs, match constants
- Each command calls the correct helper → interface method
- No-op when no context

**Update:** `src/components/execution-context/__tests__/SuggestModalProxy.test.ts`
- Test SuggestionSelector methods (moveUp/moveDown with/without active instance)
- Test InputFieldEditor primitives (getSelection, setSelection, getText, getTextLength, insertText, deleteText)
- Test input event dispatched after insertText/deleteText

**Update:** `src/components/hotkey-context/__tests__/HotkeyMatcher.test.ts`
- Test when-clause specificity tiebreaking at equal priority

---

## Execution Order

0 (worktree) → 1 → 2, 3 (parallel) → 4 → 5 → 6 → 7, 8 (parallel) → 9 → 10

## Files Changed

| File | Action |
|------|--------|
| `agent-os/specs/2026-03-02-suggest-modal-operations/*` | Create (spec docs) |
| `src/types.ts` | Modify (add 4 interfaces) |
| `src/constants.ts` | Modify (add SUGGEST_COMMANDS) |
| `src/components/execution-context/SuggestModalProxy.ts` | Modify (implement interfaces) |
| `src/commands/suggest-commands.ts` | Create (helpers + command factory) |
| `src/commands/index.ts` | Modify (add export) |
| `src/main.ts` | Modify (register commands) |
| `src/components/hotkey-context/HotkeyMatcher.ts` | Modify (specificity tiebreak) |
| `presets/emacs.json` | Modify (add keybindings, remove test entries) |
| `src/commands/control-commands.ts` | Modify (remove test commands) |
| `src/commands/__tests__/suggest-commands.test.ts` | Create |
| `src/components/execution-context/__tests__/SuggestModalProxy.test.ts` | Modify |
| `src/components/hotkey-context/__tests__/HotkeyMatcher.test.ts` | Modify |

## Verification

1. `pnpm test` — all tests pass
2. `pnpm build` — compiles without errors
3. Manual in Obsidian:
   - Open command palette (Ctrl+P) → modal opens
   - Ctrl+N/Ctrl+P → suggestion moves down/up
   - Ctrl+F/Ctrl+B → cursor moves in input field
   - Ctrl+K → kills to end of input, text in kill ring
   - Ctrl+Y → yanks from kill ring into input
   - Close modal → editor commands resume normal behavior
