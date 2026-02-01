# Obsidian Emacs-like Hotkey Plugin — Development Plan

## Timeline Overview

**Target:** 2-4 weeks of development effort

| Phase   | Duration    | Focus                                        | Done |
| ------- | ----------- | -------------------------------------------- | ---- |
| Phase 1 | ~1 week     | Core infrastructure + basic hotkey execution |      |
| Phase 2 | ~1 week     | Execution context + configuration system     |      |
| Phase 3 | ~0.5-1 week | Context system + polish                      |      |
| Phase 4 | Ongoing     | Post-MVP features                            |      |

---

## Phase 1: Core Infrastructure

**Goal:** Basic hotkey interception and execution working end-to-end

### 1.1 Project Setup

| Task                                                                                                | Effort | Dependencies | Done |
| --------------------------------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Initialize Obsidian plugin scaffold                                                                 | 0.5d   | —            | done |
| Set up TypeScript config, linting, build                                                            | 0.5d   | —            | done |
| Define shared data types (`KeyPress`, `HotkeyEntry`, `HotkeyPreset`, `Command`, `Disposable`, etc.) | 0.5d   | —            | done |

### 1.2 Hotkey Context Components

Components inside the Hotkey Context group, built individually before the Input Handler wires them together.

| Task                                                                    | Effort | Dependencies            | Done |
| ----------------------------------------------------------------------- | ------ | ----------------------- | ---- |
| Wire Matcher rebuild as onChange callback on Hotkey Manager during init | 0.25d  | Hotkey Manager, Matcher |      |

#### ChordSequenceBuffer

| Task                               | Effort | Dependencies | Done |
| ---------------------------------- | ------ | ------------ | ---- |
| Implement pending state management | 0.25d  | 1.1          |      |
| Implement `append`, `clear`        | 0.5d   | 1.1          |      |
| Implement timeout logic            | 0.5d   | 1.1          |      |
| Test sequence building and timeout | 0.25d  |              |      |

#### Hotkey Manager

| Task                                                       | Effort | Dependencies | Done |
| ---------------------------------------------------------- | ------ | ------------ | ---- |
| Implement source hotkey table (keyed by sequence::command) | 0.5d   | 1.1          |      |
| Implement `insert`, `remove`, `clear`                      | 0.5d   |              |      |
| Implement onChange callback support                        | 0.25d  |              |      |
| Test table operations                                      | 0.25d  |              |      |

#### Hotkey Matcher

| Task                                                    | Effort | Dependencies | Done |
| ------------------------------------------------------- | ------ | ------------ | ---- |
| Define matching table interface (TODO: Trie vs HashMap) | 0.25d  | 1.1          |      |
| Implement Map-based matching table for MVP              | 0.5d   |              |      |
| Implement `match(sequence): MatchResult`                | 0.5d   |              |      |
| Implement `isEscape`, `isChord`, `hasPrefix`            | 0.25d  |              |      |
| Implement rebuild from Hotkey Manager source data       | 0.5d   |              |      |
| Test exact match, prefix match, no match                | 0.5d   |              |      |

#### Status Indicator

| Task                             | Effort | Dependencies | Done |
| -------------------------------- | ------ | ------------ | ---- |
| Create status bar element        | 0.25d  | 1.1          |      |
| Implement `showPending`, `clear` | 0.25d  |              |      |
| Style indicator                  | 0.25d  |              |      |

### 1.3 Hotkey Context Engine (Stub)

| Task                                                  | Effort | Dependencies | Done |
| ----------------------------------------------------- | ------ | ------------ | ---- |
| Implement global singleton with `state` Map           | 0.25d  | 1.1          |      |
| Implement `setContext`, `getContext`, `getAllContext` | 0.25d  |              |      |
| Stub `evaluate(whenClause)` as `() => true`           | 0.25d  |              |      |
| Implement `filter(entries)` using stub evaluation     | 0.25d  |              |      |

### 1.4 Command Registry

| Task                                      | Effort | Dependencies | Done |
| ----------------------------------------- | ------ | ------------ | ---- |
| Implement commands Map                    | 0.25d  | 1.1          |      |
| Implement `registerCommand`, `getCommand` | 0.5d   |              |      |
| Implement `execute(commandId, args)`      | 0.5d   |              |      |
| Implement `loadObsidianCommands`          | 0.5d   |              |      |
| Test command registration and execution   | 0.25d  |              |      |

### 1.5 Input Handler

