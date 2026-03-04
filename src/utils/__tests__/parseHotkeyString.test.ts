import { describe, it, expect } from 'vitest';
import {
    parseHotkeyString,
    VALID_MODIFIERS,
    SPECIAL_KEYS,
    SPECIAL_KEY_TRANSLATIONS,
} from '../hotkey';

describe('parseHotkeyString', () => {
    describe('single key', () => {
        it('parses modifier+key: "ctrl+k"', () => {
            const result = parseHotkeyString('ctrl+k');
            expect(result).toHaveLength(1);
            expect(result[0]!.modifiers).toEqual(new Set(['ctrl']));
            expect(result[0]!.key).toBe('k');
            expect(result[0]!.code).toBe('');
        });

        it('parses two modifiers: "ctrl+shift+x"', () => {
            const result = parseHotkeyString('ctrl+shift+x');
            expect(result).toHaveLength(1);
            expect(result[0]!.modifiers).toEqual(new Set(['ctrl', 'shift']));
            expect(result[0]!.key).toBe('x');
        });

        it('parses all four modifiers: "ctrl+meta+alt+shift+x"', () => {
            const result = parseHotkeyString('ctrl+meta+alt+shift+x');
            expect(result).toHaveLength(1);
            expect(result[0]!.modifiers).toEqual(
                new Set(['ctrl', 'meta', 'alt', 'shift']),
            );
            expect(result[0]!.key).toBe('x');
        });

        it('parses bare special key without modifier: "Escape"', () => {
            const result = parseHotkeyString('Escape');
            expect(result).toHaveLength(1);
            expect(result[0]!.modifiers).toEqual(new Set());
            expect(result[0]!.key).toBe('Escape');
        });

        it('parses bare regular key without modifier: "a"', () => {
            const result = parseHotkeyString('a');
            expect(result).toHaveLength(1);
            expect(result[0]!.modifiers).toEqual(new Set());
            expect(result[0]!.key).toBe('a');
        });
    });

    describe('chord sequences', () => {
        it('parses two-step chord: "ctrl+x ctrl+s"', () => {
            const result = parseHotkeyString('ctrl+x ctrl+s');
            expect(result).toHaveLength(2);
            expect(result[0]!.modifiers).toEqual(new Set(['ctrl']));
            expect(result[0]!.key).toBe('x');
            expect(result[1]!.modifiers).toEqual(new Set(['ctrl']));
            expect(result[1]!.key).toBe('s');
        });

        it('parses chord with bare second step: "ctrl+x b"', () => {
            const result = parseHotkeyString('ctrl+x b');
            expect(result).toHaveLength(2);
            expect(result[0]!.modifiers).toEqual(new Set(['ctrl']));
            expect(result[0]!.key).toBe('x');
            expect(result[1]!.modifiers).toEqual(new Set());
            expect(result[1]!.key).toBe('b');
        });

        it('parses chord with different modifiers per step: "ctrl+x meta+f"', () => {
            const result = parseHotkeyString('ctrl+x meta+f');
            expect(result).toHaveLength(2);
            expect(result[0]!.modifiers).toEqual(new Set(['ctrl']));
            expect(result[0]!.key).toBe('x');
            expect(result[1]!.modifiers).toEqual(new Set(['meta']));
            expect(result[1]!.key).toBe('f');
        });
    });

    describe('special keys', () => {
        it('maps "Space" to " " (literal space)', () => {
            const result = parseHotkeyString('Space');
            expect(result[0]!.key).toBe(' ');
        });

        it('maps "Backspace" to "Backspace"', () => {
            const result = parseHotkeyString('Backspace');
            expect(result[0]!.key).toBe('Backspace');
        });

        it('maps "Tab" to "Tab"', () => {
            const result = parseHotkeyString('Tab');
            expect(result[0]!.key).toBe('Tab');
        });

        it('maps "Enter" to "Enter"', () => {
            const result = parseHotkeyString('Enter');
            expect(result[0]!.key).toBe('Enter');
        });

        it('maps "Delete" to "Delete"', () => {
            const result = parseHotkeyString('Delete');
            expect(result[0]!.key).toBe('Delete');
        });

        it('maps arrow keys correctly', () => {
            expect(parseHotkeyString('ArrowUp')[0]!.key).toBe('ArrowUp');
            expect(parseHotkeyString('ArrowDown')[0]!.key).toBe('ArrowDown');
            expect(parseHotkeyString('ArrowLeft')[0]!.key).toBe('ArrowLeft');
            expect(parseHotkeyString('ArrowRight')[0]!.key).toBe('ArrowRight');
        });

        it('maps page navigation keys correctly', () => {
            expect(parseHotkeyString('PageUp')[0]!.key).toBe('PageUp');
            expect(parseHotkeyString('PageDown')[0]!.key).toBe('PageDown');
            expect(parseHotkeyString('Home')[0]!.key).toBe('Home');
            expect(parseHotkeyString('End')[0]!.key).toBe('End');
        });

        it('maps function keys correctly', () => {
            expect(parseHotkeyString('F1')[0]!.key).toBe('F1');
            expect(parseHotkeyString('F12')[0]!.key).toBe('F12');
        });

        it('maps special keys with modifiers: "ctrl+Space"', () => {
            const result = parseHotkeyString('ctrl+Space');
            expect(result[0]!.modifiers).toEqual(new Set(['ctrl']));
            expect(result[0]!.key).toBe(' ');
        });

        it('maps special keys with modifiers: "alt+Backspace"', () => {
            const result = parseHotkeyString('alt+Backspace');
            expect(result[0]!.modifiers).toEqual(new Set(['alt']));
            expect(result[0]!.key).toBe('Backspace');
        });
    });

    describe('key normalization', () => {
        it('lowercases key: "ctrl+K" → "k"', () => {
            const result = parseHotkeyString('ctrl+K');
            expect(result[0]!.key).toBe('k');
        });

        it('special key keeps its UpperCamelCase: "Backspace" → "Backspace"', () => {
            const result = parseHotkeyString('Backspace');
            expect(result[0]!.key).toBe('Backspace');
        });

        it('preserves symbol keys: "ctrl+," → ","', () => {
            const result = parseHotkeyString('ctrl+,');
            expect(result[0]!.key).toBe(',');
        });

        it('handles "shift+meta+," correctly', () => {
            const result = parseHotkeyString('shift+meta+,');
            expect(result[0]!.modifiers).toEqual(new Set(['shift', 'meta']));
            expect(result[0]!.key).toBe(',');
        });
    });

    describe('modifier validation', () => {
        it('throws on invalid modifier: "control+x"', () => {
            expect(() => parseHotkeyString('control+x')).toThrow(
                /Invalid modifier "control"/,
            );
        });

        it('throws on misspelled modifier: "crtl+x"', () => {
            expect(() => parseHotkeyString('crtl+x')).toThrow(
                /Invalid modifier "crtl"/,
            );
        });
    });

    describe('edge cases', () => {
        it('throws on empty string', () => {
            expect(() => parseHotkeyString('')).toThrow(/cannot be empty/);
        });

        it('throws on whitespace-only string', () => {
            expect(() => parseHotkeyString('   ')).toThrow(/cannot be empty/);
        });

        it('throws on more than 2 chord steps', () => {
            expect(() => parseHotkeyString('ctrl+x ctrl+s ctrl+z')).toThrow(
                /at most 2 steps/,
            );
        });

        it('throws on "ctrl+" (plus as base key)', () => {
            expect(() => parseHotkeyString('ctrl+')).toThrow(
                /Plus sign cannot be used/,
            );
        });

        it('deduplicates duplicate modifiers: "ctrl+ctrl+x"', () => {
            const result = parseHotkeyString('ctrl+ctrl+x');
            expect(result[0]!.modifiers).toEqual(new Set(['ctrl']));
            expect(result[0]!.key).toBe('x');
        });

        it('trims whitespace from input', () => {
            const result = parseHotkeyString('  ctrl+k  ');
            expect(result).toHaveLength(1);
            expect(result[0]!.key).toBe('k');
        });
    });

    describe('constants', () => {
        it('VALID_MODIFIERS contains exactly 4 members', () => {
            expect(VALID_MODIFIERS.size).toBe(4);
            expect(VALID_MODIFIERS.has('ctrl')).toBe(true);
            expect(VALID_MODIFIERS.has('alt')).toBe(true);
            expect(VALID_MODIFIERS.has('shift')).toBe(true);
            expect(VALID_MODIFIERS.has('meta')).toBe(true);
        });

        it('SPECIAL_KEYS contains all identity-passthrough special keys', () => {
            expect(SPECIAL_KEYS.has('Backspace')).toBe(true);
            expect(SPECIAL_KEYS.has('Tab')).toBe(true);
            expect(SPECIAL_KEYS.has('Enter')).toBe(true);
            expect(SPECIAL_KEYS.has('Escape')).toBe(true);
            expect(SPECIAL_KEYS.has('Delete')).toBe(true);
            expect(SPECIAL_KEYS.has('ArrowUp')).toBe(true);
            expect(SPECIAL_KEYS.has('ArrowDown')).toBe(true);
            expect(SPECIAL_KEYS.has('ArrowLeft')).toBe(true);
            expect(SPECIAL_KEYS.has('ArrowRight')).toBe(true);
            expect(SPECIAL_KEYS.has('PageUp')).toBe(true);
            expect(SPECIAL_KEYS.has('PageDown')).toBe(true);
            expect(SPECIAL_KEYS.has('Home')).toBe(true);
            expect(SPECIAL_KEYS.has('End')).toBe(true);
            expect(SPECIAL_KEYS.has('F1')).toBe(true);
            expect(SPECIAL_KEYS.has('F12')).toBe(true);
        });

        it('SPECIAL_KEY_TRANSLATIONS maps Space to literal space', () => {
            expect(SPECIAL_KEY_TRANSLATIONS.Space).toBe(' ');
        });
    });
});
