# Standards for Native Obsidian Command Loader

The following standards apply to this work.

---

## development/private-api-types

Helper types for private/undocumented APIs: centralize if shared, keep local if single-use.

- **Shared across files** → define in `src/types.ts`
- **Used in one file only** → define at top of that file

For non-standard browser APIs, use two-step assertion: `as unknown as Record<string, unknown>` (not raw `as any`)

---

## development/string-constants

Define reusable strings as constants, never hard-code. Group related constants in objects with `as const`. Use SCREAMING_SNAKE_CASE. Import from constants.ts.

---

## architecture/component-folders

Organize components by domain context, not by technical layer. Root for orchestrators. No cross-context imports within same level.

---

## testing/file-organization

Tests in `__tests__/` directory at the same level as the component. Name: `ComponentName.test.ts`.

---

## testing/test-structure

Nested describe blocks, beforeEach for fresh instances. Descriptive test names. One assertion focus per test.
