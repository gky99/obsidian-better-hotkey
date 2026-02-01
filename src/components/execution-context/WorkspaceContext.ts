/**
 * Workspace Context Component
 * Responsibility: Aggregates workspace-related state tracking and editor operations.
 * Provides unified access to Obsidian UI state and the active editor for commands.
 *
 * Future expansion (deferred):
 * - Suggestion Modal Context: Detect modal open/close by patching SuggestModal
 * - Popover Suggestions Context: Detect popover open/close by patching PopoverSuggest
 * - Last Active MarkdownView: Track last focused markdown editor view
 */

import type { App, Editor, EditorRange, EditorPosition } from "obsidian";
import { MarkdownView } from "obsidian";

export class WorkspaceContext {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Get the active editor instance
	 */
	private getActiveEditor(): Editor | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		return view?.editor ?? null;
	}

	/**
	 * Check if text is selected
	 */
	hasSelection(): boolean {
		const editor = this.getActiveEditor();
		if (!editor) return false;
		return editor.somethingSelected();
	}

	/**
	 * Get selected text
	 */
	getSelection(): string {
		const editor = this.getActiveEditor();
		if (!editor) return "";
		return editor.getSelection();
	}

	/**
	 * Get selection range
	 */
	getSelectionRange(): EditorRange | null {
		const editor = this.getActiveEditor();
		if (!editor) return null;

		return {
			from: editor.getCursor("from"),
			to: editor.getCursor("to"),
		};
	}

	/**
	 * Get text at cursor by unit (char, word, line)
	 */
	getTextAtCursor(unit: 'char' | 'word' | 'line'): { text: string; range: EditorRange } | null {
		const editor = this.getActiveEditor();
		if (!editor) return null;

		const cursor = editor.getCursor();

		switch (unit) {
			case 'char': {
				// Get character at cursor
				const to: EditorPosition = { line: cursor.line, ch: cursor.ch + 1 };
				const text = editor.getRange(cursor, to);
				return { text, range: { from: cursor, to } };
			}

			case 'word': {
				// Get word at cursor
				const line = editor.getLine(cursor.line);
				const wordBoundary = this.findWordBoundary(line, cursor.ch);
				const from: EditorPosition = { line: cursor.line, ch: wordBoundary.start };
				const to: EditorPosition = { line: cursor.line, ch: wordBoundary.end };
				const text = editor.getRange(from, to);
				return { text, range: { from, to } };
			}

			case 'line': {
				// Get text from cursor to end of line
				const line = editor.getLine(cursor.line);
				const from = cursor;
				const to: EditorPosition = { line: cursor.line, ch: line.length };
				const text = editor.getRange(from, to);
				return { text, range: { from, to } };
			}

			default:
				return null;
		}
	}

	/**
	 * Delete text in range
	 */
	deleteRange(range: EditorRange): void {
		const editor = this.getActiveEditor();
		if (!editor) return;
		editor.replaceRange("", range.from, range.to);
	}

	/**
	 * Insert text at cursor, returns the inserted range
	 */
	insertAtCursor(text: string): EditorRange | null {
		const editor = this.getActiveEditor();
		if (!editor) return null;

		const cursor = editor.getCursor();
		editor.replaceRange(text, cursor);

		// Calculate end position
		const lines = text.split('\n');
		const lastLine = lines[lines.length - 1] ?? "";
		const to: EditorPosition = {
			line: cursor.line + lines.length - 1,
			ch: lines.length === 1
				? cursor.ch + text.length
				: lastLine.length,
		};

		return { from: cursor, to };
	}

	/**
	 * Replace text in range, returns the new range
	 */
	replaceRange(range: EditorRange, text: string): EditorRange | null {
		const editor = this.getActiveEditor();
		if (!editor) return null;

		editor.replaceRange(text, range.from, range.to);

		// Calculate end position
		const lines = text.split('\n');
		const lastLine = lines[lines.length - 1] ?? "";
		const to: EditorPosition = {
			line: range.from.line + lines.length - 1,
			ch: lines.length === 1
				? range.from.ch + text.length
				: lastLine.length,
		};

		return { from: range.from, to };
	}

	/**
	 * Check if editor has focus
	 */
	isFocused(): boolean {
		const editor = this.getActiveEditor();
		if (!editor) return false;

		// Check if the editor's container has focus
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return false;

		// Check if active element is within the editor
		const activeEl = document.activeElement;
		const editorEl = view.containerEl;
		return editorEl.contains(activeEl);
	}

	/**
	 * Find word boundary around a character position
	 * Returns start and end indices of the word
	 */
	private findWordBoundary(line: string, ch: number): { start: number; end: number } {
		// Word boundary characters (non-alphanumeric)
		const isWordChar = (c: string | undefined) => c !== undefined && /\w/.test(c);

		let start = ch;
		let end = ch;

		// Find start of word
		while (start > 0 && isWordChar(line[start - 1])) {
			start--;
		}

		// Find end of word
		while (end < line.length && isWordChar(line[end])) {
			end++;
		}

		return { start, end };
	}
}
