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
| Initialize Obsidian plugin scaffold                                                                 | 0.5d   | —            | ✅   |
| Set up TypeScript config, linting, build                                                            | 0.5d   | —            | ✅   |
| Define shared data types (`KeyPress`, `HotkeyEntry`, `HotkeyPreset`, `Command`, `Disposable`, etc.) | 0.5d   | —            | ✅   |

### 1.2 Hotkey Context Components

Components inside the Hotkey Context group, built individually before the Input Handler wires them together.

| Task                                                                    | Effort | Dependencies            | Done |
| ----------------------------------------------------------------------- | ------ | ----------------------- | ---- |
| Wire Matcher rebuild as onChange callback on Hotkey Manager during init | 0.25d  | Hotkey Manager, Matcher | ✅   |

#### ChordSequenceBuffer

| Task                               | Effort | Dependencies | Done |
| ---------------------------------- | ------ | ------------ | ---- |
| Implement pending state management | 0.25d  | 1.1          | ✅   |
| Implement `append`, `clear`        | 0.5d   | 1.1          | ✅   |
| Implement timeout logic            | 0.5d   | 1.1          | ✅   |
| Test sequence building and timeout | 0.25d  |              | ✅   |

#### Hotkey Manager

| Task                                                       | Effort | Dependencies | Done |
| ---------------------------------------------------------- | ------ | ------------ | ---- |
| Implement source hotkey table (keyed by sequence::command) | 0.5d   | 1.1          | ✅   |
| Implement `insert`, `remove`, `clear`                      | 0.5d   |              | ✅   |
| Implement onChange callback support                        | 0.25d  |              | ✅   |
| Test table operations                                      | 0.25d  |              | ✅   |

#### Hotkey Matcher

| Task                                                    | Effort | Dependencies | Done |
| ------------------------------------------------------- | ------ | ------------ | ---- |
| Define matching table interface (TODO: Trie vs HashMap) | 0.25d  | 1.1          | ✅   |
| Implement Map-based matching table for MVP              | 0.5d   |              | ✅   |
| Implement `match(sequence): MatchResult`                | 0.5d   |              | ✅   |
| Implement `isEscape`, `isChord`, `hasPrefix`            | 0.25d  |              | ✅   |
| Implement rebuild from Hotkey Manager source data       | 0.5d   |              | ✅   |
| Test exact match, prefix match, no match                | 0.5d   |              | ✅   |

#### Status Indicator

| Task                             | Effort | Dependencies | Done |
| -------------------------------- | ------ | ------------ | ---- |
| Create status bar element        | 0.25d  | 1.1          | ✅   |
| Implement `showPending`, `clear` | 0.25d  |              | ✅   |
| Style indicator                  | 0.25d  |              | ✅   |

### 1.3 Hotkey Context Engine (Stub)

| Task                                                  | Effort | Dependencies | Done |
| ----------------------------------------------------- | ------ | ------------ | ---- |
| Implement global singleton with `state` Map           | 0.25d  | 1.1          | ✅   |
| Implement `setContext`, `getContext`, `getAllContext` | 0.25d  |              | ✅   |
| Stub `evaluate(whenClause)` as `() => true`           | 0.25d  |              | ✅   |
| Implement `filter(entries)` using stub evaluation     | 0.25d  |              | ✅   |

### 1.4 Command Registry

| Task                                      | Effort | Dependencies | Done |
| ----------------------------------------- | ------ | ------------ | ---- |
| Implement commands Map                    | 0.25d  | 1.1          | ✅   |
| Implement `registerCommand`, `getCommand` | 0.5d   |              | ✅   |
| Implement `execute(commandId, args)`      | 0.5d   |              | ✅   |
| Implement `loadObsidianCommands`          | 0.5d   |              | ✅   |
| Test command registration and execution   | 0.25d  |              | ✅   |

### 1.5 Input Handler

The main orchestrator. Registers a global `keydown` listener and drives the full pipeline: normalize → buffer → match → execute → suppress.

