# Architecture

## 1. Overview

This plugin provides an Emacs-like hotkey system for Obsidian with context-aware keybinding management, key sequence support, and kill ring functionality.

### Goals

- Replace the limited built-in Obsidian hotkey manager
- Support key sequences (e.g., `C-x C-s`, `C-c C-c`)
- Context-based hotkey activation ("when" clauses, VS Code-style)
- Kill ring with system clipboard integration
- Extensible plugin API for third-party integration

### Non-Goals

- Modal editing states (Vim-style)
- Kill ring persistence across sessions

---

## 2. System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Global                                     │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Hotkey Context Engine │  │ Command Registry │  │ Input Handler │  │
│  └───────────────────────┘  └──────────────────┘  └───────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
         │                            │                     │
         │  ┌─────────────────────────┼─────────────────────┘
         │  │                         │
         ▼  ▼                         ▼
┌───────────────────────┐    ┌─────────────────────────────────────────┐
│    Hotkey Context     │    │          Execution Context              │
│                       │    │                                         │
│  ┌─────────────────┐  │    │  ┌───────────┐ ┌─────────────────────┐  │
│  │ Hotkey Manager  │  │    │  │ Kill Ring │ │  Workspace Context  │  │
│  └─────────────────┘  │    │  └───────────┘ │  ┌───────────────┐  │  │
│  ┌─────────────────┐  │    │                │  │SuggestionModal│  │  │
│  │ Hotkey Matcher  │  │    │                │  │   Context     │  │  │
│  └─────────────────┘  │    │                │  ├───────────────┤  │  │
│  ┌─────────────────┐  │    │                │  │   Popover     │  │  │
│  │ChordSeqBuffer   │  │    │                │  │Suggestions Ctx│  │  │
│  └─────────────────┘  │    │                │  ├───────────────┤  │  │
│  ┌─────────────────┐  │    │                │  │Last Active    │  │  │
│  │Status Indicator │  │    │                │  │ MarkdownView  │  │  │
│  └─────────────────┘  │    │                │  └───────────────┘  │  │
│                       │    │                │  │MarkdownView   │  │  │
│                       │    │                │  └───────────────┘  │  │
│                       │    │                └─────────────────────┘  │
└───────────────────────┘    └─────────────────────────────────────────┘
         │                              │
         │                              │
         ▼                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Supporting                                      │
│  ┌───────────────┐  ┌──────────────┐                                 │
│  │ Config Loader │  │  Plugin API  │                                 │
│  └───────────────┘  └──────────────┘                                 │
└──────────────────────────────────────────────────────────────────────┘

