# Product Roadmap

## Phase 1: MVP (P0 - Must Have)

**Core functionality required for first usable release:**

- **Key sequences/chords**: Support multi-key sequences (e.g., `C-x C-s`)
- **Kill ring**: Ring buffer with clipboard sync on kill, detection on yank
- **Context system**: Hotkey Context Engine (global singleton), core context keys + evaluation
- **Configuration**: Presets, user overrides, priority resolution (User > Preset > Plugin)
- **Input Handler**: Orchestrator for global keydown → normalize → match → execute pipeline
- **Plugin API**: Commands, hotkeys, context registration — all return Disposable

## Phase 2: Post-MVP (P1)

**Features to add after initial launch:**

- **Plugin context registration**: Allow third-party plugins to register custom context keys
- **Kill ring browser UI**: Modal interface for viewing and selecting kill ring entries
- **Configuration UI**: Display bindings, conflicts, and override relationships

## Phase 3: Enhanced Features (P2 - Nice to Have)

**Quality-of-life improvements and advanced features:**

- **Mark and region selection**: Set mark, extend selection (Emacs-style)
- **Specificity-based priority**: Resolve conflicts using "when" clause specificity
- **Scan-code hotkeys**: Physical key position matching (keyboard layout independent)
- **Consecutive kills**: Append consecutive kill operations as a single entry
- **Import preset**: Import external preset files

## Phase 4: Future Enhancements (P3)

**Long-term feature exploration:**

- **Universal argument (`C-u`)**: Numeric prefix arguments for commands
