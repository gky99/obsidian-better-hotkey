/**
 * Canonical key representation utilities
 *
 * NOTE: This is a temporary implementation for the MVP.
 * The canonicalization strategy may be optimized or changed in future iterations.
 */

import type { KeyPress } from '../types';

/**
 * Converts a KeyPress to a canonical string representation.
 *
 * Format: Modifiers are represented in consistent order (C-M-A-S) followed by the key.
 * Examples:
 *   - Ctrl+X -> "C-x"
 *   - Ctrl+Shift+X -> "C-S-x"
 *   - Ctrl+Meta+Alt+Shift+X -> "C-M-A-S-x"
 *
 * @param keyPress - The KeyPress object to canonicalize
 * @returns Canonical string representation
 */
export function canonicalizeKeyPress(keyPress: KeyPress): string {
	const parts: string[] = [];

	// Add modifiers in consistent order: Ctrl, Meta, Alt, Shift
	if (keyPress.modifiers.has('ctrl')) {
		parts.push('C');
	}
	if (keyPress.modifiers.has('meta')) {
		parts.push('M');
	}
	if (keyPress.modifiers.has('alt')) {
		parts.push('A');
	}
	if (keyPress.modifiers.has('shift')) {
		parts.push('S');
	}

	// Add the key itself
	parts.push(keyPress.key);

	return parts.join('-');
}

/**
 * Converts a key sequence (array of KeyPress) to a canonical string representation.
 *
 * Format: Individual key presses joined with space.
 * Example: Ctrl+X followed by Ctrl+S -> "C-x C-s"
 *
 * @param sequence - Array of KeyPress objects
 * @returns Canonical string representation of the sequence
 */
export function canonicalizeSequence(sequence: KeyPress[]): string {
	return sequence.map(canonicalizeKeyPress).join(' ');
}
