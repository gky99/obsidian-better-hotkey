# References for InputHandler handleKey Patch

## Similar Implementations

### ADR-005 Event Interception Strategy

- **Location:** `.ai/ADR/ADR-005 Event Interception Strategy.md`
- **Relevance:** Documents the original decision to use Obsidian's Scope API and the rationale for intercepting inside Obsidian's event pipeline
- **Key patterns:** Scope lifecycle (`pushScope`/`popScope`), return-value semantics (`false` for suppress, `undefined` for pass through)

### Original Scope API Migration Spec

- **Location:** `agent-os/specs/2026-02-24-input-handler-scope-api/`
- **Relevance:** The spec this work supersedes — documents the pushScope-based approach
- **Key patterns:** Catch-all handler `scope.register(null, null, handler)`, auto-cleanup via `plugin.register()`

### Experimental handleKey Patch (Current Code)

- **Location:** `src/components/InputHandler.ts` lines 59-74
- **Relevance:** Proof-of-concept showing `Scope.prototype.handleKey` patching works
- **Key patterns:** Save original → patch prototype → check `this === keymap.scope` → restore on cleanup
