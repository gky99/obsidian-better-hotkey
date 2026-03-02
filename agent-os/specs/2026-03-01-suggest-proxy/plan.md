# SuggestProxy — Proxy for Obsidian's PopoverSuggest & SuggestModal

## Context

The plugin needs to know when a `SuggestModal` or `PopoverSuggest` is open so hotkeys can be context-aware (e.g., suppress Emacs-style bindings inside suggestion dropdowns). `WorkspaceContext.ts` already has deferred TODOs (lines 7-8) for this exact feature. The approach monkey-patches `open`/`close` on both prototypes to capture/clear instance references and set boolean context keys on `ContextEngine`.

**Reference implementation:** `/Users/gky/Documents/obsidian-test-playground/.obsidian/plugins/obsidian-quick-select/src/main.ts` — same patching pattern, but inlined in the Plugin class.

---

## Task 1: Create worktree

Use `/using-git-worktrees` to create an isolated worktree for this feature branch.

## Task 2: Save spec documentation

Create `agent-os/specs/2026-03-01-suggest-proxy/` with:
- `plan.md` — this plan
- `shape.md` — shaping decisions from our conversation
- `standards.md` — applicable standards
- `references.md` — pointer to obsidian-quick-select reference

## Task 3: Add context key constants

**File:** `src/constants.ts`

Add to `CONTEXT_KEYS`:
```typescript
SUGGEST_MODAL_OPEN: 'suggestModalOpen',
POPOVER_SUGGEST_OPEN: 'popoverSuggestOpen',
```

## Task 4: Add obsidian mocks for tests

**File:** `tests/mocks/obsidian.ts`

Add minimal `SuggestModal` and `PopoverSuggest` mock classes with `open()` and `close()` stubs.

## Task 5: Create SuggestModalProxy class

**File:** `src/components/execution-context/SuggestModalProxy.ts` (new, ~60 lines)

### Class design

```
SuggestModalProxy
├── constructor()             — saves original SuggestModal.prototype.open/close
├── patch()                   — patches SuggestModal prototypes, initializes context key to false
├── restore()                 — restores SuggestModal prototypes, clears ref, resets context key
└── getActiveInstance()       — returns captured SuggestModal instance or null
```

### Patching logic

- **`open` patch**: call original via `.apply(this, args)` in `try`, capture `this` and set `suggestModalOpen` to `true` in `finally`
- **`close` patch**: call original via `.apply(this, args)` in `try`, clear reference and set `suggestModalOpen` to `false` in `finally`
- `try/finally` ensures context is always updated even if the original throws
- `patch()` / `restore()` are idempotent via a `patched` boolean guard

## Task 6: Create PopoverSuggestProxy class

**File:** `src/components/execution-context/PopoverSuggestProxy.ts` (new, ~60 lines)

### Class design

```
PopoverSuggestProxy
├── constructor()             — saves original PopoverSuggest.prototype.open/close
├── patch()                   — patches PopoverSuggest prototypes, initializes context key to false
├── restore()                 — restores PopoverSuggest prototypes, clears ref, resets context key
└── getActiveInstance()       — returns captured PopoverSuggest instance or null
```

### Patching logic

Same pattern as SuggestModalProxy but for `PopoverSuggest` and the `popoverSuggestOpen` context key.

## Task 7: Write tests for both proxies

**Files:**
- `src/components/execution-context/__tests__/SuggestModalProxy.test.ts` (new)
- `src/components/execution-context/__tests__/PopoverSuggestProxy.test.ts` (new)

Test groups (for each proxy):
- **constructor** — saves originals, does not patch yet
- **patch** — replaces prototype methods, initializes context key, idempotent
- **open/close cycle** — open captures instance + sets context, close clears + resets context, original-throws still updates context
- **restore** — restores originals, clears ref, resets context, idempotent
- **edge cases** — restore before patch is no-op

Pattern: `Object.create(SuggestModal.prototype)` / `Object.create(PopoverSuggest.prototype)` to create fake instances.

### Key decisions
- Full object instance captured (not just DOM element) — enables future features
- Separate context keys (`suggestModalOpen`, `popoverSuggestOpen`) — independent targeting in `when` clauses
- Single-reference tracking (not ref-counted) — sufficient for boolean context; upgradeable to `Set` later if needed

## Task 8: Wire into plugin lifecycle

**File:** `src/main.ts`
- Import `SuggestModalProxy` and `PopoverSuggestProxy`
- Add properties for both proxies
- In `onload()`: create and `patch()` both before `InputHandler.start()`
- In `onunload()`: call `restore()` on both

**File:** `src/components/index.ts`
- Add re-exports for both classes in the Execution Context section

## Task 9: Update WorkspaceContext documentation

**File:** `src/components/execution-context/WorkspaceContext.ts`
- Replace deferred TODO comment with reference to `SuggestModalProxy.ts` and `PopoverSuggestProxy.ts`

---

## Verification

1. `pnpm test` — all existing tests pass, new proxy tests pass
2. `pnpm build` — compiles without errors
3. Manual: load plugin in Obsidian, open command palette (SuggestModal) → check `suggestModalOpen` context key is true. Close → false. Open editor autocomplete (PopoverSuggest) → check `popoverSuggestOpen` is true. Close → false.

## Files changed

| File | Action |
|------|--------|
| `agent-os/specs/2026-03-01-suggest-proxy/*` | Create (spec docs) |
| `src/constants.ts` | Modify (add 2 context keys) |
| `tests/mocks/obsidian.ts` | Modify (add 2 mock classes) |
| `src/components/execution-context/SuggestModalProxy.ts` | Create |
| `src/components/execution-context/PopoverSuggestProxy.ts` | Create |
| `src/components/execution-context/__tests__/SuggestModalProxy.test.ts` | Create |
| `src/components/execution-context/__tests__/PopoverSuggestProxy.test.ts` | Create |
| `src/main.ts` | Modify (lifecycle wiring) |
| `src/components/index.ts` | Modify (re-exports) |
| `src/components/execution-context/WorkspaceContext.ts` | Modify (comment update) |
