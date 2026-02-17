/**
 * Hotkey string parsing and canonical key representation utilities
 */

import type { KeyPress } from '../types';

/**
 * Valid modifier names accepted in string notation
 */
export const VALID_MODIFIERS: ReadonlySet<string> = new Set(["ctrl", "alt", "shift", "meta"]);

/**
 * Maps special key names in string notation to their KeyPress.key values.
 * Keys not in this map are lowercased as-is.
 */
export const SPECIAL_KEY_MAP = {
	space: " ",
	backspace: "Backspace",
	tab: "Tab",
	enter: "Enter",
	escape: "Escape",
	delete: "Delete",
	up: "ArrowUp",
	down: "ArrowDown",
	left: "ArrowLeft",
	right: "ArrowRight",
} as const;

type Modifier = 'ctrl' | 'alt' | 'shift' | 'meta';

/**
 * Parses a human-readable hotkey string notation into a KeyPress sequence.
 *
 * Format: "modifier+key" for single keys, "modifier+key modifier+key" for chords.
 * Examples:
 *   - "ctrl+k" → single key with Ctrl modifier
 *   - "ctrl+x ctrl+s" → two-step chord
 *   - "ctrl+x b" → chord with bare second step (no modifier)
 *   - "escape" → bare special key
 *
 * @param notation - Human-readable hotkey string
 * @returns Array of KeyPress objects (1 or 2 for chords)
 * @throws Error if notation is invalid (empty, bad modifier, >2 steps, etc.)
 */
export function parseHotkeyString(notation: string): KeyPress[] {
	const trimmed = notation.trim();
	if (trimmed === "") {
		throw new Error("Hotkey notation cannot be empty");
	}

	const steps = trimmed.split(" ");
	if (steps.length > 2) {
		throw new Error(`Chord sequences support at most 2 steps, got ${steps.length}: "${notation}"`);
	}

	const result: KeyPress[] = [];
	for (const step of steps) {
		result.push(parseStep(step));
	}
	return result;
}

/**
 * Parses a single chord step (e.g., "ctrl+x" or "b")
 */
function parseStep(step: string): KeyPress {
	const parts = step.split("+");
	const keyPart = parts[parts.length - 1];

	if (keyPart === undefined || keyPart === "") {
		throw new Error(`Plus sign cannot be used as a base key: "${step}"`);
	}

	const modifiers = new Set<Modifier>();
	for (let i = 0; i < parts.length - 1; i++) {
		const mod = parts[i]!.toLowerCase();
		if (!VALID_MODIFIERS.has(mod)) {
			throw new Error(`Invalid modifier "${parts[i]!}" in "${step}". Valid modifiers: ctrl, alt, shift, meta`);
		}
		modifiers.add(mod as Modifier);
	}

	const lowerKey = keyPart.toLowerCase();
	const key = lowerKey in SPECIAL_KEY_MAP
		? SPECIAL_KEY_MAP[lowerKey as keyof typeof SPECIAL_KEY_MAP]
		: lowerKey;

	return {
		modifiers,
		key,
		code: "",
	};
}

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
