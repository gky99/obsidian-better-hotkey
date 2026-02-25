import { describe, it, expect } from 'vitest';
import {
    canonicalizeKeyPressByCode,
    canonicalizeSequenceByCode,
    SPECIAL_KEY_CODE_MAP,
} from '../hotkey';
import type { KeyPress } from '../../types';

function key(
    key: string,
    code: string,
    modifiers: Array<'ctrl' | 'alt' | 'shift' | 'meta'> = [],
): KeyPress {
    return { key, code, modifiers: new Set(modifiers) };
}

describe('canonicalizeKeyPressByCode', () => {
    it('uses code field instead of key field', () => {
        const kp = key('k', 'KeyK');
        expect(canonicalizeKeyPressByCode(kp)).toBe('KeyK');
    });

    it('includes modifiers in C-M-A-S order', () => {
        const kp = key('x', 'KeyX', ['ctrl', 'shift']);
        expect(canonicalizeKeyPressByCode(kp)).toBe('C-S-KeyX');
    });

    it('handles all four modifiers', () => {
        const kp = key('a', 'KeyA', ['ctrl', 'meta', 'alt', 'shift']);
        expect(canonicalizeKeyPressByCode(kp)).toBe('C-M-A-S-KeyA');
    });

    it('handles special key codes', () => {
        const kp = key('Escape', 'Escape');
        expect(canonicalizeKeyPressByCode(kp)).toBe('Escape');
    });

    it('handles digit codes', () => {
        const kp = key('3', 'Digit3', ['ctrl']);
        expect(canonicalizeKeyPressByCode(kp)).toBe('C-Digit3');
    });
});

describe('canonicalizeSequenceByCode', () => {
    it('joins single key press', () => {
        const seq = [key('k', 'KeyK', ['ctrl'])];
        expect(canonicalizeSequenceByCode(seq)).toBe('C-KeyK');
    });

    it('joins two-key chord with space', () => {
        const seq = [key('x', 'KeyX', ['ctrl']), key('s', 'KeyS')];
        expect(canonicalizeSequenceByCode(seq)).toBe('C-KeyX KeyS');
    });
});

describe('SPECIAL_KEY_CODE_MAP', () => {
    it('maps space character to Space code', () => {
        expect(SPECIAL_KEY_CODE_MAP[' ']).toBe('Space');
    });

    it('maps all special keys to their physical codes', () => {
        expect(SPECIAL_KEY_CODE_MAP['Backspace']).toBe('Backspace');
        expect(SPECIAL_KEY_CODE_MAP['Tab']).toBe('Tab');
        expect(SPECIAL_KEY_CODE_MAP['Enter']).toBe('Enter');
        expect(SPECIAL_KEY_CODE_MAP['Escape']).toBe('Escape');
        expect(SPECIAL_KEY_CODE_MAP['Delete']).toBe('Delete');
        expect(SPECIAL_KEY_CODE_MAP['ArrowUp']).toBe('ArrowUp');
        expect(SPECIAL_KEY_CODE_MAP['ArrowDown']).toBe('ArrowDown');
        expect(SPECIAL_KEY_CODE_MAP['ArrowLeft']).toBe('ArrowLeft');
        expect(SPECIAL_KEY_CODE_MAP['ArrowRight']).toBe('ArrowRight');
    });
});
