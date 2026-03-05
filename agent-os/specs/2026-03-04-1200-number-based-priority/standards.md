# Standards for Number-Based Priority System

## development/git-worktree-workflow

ALWAYS use `/using-git-worktrees` BEFORE implementing any code changes. Task 1 in any plan must be worktree setup.

---

## testing/test-structure

Structure tests with nested describe blocks. Use `beforeEach` for fresh instances per test. One assertion focus per test.

---

## testing/file-organization

Tests use the `__tests__/` directory pattern at component level. Name test files `ComponentName.test.ts`.

---

## development/todo-comments

Reference specific development phases in TODO comments. Include phase number and integration context. No generic TODOs.
