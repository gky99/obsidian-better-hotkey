# Product Mission

## Problem

Obsidian lacks a unified, global hotkey management system. Instead, each UI context (editor, suggestion modals, popovers, etc.) manages its own hotkeys internally. This creates several problems:

- **No cross-context customization**: Users cannot customize hotkeys within specific contexts like suggestion modals, popovers, or other UI states
- **No key sequence support**: Chord bindings (e.g., `C-x C-s`, `C-c C-c`) are not supported anywhere
- **Fragmented hotkey handling**: Different parts of the UI respond to keyboard input independently, making it impossible to create consistent, context-aware keybinding schemes
- **No extensibility**: Third-party plugins cannot register hotkeys programmatically with context awareness
- **Missing kill ring**: No built-in kill ring functionality with clipboard integration

Users who want Emacs-like editing capabilities or simply want to customize hotkeys across all Obsidian UI contexts are blocked by this fragmented architecture.

## Target Users

- Power users familiar with Emacs keybinding conventions
- Users who want to customize hotkeys in suggestion modals, popovers, and other UI contexts
- Plugin developers who need to register custom hotkeys programmatically
- Anyone seeking consistent, context-aware keyboard control across all of Obsidian

## Solution

A global, Emacs-like hotkey system for Obsidian that provides:

- **Global hotkey management**: Single interception point that handles keyboard input across all Obsidian contexts (editor, modals, popovers, etc.)
- **Context-aware activation**: Hotkeys that activate based on UI state, editor context, and custom conditions (VS Code-style "when" clauses)
- **Key sequences**: Support multi-key chord bindings (up to 2 keypresses)
- **Kill ring**: Ring buffer for killed text with system clipboard synchronization
- **Extensible API**: Third-party plugins can register commands, hotkeys, and custom context keys
- **Priority-based configuration**: User overrides > Presets > Plugin registrations

The system acts as a complete replacement for Obsidian's fragmented hotkey handling, providing centralized, customizable keyboard control across all contexts.