| Task                                                                                         | Effort | Dependencies  | Done |
| -------------------------------------------------------------------------------------------- | ------ | ------------- | ---- |
| Implement global `keydown` listener registration and teardown                                | 0.5d   | 1.1           | ✅   |
| Implement `normalize(KeyboardEvent): KeyPress`                                               | 0.5d   | 1.1           | ✅   |
| Wire pipeline: normalize → ChordSequenceBuffer → Matcher → Command Registry                  | 0.5d   | 1.2, 1.3, 1.4 | ✅   |
| Wire ChordSequenceBuffer → Status Indicator for pending display                              | 0.25d  | 1.2           | ✅   |
| Implement exact match flow: clear buffer → execute command → update `lastActionWasYank` flag | 0.5d   |               | ✅   |
| Implement prefix match flow: buffer key, show pending, suppress event                        | 0.25d  |               | ✅   |
| Implement no match (chord) flow: clear buffer, suppress event                                | 0.25d  |               | ✅   |
| Implement no match (non-chord) flow: clear buffer, pass through to Obsidian                  | 0.25d  |               | ✅   |
| Implement timeout → clear flow                                                               | 0.25d  |               | ✅   |
| Implement escape → clear flow                                                                | 0.25d  |               | ✅   |
| End-to-end testing with hardcoded hotkeys                                                    | 0.5d   |               | ✅   |
| Replace pushScope with Scope.prototype.handleKey patch via ScopeProxy                        | 0.5d   |               | ✅   |

**Phase 1 Total:** ~5-6 days

**Phase 1 Deliverable:** Plugin that intercepts key sequences and executes commands (with hardcoded test hotkeys). The `lastActionWasYank` flag is written to the Hotkey Context Engine after every command execution but not yet consumed.

---

## Phase 2: Execution Context + Configuration

**Goal:** Kill ring working, workspace context for editor operations, configuration loading from files

### 2.1 Workspace Context

Editor operations abstracted through Workspace Context. No separate Editor Interface component.

| Task                                                      | Effort | Dependencies | Done |
| --------------------------------------------------------- | ------ | ------------ | ---- |
| Implement active editor accessor                          | 0.25d  | Phase 1      | ✅   |
| Implement selection operations: has, get, getRange        | 0.5d   |              | ✅   |
| Implement `getTextAtCursor(unit)` for line                | 0.5d   |              | ✅   |
| Implement `deleteRange`, `insertAtCursor`, `replaceRange` | 0.5d   |              | ✅   |
| Implement `isFocused`                                     | 0.25d  |              | ✅   |
| Test editor operations                                    | 0.25d  |              | ✅   |

### 2.2 Kill Ring

System clipboard is accessed directly via `navigator.clipboard` — it's an external API, not an owned component.

| Task                                                                            | Effort | Dependencies | Done |
| ------------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Implement clipboard read/write utilities with permission/error handling         | 0.5d   | Phase 1      | ✅   |
| Implement entries ring buffer with `maxSize`                                    | 0.25d  |              | ✅   |
| Implement `push(text)` with clipboard sync                                      | 0.5d   |              | ✅   |
| Implement `yank()` with external clipboard detection                            | 0.5d   |              | ✅   |
| Implement `yankPop()` with pointer cycling                                      | 0.5d   |              | ✅   |
| Implement `canYankPop()` — reads `lastActionWasYank` from Hotkey Context Engine | 0.25d  |              | ✅   |
| Implement yank range tracking (`setYankRange`, `getYankRange`)                  | 0.25d  |              | ✅   |
| Implement `getEntries()` for future browser UI                                  | 0.25d  |              | ✅   |
| Test kill ring flows                                                            | 0.5d   |              | ✅   |

### 2.3 Editor Commands

Commands implemented as part of Phase 2. Each command is registered in the Command Registry and bound in the default preset.

- **CM6 Direct Call** (15 commands): Thin wrappers that call CodeMirror 6 built-in command functions via `EditorView`. CM6 handles bidi text, wrapped lines, multiple cursors, and undo grouping — more correct and efficient than custom implementation.
- **Custom Implementation** (14 commands): Commands that need Kill Ring integration, case transformation via `view.dispatch()`, or plugin state management. Many reuse CM6 selection commands (`selectGroupForward`, `selectGroupBackward`) as helpers for range computation. See ADR-009.

#### 2.3.1 Kill & Yank Commands

7 commands. **Custom implementation** — these interact with the Kill Ring and must capture text before deletion. Kill-word commands use CM6's `selectGroupForward`/`selectGroupBackward` to compute word ranges.

| Command              | Hotkey        | Implementation                                                           |
| -------------------- | ------------- | ------------------------------------------------------------------------ |
| `kill-line`          | `C-k`         | Compute cursor-to-EOL range → capture text → Kill Ring push → delete     |
| `kill-region`        | `C-w`         | Read selection → capture text → Kill Ring push → delete selection        |
| `kill-word`          | `M-d`         | `selectGroupForward` for range → capture text → Kill Ring push → delete  |
| `backward-kill-word` | `M-Backspace` | `selectGroupBackward` for range → capture text → Kill Ring push → delete |
| `copy-region`        | `M-w`         | Read selection → capture text → Kill Ring push (no delete)               |
| `yank`               | `C-y`         | Kill Ring yank → insert at cursor → set yank range                       |
| `yank-pop`           | `M-y`         | Check lastActionWasYank → cycle Kill Ring → replace yank range           |

