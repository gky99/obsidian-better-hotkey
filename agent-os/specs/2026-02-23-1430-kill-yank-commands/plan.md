# Task 2.3.1: Kill & Yank Commands

## Context

Phase 2.3.1 of the Development Plan: implement 7 Kill & Yank commands for the Emacs-like hotkey plugin. These are **custom implementation** commands that interact with the Kill Ring. The Kill Ring (2.2) and Workspace Context (2.1) are already complete. Cursor movement commands (2.3.2) are done and serve as a pattern reference.

**Decisions made during shaping:**
- **kill-line at EOL**: Full Emacs behavior — kills newline character when at end of line
- **Word boundary logic**: Custom `\w`-based implementation (not CM6 `moveByGroup`) — skip non-word chars (including whitespace/newlines), then skip word chars. Matches Emacs `forward-word`/`backward-word` exactly, handles cross-line killing.
- **kill-word at EOL**: Cross-line — kills newline + whitespace + next word on following line
- **Test cleanup**: Remove entire `test-commands.ts` and all references
- **Modifier key**: Use `"alt"` (not `"meta"`) for all M- hotkey bindings (Emacs Meta = Alt key)

---

## Task 1: Create worktree

Call `/using-git-worktrees` to create an isolated workspace before implementation.

## Task 2: Save Spec Documentation

Create `agent-os/specs/2026-02-23-1430-kill-yank-commands/` with plan.md, shape.md, standards.md, references.md.

## Task 3: Add command constants to `constants.ts`

Add `KILL_YANK_COMMANDS` constant group. Remove test command entries from `COMMAND_NAMES`.

## Task 4: Create `src/commands/kill-yank-commands.ts`

7 commands: kill-line, kill-region, kill-word, backward-kill-word, copy-region, yank, yank-pop. Includes forwardWordEnd/backwardWordStart helpers.

## Task 5: Remove test-commands.ts and clean up references

Delete test-commands.ts. Update index.ts, main.ts, default.ts.

## Task 6: Update preset with kill/yank bindings + fix alt modifier

Add 7 hotkey bindings. Fix all existing meta → alt for M- keys.

## Task 7: Write tests

Create `src/commands/__tests__/kill-yank-commands.test.ts`.

## Task 8: Update Development Plan

Mark task 2.3.1 items as done in `.ai/Development Plan.md`.

## Verification

1. `pnpm tsc --noEmit` — no type errors
2. `pnpm vitest run` — all tests pass
3. `pnpm run build` — builds successfully
