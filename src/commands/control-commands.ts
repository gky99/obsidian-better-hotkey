/**
 * Control Commands (Dev Plan 2.3.5)
 * 3 commands: keyboard-quit, recenter-top-bottom, undo
 * Custom implementation / Obsidian API delegation.
 */

import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import type { Command } from "../types";
import type { ExecutionContext } from "../components/execution-context/ExecutionContext";
import { contextEngine } from "../components/ContextEngine";
import { CONTROL_COMMANDS, CONTEXT_KEYS } from "../constants";

export function createControlCommands(): Command[] {
	return [
		{
			id: CONTROL_COMMANDS.KEYBOARD_QUIT,
			name: "Keyboard Quit",
			execute: (
				_args?: Record<string, unknown>,
				context?: ExecutionContext,
			) => {
				if (!context) return;
				contextEngine.setContext(
					CONTEXT_KEYS.LAST_ACTION_WAS_YANK,
					false,
				);
				const view = context.workspaceContext
					.getEditorProxy()
					.getEditorView();
				if (view) {
					const { state } = view;
					const cursors = state.selection.ranges.map(
						(r: { head: number }) =>
							EditorSelection.cursor(r.head),
					);
					view.dispatch({
						selection: EditorSelection.create(cursors),
					});
				}
			},
		},
		{
			id: CONTROL_COMMANDS.RECENTER_TOP_BOTTOM,
			name: "Recenter Top Bottom",
			execute: (
				_args?: Record<string, unknown>,
				context?: ExecutionContext,
			) => {
				if (!context) return;
				const view = context.workspaceContext
					.getEditorProxy()
					.getEditorView();
				if (!view) return;
				const current =
					(contextEngine.getContext(
						CONTEXT_KEYS.RECENTER_CYCLE_POSITION,
					) as number) ?? 0;
				const positions = ["center", "start", "end"] as const;
				view.dispatch({
					effects: EditorView.scrollIntoView(
						view.state.selection.main.head,
						{ y: positions[current] },
					),
				});
				contextEngine.setContext(
					CONTEXT_KEYS.RECENTER_CYCLE_POSITION,
					(current + 1) % 3,
				);
			},
		},
		{
			id: CONTROL_COMMANDS.UNDO,
			name: "Undo",
			execute: (
				_args?: Record<string, unknown>,
				context?: ExecutionContext,
			) => {
				if (!context) return;
				const editor = context.workspaceContext
					.getEditorProxy()
					.getEditor();
				if (editor) editor.undo();
			},
		},
	];
}