| Task                                                                         | Effort | Dependencies | Done |
| ---------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Implement `kill-line` (C-k): cursor-to-EOL text → Kill Ring push             | 0.5d   | 2.1, 2.2     | ✅   |
| Implement `kill-region` (C-w): selection → Kill Ring push → delete           | 0.25d  | 2.1, 2.2     | ✅   |
| Implement `kill-word` (M-d): forward word → Kill Ring push → delete          | 0.25d  | 2.1, 2.2     | ✅   |
| Implement `backward-kill-word` (M-Backspace): backward word → Kill Ring push | 0.25d  | 2.1, 2.2     | ✅   |
| Implement `copy-region` (M-w): selection → Kill Ring (no delete)             | 0.25d  | 2.1, 2.2     | ✅   |
| Implement `yank` (C-y): insert from Kill Ring, set yank range                | 0.5d   | 2.1, 2.2     | ✅   |
| Implement `yank-pop` (M-y): cycle Kill Ring, replace last yank range         | 0.5d   | 2.1, 2.2     | ✅   |
| Test kill/yank flows end-to-end (including yank tracking)                    | 0.5d   |              | ✅   |

#### 2.3.2 Cursor Movement Commands

12 commands. **CM6 Direct Call** — each calls a CM6 built-in function (e.g., `cursorCharForward(editorView)`). CM6 handles bidi, wrapped lines, goal column, and multiple cursors.

| Command                  | Hotkey        | CM6 Function (`@codemirror/commands`) |
| ------------------------ | ------------- | ------------------------------------- |
| `forward-char`           | `C-f`         | `cursorCharForward`                   |
| `backward-char`          | `C-b`         | `cursorCharBackward`                  |
| `next-line`              | `C-n`         | `cursorLineDown`                      |
| `previous-line`          | `C-p`         | `cursorLineUp`                        |
| `move-beginning-of-line` | `C-a`         | `cursorLineStart`                     |
| `move-end-of-line`       | `C-e`         | `cursorLineEnd`                       |
| `forward-word`           | `M-f`         | `cursorGroupForward`                  |
| `backward-word`          | `M-b`         | `cursorGroupBackward`                 |
| `scroll-up`              | `C-v`         | `cursorPageDown`                      |
| `scroll-down`            | `M-v`         | `cursorPageUp`                        |
| `beginning-of-buffer`    | `M-<` (S-M-,) | `cursorDocStart`                      |
| `end-of-buffer`          | `M->` (S-M-.) | `cursorDocEnd`                        |

| Task                                                             | Effort | Dependencies | Done |
| ---------------------------------------------------------------- | ------ | ------------ | ---- |
| Register 12 cursor movement commands as CM6 direct-call wrappers | 0.5d   | 2.1          | ✅   |
| Add cursor movement hotkeys to default preset                    | 0.25d  |              | ✅   |
| Test cursor movement commands with active editor                 | 0.25d  |              | ✅   |

#### 2.3.3 Basic Editing Commands

3 commands. **CM6 Direct Call** — each calls a CM6 built-in function.

| Command           | Hotkey | CM6 Function (`@codemirror/commands`) |
| ----------------- | ------ | ------------------------------------- |
| `delete-char`     | `C-d`  | `deleteCharForward`                   |
| `transpose-chars` | `C-t`  | `transposeChars`                      |
| `open-line`       | `C-o`  | `splitLine`                           |

| Task                                                          | Effort | Dependencies | Done |
| ------------------------------------------------------------- | ------ | ------------ | ---- |
| Register 3 basic editing commands as CM6 direct-call wrappers | 0.25d  | 2.1          | ✅   |
| Add basic editing hotkeys to default preset                   | 0.25d  |              | ✅   |
| Test basic editing commands                                   | 0.25d  |              | ✅   |

#### 2.3.4 Case Transformation Commands

4 commands. **Custom implementation** — no CM6 built-in exists. Uses `view.dispatch()` with `changeByRange()` to transform text in-place.

