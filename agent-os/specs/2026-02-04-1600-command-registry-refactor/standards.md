# Standards for CommandRegistry Refactoring

The following standards apply to this work.

---

## architecture/component-folders

**Description**: Organize components by domain context (hotkey-context/, execution-context/)

**Application**: CommandRegistry remains in `src/components/` directory. No structural changes to folder organization.

---

## testing/file-organization

**Description**: Tests in __tests__/ directories at component level, ComponentName.test.ts naming

**Application**:
- Test file stays at `src/components/__tests__/CommandRegistry.test.ts`
- No file moves or renames needed
- Update test content to match new behavior

---

## testing/test-structure

**Description**: Nested describe blocks, beforeEach for test isolation, descriptive test names

**Application**:
- Maintain nested describe blocks for test organization
- Update beforeEach to pass mock App to constructor
- Update test names to accurately describe new behavior:
  - "overwrites duplicate command IDs" → "prevents duplicate registration and returns null"
- Maintain use of vi.fn() for mocks and vi.spyOn() for console interception
- Keep descriptive, action-oriented test names
