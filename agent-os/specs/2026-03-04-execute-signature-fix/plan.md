# Plan: Fix Command.execute Signature

See main plan at: `/Users/gky/.claude/plans/iridescent-meandering-sundae.md`

## Summary

Change `Command.execute(args?, context?, event?)` to `Command.execute(context, event, args?)` in `src/types.ts`, then propagate throughout all implementations, callers, and tests.

## Key changes
1. `src/types.ts` — interface change
2. `src/components/CommandRegistry.ts` — signature + call order
3. `src/components/InputHandler.ts` — call order
4. 6 command implementation files — parameter reorder
5. 7 test files + 1 e2e test — call site updates
6. `.ai/Architecture.md` — doc update
