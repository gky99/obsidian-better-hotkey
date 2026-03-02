# Standards for InputHandler handleKey Patch

The following standards apply to this work.

---

## development/git-worktree-workflow

**ALWAYS use `/using-git-worktrees` skill BEFORE implementing any code changes.**

- Plan first, worktree second, implement third
- Every generated plan MUST include worktree setup as Task 1

---

## testing/test-structure

Structure tests with nested describe blocks:

- Group tests by component/method using nested `describe` blocks
- Use `beforeEach` to create fresh instances — prevents test pollution
- Use descriptive test names: what behavior is tested, not generic "works"
- One assertion focus per test
- Tests must not share state

---

## testing/file-organization

Tests use the `__tests__/` directory pattern at component level.

- Place test files in `__tests__/` directory at the same level as the component
- Name test files: `ComponentName.test.ts`
- Import from parent directory: `import { Component } from '../Component'`
