/**
 * Default Emacs-like Preset
 * Phase 1 test hotkeys for validation
 */

import type { HotkeyPreset, KeyPress } from "../types";
import { Priority } from "../types";
import { COMMAND_NAMES } from "../constants";

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
	],
};
