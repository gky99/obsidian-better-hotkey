# Context Key Expression System — Dev Plan Task 3.1

## Context

The ContextEngine currently has a stub `evaluate()` that always returns `true`, meaning all "when" clauses are ignored. Task 3.1 implements the real expression parser and evaluator so hotkeys with context conditions (e.g., `editorFocused && !suggestionModalRendered`) are correctly filtered based on runtime state.

## Scope

- Define `ContextKeyExpression` AST type hierarchy
- Implement tokenizer + recursive descent parser (`deserialize()`)
- Operators: `key`, `!key`, `&&`, `||`, `==`, `!=` — precedence: `!` > `&&` > `||`
- Parentheses supported in parsing (no separate AST node — they only affect grouping)
- ConfigManager pre-parses `when` → `whenExpr` at load time
- Keep `when` (raw string) alongside `whenExpr` for Settings UI
- When no `when` clause is specified, default to a "true" expression (so `whenExpr` is always defined)
- Invalid expressions → evaluate to `false` (safe default) + console.warn
- Specificity: Skip for now — rely on existing Priority enum + declaration order (matches VSCode approach)
- Reuse existing `getContext()` method on ContextEngine (no separate `IContextKeyService` interface)

## Implementation Tasks

1. Create worktree
2. Save spec documentation
3. Create `src/components/context-key-expression.ts` — types, tokenizer, parser, deserialize()
4. Write expression tests
5. Modify `src/types.ts` — add whenExpr field
6. Modify `src/components/ContextEngine.ts` — real evaluate()
7. Update ContextEngine tests
8. Modify `src/components/ConfigManager.ts` — call deserialize()
9. Modify `src/components/hotkey-context/HotkeyManager.ts` — pass whenExpr
10. Update ConfigManager and HotkeyManager tests
11. Full test suite + verification

## Key Files

| File                                                      | Action                        |
| --------------------------------------------------------- | ----------------------------- |
| `src/components/context-key-expression.ts`                | **NEW**                       |
| `src/components/__tests__/context-key-expression.test.ts` | **NEW**                       |
| `src/types.ts`                                            | MODIFY — add `whenExpr` field |
| `src/components/ContextEngine.ts`                         | MODIFY — real evaluate()      |
| `src/components/__tests__/ContextEngine.test.ts`          | MODIFY — real eval tests      |
| `src/components/ConfigManager.ts`                         | MODIFY — call deserialize()   |
| `src/components/__tests__/ConfigManager.test.ts`          | MODIFY — whenExpr tests       |
| `src/components/hotkey-context/HotkeyManager.ts`          | MODIFY — pass whenExpr        |
