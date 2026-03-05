import { describe, it, expect, beforeEach } from 'vitest';
import { HotkeyMatcher } from '../HotkeyMatcher';
import type { HotkeyEntry, KeyPress } from '../../../types';
import { CONTEXT_KEY_TRUE } from '../../context-key-expression';

function key(
    key: string,
    code?: string,
    modifiers: Array<'ctrl' | 'alt' | 'shift' | 'meta'> = [],
): KeyPress {
    return {
        key,
        code: code ?? key,
        modifiers: new Set(modifiers),
    };
}

function entry(
    command: string,
    seq: KeyPress[],
    priority = 0,
): HotkeyEntry {
    return { command, key: seq, priority, whenExpr: CONTEXT_KEY_TRUE };
}

describe('HotkeyMatcher', () => {
    let matcher: HotkeyMatcher;

    beforeEach(() => {
        matcher = new HotkeyMatcher();
    });

    describe('rebuild and exact matching', () => {
        it('returns exact match with highest priority number among candidates', () => {
            const seq = [key('x', 'KeyX', ['ctrl'])];
            const eLow = entry('cmd.low', seq, 0);    // lowest priority
            const eMid = entry('cmd.mid', seq, 500);  // middle priority
            const eHigh = entry('cmd.high', seq, 1000); // highest priority

            matcher.rebuild([eLow, eMid, eHigh]);

            const result = matcher.match(seq);
            expect(result).toEqual({ type: 'exact', entry: eHigh });
        });

        it('canonicalizes sequences so modifier order does not affect matching', () => {
            const seq1 = [key('x', 'KeyX', ['ctrl', 'shift'])];
            const seq2 = [key('x', 'KeyX', ['shift', 'ctrl'])];

            // Register entries with same logical sequence but different modifier order
            const e1 = entry('cmd.first', seq1, 0);
            const e2 = entry('cmd.second', seq2, 1000); // higher priority number wins

            matcher.rebuild([e1, e2]);

            // Match using either representation should resolve to the highest priority entry
            const r1 = matcher.match(seq1);
            const r2 = matcher.match(seq2);
            expect(r1.type).toBe('exact');
            expect(r2.type).toBe('exact');
            // Both should resolve to e2 due to higher priority number
            expect((r1 as any).entry).toBe(e2);
            expect((r2 as any).entry).toBe(e2);
        });
    });

    describe('prefix and none matching', () => {
        it('returns prefix when the single key is a prefix of a longer sequence', () => {
            const first = key('x', 'KeyX', ['ctrl']);
            const second = key('s', 'KeyS');
            const longSeq = [first, second];
            const e = entry('cmd.save', longSeq, 0);

            matcher.rebuild([e]);

            const result = matcher.match([first]);
            expect(result).toEqual({ type: 'prefix' });
        });

        it('returns none with isChord=true when sequence has cached input', () => {
            matcher.rebuild([]);

            // Multi-key sequence (length > 1) means there was cached input
            const r = matcher.match([
                key('x', 'KeyX', ['ctrl']),
                key('q', 'KeyQ'),
            ]);
            expect(r).toEqual({ type: 'none', isChord: true });
        });

        it('returns none with isChord=false when no cached input (single key)', () => {
            matcher.rebuild([]);

            const r = matcher.match([key('z', 'KeyZ')]);
            expect(r).toEqual({ type: 'none', isChord: false });
        });

        it('returns none with isChord=false for unmatched single-key with modifiers', () => {
            matcher.rebuild([]);

            // Single unmatched key with modifiers should pass through to Obsidian
            const r = matcher.match([key('k', 'KeyK', ['ctrl'])]);
            expect(r).toEqual({ type: 'none', isChord: false });
        });
    });

    describe('isEscape', () => {
        it('detects Escape key correctly', () => {
            expect(matcher.isEscape(key('Escape', 'Escape'))).toBe(true);
            expect(matcher.isEscape(key('x', 'KeyX'))).toBe(false);
        });
    });

    describe('rebuild behavior', () => {
        it('groups multiple entries under the same canonical key and picks highest priority number', () => {
            const seq = [key('a', 'KeyA')];
            const e1 = entry('cmd.alpha', seq, 0);
            const e2 = entry('cmd.beta', seq, 1000); // higher number wins

            matcher.rebuild([e1, e2]);

            const result = matcher.match(seq);
            expect(result.type).toBe('exact');
            expect((result as any).entry).toBe(e2);
        });
    });
});
