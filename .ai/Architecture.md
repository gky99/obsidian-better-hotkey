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
│                                     Global                           │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Hotkey Context Engine │  │ Command Registry │  │ Input Handler │  │
│  └───────────────────────┘  └──────────────────┘  └───────────────┘  │
│  ┌───────────────────────┐  ┌────────────────┐                       │
│  │Keyboard Layout Service│  │ Config Manager │                       │
│  └───────────────────────┘  └────────────────┘                       │
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
│  ┌──────────────┐                                                    │
│  │  Plugin API  │                                                    │
│  └──────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────┘

External APIs: System Clipboard, Obsidian Editor API, Obsidian Workspace API
```

| Group             | Responsibility                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- |
| Global            | Cross-cutting components used by both contexts and the action pipeline              |
| Hotkey Context    | Input processing: key sequence tracking, matching, pending state display            |
| Execution Context | Runtime state: killed text, workspace/editor state, Obsidian UI observation         |
| Supporting        | Third-party integration (Plugin API)                                                |
| External APIs     | System Clipboard, Obsidian Editor API, Obsidian Workspace API — consumed, not owned |

---

## 3. Components

> **Note:** API signatures live in the source code as the single source of truth. This section describes each component's role and relationships only.

### Global

**Input Handler** — The main orchestrator of the hotkey pipeline. Internally registers a global `keydown` event listener (see [ADR-005](ADR/ADR-005%20Event%20Interception%20Strategy.md)), but its responsibility extends well beyond event capture. On each keypress it: normalizes the browser event into a `KeyPress`, feeds it through the ChordSequenceBuffer, calls the Matcher to find a matching hotkey (which in turn consults the Hotkey Context Engine for "when" clause filtering), and on an exact match, executes the resolved command via the Command Registry. It also decides whether to suppress event propagation based on the match outcome.

**Hotkey Context Engine** — Tracks context state as a global key-value map and evaluates "when" clauses against it. Supports boolean, negation, AND, OR, and equality operators. Filters candidate hotkey entries by their `when` clause. Initialized once on plugin load and accessible to all components — the Matcher uses it to filter candidates, the Status Indicator may query it, and command actions read/write context during execution. Also stores cross-action state such as the `lastActionWasYank` flag used by the kill ring's yank-pop logic. See [ADR-007](ADR/ADR-007%20Context%20Engine%20Design.md).

**Command Registry** — Stores and executes registered commands. On startup, loads Obsidian's built-in commands. Commands receive the Hotkey Context Engine and optional args at execution time.

**Keyboard Layout Service** — Detects the user's keyboard layout and provides translation between physical key codes and base characters. Uses `navigator.keyboard.getLayoutMap()` to build a code-to-character mapping, falling back to predefined QWERTY layout data if the API is unavailable. Exposes:

- `getBaseCharacter(code: string): string | null` — Returns the actual layout base character for a physical key code (including digit codes — no digit override)
- `getCode(character: string): string | null` — Reverse lookup: returns the physical key code for a base character. Digits 0-9 are always mapped to their DigitN codes as virtual entries, even if they are not the actual base character on that layout
- `isBaseKey(character: string): boolean` — Checks if a character is available without modifiers (includes virtual digit entries)
- `onLayoutChange(callback): Disposable` — Registers callback for layout change events

Monitors for window `focus` events and re-checks the layout map (the `layoutchange` event has no reliable browser support). Notifies a registered callback when the layout changes. Used by the Input Handler for key normalization at match time and by the Settings UI for display translation — NOT used by Config Manager at load time (see [ADR-010](ADR/ADR-010%20Keyboard%20Layout%20Translation%20Timing.md)). Initialized once on plugin load. See [ADR-008](ADR/ADR-008%20Keyboard%20Layout%20Normalization.md).

**Config Manager** — Data provider for all hotkey configuration. Constructed with `adapter: DataAdapter`; file paths derive from the `PLUGIN_DATA_PATH` constant in `constants.ts`. Loads preset JSON and user hotkeys from separate files in the plugin folder (custom file I/O via `app.vault.adapter`, since Obsidian's `loadData()`/`saveData()` only supports `data.json`). Parses string hotkey notation (e.g., `"ctrl+x ctrl+s"`) into `KeyPress` objects via `parseHotkeyString()`. Both preset and user JSON files use the same `RawHotkeyBinding` shape (`{ command, key?, when?, args? }`). Stores entries separately by source (preset, plugin, user) and fires an `onChange` callback when any source changes, enabling HotkeyManager to recalculate the effective hotkey table. Key APIs: `loadAll(presetName)` reads preset + user files; `registerPluginHotkeys(pluginName, bindings[])` bulk-registers plugin hotkeys keyed by plugin name (same name replaces all previous entries), returns `Disposable`; `addUserHotkey(command, key?, when?)` adds a user hotkey and persists to file; `removeHotkey()` is a placeholder stub (deferred to Settings UI). Manages user hotkeys including `"-command"` removal syntax (VSCode-style). Plugin entries are tracked in an in-memory `Map<pluginName, ConfigHotkeyEntry[]>`. Does NOT perform keyboard layout translation — that happens at match time (Input Handler) and display time (Settings UI). See [ADR-002](ADR/ADR-002%20Configuration%20Priority.md), [ADR-010](ADR/ADR-010%20Keyboard%20Layout%20Translation%20Timing.md).

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
      1. Keyboard Layout Service.getBaseCharacter(event.code) [Global]
      2. Build KeyPress with base character + modifiers
      3. ChordSequenceBuffer.append(keypress)    [Hotkey Context]
      4. Matcher.match(sequence)                  [Hotkey Context]
         └─ filters by Hotkey Context Engine      [Global]
      5. On exact match:
         a. ChordSequenceBuffer.clear()           [Hotkey Context]
         b. Command Registry.execute(command)     [Global]
            └─ command action reads/writes        [Execution Context]
         c. Update Hotkey Context Engine:          [Global]
            set lastActionWasYank = true if the
            executed command was yank or yank-pop,
            false otherwise
      6. Decide: suppress or pass through event
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
  → Config Manager reads preset JSON file (presets/{name}.json)
  → Config Manager reads user hotkeys file (user-hotkeys.json)
  → Config Manager parses string notation → KeyPress objects (via parseHotkeyString)
  → Plugin entries registered at runtime via registerPluginHotkeys(pluginName, bindings[])
    (stored in-memory Map<pluginName, ConfigHotkeyEntry[]>, not persisted to disk)
  → Config Manager fires onChange callback with (preset[], plugin[], user[])
  → Hotkey Manager.recalculate() receives entries by source:
      1. Insert preset entries      (Priority: Preset)
      2. Insert plugin entries      (Priority: Plugin)
      3. Process user entries:
         - Normal entries           (Priority: User)
         - Removal entries ("-cmd") → remove matching preset/plugin entry
  → Hotkey Manager triggers Matcher rebuild
```

