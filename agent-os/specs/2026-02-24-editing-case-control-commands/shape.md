# Editing, Case Transformation & Control Commands — Shaping Notes

## Scope

Implement 10 editor commands from Dev Plan tasks 2.3.3, 2.3.4, and 2.3.5:
- 3 basic editing commands (CM6 direct call)
- 4 case transformation commands (custom via `view.dispatch`)
- 3 control commands (custom / Obsidian API delegation)

## Decisions

- **Constants grouping**: Basic editing + case transform merged into `EDITING_COMMANDS`. Control gets `CONTROL_COMMANDS`.
- **File organization**: `editing-commands.ts` (7 commands) + `control-commands.ts` (3 commands)
- **Meta vs Alt**: All meta-style hotkeys use `alt` modifier in key() helper
- **keyboard-quit**: Only clears selection + resets context state. Chord buffer already cleared by InputHandler exact-match flow.
- **Case word boundary**: Finds full word under cursor (both directions). If at whitespace, finds next word forward.
- **recenter-top-bottom**: Cycle state stored in ContextEngine as context key. Reset by InputHandler after any non-recenter command.
- **undo**: Delegates to Obsidian `editor.undo()`, not CM6 undo.

## Context

- **Visuals:** None (text-editing commands, no UI)
- **References:** `cursor-commands.ts` for CM6 direct-call pattern
- **Product alignment:** Phase 2 of the Emacs-like hotkey plugin roadmap
