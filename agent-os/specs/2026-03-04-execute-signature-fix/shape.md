# Command.execute Signature Fix — Shaping Notes

## Scope

Fix the `Command.execute` method signature in `src/types.ts`. Currently:
- `args` is first parameter (but least important)
- All three params are optional, misrepresenting the runtime contract

Corrected signature: `execute(context: ExecutionContext, event: KeyboardEvent, args?: Record<string, unknown>)`

## Decisions

- `context` and `event` are required (non-optional) — they're always available at the call site (InputHandler)
- `args` is optional — hotkey bindings may or may not configure args
- `args` moves to last position — TypeScript requires required params before optional
- `CommandRegistry.execute` is also updated to require context and event for consistency
- All implementations and call sites updated to match new parameter order

## Context

- **Visuals:** None
- **References:** `src/components/CommandRegistry.ts`, `src/components/InputHandler.ts`, all `src/commands/*.ts` files
- **Product alignment:** N/A — internal type correctness fix