External APIs: System Clipboard, Obsidian Editor API, Obsidian Workspace API
```

| Group             | Responsibility                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- |
| Global            | Cross-cutting components used by both contexts and the action pipeline              |
| Hotkey Context    | Input processing: key sequence tracking, matching, pending state display            |
| Execution Context | Runtime state: killed text, workspace/editor state, Obsidian UI observation         |
| Supporting        | Persistence (Config Loader) and third-party integration (Plugin API)                |
| External APIs     | System Clipboard, Obsidian Editor API, Obsidian Workspace API — consumed, not owned |

---

## 3. Components

> **Note:** API signatures live in the source code as the single source of truth. This section describes each component's role and relationships only.

### Global

**Input Handler** — The main orchestrator of the hotkey pipeline. Internally registers a global `keydown` event listener (see [ADR-005](ADR/ADR-005%20Event%20Interception%20Strategy.md)), but its responsibility extends well beyond event capture. On each keypress it: normalizes the browser event into a `KeyPress`, feeds it through the ChordSequenceBuffer, calls the Matcher to find a matching hotkey (which in turn consults the Hotkey Context Engine for "when" clause filtering), and on an exact match, executes the resolved command via the Command Registry. It also decides whether to suppress event propagation based on the match outcome.

**Hotkey Context Engine** — Tracks context state as a global key-value map and evaluates "when" clauses against it. Supports boolean, negation, AND, OR, and equality operators. Filters candidate hotkey entries by their `when` clause. Initialized once on plugin load and accessible to all components — the Matcher uses it to filter candidates, the Status Indicator may query it, and command actions read/write context during execution. Also stores cross-action state such as the `lastActionWasYank` flag used by the kill ring's yank-pop logic. See [ADR-007](ADR/ADR-007%20Context%20Engine%20Design.md).

**Command Registry** — Stores and executes registered commands. On startup, loads Obsidian's built-in commands. Commands receive the Hotkey Context Engine and optional args at execution time.

### Hotkey Context

The input processing group — everything involved in capturing keystrokes and resolving them to a matched hotkey entry.

**Hotkey Manager** — Manages the source hotkey table, keyed by `${canonicalSequence}::${commandName}`. Provides CRUD operations (insert, remove, clear) with priority assignment. When the table changes, triggers a rebuild of the Matcher's optimized matching table. Acts as the single source of truth for all registered hotkeys. See [ADR-002](ADR/ADR-002%20Configuration%20Priority.md).

**Hotkey Matcher** — Maintains an optimized matching table built from hotkey entries provided by the Manager. Given a key sequence, returns: exact match (with the winning `HotkeyEntry`), prefix match (sequence is incomplete), or no match. Handles priority resolution when multiple entries match the same sequence. Filters candidates through the Hotkey Context Engine for "when" clause evaluation.

**ChordSequenceBuffer** — Tracks a pending key sequence of up to 2 keypresses. Manages a configurable timeout (~5000ms) after the first keypress. Feeds the current sequence to the Matcher and displays pending state via Status Indicator.

**Status Indicator** — Displays the pending key sequence in the status bar during chord input.

### Execution Context

The runtime state group — workspace observation, editor operations, and the kill ring.

**Kill Ring** — Ring buffer of killed text with yank cycling. Syncs kills to the system clipboard and detects external clipboard changes on yank. Yank-pop reads the `lastActionWasYank` flag from the Hotkey Context Engine to decide whether to cycle the ring or fall back to the kill ring browser UI. See [ADR-003](ADR/ADR-003%20Clipboard%20Sync%20Strategy.md).

**Workspace Context** — Aggregates workspace-related state tracking and editor operations. Provides unified access to Obsidian UI state and the active editor for commands. This includes the editor abstraction (selection, cursor text, insert, delete, replace) — there is no separate Editor Interface component.

Sub-components:

- **Suggestion Modal Context** — Detects modal open/close by patching `SuggestModal`
- **Popover Suggestions Context** — Detects popover open/close by patching `PopoverSuggest`
- **Last Active MarkdownView** — Tracks the last focused markdown editor view

### Supporting

**Config Loader** — Loads/saves JSON configuration: settings, presets, and user overrides. Validates preset format and supports settings migration.

**Plugin API** — Public facade exposing three surfaces to third-party plugins: commands, hotkeys, and context. All registration methods return a `Disposable`. See [ADR-004](ADR/ADR-004%20Lifecycle%20Management.md).

### External APIs

**System Clipboard** — Browser/OS clipboard accessed via `navigator.clipboard`. Used by Kill Ring for sync. Not a component we own — it's an external API dependency.

**Obsidian Editor API** — Accessed through Workspace Context for editor operations.

**Obsidian Workspace API** — Used by context sub-components for event observation and class patching.

---

## 4. Key Data Flow

### Hotkey Processing

```
KeyboardEvent
  → Input Handler
      1. Normalize to KeyPress
      2. ChordSequenceBuffer.append(keypress)    [Hotkey Context]
      3. Matcher.match(sequence)                  [Hotkey Context]
         └─ filters by Hotkey Context Engine      [Global]
      4. On exact match:
         a. ChordSequenceBuffer.clear()           [Hotkey Context]
         b. Command Registry.execute(command)     [Global]
            └─ command action reads/writes        [Execution Context]
         c. Update Hotkey Context Engine:          [Global]
            set lastActionWasYank = true if the
            executed command was yank or yank-pop,
            false otherwise
      5. Decide: suppress or pass through event
