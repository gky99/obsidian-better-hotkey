# Popover Suggest Selector Move

## Context

`PopoverSuggestProxy` already tracks the active `PopoverSuggest` instance (for context-key purposes) but does not expose navigation methods. The `SuggestionSelector` interface (`moveUp` / `moveDown`) exists and is already implemented by `SuggestModalProxy` via `instance.chooser.moveUp/Down`. For popovers the equivalent private API is `instance.suggestions.moveUp/Down`. This change wires up navigation commands for popover suggestions following the same patterns used for suggest modals.

User decisions:
- Separate command namespace: `popover-suggest:next-option` / `popover-suggest:prev-option`
- Context: use existing `popoverSuggestOpen` key (popovers never receive DOM focus)
- Scope: navigation only (no text editing)

---

## Task 0: Create Git Worktree

Use `superpowers:using-git-worktrees` skill to create an isolated worktree before any code changes.

---

## Task 1: Save Spec Documentation

Create `agent-os/specs/2026-03-04-1200-popover-suggest-selector-move/` with plan, shape, and references docs.

---

## Task 2: Add Private API Type for PopoverSuggest

**File**: `src/types.ts`

Add an interface for the private `suggestions` property on `PopoverSuggest`, mirroring the existing `SuggestModalWithChooser` pattern:

```typescript
export interface PopoverSuggestWithSuggestions extends PopoverSuggest<unknown> {
    suggestions: SuggestChooser;   // reuse existing SuggestChooser shape
}
```

`SuggestChooser` already has `{ moveUp(event?: KeyboardEvent): void; moveDown(event?: KeyboardEvent): void; }` — no new interface needed.

---

## Task 3: Implement SuggestionSelector on PopoverSuggestProxy

**File**: `src/components/execution-context/PopoverSuggestProxy.ts`

1. Import `SuggestionSelector`, `PopoverSuggestWithSuggestions` from `types.ts`
2. Change class declaration: `export class PopoverSuggestProxy implements SuggestionSelector`
3. Add methods:

```typescript
moveUp(event?: KeyboardEvent): void {
    if (!this.activeInstance) return;
    const s = (this.activeInstance as unknown as PopoverSuggestWithSuggestions).suggestions;
    s?.moveUp(event);
}

moveDown(event?: KeyboardEvent): void {
    if (!this.activeInstance) return;
    const s = (this.activeInstance as unknown as PopoverSuggestWithSuggestions).suggestions;
    s?.moveDown(event);
}
```

---

## Task 4: Add Command Constants & Rename Suggest Modal Namespace

**File**: `src/constants.ts`

1. Rename `SUGGEST_COMMANDS` values from `suggest:*` to `suggest-modal:*`:
   - `suggest:next-option` → `suggest-modal:next-option`
   - `suggest:prev-option` → `suggest-modal:prev-option`
   - etc. for all 14 commands

2. Add new constant alongside:

```typescript
export const POPOVER_SUGGEST_COMMANDS = {
    NEXT_OPTION: 'popover-suggest:next-option',
    PREV_OPTION: 'popover-suggest:prev-option',
} as const;
```

Update all references to `SUGGEST_COMMANDS` values throughout the codebase (commands, tests, default keybindings, etc.).

---

## Task 5: Create popover-suggest-commands.ts

**File**: `src/commands/popover-suggest-commands.ts` (new file)

```typescript
export function createPopoverSuggestCommands(): Command[] {
    return [
        {
            id: POPOVER_SUGGEST_COMMANDS.NEXT_OPTION,
            name: 'Popover: Next Suggestion',
            execute(context: ExecutionContext, event: KeyboardEvent) {
                context.popoverSuggestProxy.moveDown(event);
            },
        },
        {
            id: POPOVER_SUGGEST_COMMANDS.PREV_OPTION,
            name: 'Popover: Previous Suggestion',
            execute(context: ExecutionContext, event: KeyboardEvent) {
                context.popoverSuggestProxy.moveUp(event);
            },
        },
    ];
}
```

---

## Task 6: Register Commands

Find where `createSuggestCommands()` is called and also call `createPopoverSuggestCommands()`, registering both command objects. (Likely in the plugin's main setup or a command registry file.)

---

## Task 7: Write Tests

**New file**: `src/components/execution-context/__tests__/PopoverSuggestProxy.selector.test.ts`
(or extend existing `PopoverSuggestProxy.test.ts`)

Tests:
- `moveDown` calls `instance.suggestions.moveDown(event)` when active
- `moveUp` calls `instance.suggestions.moveUp(event)` when active
- `moveDown`/`moveUp` are no-ops when no active instance
- `moveDown`/`moveUp` handle null `suggestions` gracefully

**Extend**: `src/commands/__tests__/suggest-commands.test.ts` (or new file for popover commands)
- `popover-suggest:next-option` calls `popoverSuggestProxy.moveDown`
- `popover-suggest:prev-option` calls `popoverSuggestProxy.moveUp`

---

## Critical Files

| File | Change |
|------|--------|
| `src/types.ts` | Add `PopoverSuggestWithSuggestions` interface |
| `src/components/execution-context/PopoverSuggestProxy.ts` | Implement `SuggestionSelector` |
| `src/constants.ts` | Add `POPOVER_SUGGEST_COMMANDS` |
| `src/commands/popover-suggest-commands.ts` | New file — 2 commands |
| `src/constants.ts` (all references) | Rename `suggest:*` → `suggest-modal:*` |
| Plugin main/command registry | Register new commands |

---

## Verification

1. Run existing tests: `bun test` — should still pass (non-breaking addition)
2. Run new tests for `PopoverSuggestProxy.moveUp/moveDown`
3. Manual e2e: open a file, trigger a popover suggestion (e.g. wikilink `[[`), bind `popover-suggest:next-option` to a key, verify selection moves down in the popover list
