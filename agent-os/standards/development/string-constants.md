# String Constants

Define reusable strings as constants, never hard-code.

```typescript
// constants.ts
export const COMMAND_NAMES = {
  YANK: "editor:yank",
  YANK_POP: "editor:yank-pop",
} as const;

export const CONTEXT_KEYS = {
  LAST_ACTION_WAS_YANK: "lastActionWasYank",
} as const;

// Usage
import { COMMAND_NAMES, CONTEXT_KEYS } from "../../constants";

if (command === COMMAND_NAMES.YANK) { ... }
contextEngine.getContext(CONTEXT_KEYS.LAST_ACTION_WAS_YANK);
```

**Rules:**
- Command IDs, context keys, and shared identifiers must be constants
- Group related constants in objects with `as const`
- Use SCREAMING_SNAKE_CASE for constant names
- Import from `constants.ts`, never duplicate strings

**Exceptions:**
- One-off UI strings (error messages, labels)
- Test-specific data
- Local scope strings not shared

**Why:** Type safety, autocomplete, single source of truth, prevents typo bugs
