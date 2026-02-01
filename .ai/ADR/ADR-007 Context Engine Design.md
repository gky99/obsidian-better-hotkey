# ADR-007: Hotkey Context Engine Design

**Status:** Accepted

## Context

The plugin needs to evaluate conditions on hotkey bindings at match time — for example, a binding that only fires when the editor is focused and no modal is open. This is the "when" clause system, inspired by VS Code's `when` clause context.

The engine must track a set of context key-value pairs (updated by various workspace observers) and evaluate boolean expressions against them. Because it is consumed by nearly every component — the Matcher for filtering, the Status Indicator for display logic, and command actions for reading/writing state — it must be globally accessible rather than scoped to a single context group.

## Decision

Implement a **global singleton Hotkey Context Engine**: a key-value state map with a simple expression evaluator. The evaluation implementation can be swapped later without affecting the rest of the system. The engine lives outside both the Hotkey Context and the Execution Context because it has interactions with components in both groups.

### "When" Clause Syntax (MVP)

| Syntax | Example | Description |
| ------ | ------- | ----------- |
| `key` | `editorFocused` | True if key is truthy |
| `!key` | `!suggestionModalRendered` | Negation |
| `key && key` | `editorFocused && !suggestionModalRendered` | Logical AND |
| `key \|\| key` | `suggestionModalRendered \|\| popoverSuggestionRendered` | Logical OR |
| `key == "value"` | `activeViewType == "editor"` | Equality comparison |

Operator precedence: `!` > `&&` > `||`. Parentheses support deferred to P2.

### Core Context Keys (MVP)

| Key | Type | Source |
| --- | ---- | ------ |
| `editorFocused` | `boolean` | Focus events on markdown editor |
| `suggestionModalRendered` | `boolean` | Patching `SuggestModal.open/close` |
| `popoverSuggestionRendered` | `boolean` | Patching `PopoverSuggest.open/close` |
| `activeViewType` | `string` | Workspace `active-leaf-change` event |

## Consequences

- The engine is initialized once at plugin load and accessible globally by all components.
- Context state is updated by specialized sub-components within the Execution Context's Workspace Context (Suggestion Modal Context, Popover Suggestions Context, Last Active MarkdownView) that observe Obsidian workspace events or patch Obsidian classes.
- Third-party plugins can declare and update custom context keys via the Plugin API (P1).
- The evaluator starts as a simple string parser. It can be replaced with a proper tokenizer/AST if complexity grows (parentheses, nested expressions), without changing the public API.
- Context values are stored as `Map<string, unknown>` — typed schemas (`ContextSchema`) are available for validation and future autocomplete in the config UI.
