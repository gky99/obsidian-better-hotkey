# ADR-002: Configuration Priority

**Status:** Accepted

## Context

Hotkey bindings come from three sources: built-in presets, third-party plugin registrations, and user customizations. When multiple sources define a binding for the same key + context, the system needs a deterministic resolution order.

Users must always have final say over their keybindings. Presets define the baseline experience. Third-party plugins contribute defaults that should not override either the user or the selected preset.

## Decision

Use a **three-tier priority system**: User > Preset > Plugin, with conflict stacking.

## Options Considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| Last-write wins | Simple implementation | Unpredictable when plugins load in different order |
| Strict conflict rejection | Clear error messages | Frustrating UX, common cases fail |
| Priority stacking | Predictable, user always has control | Slightly more complex resolution logic |

## Consequences

- User customizations are never overridden by preset updates or plugin registrations.
- Shadowed bindings (lower priority overridden by higher) remain registered but inactive, allowing them to re-activate if the overriding binding is removed.
- The `HotkeyEntry` carries a `priority` field that is assigned at registration time based on source (not serialized to config files).
- User overrides support a removal syntax (`-command` prefix) to explicitly unbind preset/plugin hotkeys.
