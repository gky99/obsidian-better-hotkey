/**
 * Constants for command IDs and other shared values
 */

/**
 * Command names used throughout the application
 */
export const COMMAND_NAMES = {
	YANK: "editor:yank",
	YANK_POP: "editor:yank-pop",
	DELETE_WORD: "editor:delete-word",
	TEST_CHORD_X: "test:chord-x",
	TEST_SAVE: "test:save",
} as const;

/**
 * Context keys used by components
 */
export const CONTEXT_KEYS = {
	LAST_ACTION_WAS_YANK: "lastActionWasYank",
} as const;
