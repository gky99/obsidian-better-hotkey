/**
 * Default Emacs-like Preset
 * Phase 1 test hotkeys for validation
 */

import type { HotkeyPreset, KeyPress } from "../types";
import { Priority } from "../types";
import { COMMAND_NAMES, CURSOR_MOVEMENT_COMMANDS } from "../constants";

/**
 * Helper to create a KeyPress object
 */
function key(
	character: string,
	modifiers: ("ctrl" | "meta" | "alt" | "shift")[] = [],
): KeyPress {
	return {
		modifiers: new Set(modifiers),
		key: character,
		code: "", // Code not used in Phase 1
	};
}

export const defaultPreset: HotkeyPreset = {
	name: "Default Emacs-like Preset",
	version: "1.0.0",
	description: "Basic Emacs keybindings for Phase 1 testing",
	hotkeys: [
		// Two key sequence: C-x C-s
		{
			command: COMMAND_NAMES.TEST_SAVE,
			key: [key("x", ["ctrl"]), key("s", ["ctrl"])],
			priority: Priority.Preset,
		},

		// Kill/yank commands
		{
			command: COMMAND_NAMES.DELETE_WORD,
			key: [key("d", ["meta"])],
			priority: Priority.Preset,
		},
		{
			command: COMMAND_NAMES.YANK,
			key: [key("y", ["ctrl"])],
			priority: Priority.Preset,
		},

		// Cursor movement commands (2.3.2)
		{
			command: CURSOR_MOVEMENT_COMMANDS.FORWARD_CHAR,
			key: [key("f", ["ctrl"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.BACKWARD_CHAR,
			key: [key("b", ["ctrl"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.NEXT_LINE,
			key: [key("n", ["ctrl"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.PREVIOUS_LINE,
			key: [key("p", ["ctrl"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.MOVE_BEGINNING_OF_LINE,
			key: [key("a", ["ctrl"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.MOVE_END_OF_LINE,
			key: [key("e", ["ctrl"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.FORWARD_WORD,
			key: [key("f", ["meta"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.BACKWARD_WORD,
			key: [key("b", ["meta"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.SCROLL_UP,
			key: [key("v", ["ctrl"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.SCROLL_DOWN,
			key: [key("v", ["meta"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.BEGINNING_OF_BUFFER,
			key: [key(",", ["shift", "meta"])],
			priority: Priority.Preset,
		},
		{
			command: CURSOR_MOVEMENT_COMMANDS.END_OF_BUFFER,
			key: [key(".", ["shift", "meta"])],
			priority: Priority.Preset,
		},
	],
};
