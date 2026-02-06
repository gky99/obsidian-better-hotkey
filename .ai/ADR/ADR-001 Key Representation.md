# ADR-001: Key Representation

**Status:** Accepted

## Context

The plugin needs to represent keyboard input internally. Two fundamental approaches exist: matching by the character the key produces (e.g., `x`, `s`) or by the physical key position (scan-code, e.g., `KeyX`, `KeyS`). The choice affects how bindings behave across different keyboard layouts.

Emacs users expect `C-x` to mean "Ctrl + whatever key produces 'x'" — on a QWERTY layout that's the physical X key, but on AZERTY it's a different position. This is the character-based model.

Some users on non-Latin layouts may prefer bindings tied to physical position instead.

## Decision

Use **character-based matching by default**, with scan-code as an opt-in feature deferred to P2.

## Update: Layout-Aware Normalization (ADR-008)

The original decision remains valid, but is refined by [ADR-008](ADR-008%20Keyboard%20Layout%20Normalization.md):

- **Key matching** still uses the character representation, but the character is now **derived from the physical key code** via the Keyboard Layout Service
- **KeyPress.key** contains the base character from the user's keyboard layout (not the raw `event.key`)
- **KeyPress.code** is used as input to the layout translation, not for direct matching
- This approach maintains Emacs-style character semantics while ensuring correct behavior across layouts and OS platforms

## Options Considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| Character-based only | Simple, matches Emacs user expectation | Bindings shift with layout |
| Scan-code only | Consistent physical position across layouts | Unintuitive for Emacs users |
| Both (character default, scan-code opt-in) | Flexible, handles all use cases | Slightly more complex internal representation |

## Consequences

- `KeyPress` stores both `key` (layout-normalized character) and `code` (physical key code)
- Matching uses the layout-normalized `key` value
- The Keyboard Layout Service translates `code` → `key` at input time
- Scan-code matching can still be added later as an opt-in feature
- Number keys in presets are translated to layout-specific base characters
- Symbols not available as base keys on a layout are silently skipped
