/**
 * Hotkey Matcher Component
 * Responsibility: Match sequences to hotkeys, resolve priority
 * Based on Design Documents/Components/Hotkey Matcher.md
 */

import type { KeyPress, HotkeyEntry, MatchResult } from "../../types";
import { canonicalizeSequence } from "../../utils/hotkey";
import { contextEngine } from "../ContextEngine";

/**
 * Matching table structure: Map from canonical sequence to array of hotkey entries
 * Multiple entries can exist for the same sequence (different commands, priorities)
 */
type MatchingTable = Map<string, HotkeyEntry[]>;

export class HotkeyMatcher {
	private matchingTable: MatchingTable = new Map();

	/**
	 * Match sequence against matching table
	 * Uses Context Engine for "when" clause filtering
	 */
	match(sequence: KeyPress[]): MatchResult {
		const canonical = canonicalizeSequence(sequence);

		// Check for exact match
		const exactMatches = this.matchingTable.get(canonical);
		if (exactMatches && exactMatches.length > 0) {
			const candidates = this.findCandidates(sequence);
			if (candidates.length > 0) {
				const entry = this.selectHighestPriority(candidates);
				return { type: "exact", entry };
			}
		}

		// Check for prefix match
		if (this.hasPrefix(sequence)) {
			return { type: "prefix" };
		}

		// No match
		const isChord = this.isChord(sequence);
		return { type: "none", isChord };
	}

	/**
	 * Check if key is escape
	 * TODO: Support custom hotkey to synthesize escape event
	 */
	isEscape(key: KeyPress): boolean {
		return key.key === "Escape";
	}

	/**
	 * Rebuild matching table from hotkey entries
	 */
	rebuild(entries: HotkeyEntry[]): void {
		this.matchingTable.clear();

		for (const entry of entries) {
			const canonical = canonicalizeSequence(entry.key);
			const existing = this.matchingTable.get(canonical) || [];
			existing.push(entry);
			this.matchingTable.set(canonical, existing);
		}
	}

	/**
	 * Find all matching entries for a sequence
	 * First filters by key sequence (matchingTable lookup)
	 * Then filters by "when" clause using Context Engine
	 */
	private findCandidates(sequence: KeyPress[]): HotkeyEntry[] {
		const canonical = canonicalizeSequence(sequence);
		const entries = this.matchingTable.get(canonical) || [];

		// Filter by "when" clause using Context Engine
		return contextEngine.filter(entries);
	}

	/**
	 * Select highest priority entry from candidates
	 * Lower priority number = higher priority (User=0, Preset=1, Plugin=2)
	 */
	private selectHighestPriority(entries: HotkeyEntry[]): HotkeyEntry {
		if (entries.length === 0) {
			throw new Error("Cannot select from empty entries array");
		}

		return entries.reduce((highest, current) => {
			return current.priority < highest.priority ? current : highest;
		});
	}

	/**
	 * Check if sequence has cached input (is part of a chord sequence)
	 * A chord means there was a previous keypress cached in the buffer
	 */
	private isChord(sequence: KeyPress[]): boolean {
		return sequence.length > 1;
	}

	/**
	 * Check if sequence is a prefix of any registered sequence
	 * Only checks when sequence has exactly one key press
	 */
	private hasPrefix(sequence: KeyPress[]): boolean {
		if (sequence.length === 1) {
			const canonical = canonicalizeSequence(sequence);
			for (const key of this.matchingTable.keys()) {
				if (key.startsWith(canonical + " ")) {
					return true;
				}
			}
		}

		return false;
	}
}
