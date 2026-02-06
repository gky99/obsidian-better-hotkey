# CodeMirror Emacs Plugin - Feature Documentation

This document provides a comprehensive overview of all features implemented in the CodeMirror Emacs plugin and their associated keybindings.

## Table of Contents
- [Cursor Movement](#cursor-movement)
- [Text Selection](#text-selection)
- [Search and Replace](#search-and-replace)
- [Basic Editing](#basic-editing)
- [Kill Ring (Cut/Copy/Paste)](#kill-ring-cutcopypaste)
- [Marks and Regions](#marks-and-regions)
- [Case Transformation](#case-transformation)
- [Undo/Redo](#undoredo)
- [Rectangular Selection](#rectangular-selection)
- [Code Commenting](#code-commenting)
- [Autocomplete](#autocomplete)
- [Display Control](#display-control)
- [Block Cursor](#block-cursor)

---

## Cursor Movement

Move the cursor around the document using various granularities (character, word, line, page, document).

### Character Navigation
- **Left** / **Ctrl+b**: Move cursor left one character
- **Right** / **Ctrl+f**: Move cursor right one character

### Line Navigation
- **Up** / **Ctrl+p**: Move cursor up one line
- **Down** / **Ctrl+n**: Move cursor down one line
- **Home** / **Ctrl+a**: Move cursor to start of line
- **End** / **Ctrl+e**: Move cursor to end of line

### Word Navigation
- **Ctrl+Left** / **Alt+b** (Mac: **Ctrl+Left**): Move cursor left one word
- **Ctrl+Right** / **Alt+f** (Mac: **Ctrl+Right**): Move cursor right one word

### Page Navigation
- **PageDown** / **Ctrl+v** / **Ctrl+Down**: Move cursor down one page
- **PageUp** / **Alt+v** / **Ctrl+Up**: Move cursor up one page

### Document Navigation
- **Ctrl+Home** / **Shift+Alt+,**: Move cursor to start of document
- **Ctrl+End** / **Shift+Alt+.**: Move cursor to end of document

### Special Navigation
- **Alt+g**: Go to line (command line interface)

---

## Text Selection

Create and modify text selections. Most movement commands become selection commands when a mark is set (see [Marks and Regions](#marks-and-regions)).

### Selection by Character
- **Shift+Left** / **Shift+Ctrl+b**: Extend selection left one character
- **Shift+Right** / **Shift+Ctrl+f**: Extend selection right one character

### Selection by Line
- **Shift+Up** / **Shift+Ctrl+p**: Extend selection up one line
- **Shift+Down** / **Shift+Ctrl+n**: Extend selection down one line
- **Shift+Home** / **Shift+Ctrl+a**: Extend selection to start of line
- **Shift+End** / **Shift+Ctrl+e**: Extend selection to end of line

### Selection by Word
- **Shift+Ctrl+Left** / **Shift+Alt+b**: Extend selection left one word
- **Shift+Ctrl+Right** / **Shift+Alt+f**: Extend selection right one word

### Selection by Page
- **Shift+Ctrl+Down**: Extend selection down one page
- **Shift+Ctrl+Up**: Extend selection up one page

### Selection by Document
- **Shift+Ctrl+Home**: Extend selection to start of document
- **Shift+Ctrl+End**: Extend selection to end of document
- **Ctrl+x Ctrl+p** / **Ctrl+x h**: Select all text in document

### Semantic Selection
- **Alt+h**: Select paragraph (contiguous non-empty lines)
- **Alt+@** / **Alt+Shift+2**: Mark word at cursor

---

## Search and Replace

Find and replace text in the document.

### Interactive Search
- **Ctrl+s**: Open search panel (forward search)
- **Ctrl+r**: Open search panel (reverse search)

### Find Next/Previous
- **Alt+Ctrl+s**: Find next occurrence
- **Alt+Ctrl+r**: Find previous occurrence

### Replace
- **Shift+Alt+5**: Replace text

---

## Basic Editing

Insert, delete, and modify text.

### Character Editing
- **Backspace**: Delete character before cursor
- **Delete** / **Ctrl+d**: Delete character after cursor
- **Ctrl+t**: Transpose characters (swap character before and after cursor)

### Line Editing
- **Return** / **Ctrl+m**: Insert newline
- **Ctrl+o**: Split line (insert newline and keep cursor position)

### Word Deletion
- **Alt+d** / **Ctrl+Delete**: Delete word to the right
- **Ctrl+Backspace** / **Alt+Backspace** / **Alt+Delete**: Delete word to the left

### Kill Line
- **Ctrl+k**: Kill (cut) from cursor to end of line

---

## Kill Ring (Cut/Copy/Paste)

Emacs-style clipboard management with a ring buffer that stores multiple killed (cut) text entries.

### Cut Operations
- **Ctrl+w** / **Ctrl+Shift+w**: Kill region (cut selected text)
- **Ctrl+k**: Kill line (cut from cursor to end of line)
- **Alt+d** / **Ctrl+Delete**: Kill word to the right
- **Ctrl+Backspace** / **Alt+Backspace**: Kill word to the left

### Copy Operations
- **Alt+w**: Save region to kill ring (copy without deleting)

### Paste Operations
- **Ctrl+y** / **Shift+Delete**: Yank (paste most recent kill)
- **Alt+y**: Yank and rotate kill ring (cycle through previous kills)

**Note**: The kill ring stores up to 30 entries. Multiple consecutive `Ctrl+k` commands append to the same kill ring entry.

---

## Marks and Regions

Set marks to define regions and enable selection mode where cursor movement commands become selection commands.

### Mark Operations
- **Ctrl+Space**: Set mark at cursor position
  - First press: Activates mark mode (movement commands now select text)
  - Second press at same location: Deactivates mark mode
  - With Ctrl+u prefix: Pop mark from ring and jump to it
- **Ctrl+x Ctrl+x**: Exchange point and mark
  - Without selection: Swap cursor position with last mark
  - With selection: Reverse selection direction
  - With Ctrl+u prefix: Replace mark position with current position

### Mark Behavior
When mark is active:
- All movement commands (Up, Down, Left, Right, etc.) extend the selection
- Inserting text or clicking the mouse deactivates the mark
- **Escape**: Deactivate mark without affecting selection

### Quit/Cancel
- **Ctrl+g**: Keyboard quit (cancel operation, clear selection, reset mark)

---

## Case Transformation

Change the case of characters in words or regions.

### Word Case Transformation
- **Alt+u**: Convert next word to uppercase
- **Alt+l**: Convert next word to lowercase

### Region Case Transformation
- **Ctrl+x Ctrl+u**: Convert region to uppercase
- **Ctrl+x Ctrl+l**: Convert region to lowercase

---

## Undo/Redo

Revert or restore changes to the document.

### Undo Operations
- **Ctrl+/** / **Ctrl+x u** / **Shift+Ctrl+-** / **Ctrl+z**: Undo last change

### Redo Operations
- **Shift+Ctrl+/** / **Shift+Ctrl+x u** / **Ctrl+-** / **Shift+Ctrl+z**: Redo (restore undone change)

---

## Rectangular Selection

Select and edit rectangular regions of text (column selection).

### Rectangular Region
- **Ctrl+x r**: Toggle rectangular selection mode
  - First press on normal selection: Convert to rectangular selection across multiple lines
  - Second press on rectangular selection: Merge back to normal selection

This feature enables column editing across multiple lines.

---

## Code Commenting

Toggle comments on lines or regions.

### Comment Operations
- **Alt+;**: Toggle line comment (comment/uncomment selected lines)

---

## Autocomplete

Trigger code completion suggestions.

### Completion Operations
- **Alt+/**: Start completion (show autocomplete suggestions)

**Note**: Up/Down arrow keys navigate through completion suggestions when the completion menu is active.

---

## Display Control

Control how content is displayed in the viewport.

### Screen Centering
- **Ctrl+l**: Recenter top/bottom (cycles cursor position: center → top → bottom)
- **Alt+s**: Center selection in viewport

---

## Block Cursor

Visual block cursor that mimics traditional Emacs cursor behavior.

### Features
- Displays a block cursor that covers the character at the cursor position
- Shows the actual character under the cursor
- Cursor blinks at configurable rate
- Visual feedback for mark mode and count prefix:
  - Half-height cursor when entering a count prefix (Ctrl+number) or key chain (Ctrl+x, etc.)
  - Full-height cursor in normal mode
- Multiple cursors supported (shows block cursor for each cursor)
- Unfocused editor shows outline cursor instead of filled

### Styling
- **Focused cursor**: Red background (#ff9696)
- **Unfocused cursor**: Red outline
- **Hidden native cursor**: The native browser cursor is hidden when in Emacs mode

---

## Universal Argument

Execute commands multiple times.

### Count Prefix
- **Ctrl+u**: Universal argument
  - Without number: Next command executes 4 times
  - Followed by number (Ctrl+5): Next command executes that many times
  - Example: `Ctrl+u Ctrl+5 Ctrl+f` moves cursor forward 5 characters

**Note**: When count prefix is active, cursor displays at half height.

---

## Special Keys and Platform Differences

### macOS-Specific Keybindings
The plugin provides macOS-friendly alternatives for many commands:
- **Cmd+Left**: Move to start of line (in addition to Home/Ctrl+a)
- **Cmd+Right**: Move to end of line (in addition to End/Ctrl+e)
- **Cmd+Up**: Scroll up (in addition to PageUp)
- **Cmd+Down**: Scroll down (in addition to PageDown)
- **Cmd+Backspace**: Delete to start of line
- **Cmd+Delete**: Delete to end of line

### Key Notation
- **Ctrl**: Control key
- **Alt**: Alt key (Option on macOS)
- **Shift**: Shift key
- **Cmd**: Command key (macOS only)
- **Mod**: Ctrl on Windows/Linux, Cmd on macOS

---

## Implementation Details

### Mark Ring
- Stores up to 30 mark positions
- Marks are automatically updated when document changes
- Marks track cursor positions across multiple cursors

### Kill Ring
- Stores up to 30 killed text entries
- Consecutive kill-line operations append to the same entry
- Yank-rotate cycles through the ring

### Key Chain Support
Commands can be chained together (e.g., `Ctrl+x h` = Ctrl+x followed by h). When entering a chain, the cursor displays at half height to indicate waiting for next key.

### Auto-complete Integration
The plugin integrates with CodeMirror's autocomplete system and doesn't interfere with Up/Down navigation in completion menus.
