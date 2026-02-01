/**
 * Hotkey Manager Component
 * Responsibility: Manage hotkey table, coordinate with Matcher for updates
 * Based on Architecture.md § 3 - Hotkey Context
 */

import type { HotkeyEntry, Priority } from "../../types";
import { canonicalizeSequence } from "../../utils/hotkey";

/**
 * Create composite key from hotkey entry
 * Format: ${canonicalSequence}::${commandName}
 */
function makeCompositeKey(entry: HotkeyEntry): string {
	const canonical = canonicalizeSequence(entry.key);
	return `${canonical}::${entry.command}`;
}

export class HotkeyManager {
	/**
	 * Source hotkey table, keyed by composite key: ${canonicalSequence}::${commandName}
	 */
	private hotkeyTable: Map<string, HotkeyEntry> = new Map();
	private onChange: ((entries: HotkeyEntry[]) => void) | null = null;

	/**
	 * Set the onChange callback for table mutations
	 * Typically wired to HotkeyMatcher.rebuild() during initialization
	 */
	setOnChange(callback: (entries: HotkeyEntry[]) => void): void {
		this.onChange = callback;
	}

	/**
	 * Add hotkey to table with specified priority and trigger onChange callback
	 */
	insert(entry: HotkeyEntry, priority: Priority): void {
		const key = makeCompositeKey(entry);

		// Create a new entry with the specified priority
		const entryWithPriority: HotkeyEntry = {
			...entry,
			priority,
		};

		this.hotkeyTable.set(key, entryWithPriority);
		// TODO: Implement manual reindex for batch update (Phase 2)
		this.triggerOnChange();
	}

	/**
	 * Remove hotkey from table and trigger onChange callback
	 */
	remove(entry: HotkeyEntry): void {
		const key = makeCompositeKey(entry);
		this.hotkeyTable.delete(key);
		this.triggerOnChange();
	}

	/**
	 * Clear all hotkeys (or specific priority level)
	 */
	clear(priority?: Priority): void {
		if (priority !== undefined) {
			// Clear only entries with the specified priority
			for (const [key, entry] of this.hotkeyTable.entries()) {
				if (entry.priority === priority) {
					this.hotkeyTable.delete(key);
				}
			}
		} else {
			// Clear all entries
			this.hotkeyTable.clear();
		}
		this.triggerOnChange();
	}

	/**
	 * Get all hotkey entries
	 */
	getAll(): HotkeyEntry[] {
		return Array.from(this.hotkeyTable.values());
	}

	/**
	 * Trigger onChange callback with current hotkey table
	 */
	private triggerOnChange(): void {
		if (this.onChange) {
			const entries = this.getAll();
			this.onChange(entries);
		}
	}
}
