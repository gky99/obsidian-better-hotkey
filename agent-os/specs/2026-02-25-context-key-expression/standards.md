# Standards for Context Key Expression System

The following standards apply to this work.

---

## architecture/component-folders

Organize components by domain context, not by technical layer or feature.

- Context = separate folder — Each domain context gets its own subdirectory
- Root for orchestrators — Global coordinators live at `src/components/` root
- No cross-context imports within same level

The new `context-key-expression.ts` lives at `src/components/` root level as it's a global utility used by ContextEngine.

---

## testing/file-organization

Tests use the `__tests__/` directory pattern at component level.

- Place test files in `__tests__/` directory at the same level as the component
- Name test files: `ComponentName.test.ts`
- Mirror the component structure within `__tests__/`

New test file: `src/components/__tests__/context-key-expression.test.ts`

---

## testing/test-structure

Structure tests with nested describe blocks.

- Group tests by component/method using nested `describe` blocks
- Use `beforeEach` to create fresh instances — prevents test pollution
- Use descriptive test names: what behavior is tested, not generic "works"
- One assertion focus per test
- Tests must not share state

---

## development/string-constants

Define reusable strings as constants, never hard-code.

- Command IDs, context keys, and shared identifiers must be constants
- Group related constants in objects with `as const`
- Use SCREAMING_SNAKE_CASE for constant names
- Import from `constants.ts`, never duplicate strings

---

## development/git-worktree-workflow

ALWAYS use `/using-git-worktrees` skill BEFORE implementing any code changes.

- Plan first, worktree second, implement third
- Every generated plan MUST include worktree setup as Task 1
- Finish with `/finishing-a-development-branch`
