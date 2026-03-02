# Test Lint Exclusion

Test files are excluded from ESLint. Separate quality expectations apply.

## What's excluded

- `**/*.test.ts` — test files
- `**/mocks/` — mock implementations

## Why

- Test setup requires `as any` / `as never` for mocking and polyfills (e.g. jsdom lacks Obsidian DOM methods)
- Enforcing production lint rules on test scaffolding creates noise without value
- Tests still benefit from TypeScript type checking via `tsconfig.json`
