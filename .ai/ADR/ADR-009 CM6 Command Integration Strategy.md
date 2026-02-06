# ADR-009: CM6 Command Integration Strategy

**Status:** Accepted

## Context

The plugin implements 29 Emacs editor commands (cursor movement, kill/yank, case transformation, etc.) that operate on the editor. Obsidian uses CodeMirror 6 internally, and the `@codemirror/commands` package provides well-tested command functions for many common editor operations. We need to decide how our commands interact with CM6.

Key considerations:

1. **CM6 built-in quality**: CM6 command functions handle bidi text, wrapped lines, multiple cursors, goal column preservation, atomic ranges, and undo grouping — edge cases that are costly to rediscover and reimplement.
2. **Kill Ring integration**: Some commands must capture deleted text before removal to push it to the Kill Ring. CM6's built-in delete commands discard the text, making them unsuitable for kill operations.
3. **EditorView access**: Obsidian exposes CM6's `EditorView` via `(editor as any).cm`, an undocumented but widely-used pattern. Obsidian re-exports `@codemirror/*` modules internally, ensuring version compatibility.

## Decision

Editor commands use two strategies:

### Strategy 1: CM6 Direct Call (15 commands)

For commands that map 1:1 to CM6 built-in functions, we call the CM6 function directly. Our code is thin glue: get the `EditorView`, call the function.

**Applies to:** Cursor movement (12 commands) and basic editing (3 commands).

| Our Command             | CM6 Function           |
| ----------------------- | ---------------------- |
| `forward-char`          | `cursorCharForward`    |
| `backward-char`         | `cursorCharBackward`   |
| `next-line`             | `cursorLineDown`       |
| `previous-line`         | `cursorLineUp`         |
| `move-beginning-of-line`| `cursorLineStart`      |
| `move-end-of-line`      | `cursorLineEnd`        |
| `forward-word`          | `cursorGroupForward`   |
| `backward-word`         | `cursorGroupBackward`  |
| `scroll-up`             | `cursorPageDown`       |
| `scroll-down`           | `cursorPageUp`         |
| `beginning-of-buffer`   | `cursorDocStart`       |
| `end-of-buffer`         | `cursorDocEnd`         |
| `delete-char`           | `deleteCharForward`    |
| `transpose-chars`       | `transposeChars`       |
| `open-line`             | `splitLine`            |

**Why direct call is better than custom**: CM6 functions are optimized for CM6's internal state representation and handle all edge cases (bidi, soft-wrapped lines, atomic ranges, multiple cursors). Reimplementing this logic would be error-prone and redundant.

### Strategy 2: Custom Implementation with CM6 Helpers (14 commands)

For commands that need Kill Ring integration, case transformation, or plugin state management, we implement custom logic. However, we reuse CM6 selection commands (`selectGroupForward`, `selectGroupBackward`) as helpers for computing word ranges rather than reimplementing word boundary detection.

**Pattern for kill-word commands:**
1. Use `selectGroupForward`/`selectGroupBackward` to compute the word range
2. Capture the text in that range
3. Push to Kill Ring
4. Dispatch deletion of the range

**Applies to:** Kill/yank (7), case transformation (4), control (3).

### EditorView Access

Access the CM6 `EditorView` from an Obsidian `Editor` instance:

```typescript
const editorView = (editor as any).cm as EditorView;
```

Obsidian internally redirects `require('@codemirror/...')` calls to its own bundled CM6 instances. We must NOT bundle a separate CM6 version — we use Obsidian's re-exported modules via `@codemirror/commands`, `@codemirror/view`, and `@codemirror/state` as external dependencies.

## Options Considered

| Option                           | Pros                                      | Cons                                                        |
| -------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| CM6 Direct Call + Custom helpers | Correct, efficient, reuses CM6 edge cases | Depends on undocumented EditorView access                   |
| Obsidian `editor.exec()`        | Official API                              | Only 17 commands; no word movement, case, kill              |
| Full custom implementation       | No CM6 dependency                         | Must rediscover bidi, wrapped lines, multiple cursor logic  |
| CM6 `emacsStyleKeymap`          | Zero implementation effort                | Only 13 bindings; no kill ring, case, mark, or chord support|

## Consequences

- All 15 CM6 Direct Call commands are thin wrappers — minimal code, high correctness
- Kill-word commands reuse CM6's word boundary logic via selection commands
- Case transformation commands use `view.dispatch()` + `changeByRange()` for in-place text transformation
- Plugin depends on `@codemirror/commands`, `@codemirror/view`, `@codemirror/state` as external dependencies (provided by Obsidian)
- EditorView access pattern `(editor as any).cm` is undocumented but stable and widely used across the Obsidian plugin ecosystem
