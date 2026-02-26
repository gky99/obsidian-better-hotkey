# Context Key Expression System — Shaping Notes

## Scope

Replace the stub `evaluate()` in ContextEngine with a real expression parser and evaluator for "when" clauses. The system parses raw string expressions (e.g., `"editorFocused && !suggestionModalRendered"`) into an AST that evaluates against runtime context state.

## Decisions

- **ContextReader interface** matches ContextEngine's existing `getContext()` — no new interface needed on ContextEngine
- **Factory functions, not classes** — lightweight objects conforming to discriminated union types
- **whenExpr always defined** — defaults to TrueExpr when no `when` clause; eliminates null checks throughout pipeline
- **`when` string preserved** alongside `whenExpr` for future Settings UI display
- **Invalid expressions evaluate to false** — safe default prevents accidental hotkey activation
- **Parentheses supported in parser** — no separate AST node, they only affect grouping during parsing
- **Specificity deferred** — rely on Priority enum + declaration order (matches VSCode approach)
- **Two-pass parser** (tokenize then parse) — cleaner separation, easier to extend

## Context

- **Visuals:** None
- **References:** VSCode contextkey.ts (expression type hierarchy, evaluate pattern)
- **Product alignment:** Enables Phase 3.2 workspace context sub-components

## Standards Applied

- architecture/component-folders — new expression module at `src/components/` root level
- testing/file-organization — tests in `__tests__/` with `context-key-expression.test.ts`
- testing/test-structure — nested describe blocks, beforeEach isolation
- development/string-constants — context keys as constants
- development/git-worktree-workflow — worktree isolation for implementation