The main orchestrator. Registers a global `keydown` listener and drives the full pipeline: normalize → buffer → match → execute → suppress.

| Task                                                                                         | Effort | Dependencies  | Done |
| -------------------------------------------------------------------------------------------- | ------ | ------------- | ---- |
| Implement global `keydown` listener registration and teardown                                | 0.5d   | 1.1           |      |
| Implement `normalize(KeyboardEvent): KeyPress`                                               | 0.5d   | 1.1           |      |
| Wire pipeline: normalize → ChordSequenceBuffer → Matcher → Command Registry                  | 0.5d   | 1.2, 1.3, 1.4 |      |
| Wire ChordSequenceBuffer → Status Indicator for pending display                              | 0.25d  | 1.2           |      |
| Implement exact match flow: clear buffer → execute command → update `lastActionWasYank` flag | 0.5d   |               |      |
| Implement prefix match flow: buffer key, show pending, suppress event                        | 0.25d  |               |      |
| Implement no match (chord) flow: clear buffer, suppress event                                | 0.25d  |               |      |
| Implement no match (non-chord) flow: clear buffer, pass through to Obsidian                  | 0.25d  |               |      |
| Implement timeout → clear flow                                                               | 0.25d  |               |      |
| Implement escape → clear flow                                                                | 0.25d  |               |      |
| End-to-end testing with hardcoded hotkeys                                                    | 0.5d   |               |      |

**Phase 1 Total:** ~5-6 days

**Phase 1 Deliverable:** Plugin that intercepts key sequences and executes commands (with hardcoded test hotkeys). The `lastActionWasYank` flag is written to the Hotkey Context Engine after every command execution but not yet consumed.

---

## Phase 2: Execution Context + Configuration

**Goal:** Kill ring working, workspace context for editor operations, configuration loading from files

### 2.1 Workspace Context

Editor operations abstracted through Workspace Context. No separate Editor Interface component.

| Task                                                      | Effort | Dependencies | Done |
| --------------------------------------------------------- | ------ | ------------ | ---- |
| Implement active editor accessor                          | 0.25d  | Phase 1      |      |
| Implement selection operations: has, get, getRange        | 0.5d   |              |      |
| Implement `getTextAtCursor(unit)` for line                | 0.5d   |              |      |
| Implement `deleteRange`, `insertAtCursor`, `replaceRange` | 0.5d   |              |      |
| Implement `isFocused`                                     | 0.25d  |              |      |
| Test editor operations                                    | 0.25d  |              |      |

### 2.2 Kill Ring

System clipboard is accessed directly via `navigator.clipboard` — it's an external API, not an owned component.

| Task                                                                            | Effort | Dependencies | Done |
| ------------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Implement clipboard read/write utilities with permission/error handling         | 0.5d   | Phase 1      |      |
| Implement entries ring buffer with `maxSize`                                    | 0.25d  |              |      |
| Implement `push(text)` with clipboard sync                                      | 0.5d   |              |      |
| Implement `yank()` with external clipboard detection                            | 0.5d   |              |      |
| Implement `yankPop()` with pointer cycling                                      | 0.5d   |              |      |
| Implement `canYankPop()` — reads `lastActionWasYank` from Hotkey Context Engine | 0.25d  |              |      |
| Implement yank range tracking (`setYankRange`, `getYankRange`)                  | 0.25d  |              |      |
| Implement `getEntries()` for future browser UI                                  | 0.25d  |              |      |
| Test kill ring flows                                                            | 0.5d   |              |      |

### 2.3 Kill/Yank Commands

| Task                                                                        | Effort | Dependencies | Done |
| --------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Implement `kill-line` command (uses Workspace Context + Kill Ring)          | 0.5d   | 2.1, 2.2     |      |
| Implement `kill-region` command (if selection)                              | 0.25d  | 2.1, 2.2     |      |
| Implement `yank` command                                                    | 0.5d   | 2.1, 2.2     |      |
| Implement `yank-pop` command (check `lastActionWasYank`, cycle or fallback) | 0.5d   | 2.1, 2.2     |      |
| Register commands with Command Registry                                     | 0.25d  |              |      |
| Test kill/yank flows end-to-end (including yank tracking)                   | 0.5d   |              |      |

### 2.4 Config Loader

