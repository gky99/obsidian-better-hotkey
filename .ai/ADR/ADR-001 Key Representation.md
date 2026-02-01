# ADR-001: Key Representation

**Status:** Accepted

## Context

The plugin needs to represent keyboard input internally. Two fundamental approaches exist: matching by the character the key produces (e.g., `x`, `s`) or by the physical key position (scan-code, e.g., `KeyX`, `KeyS`). The choice affects how bindings behave across different keyboard layouts.

Emacs users expect `C-x` to mean "Ctrl + whatever key produces 'x'" — on a QWERTY layout that's the physical X key, but on AZERTY it's a different position. This is the character-based model.

Some users on non-Latin layouts may prefer bindings tied to physical position instead.

## Decision

Use **character-based matching by default**, with scan-code as an opt-in feature deferred to P2.

## Options Considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| Character-based only | Simple, matches Emacs user expectation | Bindings shift with layout |
| Scan-code only | Consistent physical position across layouts | Unintuitive for Emacs users |
| Both (character default, scan-code opt-in) | Flexible, handles all use cases | Slightly more complex internal representation |

## Consequences

- `KeyPress` stores both `key` (character) and `code` (scan-code), but matching uses `key` by default.
- Scan-code matching can be added later by introducing a `[KeyX]` syntax in config, affecting only the key normalization layer and config parsing. Low coupling.
- Users on non-standard layouts will need to wait for P2 scan-code support or remap at the OS level.
