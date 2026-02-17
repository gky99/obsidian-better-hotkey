/**
 * MarkdownEditorProxy
 * Responsibility: Persistent wrapper tracking the last active MarkdownView.
 * Provides type-safe access to the Obsidian Editor and CM6 EditorView instances.
 * Created once by WorkspaceContext, updated via updateView() on active leaf changes.
 * Used by commands that need direct CM6 access (cursor movement, case transformation).
 */

import type { Editor } from "obsidian";
import { MarkdownView } from "obsidian";
import type { EditorView } from "@codemirror/view";

export class MarkdownEditorProxy {
	private view: MarkdownView | null;

	constructor(view: MarkdownView | null) {
		this.view = view;
	}

	/**
	 * Update the tracked MarkdownView.
	 * Called by WorkspaceContext when the active leaf switches to a markdown view.
	 */
	updateView(view: MarkdownView): void {
		this.view = view;
	}

	/**
	 * Check if the tracked MarkdownView is still visible in the workspace.
	 * Returns false if the view has been closed or if no view has been tracked yet.
	 */
	isVisible(): boolean {
		if (!this.view) return false;
		return this.view.containerEl.isShown();
	}

	/**
	 * Get the Obsidian Editor wrapper.
	 * Returns null if no view is tracked or the view is no longer visible.
	 */
	getEditor(): Editor | null {
		if (!this.isVisible()) return null;
		return this.view!.editor;
	}

	/**
	 * Get the CM6 EditorView instance for direct CM6 command calls.
	 * Returns null if no view is tracked or the view is no longer visible.
	 */
	getEditorView(): EditorView | null {
		if (!this.isVisible()) return null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- EditorView access not in public Obsidian types
		return (this.view!.editor as any).cm as EditorView;
	}

	/**
	 * Get the underlying MarkdownView reference.
	 * May be null if no markdown view has been active since plugin load.
	 */
	getMarkdownView(): MarkdownView | null {
		return this.view;
	}
}