| Command           | Hotkey    | Implementation                                               |
| ----------------- | --------- | ------------------------------------------------------------ |
| `upcase-word`     | `M-u`     | Find next word range → transform `.toUpperCase()` → dispatch |
| `downcase-word`   | `M-l`     | Find next word range → transform `.toLowerCase()` → dispatch |
| `upcase-region`   | `C-x C-u` | Get selection → transform `.toUpperCase()` → dispatch        |
| `downcase-region` | `C-x C-l` | Get selection → transform `.toLowerCase()` → dispatch        |

| Task                                                                         | Effort | Dependencies | Done |
| ---------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Implement `upcase-word` and `downcase-word` via dispatch + changeByRange     | 0.5d   | 2.1          | ✅   |
| Implement `upcase-region` and `downcase-region` via dispatch + changeByRange | 0.25d  | 2.1          | ✅   |
| Add case transformation hotkeys to default preset                            | 0.25d  |              | ✅   |
| Test case transformation commands                                            | 0.25d  |              | ✅   |

#### 2.3.5 Control Commands

3 commands. **Custom implementation** — plugin state management and editor control.

| Command               | Hotkey         | Implementation                                             |
| --------------------- | -------------- | ---------------------------------------------------------- |
| `keyboard-quit`       | `C-g`          | Clear selection + clear chord buffer + reset plugin state  |
| `recenter-top-bottom` | `C-l`          | `EditorView.scrollIntoView` cycling: center → top → bottom |
| `undo`                | `C-/`, `C-x u` | Delegate to Obsidian `editor.undo()`                       |

| Task                                                                        | Effort | Dependencies | Done |
| --------------------------------------------------------------------------- | ------ | ------------ | ---- |
| Implement `keyboard-quit` (C-g): clear selection + chord buffer + state     | 0.5d   | 2.1          | ✅   |
| Implement `recenter-top-bottom` (C-l): scrollIntoView with position cycling | 0.5d   | 2.1          | ✅   |
| Implement `undo` (C-/): delegate to editor.undo()                           | 0.25d  | 2.1          | ✅   |
| Add control command hotkeys to default preset                               | 0.25d  |              | ✅   |
| Test control commands                                                       | 0.25d  |              | ✅   |

#### Phase 2 Commands Summary

| Group               | Count  | Strategy                     |
| ------------------- | ------ | ---------------------------- |
| Kill & Yank         | 7      | Custom (Kill Ring)           |
| Cursor Movement     | 12     | CM6 Direct Call              |
| Basic Editing       | 3      | CM6 Direct Call              |
| Case Transformation | 4      | Custom (`changeByRange`)     |
| Control             | 3      | Custom / Obsidian delegation |
| **Total**           | **29** |                              |

#### Deferred Commands (Phase 3+)

These require the mark/region system (Phase 3 P2):

| Command                   | Hotkey    | Phase |
| ------------------------- | --------- | ----- |
| `set-mark-command`        | `C-Space` | 3     |
| `exchange-point-and-mark` | `C-x C-x` | 3     |
| `select-all`              | `C-x h`   | 3     |
| `mark-paragraph`          | `M-h`     | 3     |
| `mark-word`               | `M-@`     | 3     |

#### Not Implementing (Obsidian Native)

These are handled by Obsidian's built-in systems:

| Feature          | Hotkey    | Reason                       |
| ---------------- | --------- | ---------------------------- |
| Search           | `C-s/C-r` | Obsidian native search       |
| Autocomplete     | `M-/`     | Obsidian native autocomplete |
| Comment toggle   | `M-;`     | Obsidian native comment      |
| Rectangle select | `C-x r`   | Too complex, low priority    |
| Universal arg    | `C-u`     | Phase 4 (P3)                 |

### 2.4 String Parser & Types

| Task                                                                    | Effort | Dependencies | Done |
| ----------------------------------------------------------------------- | ------ | ------------ | ---- |
| Add `ConfigHotkeyEntry` interface extending `HotkeyEntry` in `types.ts` | 0.25d  | Phase 1      | ✅   |
| Implement `parseHotkeyString()` in `utils/hotkey.ts`                    | 0.5d   |              | ✅   |
| Add constants: `VALID_MODIFIERS`, `SPECIAL_KEY_MAP`                     | 0.25d  |              | ✅   |
| Handle bare second chord (no modifier required)                         | —      |              | ✅   |
| Console warn + skip for `+` as base key                                 | —      |              | ✅   |
| Test: chords, modifiers, special keys, bare second chord, edge cases    | 0.5d   |              | ✅   |

### 2.5 Config Manager