| Task                                               | Effort | Dependencies | Done |
| -------------------------------------------------- | ------ | ------------ | ---- |
| Define storage paths                               | 0.25d  | Phase 1      |      |
| Implement `loadSettings`, `saveSettings`           | 0.5d   |              |      |
| Implement `loadHotkeyPreset(name)`                 | 0.5d   |              |      |
| Implement `getAvailableHotkeyPresets`              | 0.25d  |              |      |
| Implement `loadUserOverrides`, `saveUserOverrides` | 0.5d   |              |      |
| Implement `validateHotkeyPreset`                   | 0.25d  |              |      |
| Test file loading/saving                           | 0.25d  |              |      |

### 2.5 Configuration Loading Flow

| Task                                                      | Effort | Dependencies | Done |
| --------------------------------------------------------- | ------ | ------------ | ---- |
| Implement loading order: preset → plugin → user overrides | 0.5d   | 2.4          |      |
| Implement removal syntax (`-command`)                     | 0.25d  |              |      |
| Implement priority resolution in Matcher                  | 0.5d   | 1.2          |      |
| Wire Config Loader to plugin initialization               | 0.25d  |              |      |
| Test configuration loading                                | 0.5d   |              |      |

### 2.6 Default Preset

| Task                                                 | Effort | Dependencies | Done |
| ---------------------------------------------------- | ------ | ------------ | ---- |
| Create `emacs.json` preset with basic Emacs bindings | 1d     | 2.5          |      |
| Test preset loading                                  | 0.25d  |              |      |

**Phase 2 Total:** ~5-6 days

**Phase 2 Deliverable:** Working kill ring with yank/yank-pop (including yank tracking via Hotkey Context Engine), editor operations through Workspace Context, configuration loading from JSON files, default Emacs preset

---

## Phase 3: Context System + Polish

**Goal:** Context system working, plugin API exposed, ready for first release

### 3.1 Hotkey Context Engine (Real Implementation)

| Task                                                                               | Effort | Dependencies | Done |
| ---------------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Implement `when` clause parser (`key`, `!key`, `key && key`, `key \|\| key`, `==`) | 1d     | Phase 2      |      |
| Implement `evaluate(whenClause)` with real logic                                   | 0.5d   |              |      |
| Update `filter(entries)` to use real evaluation                                    | 0.25d  |              |      |
| Test context evaluation                                                            | 0.5d   |              |      |

### 3.2 Workspace Context Sub-Components

Context state capture — these live inside the Execution Context's Workspace Context and update the global Hotkey Context Engine.

| Task                                                                                       | Effort | Dependencies | Done |
| ------------------------------------------------------------------------------------------ | ------ | ------------ | ---- |
| Implement `editorFocused` tracking (focus events on MarkdownView)                          | 0.5d   | 3.1          |      |
| Implement Suggestion Modal Context: patch `SuggestModal` open/close, update context engine | 0.5d   |              |      |
| Implement Popover Suggestions Context: patch `PopoverSuggest` open/close, update context   | 0.5d   |              |      |
| Implement Last Active MarkdownView tracking                                                | 0.5d   |              |      |
| Implement `activeViewType` tracking (workspace events)                                     | 0.5d   |              |      |
| Test context updates                                                                       | 0.5d   |              |      |

### 3.3 Plugin API

| Task                                                                        | Effort | Dependencies | Done |
| --------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Expose `commands.registerCommand`, `commands.getCommands`                   | 0.25d  | Phase 2      |      |
| Expose `hotkeys.registerHotkey`                                             | 0.5d   |              |      |
| Expose `context.declareContext`, `context.setContext`, `context.getContext` | 0.25d  |              |      |
| Implement `Disposable` return for all registration methods                  | 0.25d  |              |      |
| Document API                                                                | 0.5d   |              |      |
| Test third-party registration flow                                          | 0.5d   |              |      |

### 3.4 Hot Update

| Task                                                     | Effort | Dependencies | Done |
| -------------------------------------------------------- | ------ | ------------ | ---- |
| Implement runtime hotkey insertion (plugin registration) | 0.25d  | 3.3          |      |
| Implement runtime hotkey removal (dispose)               | 0.25d  |              |      |
| Test hot update flows                                    | 0.25d  |              |      |

### 3.5 Settings Tab (Basic)

| Task                                | Effort | Dependencies | Done |
| ----------------------------------- | ------ | ------------ | ---- |
| Create settings tab scaffold        | 0.25d  | Phase 2      |      |
| Add preset selection dropdown       | 0.5d   |              |      |
| Add hotkey list display (read-only) | 0.5d   |              |      |
| Style settings tab                  | 0.25d  |              |      |

### 3.6 Polish

