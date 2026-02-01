/**
 * Shared data types for Obsidian Better Hotkey plugin
 * Based on Design Documents/Data Types.md
 */

import type { ExecutionContext } from "./components/execution-context/ExecutionContext";

/**
 * Represents a normalized key press event
 * Character-based matching by default
 */
export interface KeyPress {
	modifiers: Set<'ctrl' | 'alt' | 'shift' | 'meta'>;
	key: string; // Character-based, e.g., "x", "s", "/"
	code: string; // Physical key code, e.g., "KeyX", "KeyS", "Space"
}

/**
 * Represents a single hotkey entry in the configuration
 * Note: priority should not be serialized in config files - it's applied during registration
 */
export interface HotkeyEntry {
	command: string; // "editor:save" or "-editor:save" for removal
	key: KeyPress[]; // Key sequence array
	when?: string; // Context condition: "editorFocused && !suggestionModalRendered"
	args?: Record<string, unknown>;
	priority: Priority; // Priority level for conflict resolution
}

/**
 * Represents a hotkey preset configuration
 */
export interface HotkeyPreset {
	name: string;
	description: string;
	version: string;
	author?: string;
	hotkeys: HotkeyEntry[];
}

/**
 * Priority levels for hotkey resolution
 * Lower number = higher priority
 */
export enum Priority {
	User = 0, // Highest
	Preset = 1,
	Plugin = 2, // Lowest
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
	execute(args?: Record<string, unknown>, context?: ExecutionContext): void | Promise<void>;
}

/**
 * Disposable pattern for cleanup
 */
export interface Disposable {
	dispose(): void;
}

/**
 * Lightweight preset info for listing without loading all hotkeys
 */
export type HotkeyPresetMeta = Omit<HotkeyPreset, 'hotkeys'>;

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
