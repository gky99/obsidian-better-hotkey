/**
 * Shared data types for Obsidian Better Hotkey plugin
 * Based on Design Documents/Data Types.md
 */

import type { SuggestModal } from 'obsidian';
import type { ExecutionContext } from './components/execution-context/ExecutionContext';
import type { ContextKeyExpression } from './components/context-key-expression';

/**
 * Represents a normalized key press event.
 * Matching uses the physical key code (code field).
 */
export interface KeyPress {
    modifiers: Set<'ctrl' | 'alt' | 'shift' | 'meta'>;
    key: string; // Display character from layout service, e.g., "x", "s", "/" — NOT used for matching
    code: string; // Physical key code, e.g., "KeyX", "KeyS", "Space" — used for matching
}

/**
 * Represents a single hotkey entry in the configuration
 * In ConfigHotkeyEntry (before recalculate), priority holds the basePriority from config.
 * In the hotkey table (after recalculate), priority holds the final computed value:
 * basePriority + indexInAggregatedList
 */
export interface HotkeyEntry {
    command: string; // "editor:save" or "-editor:save" for removal
    key: KeyPress[]; // Key sequence array
    when?: string; // Context condition (raw string): "editorFocused && !suggestionModalRendered"
    whenExpr: ContextKeyExpression; // Pre-parsed AST — always defined (TrueExpr when no "when" clause)
    args?: Record<string, unknown>;
    priority: number; // Priority number; higher = wins. See HotkeyEntry JSDoc for lifecycle.
}

/**
 * Extended entry used by ConfigManager — adds config metadata to HotkeyEntry.
 * Stored separately by source (preset, plugin, user) in ConfigManager.
 */
export interface ConfigHotkeyEntry extends HotkeyEntry {
    removal: boolean; // true for "-command" removal entries
    hotkeyString: string; // original string notation, e.g. "ctrl+k"
}


/**
 * Result of matching a key sequence against registered hotkeys
 */
export type MatchResult =
    | { type: 'exact'; entry: HotkeyEntry }
    | { type: 'prefix' }
    | { type: 'none'; isChord: boolean };

/**
 * Represents a command that can be executed
 */
export interface Command {
    id: string;
    name: string;
    execute(
        context: ExecutionContext,
        event: KeyboardEvent,
        args?: Record<string, unknown>,
    ): void | Promise<void>;
    canExecute?(context?: ExecutionContext): boolean;
}

/**
 * Disposable pattern for cleanup
 */
export interface Disposable {
    dispose(): void;
}

/**
 * Plugin settings
 */
export interface Settings {
    selectedPreset: string;
    chordTimeout: number; // ms, default ~5000
    killRingMaxSize: number; // default ~60
}

/**
 * Context schema for validation and autocomplete in configuration UI
 */
export interface ContextSchema {
    type: 'boolean' | 'string' | 'number';
    description?: string;
    enum?: string[]; // For string types with fixed values
}

/**
 * Note: EditorRange is provided by Obsidian's API
 * Import from 'obsidian' when needed
 * Structure: { from: EditorPosition, to: EditorPosition }
 * where EditorPosition is { line: number, ch: number }
 */

// ─── Suggest Modal Private API Types ───

/**
 * Private chooser API on SuggestModal instances.
 * Obsidian's undocumented chooser object with navigation methods.
 */
export interface SuggestChooser {
    moveUp(event?: KeyboardEvent): void;
    moveDown(event?: KeyboardEvent): void;
}

/**
 * Extended SuggestModal shape exposing the private chooser property.
 * Use: `(instance as unknown as SuggestModalWithChooser).chooser`
 */
export interface SuggestModalWithChooser extends SuggestModal<unknown> {
    chooser: SuggestChooser;
    inputEl: HTMLInputElement;
}

// ─── Suggest Modal Operation Interfaces ───

/**
 * Selection range for single-line input fields.
 * from/to are character offsets (0-indexed).
 */
export interface InputSelection {
    from: number;
    to: number;
}

/**
 * Wraps suggestion list navigation (chooser.moveUp/moveDown).
 * Implemented by SuggestModalProxy; consumed by helper functions in suggest-commands.ts.
 */
export interface SuggestionSelector {
    moveUp(event?: KeyboardEvent): void;
    moveDown(event?: KeyboardEvent): void;
}

/**
 * Primitive text input operations on a modal's inputEl (HTMLInputElement).
 * Exposes basic elements — high-level operations (kill, yank, word movement)
 * are implemented as helper functions in suggest-commands.ts.
 * Implemented by SuggestModalProxy; consumed by helper functions.
 */
export interface InputFieldEditor {
    getSelection(): InputSelection;
    setSelection(selection: InputSelection): void;
    getText(): string;
    getTextLength(): number;
    insertText(text: string, from: number, to?: number): void;
    deleteText(from: number, to: number): void;
}

// --- Private API types (Obsidian internals) ---
// See .ai/Obsidian-private-api/focus-elements.md for investigation details

import type { MarkdownView, MarkdownSubView } from 'obsidian';

/** Private: MarkdownView.currentMode (MarkdownSubView in source/live preview mode) */
export interface MarkdownEditMode extends MarkdownSubView {
    editor: MarkdownEditModeEditor;
    search: MarkdownEditModeSearch;
    containerEl: HTMLElement;
    editorEl: HTMLElement;
}

/** Private: currentMode.editor — wraps CM6 EditorView */
export interface MarkdownEditModeEditor {
    containerEl: HTMLElement; // div.cm-editor
}

/** Private: currentMode.search — find/replace component */
export interface MarkdownEditModeSearch {
    searchInputEl: HTMLInputElement;
    replaceInputEl: HTMLInputElement;
    searchContainerEl: HTMLElement;
    isActive: boolean;
}

/** Private: extends MarkdownView with currentMode access */
export interface MarkdownViewWithMode extends MarkdownView {
    currentMode: MarkdownEditMode;
}
