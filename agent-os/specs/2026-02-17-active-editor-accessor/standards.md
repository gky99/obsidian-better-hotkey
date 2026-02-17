# Standards for Active Editor Accessor

The following standards apply to this work.

---

## architecture/component-folders

Organize components by **domain context**, not by technical layer or feature.

### Structure

```
src/components/
├── index.ts              # Root: Global orchestrators
├── InputHandler.ts
├── ContextEngine.ts
├── hotkey-context/       # Hotkey processing domain
│   ├── HotkeyManager.ts
│   ├── ChordSequenceBuffer.ts
│   └── ...
└── execution-context/    # Command execution domain
    ├── KillRing.ts
    └── ...
```

### Rules

- **Context = separate folder** — Each domain context gets its own subdirectory
- **Root for orchestrators** — Global coordinators live at `src/components/` root
- **No cross-context imports within same level** — `hotkey-context/` should not import from `execution-context/`

---

## testing/file-organization

Tests use the `__tests__/` directory pattern at component level.

### Rules

- Place test files in `__tests__/` directory at the same level as the component
- Name test files: `ComponentName.test.ts`
- Mirror the component structure within `__tests__/`
- Import from parent directory: `import { Component } from '../Component'`

---

## testing/test-structure

Structure tests with nested describe blocks.

### Rules

- Group tests by component/method using nested `describe` blocks
- Use `beforeEach` to create fresh instances — prevents test pollution
- Use descriptive test names: what behavior is tested, not generic "works"
- One assertion focus per test
- **Critical:** Tests must not share state. Each test gets fresh instances via `beforeEach`.
