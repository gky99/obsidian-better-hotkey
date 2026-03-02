# Standards for SuggestProxy

The following standards apply to this work.

---

## architecture/component-folders

Organize components by **domain context**, not by technical layer or feature.

- **Context = separate folder** — Each domain context gets its own subdirectory
- **Root for orchestrators** — Global coordinators live at `src/components/` root
- **No cross-context imports within same level**

**Application:** SuggestModalProxy and PopoverSuggestProxy go in `src/components/execution-context/`

---

## development/string-constants

Command IDs and context keys as constants with `as const`, never hard-code.

- Group related constants in objects with `as const`
- Use SCREAMING_SNAKE_CASE for constant names
- Import from `constants.ts`, never duplicate strings

**Application:** `SUGGEST_MODAL_OPEN` and `POPOVER_SUGGEST_OPEN` added to `CONTEXT_KEYS` in `src/constants.ts`

---

## testing/file-organization

Tests in `__tests__/` directories at component level, `ComponentName.test.ts` naming.

**Application:** Test files at `src/components/execution-context/__tests__/SuggestModalProxy.test.ts` and `PopoverSuggestProxy.test.ts`

---

## testing/test-structure

Nested describe blocks, beforeEach for test isolation, descriptive test names.

**Application:** Each test file uses nested describes for constructor/patch/open-close/restore/edge-cases, with beforeEach creating fresh proxy instances.
