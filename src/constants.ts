/**
 * Constants for command IDs and other shared values
 */

/**
 * Kill & Yank command IDs (Dev Plan 2.3.1)
 * Custom implementation — Kill Ring integration, word boundary computation
 */
export const KILL_YANK_COMMANDS = {
	KILL_LINE: "editor:kill-line",
	KILL_REGION: "editor:kill-region",
	KILL_WORD: "editor:kill-word",
	BACKWARD_KILL_WORD: "editor:backward-kill-word",
	COPY_REGION: "editor:copy-region",
	YANK: "editor:yank",
	YANK_POP: "editor:yank-pop",
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
