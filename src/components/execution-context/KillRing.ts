/**
 * Kill Ring Component
 * Responsibility: Store killed text, manage yank cycling, sync with system clipboard
 * Based on Architecture.md § 3 - Execution Context
 */

import type { EditorRange } from "obsidian";
import { contextEngine } from "../ContextEngine";
import { COMMAND_NAMES, CONTEXT_KEYS } from "../../constants";

export class KillRing {
	private entries: string[] = [];
	private maxSize: number;
	private yankCyclePointer: number = 0;
	private lastYankRange: EditorRange | null = null;

	constructor(maxSize = 60) {
		this.maxSize = maxSize;
	}

	/**
	 * Add text to ring head, sync to clipboard
	 */
	push(text: string): void {
		if (!text || text.length === 0) {
			return; // Don't add empty strings
		}

		// Add to front of ring
		this.entries.unshift(text);

		// Enforce max size
		if (this.entries.length > this.maxSize) {
			this.entries.pop();
		}

		// Sync to system clipboard
		this.syncToClipboard(text);

		// Reset yank state when new content is killed
		this.resetPointer();
	}

	/**
	 * Get text for yank operation
	 * Checks clipboard for external copy detection
	 */
	async yank(): Promise<string | null> {
		// Check if clipboard has new content
		await this.syncFromClipboard();

		if (this.entries.length === 0) {
			return null;
		}

		// Reset pointer to start of ring
		this.resetPointer();

		return this.entries[this.yankCyclePointer] ?? null;
	}

	/**
	 * Get next text in ring for cycling
	 * Must be called after yank and while lastActionWasYank is true
	 */
	yankPop(): string | null {
		// TODO should be checked in yankPop command
		if (!this.lastActionWasYank() || this.entries.length === 0) {
			return null;
		}

		// Advance to next entry
		this.advancePointer();
		return this.entries[this.yankCyclePointer] ?? null;
	}

	/**
	 * Store range after yank/yank-pop for replacement
	 */
	setYankRange(range: EditorRange): void {
		this.lastYankRange = range;
	}

	/**
	 * Get stored range for replacement
	 */
	getYankRange(): EditorRange | null {
		return this.lastYankRange;
	}

	/**
	 * Get lastActionWasYank flag from context engine
	 * Returns false if not set (default value)
	 */
	private lastActionWasYank(): boolean {
		const value = contextEngine.getContext(CONTEXT_KEYS.LAST_ACTION_WAS_YANK);
		return Boolean(value);
	}

	/**
	 * Update lastActionWasYank based on current command
	 * Should be true when:
	 * - Current command is a YANK command
	 * - OR current command is YANK_POP AND last action was already YANK or YANK_POP
	 */
	updateLastActionWasYank(command: string): void {
		const isYankCommand = command === COMMAND_NAMES.YANK;
		const isYankPopAfterYank =
			command === COMMAND_NAMES.YANK_POP && this.lastActionWasYank();

		const isValidYank = isYankCommand || isYankPopAfterYank;

		contextEngine.setContext(
			CONTEXT_KEYS.LAST_ACTION_WAS_YANK,
			isValidYank,
		);

		if (!isValidYank) {
			this.resetPointer();
			this.lastYankRange = null;
		}
	}

	/**
	 * Get all entries (for kill ring browser UI)
	 */
	getEntries(): readonly string[] {
		return this.entries; // Return copy
	}

	/**
	 * Set max size of the ring buffer
	 */
	setMaxSize(size: number): void {
		this.maxSize = size;
		// Trim if needed
		if (this.entries.length > this.maxSize) {
			this.entries = this.entries.slice(0, this.maxSize);
		}
	}

	/**
	 * Move pointer to next entry (wraps around)
	 */
	private advancePointer(): void {
		if (this.entries.length === 0) return;
		this.yankCyclePointer =
			(this.yankCyclePointer + 1) % this.entries.length;
	}

	/**
	 * Reset pointer to start
	 */
	private resetPointer(): void {
		this.yankCyclePointer = 0;
	}

	/**
	 * Write text to system clipboard
	 */
	private async syncToClipboard(text: string): Promise<void> {
		try {
			if (!navigator.clipboard) {
				throw new Error("Clipboard API not available");
			}
			await navigator.clipboard.writeText(text);
		} catch (error) {
			console.error("Failed to sync to clipboard:", error);
		}
	}

	/**
	 * Check if clipboard matches ring head
	 * If clipboard has new content, add it to the ring
	 */
	private async syncFromClipboard(): Promise<boolean> {
		try {
			if (!navigator.clipboard) {
				throw new Error("Clipboard API not available");
			}
			const clipboardText = await navigator.clipboard.readText();

			// If clipboard is empty or matches ring head, no sync needed
			if (!clipboardText || clipboardText === this.entries[0]) {
				return true;
			}

			// Clipboard has new content - add to ring
			// (This handles external copy operations)
			this.entries.unshift(clipboardText);

			// Enforce max size
			if (this.entries.length > this.maxSize) {
				this.entries.pop();
			}

			return false; // Clipboard was out of sync
		} catch (error) {
			console.error("Failed to check clipboard sync:", error);
			return true; // Assume in sync on error
		}
	}
}
