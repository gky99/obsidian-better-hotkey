# Standards for InputHandler Scope API Migration

The following standards apply to this work.

---

## testing/test-structure

Nested describe blocks, beforeEach for test isolation, descriptive test names.

Applies because: The InputHandler test file is being substantially rewritten. All new and updated tests must follow nested describe blocks with beforeEach for fresh mock setup.

---

## testing/file-organization

Tests in `__tests__/` directories at component level, `ComponentName.test.ts` naming.

Applies because: The test file `src/components/__tests__/InputHandler.test.ts` already follows this convention and must continue to.

---

## architecture/component-folders

Organize components by domain context (hotkey-context/, execution-context/).

Applies because: InputHandler stays in `src/components/` as a top-level orchestrator, not moved into a subdomain folder.
