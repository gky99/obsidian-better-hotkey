# Kill & Yank Commands (Task 2.3.1) — Shaping Notes

## Scope

Implement 7 Kill & Yank commands for the Emacs-like hotkey plugin (Dev Plan task 2.3.1). These are custom implementation commands that interact with the Kill Ring for text killing/yanking operations. Kill commands use CM6 EditorView directly; yank commands use WorkspaceContext for EditorRange compatibility.

## Decisions

- **kill-line at EOL**: Full Emacs behavior — kills newline character when cursor is at end of line, joining lines
- **Word boundary logic**: Custom `\w`-based implementation instead of CM6 `moveByGroup`. Rationale: `moveByGroup` moves one character category group at a time, but Emacs kill-word needs to skip whitespace AND the next word in one operation. Custom logic using `\w` regex handles this naturally and matches Emacs `forward-word`/`backward-word` exactly.
- **kill-word cross-line**: Kills newline + whitespace + next word on following line (standard Emacs M-d behavior)
- **Kill vs Yank implementation split**: Kill commands (kill-line, kill-region, kill-word, backward-kill-word, copy-region) use CM6 EditorView directly for precise range computation. Yank commands (yank, yank-pop) use WorkspaceContext because KillRing.setYankRange requires Obsidian EditorRange format.
- **Test cleanup**: Remove entire `test-commands.ts` — prototype commands replaced by proper implementations
- **Modifier key**: Use `"alt"` (not `"meta"`) for all M- hotkey bindings. Emacs Meta key maps to Alt on Windows/Linux. The existing cursor movement bindings also fixed (meta → alt).
- **No cut-region**: kill-region already provides cut behavior (delete + save to kill ring)

## Context

- **Visuals:** None (backend command logic, no UI changes)
- **References:** cursor-commands.ts (CM6 wrapper pattern), test-commands.ts (prototype kill/yank), KillRing.ts, WorkspaceContext.ts, ADR-009
- **Product alignment:** Kill ring is a key product feature (see mission.md). These commands enable the core kill/yank workflow.

## Standards Applied

- development/string-constants — New command IDs as `KILL_YANK_COMMANDS` constant object with `as const`
- development/git-worktree-workflow — Task 0 worktree setup
- testing/file-organization — Tests in `src/commands/__tests__/kill-yank-commands.test.ts`
- testing/test-structure — Nested describe blocks, beforeEach isolation, descriptive test names
