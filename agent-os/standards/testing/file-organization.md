# Test File Organization

Tests use the `__tests__/` directory pattern at component level.

```
src/components/
├── hotkey-context/
│   ├── HotkeyManager.ts
│   ├── ChordSequenceBuffer.ts
│   └── __tests__/
│       ├── HotkeyManager.test.ts
│       └── ChordSequenceBuffer.test.ts
```

**Rules:**
- Place test files in `__tests__/` directory at the same level as the component
- Name test files: `ComponentName.test.ts`
- Mirror the component structure within `__tests__/`
- Import from parent directory: `import { Component } from '../Component'`

**Why:** Follows Jest/Vitest convention for automatic test discovery
