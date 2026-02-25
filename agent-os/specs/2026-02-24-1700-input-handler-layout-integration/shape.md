# Input Handler Layout Integration — Shaping Notes

## Scope

Integrate the Keyboard Layout Service (task 2.7) into the hotkey pipeline. The system uses physical key codes for matching instead of character-based matching.

## Decisions

- Matching uses `KeyPress.code` (physical key code), not `KeyPress.key`
- `KeyPress.key` is populated by layout service for display only (status indicator)
- HotkeyManager translates config characters to physical codes at load time
- Layout change triggers ConfigManager.loadAll() to re-translate codes
- No constructor injection for layout service — import singleton directly
- HotkeyManager composite key stays character-based for dedup (preserves distinct config entries)
- SPECIAL_KEY_CODE_MAP needed for keys not in layout service (Space, Escape, etc.)

## Context

- **Visuals:** None
- **References:** Keyboard Layout Service (task 2.7), ADR-008, ADR-010
- **Product alignment:** N/A

## Standards Applied

- ADR-001 updated to reflect code-based matching
- ADR-008 Keyboard Layout Normalization (guides the design)
- ADR-010 Keyboard Layout Translation Timing (config stays layout-independent)
