# Standards for Keyboard Layout Service

The following standards apply to this work.

---

## architecture/component-folders

Organize components by **domain context**, not by technical layer or feature.

- **Context = separate folder** — Each domain context gets its own subdirectory
- **Root for orchestrators** — Global coordinators live at `src/components/` root
- **No cross-context imports within same level**

KeyboardLayoutService is a Global component → lives at `src/components/KeyboardLayoutService.ts`.

---

## development/string-constants

Define reusable strings as constants, never hard-code.

- Command IDs, context keys, and shared identifiers must be constants
- Group related constants in objects with `as const`
- Use SCREAMING_SNAKE_CASE for constant names

Applied: `DIGIT_CODES` constant maps digit strings to physical key codes.

---

## development/git-worktree-workflow

ALWAYS use `/using-git-worktrees` skill BEFORE implementing any code changes.

- Plan first, worktree second, implement third
- Every generated plan MUST include worktree setup as Task 0
- Task 0 is non-negotiable for any plan involving code changes

Applied: Task 0 creates worktree branching from Phase-2.

---

## testing/file-organization

Tests use the `__tests__/` directory pattern at component level.

- Place test files in `__tests__/` directory at the same level as the component
- Name test files: `ComponentName.test.ts`
- Import from parent directory

Applied: `src/components/__tests__/KeyboardLayoutService.test.ts`

---

## testing/test-structure

Structure tests with nested describe blocks.

- Group tests by component/method using nested `describe` blocks
- Use `beforeEach` to create fresh instances — prevents test pollution
- Use descriptive test names: what behavior is tested, not generic "works"
- One assertion focus per test
- Tests must not share state

Applied: Fresh `new KeyboardLayoutService()` per test, nested describes per method.