| Task                                         | Effort | Dependencies | Done |
| -------------------------------------------- | ------ | ------------ | ---- |
| Error handling and logging                   | 0.5d   | All above    |      |
| Edge case handling (focus loss, rapid input) | 0.5d   |              |      |
| Performance review                           | 0.25d  |              |      |
| README and documentation                     | 0.5d   |              |      |

**Phase 3 Total:** ~4-5 days

**Phase 3 Deliverable:** First release — context-aware hotkeys, kill ring, Plugin API, basic settings UI

---

## Phase 4: Post-MVP (P1/P2/P3)

### P1 Features

| Task                                       | Effort | Dependencies | Done |
| ------------------------------------------ | ------ | ------------ | ---- |
| Kill ring browser UI (modal)               | 1-2d   | Phase 3      |      |
| Configuration UI: add/edit/remove bindings | 2-3d   | Phase 3      |      |
| Configuration UI: show conflicts/overrides | 1d     | P1 Config UI |      |

### P2 Features

| Task                                | Effort | Dependencies | Done |
| ----------------------------------- | ------ | ------------ | ---- |
| Mark and region selection           | 2-3d   | Phase 3      |      |
| Specificity-based priority          | 1-2d   | Phase 3      |      |
| Scan-code hotkeys                   | 1-2d   | Phase 3      |      |
| Consecutive kills appending         | 0.5-1d | Phase 3      |      |
| Import hotkey preset from file      | 0.5-1d | Phase 3      |      |
| Auto-cleanup API (scoped to plugin) | 0.5-1d | Phase 3      |      |

### P3 Features

| Task                       | Effort | Dependencies | Done |
| -------------------------- | ------ | ------------ | ---- |
| Universal argument (`C-u`) | 1-2d   | Phase 3      |      |

---

## Milestone Summary

| Milestone              | Target        | Deliverable                                  |
| ---------------------- | ------------- | -------------------------------------------- |
| M1: Core Working       | End of Week 1 | Key sequences execute commands               |
| M2: Execution + Config | End of Week 2 | Kill ring, workspace context, JSON config    |
| M3: First Release      | End of Week 3 | Context-aware, Plugin API, basic settings UI |
| M4: Enhanced UI        | Week 4+       | Kill ring browser, config editing            |

---

## Risk Register

| Risk                                        | Impact | Likelihood | Mitigation                                               |
| ------------------------------------------- | ------ | ---------- | -------------------------------------------------------- |
| Context detection timing issues             | Medium | Medium     | Test early in Phase 3; fallback to synchronous DOM check |
| Obsidian API limitations for focus tracking | Medium | Low        | Use DOM events as fallback                               |
| Matcher performance with many hotkeys       | Low    | Low        | Defer optimization; Map-based is sufficient for MVP      |
| Clipboard permission issues in browser      | Medium | Low        | Handle gracefully; inform user                           |
| Third-party plugin conflicts                | Medium | Medium     | Priority system ensures user control                     |

---

## Dependencies Graph

```
Phase 1:
  1.1 Project Setup
    ├── 1.2 Hotkey Context Components
    │     ├── ChordSequenceBuffer
    │     ├── Hotkey Matcher + Hotkey Manager
    │     └── Status Indicator
    ├── 1.3 Hotkey Context Engine (Stub)
    └── 1.4 Command Registry

  1.2, 1.3, 1.4
    └── 1.5 Input Handler (orchestrates all of the above)

Phase 2:
  Phase 1
    ├── 2.1 Workspace Context (editor operations)
    └── 2.4 Config Loader

  2.1
    └── 2.2 Kill Ring (also uses clipboard external API)
      └── 2.3 Kill/Yank Commands

  2.4
    └── 2.5 Configuration Loading Flow
      └── 2.6 Default Preset

Phase 3:
  Phase 2
    ├── 3.1 Hotkey Context Engine (Real)
    │     └── 3.2 Workspace Context Sub-Components
    ├── 3.3 Plugin API
    │     └── 3.4 Hot Update
    ├── 3.5 Settings Tab
    └── 3.6 Polish
```

---

## Daily Checklist Template

```markdown
### Day N — [Date]

**Focus:** [Phase X.Y — Component Name]

**Tasks:**

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**Blockers:**

- (none)

## **Notes:**
```

---

## Unassigned Tasks

| Task                                                                                    | Effort | Dependencies | Done |
| --------------------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Support custom hotkey to synthesize escape event (e.g., `C-g` triggers escape behavior) | 0.5d   | 1.2          |      |
