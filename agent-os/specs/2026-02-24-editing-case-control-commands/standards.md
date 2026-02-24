# Standards for Editing, Case & Control Commands

## development/string-constants

Use `as const` for constant objects. SCREAMING_SNAKE_CASE for names. Group related constants. Single source of truth.

## testing/file-organization

Tests in `__tests__/` directories at component level. Naming: `ComponentName.test.ts`.

## testing/test-structure

Nested describe blocks, beforeEach for test isolation, descriptive test names.

## development/todo-comments

Phase-aware TODO comments referencing development plan section (e.g., "TODO: Phase 3+").
