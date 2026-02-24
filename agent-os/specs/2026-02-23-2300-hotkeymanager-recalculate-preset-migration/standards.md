# Standards for HotkeyManager Recalculate + Preset Migration

The following standards apply to this work.

---

## development/git-worktree-workflow

MANDATORY Task 0 in all plans; call /using-git-worktrees before any implementation. Every plan must include worktree setup as the first task.

---

## development/string-constants

Command IDs and context keys as constants with `as const`, never hard-code. The `emacs.json` preset uses the same command ID strings defined in `constants.ts` (e.g., `"editor:forward-char"`, `"test:save"`).

---

## testing/file-organization

Tests in `__tests__/` directories at component level, `ComponentName.test.ts` naming. New recalculate tests go in `src/components/hotkey-context/__tests__/HotkeyManager.test.ts`.

---

## testing/test-structure

Nested describe blocks, beforeEach for test isolation, descriptive test names. The `recalculate` tests use a nested `describe('recalculate', ...)` block with fresh HotkeyManager instance per test.

---

## architecture/component-folders

Organize components by domain context (hotkey-context/, execution-context/). HotkeyManager stays in `src/components/hotkey-context/`. ConfigManager stays at `src/components/` root (Global component).