```

Outcomes per match result:

- **Exact match** → Clear buffer, execute command, update yank tracking, suppress event
- **Prefix match** → Buffer key, show pending in Status Indicator, suppress event
- **No match (chord)** → Clear buffer, suppress event
- **No match (non-chord)** → Clear buffer, let event propagate to Obsidian

**Yank tracking:** After every successful command execution, the Input Handler writes a `lastActionWasYank` flag into the Hotkey Context Engine. This is `true` if the command was yank or yank-pop, `false` otherwise. The Kill Ring's yank-pop reads this flag to decide whether to cycle the ring or fall back to the kill ring browser UI.

### Configuration Loading

```
Plugin load
  → Config Loader reads settings.json
  → Load selected preset        → Hotkey Manager (Priority: Preset)
  → Load plugin registrations   → Hotkey Manager (Priority: Plugin)
  → Load user overrides          → Hotkey Manager (Priority: User)
  → Hotkey Manager triggers Matcher rebuild
```

### Kill / Yank

```
Kill:     Workspace Context (editor selection/cursor text) → Kill Ring push → System Clipboard write
Yank:     System Clipboard read → compare with ring head → Workspace Context (insert into editor)
Yank-Pop: Check lastActionWasYank in Hotkey Context Engine
          → if true:  advance ring pointer → Workspace Context (replace last yank range)
          → if false: open kill ring browser UI (P1 feature)
```

---

## 5. Configuration Model

### Storage Structure

```
/plugin-data/
  ├── presets/
  │   ├── emacs.json
  │   ├── emacs-strict.json
  │   └── imported/
  ├── user-overrides.json
  └── settings.json
```

### Priority Order (highest to lowest)

1. **User overrides** — Explicit changes and removals (`-command` syntax)
2. **Selected preset** — Built-in or imported preset
3. **Plugin-registered** — Runtime registrations from third-party plugins

### Conflict Resolution

| Scenario                                   | Resolution                                       |
| ------------------------------------------ | ------------------------------------------------ |
| Same key, different `when` contexts        | Coexist — context evaluation picks the right one |
| Same key, same context, different priority | Higher priority wins                             |
| Same key, same context, same priority      | First registered wins                            |

Shadowed bindings remain registered but inactive. Visible in configuration UI as "overridden by [source]".

See [ADR-002](ADR/ADR-002%20Configuration%20Priority.md) and [ADR-006](ADR/ADR-006%20Conflict%20Resolution.md).

---

## 6. Key Constraints

- Key matching is **character-based** by default. Physical scan-code matching is deferred (P2). See [ADR-001](ADR/ADR-001%20Key%20Representation.md).
- Chord sequences support **at most 2 keypresses**.
- "When" clause syntax supports: `key`, `!key`, `&&`, `||`, `== "value"`. Parentheses are deferred (P2).
- The Hotkey Context Engine is a **global singleton** initialized at plugin load, accessible to all components.
- Editor operations are accessed through **Workspace Context**, not a separate Editor Interface.
- Kill ring is **in-memory only** — no persistence across sessions.
- System Clipboard is an **external API dependency**, not an owned component.
- All registration APIs return `Disposable`. Auto-cleanup scoped to plugin instance is deferred (P2).
- Preset selection is **single-select** — users cannot combine multiple presets.

---

## 7. ADR Index

| ADR                                                         | Decision                                     |
| ----------------------------------------------------------- | -------------------------------------------- |
| [ADR-001](ADR/ADR-001%20Key%20Representation.md)            | Character-based key matching by default      |
| [ADR-002](ADR/ADR-002%20Configuration%20Priority.md)        | User > Preset > Plugin priority              |
| [ADR-003](ADR/ADR-003%20Clipboard%20Sync%20Strategy.md)     | Sync kill→clipboard, detect external on yank |
| [ADR-004](ADR/ADR-004%20Lifecycle%20Management.md)          | Return Disposable, auto-cleanup deferred     |
| [ADR-005](ADR/ADR-005%20Event%20Interception%20Strategy.md) | Global keydown listener via Input Handler    |
| [ADR-006](ADR/ADR-006%20Conflict%20Resolution.md)           | Priority stacking with context coexistence   |
| [ADR-007](ADR/ADR-007%20Context%20Engine%20Design.md)       | Black-boxed engine with "when" clause syntax |
