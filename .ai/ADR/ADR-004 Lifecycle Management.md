# ADR-004: Lifecycle Management

**Status:** Accepted

## Context

The Plugin API allows third-party plugins to register commands, hotkeys, and context keys at runtime. These registrations must be cleaned up when the registering plugin unloads. Two patterns exist in the ecosystem:

- **VS Code pattern:** Registration returns a `Disposable`. The plugin author pushes it to `context.subscriptions` for automatic cleanup, or calls `.dispose()` manually.
- **Obsidian pattern:** `this.register*` methods accept the plugin instance and tie cleanup to the plugin lifecycle automatically.

## Decision

**Return `Disposable` from all registration methods.** Auto-cleanup scoped to plugin instance is deferred to P2.

## Options Considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| Explicit dispose (return handle) | Fine-grained control, testable, matches VS Code | Leak risk if caller forgets |
| Scoped to plugin instance | Automatic cleanup, matches Obsidian convention | Coarser granularity, coupling to plugin instance |
| Hybrid (both) | Maximum flexibility | Potentially confusing API surface |

## Consequences

- All `register*` methods return `{ dispose(): void }`.
- Third-party authors are responsible for calling `.dispose()` or tracking disposables.
- Adding an auto-cleanup layer later (accepting a plugin instance and managing disposables internally) is purely additive and non-breaking.
- This matches VS Code's pattern, which Obsidian plugin developers are likely familiar with.
