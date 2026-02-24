import { describe, it, expect } from 'vitest';
import { parseHotkeyString, VALID_MODIFIERS, SPECIAL_KEY_MAP } from '../hotkey';

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

        it('parses bare special key without modifier: "escape"', () => {
            const result = parseHotkeyString('escape');
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
        it('maps "space" to " " (literal space)', () => {
            const result = parseHotkeyString('space');
            expect(result[0]!.key).toBe(' ');
        });

        it('maps "backspace" to "Backspace"', () => {
            const result = parseHotkeyString('backspace');
            expect(result[0]!.key).toBe('Backspace');
        });

        it('maps "tab" to "Tab"', () => {
            const result = parseHotkeyString('tab');
            expect(result[0]!.key).toBe('Tab');
        });

        it('maps "enter" to "Enter"', () => {
            const result = parseHotkeyString('enter');
            expect(result[0]!.key).toBe('Enter');
        });

        it('maps "delete" to "Delete"', () => {
            const result = parseHotkeyString('delete');
            expect(result[0]!.key).toBe('Delete');
        });

        it('maps arrow keys correctly', () => {
            expect(parseHotkeyString('up')[0]!.key).toBe('ArrowUp');
            expect(parseHotkeyString('down')[0]!.key).toBe('ArrowDown');
            expect(parseHotkeyString('left')[0]!.key).toBe('ArrowLeft');
            expect(parseHotkeyString('right')[0]!.key).toBe('ArrowRight');
        });

        it('maps special keys with modifiers: "ctrl+space"', () => {
            const result = parseHotkeyString('ctrl+space');
            expect(result[0]!.modifiers).toEqual(new Set(['ctrl']));
            expect(result[0]!.key).toBe(' ');
        });
    });

    describe('key normalization', () => {
        it('lowercases key: "ctrl+K" → "k"', () => {
            const result = parseHotkeyString('ctrl+K');
            expect(result[0]!.key).toBe('k');
        });

        it('special key keeps mapped casing: "Backspace" → "Backspace"', () => {
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

        it('SPECIAL_KEY_MAP maps all documented keys', () => {
            expect(SPECIAL_KEY_MAP.space).toBe(' ');
            expect(SPECIAL_KEY_MAP.backspace).toBe('Backspace');
            expect(SPECIAL_KEY_MAP.tab).toBe('Tab');
            expect(SPECIAL_KEY_MAP.enter).toBe('Enter');
            expect(SPECIAL_KEY_MAP.escape).toBe('Escape');
            expect(SPECIAL_KEY_MAP.delete).toBe('Delete');
            expect(SPECIAL_KEY_MAP.up).toBe('ArrowUp');
            expect(SPECIAL_KEY_MAP.down).toBe('ArrowDown');
            expect(SPECIAL_KEY_MAP.left).toBe('ArrowLeft');
            expect(SPECIAL_KEY_MAP.right).toBe('ArrowRight');
        });
    });
});
