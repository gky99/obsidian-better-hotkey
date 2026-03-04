/**
 * Hotkey string parsing and canonical key representation utilities
 */

import type { KeyPress } from '../types';

/**
 * Valid modifier names accepted in string notation
 */
export const VALID_MODIFIERS: ReadonlySet<string> = new Set([
    'ctrl',
    'alt',
    'shift',
    'meta',
]);

/**
 * Special key tokens that pass through as-is (token = KeyboardEvent.key value).
 * Used in config notation and hotkey settings display.
 * All tokens use UpperCamelCase matching KeyboardEvent.key.
 */
export const SPECIAL_KEYS: ReadonlySet<string> = new Set([
    'Backspace',
    'Tab',
    'Enter',
    'Escape',
    'Delete',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'PageUp',
    'PageDown',
    'Home',
    'End',
    'F1',
    'F2',
    'F3',
    'F4',
    'F5',
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
    'F11',
    'F12',
]);

/**
 * Special key tokens that require translation to their KeyboardEvent.key value.
 * 'Space' is the only exception: config token is 'Space', KeyPress.key is ' '.
 */
export const SPECIAL_KEY_TRANSLATIONS = {
    Space: ' ',
} as const;

/**
 * Maps KeyPress.key values (KeyboardEvent.key) to their physical key codes.
 * Used by HotkeyManager to translate keys not in the Keyboard Layout Service
 * (which only covers letter/symbol/digit keys from the layout map).
 */
export const SPECIAL_KEY_CODE_MAP: Record<string, string> = {
    ' ': 'Space',
    Backspace: 'Backspace',
    Tab: 'Tab',
    Enter: 'Enter',
    Escape: 'Escape',
    Delete: 'Delete',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Home: 'Home',
    End: 'End',
    F1: 'F1',
    F2: 'F2',
    F3: 'F3',
    F4: 'F4',
    F5: 'F5',
    F6: 'F6',
    F7: 'F7',
    F8: 'F8',
    F9: 'F9',
    F10: 'F10',
    F11: 'F11',
    F12: 'F12',
};

type Modifier = 'ctrl' | 'alt' | 'shift' | 'meta';

/**
 * Parses a human-readable hotkey string notation into a KeyPress sequence.
 *
 * Format: "modifier+key" for single keys, "modifier+key modifier+key" for chords.
 * Examples:
 *   - "ctrl+k" → single key with Ctrl modifier
 *   - "ctrl+x ctrl+s" → two-step chord
 *   - "ctrl+x b" → chord with bare second step (no modifier)
 *   - "Escape" → bare special key
 *
 * @param notation - Human-readable hotkey string
 * @returns Array of KeyPress objects (1 or 2 for chords)
 * @throws Error if notation is invalid (empty, bad modifier, >2 steps, etc.)
 */
export function parseHotkeyString(notation: string): KeyPress[] {
    const trimmed = notation.trim();
    if (trimmed === '') {
        throw new Error('Hotkey notation cannot be empty');
    }

    const steps = trimmed.split(' ');
    if (steps.length > 2) {
        throw new Error(
            `Chord sequences support at most 2 steps, got ${steps.length}: "${notation}"`,
        );
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
    const parts = step.split('+');
    const keyPart = parts[parts.length - 1];

    if (keyPart === undefined || keyPart === '') {
        throw new Error(`Plus sign cannot be used as a base key: "${step}"`);
    }

    const modifiers = new Set<Modifier>();
    for (let i = 0; i < parts.length - 1; i++) {
        const mod = parts[i]!.toLowerCase();
        if (!VALID_MODIFIERS.has(mod)) {
            throw new Error(
                `Invalid modifier "${parts[i]!}" in "${step}". Valid modifiers: ctrl, alt, shift, meta`,
            );
        }
        modifiers.add(mod as Modifier);
    }

    const key =
        keyPart in SPECIAL_KEY_TRANSLATIONS
            ? SPECIAL_KEY_TRANSLATIONS[
                  keyPart as keyof typeof SPECIAL_KEY_TRANSLATIONS
              ]
            : SPECIAL_KEYS.has(keyPart)
              ? keyPart
              : keyPart.toLowerCase();

    return {
        modifiers,
        key,
        code: '',
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

/**
 * Converts a KeyPress to a canonical string using the physical key code.
 * Used by HotkeyMatcher for code-based matching.
 *
 * Format: Same modifier order as canonicalizeKeyPress (C-M-A-S) but uses code instead of key.
 * Examples:
 *   - Ctrl+KeyX -> "C-KeyX"
 *   - Ctrl+Shift+KeyX -> "C-S-KeyX"
 */
export function canonicalizeKeyPressByCode(keyPress: KeyPress): string {
    const parts: string[] = [];

    if (keyPress.modifiers.has('ctrl')) parts.push('C');
    if (keyPress.modifiers.has('meta')) parts.push('M');
    if (keyPress.modifiers.has('alt')) parts.push('A');
    if (keyPress.modifiers.has('shift')) parts.push('S');

    parts.push(keyPress.code);

    return parts.join('-');
}

/**
 * Converts a key sequence to a canonical string using physical key codes.
 * Used by HotkeyMatcher for code-based matching table keys.
 */
export function canonicalizeSequenceByCode(sequence: KeyPress[]): string {
    return sequence.map(canonicalizeKeyPressByCode).join(' ');
}
