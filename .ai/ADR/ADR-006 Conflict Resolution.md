# ADR-006: Conflict Resolution

**Status:** Accepted

## Context

Multiple hotkey entries can be bound to the same key sequence. This happens when different sources (user, preset, plugin) bind the same key, or when the same key is bound to different commands with different "when" context conditions.

The system needs clear rules for which binding fires and which is silently ignored.

## Decision

Use **priority stacking with context coexistence**: bindings with different `when` clauses coexist and are filtered at match time; bindings with the same key + context are resolved by source priority.

## Resolution Rules

| Scenario | Resolution |
| -------- | ---------- |
| Same key, different `when` contexts | Coexist — context evaluation at match time picks the applicable one |
| Same key, same context, different priority | Higher priority source wins (User > Preset > Plugin) |
| Same key, same context, same priority | First registered wins |

## Consequences

- Bindings are never silently dropped — lower-priority bindings remain registered as "shadowed" and re-activate if the overriding binding is removed.
- The configuration UI should surface shadowed bindings so users understand why a binding isn't firing.
- Context-differentiated bindings (e.g., `C-n` for `next-line` when `editorFocused`, `C-n` for `suggestion:next` when `suggestionModalRendered`) are the intended design pattern for context-aware hotkeys.
- Specificity-based priority within the same source tier (more `when` conditions = higher specificity) is deferred to P2.
