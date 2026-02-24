# Standards for Kill & Yank Commands

The following standards apply to this work.

---

## development/string-constants

Define reusable strings as constants, never hard-code.

```typescript
// constants.ts
export const KILL_YANK_COMMANDS = {
  KILL_LINE: "editor:kill-line",
  // ...
} as const;
```

**Rules:**
- Command IDs and context keys must be constants
- Group related constants in objects with `as const`
- Use SCREAMING_SNAKE_CASE for constant names
- Import from `constants.ts`, never duplicate strings

---

## testing/file-organization

Tests use the `__tests__/` directory pattern at component level.

```
src/commands/
├── kill-yank-commands.ts
└── __tests__/
    └── kill-yank-commands.test.ts
```

**Rules:**
- Place test files in `__tests__/` directory at the same level as the component
- Name test files: `ComponentName.test.ts`
- Import from parent directory

---

## testing/test-structure

Structure tests with nested describe blocks:

```typescript
describe('createKillYankCommands', () => {
  let commands: Command[];

  beforeEach(() => {
    commands = createKillYankCommands();
  });

  describe('kill-line', () => {
    it('kills text from cursor to end of line', () => {
      // ...
    });
  });
});
```

**Rules:**
- Group tests by component/method using nested `describe` blocks
- Use `beforeEach` to create fresh instances
- Descriptive test names: what behavior is tested
- One assertion focus per test
