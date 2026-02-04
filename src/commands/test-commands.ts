/**
 * Test Commands for Phase 1
 * These commands demonstrate the integrated pipeline functionality
 */

import type { Command } from "../types";
import type { ExecutionContext } from "../components/execution-context/ExecutionContext";
import { COMMAND_NAMES } from "../constants";

export function createTestCommands(): Command[] {
	return [
		{
			id: COMMAND_NAMES.TEST_CHORD_X,
			name: "Test Chord X",
			execute: () => {
				console.log("Chord C-x pressed!");
				// InputHandler will track lastActionWasYank
			},
		},
		{
			id: COMMAND_NAMES.TEST_SAVE,
			name: "Test Save (C-x C-s)",
			execute: () => {
				console.log("Save command executed!");
				// InputHandler will track lastActionWasYank
			},
		},
		{
			id: COMMAND_NAMES.DELETE_WORD,
			name: "Delete Word",
			execute: (_args, context: ExecutionContext) => {
				if (!context) return;

				const result = context.workspaceContext.getTextAtCursor("word");
				if (result) {
					context.workspaceContext.deleteRange(result.range);
					context.killRing.push(result.text);
				}
				// InputHandler will track lastActionWasYank
			},
		},
		{
			id: COMMAND_NAMES.YANK,
			name: "Yank",
			execute: async (_args, context) => {
				if (!context) return;

				const text = await context.killRing.yank();
				if (text) {
					const range = context.workspaceContext.insertAtCursor(text);
					if (range) context.killRing.setYankRange(range);
				}
				console.log(text);
				// InputHandler will track lastActionWasYank
			},
		},
	];
}