### Layout Change Handling

```
Window focus event
  → Keyboard Layout Service re-checks layout map
  → Compares with cached map; if changed:
  → Rebuilds internal layout map, charToCode reverse map, and baseCharSet
  → Matcher invalidates cached keycodes and re-translates via getCode()
  → Stored hotkey definitions are NOT re-translated (see ADR-010)
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

Plugin settings (`data.json`, via Obsidian's `loadData()`/`saveData()`):

- `selectedPreset`, `chordTimeout`, `killRingMaxSize`

Hotkey configuration (separate JSON files, via `app.vault.adapter`):

```
/<plugin-folder>/          (PLUGIN_DATA_PATH constant in constants.ts)
  ├── presets/
  │   ├── emacs.json
  │   └── emacs-strict.json
  └── user-hotkeys.json
```

Both preset and user JSON files use the same `RawHotkeyBinding` shape: `{ command: string, key?: string, when?: string, args?: Record<string, unknown> }`. Preset files wrap bindings in a `{ name, description, version, hotkeys: RawHotkeyBinding[] }` envelope; user hotkeys file is `RawHotkeyBinding[]` directly.

Plugin-registered hotkeys are stored in-memory only (`Map<pluginName, ConfigHotkeyEntry[]>`), registered via `registerPluginHotkeys(pluginName, bindings[])`. Re-registering the same plugin name replaces all previous entries. Not persisted to disk.

### String Notation

Hotkeys in JSON files use a human-readable string notation:

- Modifier+key separated by `+`: `"ctrl+k"`, `"shift+meta+,"`
- Chord steps separated by space: `"ctrl+x ctrl+s"` (two-step chord)
- Second chord step may be a bare key: `"ctrl+x b"`
- Modifiers: `ctrl`, `alt`, `shift`, `meta` (lowercase)
- Special keys: `space`, `backspace`, `tab`, `enter`, `escape`, etc.
- The `+` character cannot be used as a base key (it is the separator)

### User Override Removal Syntax

User overrides support VSCode-style removal using a `-` prefix on the command name:

- `{ "command": "-kill-line", "key": "ctrl+k" }` — remove the ctrl+k binding for kill-line
- If the specified key doesn't match any existing binding, the removal is silently ignored

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

- Key matching uses **layout-normalized characters** — physical key codes are translated to base characters via the Keyboard Layout Service at match time (not at config load time). See [ADR-001](ADR/ADR-001%20Key%20Representation.md), [ADR-008](ADR/ADR-008%20Keyboard%20Layout%20Normalization.md), and [ADR-010](ADR/ADR-010%20Keyboard%20Layout%20Translation%20Timing.md).
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

| ADR | Decision |
| --- | --- |
| [ADR-001](ADR/ADR-001%20Key%20Representation.md) | Character-based key matching by default |
| [ADR-002](ADR/ADR-002%20Configuration%20Priority.md) | User > Preset > Plugin priority |
| [ADR-003](ADR/ADR-003%20Clipboard%20Sync%20Strategy.md) | Sync kill→clipboard, detect external on yank |
| [ADR-004](ADR/ADR-004%20Lifecycle%20Management.md) | Return Disposable, auto-cleanup deferred |
| [ADR-005](ADR/ADR-005%20Event%20Interception%20Strategy.md) | Global keydown listener via Input Handler |
| [ADR-006](ADR/ADR-006%20Conflict%20Resolution.md) | Priority stacking with context coexistence |
| [ADR-007](ADR/ADR-007%20Context%20Engine%20Design.md) | Black-boxed engine with "when" clause syntax |
| [ADR-008](ADR/ADR-008%20Keyboard%20Layout%20Normalization.md) | Layout-aware key normalization |
| [ADR-009](ADR/ADR-009%20CM6%20Command%20Integration%20Strategy.md) | CM6 Direct Call + Custom with CM6 helpers |
| [ADR-010](ADR/ADR-010%20Keyboard%20Layout%20Translation%20Timing.md) | Layout translation at match time, not load time |
