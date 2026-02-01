# Component Folder Organization

Organize components by **domain context**, not by technical layer or feature.

## Structure

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

## Rules

- **Context = separate folder** — Each domain context gets its own subdirectory
- **Root for orchestrators** — Global coordinators live at `src/components/` root
- **No cross-context imports within same level** — `hotkey-context/` should not import from `execution-context/`

## Why

- Reflects domain model separation (each context is a distinct concept)
- Makes dependencies explicit (prevents circular dependencies between contexts)