| Task                                                                           | Effort | Dependencies | Done |
| ------------------------------------------------------------------------------ | ------ | ------------ | ---- |
| Add `PLUGIN_DATA_PATH` constant in `constants.ts`                              | —      | 2.4          | ✅   |
| Implement ConfigManager class with `constructor(adapter)` + `setOnChange`      | 0.5d   | 2.4          | ✅   |
| Implement custom file I/O (`readJsonFile`, `writeJsonFile` via vault adapter)  | 0.5d   |              | ✅   |
| Implement `loadAll()` — read preset + user hotkeys, parse, fire onChange       | 0.5d   |              | ✅   |
| Implement `registerPluginHotkeys(pluginName, bindings[])` returning Disposable | 0.25d  |              | ✅   |
| Implement `addUserHotkey(command, key?, when?)` with file persistence          | 0.5d   |              | ✅   |
| Implement `removeHotkey()` placeholder (stub, throws "not implemented")        | —      |              | ✅   |
| Test: loading, persistence, plugin registration, round-trip                    | 0.5d   |              | ✅   |

### 2.6 HotkeyManager Recalculate + Preset Migration

| Task                                                                 | Effort | Dependencies | Done |
| -------------------------------------------------------------------- | ------ | ------------ | ---- |
| Add `recalculate(preset, plugin, user)` to HotkeyManager             | 0.5d   | 2.5          | ✅   |
| Implement removal logic in recalculate (by `hotkeyString`)           | 0.25d  |              | ✅   |
| Create `presets/emacs.json` with current bindings in string notation | 0.5d   |              | ✅   |
| Delete `src/presets/default.ts`                                      | —      |              | ✅   |
| Update `main.ts`: create ConfigManager, wire onChange → recalculate  | 0.25d  |              | ✅   |
| Update `HotkeyContext`: remove preset param + `loadPreset()`         | 0.25d  |              | ✅   |
| End-to-end test: load preset → apply overrides → verify hotkeys      | 0.5d   |              | ✅   |

### 2.7 Keyboard Layout Service

| Task                                                               | Effort | Dependencies | Done |
| ------------------------------------------------------------------ | ------ | ------------ | ---- |
| Implement Keyboard Layout Service singleton                        | 0.5d   | Phase 1      | ✅   |
| Implement `getLayoutMap()` wrapper with error handling             | 0.5d   |              | ✅   |
| Implement `getBaseCharacter(code): string \| null`                 | 0.25d  |              | ✅   |
| Implement `isBaseKey(character): boolean`                          | 0.25d  |              | ✅   |
| Implement dynamic digit-to-code mapping from layout                | 0.5d   |              | ✅   |
| Implement `translateNumber(digit): string` using dynamic mapping   | 0.25d  |              | ✅   |
| Implement window focus listener for layout change detection        | 0.25d  |              | ✅   |
| Implement `onLayoutChange(callback): Disposable` (single callback) | 0.25d  |              | ✅   |
| Implement identity fallback for unsupported environments           | 0.5d   |              | ✅   |
| Test layout detection, translation, and change handling            | 0.5d   |              | ✅   |

### 2.8 Input Handler Layout Integration

| Task                                                     | Effort | Dependencies            | Done |
| -------------------------------------------------------- | ------ | ----------------------- | ---- |
| Update `normalize()` to use Keyboard Layout Service      | 0.5d   | Keyboard Layout Service | ✅    |
| Update KeyPress.key to store layout-normalized character | 0.25d  |                         | ✅    |
| Test input normalization on different layouts            | 0.5d   |                         | ✅    |

### 2.9 ADR Updates

| Task                                                      | Effort | Dependencies | Done |
| --------------------------------------------------------- | ------ | ------------ | ---- |
| Write ADR-010 Keyboard Layout Translation Timing          | 0.25d  |              | done |
| Update ADR-008 to remove load-time translation references | 0.25d  |              | done |

**Phase 2 Total:** ~10-12 days

**Phase 2 Deliverable:** 29 Emacs editor commands: 7 kill/yank (custom, Kill Ring), 15 CM6 direct-call (cursor movement + basic editing), 4 case transformation (custom), 3 control (custom). Editor operations through Workspace Context, configuration loading from JSON files, default Emacs preset.

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
| Expose `hotkeys.registerPluginHotkeys(pluginName, bindings[])`              | 0.5d   |              |      |
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
    └── 2.4 String Parser & Types

  2.1
    └── 2.2 Kill Ring (also uses clipboard external API)
      └── 2.3 Kill/Yank Commands

  2.4
    └── 2.5 Config Manager
      └── 2.6 HotkeyManager Recalculate + Preset Migration

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
