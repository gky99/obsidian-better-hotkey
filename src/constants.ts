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

/**
 * Cursor movement command IDs (Dev Plan 2.3.2)
 * CM6 Direct Call — each wraps a @codemirror/commands function
 */
export const CURSOR_MOVEMENT_COMMANDS = {
	FORWARD_CHAR: "editor:forward-char",
	BACKWARD_CHAR: "editor:backward-char",
	NEXT_LINE: "editor:next-line",
	PREVIOUS_LINE: "editor:previous-line",
	MOVE_BEGINNING_OF_LINE: "editor:move-beginning-of-line",
	MOVE_END_OF_LINE: "editor:move-end-of-line",
	FORWARD_WORD: "editor:forward-word",
	BACKWARD_WORD: "editor:backward-word",
	SCROLL_UP: "editor:scroll-up",
	SCROLL_DOWN: "editor:scroll-down",
	BEGINNING_OF_BUFFER: "editor:beginning-of-buffer",
	END_OF_BUFFER: "editor:end-of-buffer",
} as const;
