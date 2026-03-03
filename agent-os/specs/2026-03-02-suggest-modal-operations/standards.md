# Standards for Suggest Modal Operations

The following standards apply to this work.

---

## architecture/component-folders

Organize components by **domain context**, not by technical layer or feature.

- **Context = separate folder** — Each domain context gets its own subdirectory
- **Root for orchestrators** — Global coordinators live at `src/components/` root
- **No cross-context imports within same level** — `hotkey-context/` should not import from `execution-context/`

---

## development/private-api-types

Helper types for private/undocumented APIs: centralize if shared, keep local if single-use.

- **Shared across files** → define in `src/types.ts`
- **Used in one file only** → define at top of that file
- For non-standard browser APIs, use two-step assertion: `as unknown as Record<string, unknown>` (not raw `as any`)

---

## development/string-constants

Define reusable strings as constants, never hard-code.

- Command IDs, context keys, and shared identifiers must be constants
- Group related constants in objects with `as const`
- Use SCREAMING_SNAKE_CASE for constant names
- Import from `constants.ts`, never duplicate strings

---

## development/eslint-disable-policy

`eslint-disable` is a last resort. Exhaust all type-safe alternatives first.

- Always use `eslint-disable-next-line`, never file-wide `eslint-disable`
- Every disable MUST have a `--` comment explaining why

---

## development/pre-commit-formatting

Prettier auto-formats staged files via .githooks/pre-commit; CI checks build + lint.

---

## testing/file-organization

Tests use the `__tests__/` directory pattern at component level. Name test files: `ComponentName.test.ts`.

---

## testing/test-structure

Structure tests with nested describe blocks. Use `beforeEach` to create fresh instances. Use descriptive test names.

---

## development/test-lint-exclusion

Test files and mocks excluded from ESLint; separate quality expectations.
