import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HotkeyManager } from '../HotkeyManager';
import { HotkeyMatcher } from '../HotkeyMatcher';
import type { HotkeyEntry, KeyPress, ConfigHotkeyEntry } from '../../../types';
import { parseHotkeyString } from '../../../utils/hotkey';
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

function configEntry(
    command: string,
    keyString: string,
    priority: number,
    removal = false,
): ConfigHotkeyEntry {
    const keyPresses = keyString ? parseHotkeyString(keyString) : [];
    return {
        command,
        key: keyPresses,
        priority,
        removal,
        hotkeyString: keyString,
        whenExpr: CONTEXT_KEY_TRUE,
    };
}

describe('HotkeyManager', () => {
    let mockOnChange: ReturnType<typeof vi.fn>;
    let manager: HotkeyManager;

    beforeEach(() => {
        mockOnChange = vi.fn();
        manager = new HotkeyManager();
        manager.setOnChange(mockOnChange as (entries: HotkeyEntry[]) => void);
    });

    describe('insert', () => {
        it('inserts a new entry and triggers matcher rebuild with updated table', () => {
            const e = entry('cmd.save', [key('x'), key('s')], 2);

            manager.insert(e, 0);

            // Should call rebuild with the inserted entry, and priority overridden to specified one
            expect(mockOnChange.mock.calls.length).toBe(1);
            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(1);
            expect(entries[0]).toEqual({ ...e, priority: 0 });
        });

        it('overwrites existing entry with same canonical sequence and command (composite key)', () => {
            const first = entry('cmd.open', [key('x'), key('o')], 2);
            const second = entry('cmd.open', [key('x'), key('o')], 1);

            manager.insert(first, 2);
            manager.insert(second, 500); // same composite key; should overwrite

            expect(mockOnChange.mock.calls.length).toBe(2);
            const [entries] = mockOnChange.mock.calls.at(-1)!;
            expect(entries).toHaveLength(1);
            expect(entries[0]).toEqual({ ...second, priority: 500 });
        });

        it('composite key uses canonicalized sequence (modifier ordering insensitive)', () => {
            const seq1 = [key('x', 'KeyX', ['ctrl', 'shift'])];
            const seq2 = [key('x', 'KeyX', ['shift', 'ctrl'])];

            // Different insertion orders for modifiers should canonicalize to same key
            manager.insert(entry('cmd.toggle', seq1, 2), 2);
            manager.insert(entry('cmd.toggle', seq2, 2), 0);

            const [entries] = mockOnChange.mock.calls.at(-1)!;
            expect(entries).toHaveLength(1);
            // Last insert should win and reflect provided priority
            expect(entries[0].priority).toBe(0);
        });
    });

    describe('remove', () => {
        it('removes an existing entry and triggers matcher rebuild', () => {
            const e = entry('cmd.save', [key('x'), key('s')], 2);
            manager.insert(e, 2);
            expect(mockOnChange.mock.calls.length).toBe(1);

            manager.remove(e);

            expect(mockOnChange.mock.calls.length).toBe(2);
            const [entries] = mockOnChange.mock.calls.at(-1)!;
            expect(entries).toHaveLength(0);
        });

        it('no-op remove still triggers rebuild (idempotent behavior)', () => {
            const e = entry('cmd.missing', [key('z')], 2);

            manager.remove(e);

            expect(mockOnChange.mock.calls.length).toBe(1);
            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(0);
        });
    });

    describe('clear', () => {
        it('clears all entries', () => {
            manager.insert(entry('cmd.a', [key('a')], 0), 0);
            manager.insert(entry('cmd.b', [key('b')], 0), 1);
            manager.insert(entry('cmd.c', [key('c')], 0), 2);

            manager.clear();

            const [entries] = mockOnChange.mock.calls.at(-1)!;
            expect(entries).toHaveLength(0);
        });
    });

    describe('getAll and reindexMatcher', () => {
        it('getAll returns a shallow copy of current hotkeys', () => {
            const a = entry('cmd.a', [key('a')], 0);
            const b = entry('cmd.b', [key('b')], 2);
            manager.insert(a, 0);
            manager.insert(b, 2);

            const all = manager.getAll();
            expect(all).toHaveLength(2);
            // Ensure modifying result does not mutate manager internal map
            all.pop();
            const all2 = manager.getAll();
            expect(all2).toHaveLength(2);
        });
    });

    describe('recalculate', () => {
        it('clears existing table and inserts preset + plugin entries', () => {
            // Pre-populate with something
            manager.insert(entry('old-cmd', [key('z')]), 0);
            mockOnChange.mockClear();

            manager.recalculate(
                [configEntry('preset-cmd', 'ctrl+k', 0)],
                [configEntry('plugin-cmd', 'ctrl+p', 0)],
                [],
            );

            expect(mockOnChange).toHaveBeenCalledTimes(1);
            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(2);
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'old-cmd'),
            ).toBeUndefined();
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'preset-cmd'),
            ).toBeDefined();
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'plugin-cmd'),
            ).toBeDefined();
        });

        it('assigns finalPriority = basePriority + index across aggregated list', () => {
            manager.recalculate(
                [configEntry('preset-cmd', 'ctrl+k', 0)],  // basePriority=0, index=0 → final=0
                [configEntry('plugin-cmd', 'ctrl+p', 0)],  // basePriority=0, index=1 → final=1
                [configEntry('user-cmd', 'ctrl+u', 0)],    // basePriority=0, index=2 → final=2
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'preset-cmd')!.priority,
            ).toBe(0);
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'plugin-cmd')!.priority,
            ).toBe(1);
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'user-cmd')!.priority,
            ).toBe(2);
        });

        it('widget basePriority beats editor basePriority regardless of source index', () => {
            // Widget in preset (index=0): 1000 + 0 = 1000
            // Editor in user (index=1): 0 + 1 = 1
            manager.recalculate(
                [configEntry('widget-cmd', 'ctrl+n', 1000)],
                [],
                [configEntry('editor-cmd', 'ctrl+n', 0)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'widget-cmd')!.priority,
            ).toBe(1000); // 1000 + 0
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'editor-cmd')!.priority,
            ).toBe(1); // 0 + 1
        });

        it('inserts user entries with correct index offset', () => {
            manager.recalculate(
                [],
                [],
                [configEntry('user-cmd', 'ctrl+u', 0)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(1);
            expect(entries[0].command).toBe('user-cmd');
            expect(entries[0].priority).toBe(0); // basePriority=0, index=0 → final=0
        });

        it('removal by hotkeyString removes specific binding, keeps others for same command', () => {
            manager.recalculate(
                [
                    configEntry('kill-line', 'ctrl+k', 0),
                    configEntry('kill-line', 'ctrl+shift+k', 0),
                ],
                [],
                [configEntry('kill-line', 'ctrl+k', 0, true)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            // Only ctrl+shift+k should remain
            expect(entries).toHaveLength(1);
            expect(entries[0].command).toBe('kill-line');
        });

        it('removal without hotkeyString is silently ignored', () => {
            manager.recalculate(
                [
                    configEntry('kill-word', 'meta+d', 0),
                    configEntry('kill-word', 'ctrl+d', 0),
                ],
                [],
                [configEntry('kill-word', '', 0, true)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            // Both entries should remain — removal without key is ignored
            expect(entries).toHaveLength(2);
        });

        it('fires onChange exactly once', () => {
            manager.recalculate(
                [
                    configEntry('a', 'ctrl+a', 0),
                    configEntry('b', 'ctrl+b', 0),
                ],
                [configEntry('c', 'ctrl+c', 0)],
                [configEntry('d', 'ctrl+d', 0)],
            );

            expect(mockOnChange).toHaveBeenCalledTimes(1);
        });

        it('user entry replaces preset with same key+command (takes preset map position)', () => {
            // Same composite key (ctrl+k::cmd): user entry overwrites preset in-place.
            // After reindex the single surviving entry is at index 0.
            manager.recalculate(
                [configEntry('cmd', 'ctrl+k', 0)],
                [],
                [configEntry('cmd', 'ctrl+k', 0)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(1);
            expect(entries[0].priority).toBe(0); // basePriority(0) + index(0) — only one entry
        });

        it('removal of non-existent binding is silently ignored', () => {
            manager.recalculate(
                [configEntry('other', 'ctrl+o', 0)],
                [],
                [configEntry('nonexistent', 'ctrl+z', 0, true)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(1);
            expect(entries[0].command).toBe('other');
        });

        it('strips config metadata from stored entries', () => {
            manager.recalculate(
                [configEntry('test', 'ctrl+t', 0)],
                [],
                [],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries[0]).not.toHaveProperty('removal');
            expect(entries[0]).not.toHaveProperty('hotkeyString');
        });

        it('processes user entries in order (add then remove in sequence)', () => {
            manager.recalculate(
                [],
                [],
                [
                    configEntry('cmd', 'ctrl+a', 0),
                    configEntry('cmd', 'ctrl+a', 0, true),
                ],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(0); // added then removed
        });
    });

    describe('recalculate integration with HotkeyMatcher', () => {
        it('recalculate populates Matcher so match() finds exact matches', () => {
            const matcher = new HotkeyMatcher();
            manager.setOnChange((entries) => matcher.rebuild(entries));

            manager.recalculate(
                [configEntry('kill-line', 'ctrl+k', 0)],
                [],
                [],
            );

            const result = matcher.match(parseHotkeyString('ctrl+k'));
            expect(result.type).toBe('exact');
            if (result.type === 'exact') {
                expect(result.entry.command).toBe('kill-line');
            }
        });

        it('user removal removes preset binding from Matcher', () => {
            const matcher = new HotkeyMatcher();
            manager.setOnChange((entries) => matcher.rebuild(entries));

            manager.recalculate(
                [configEntry('kill-line', 'ctrl+k', 0)],
                [],
                [configEntry('kill-line', 'ctrl+k', 0, true)],
            );

            const result = matcher.match(parseHotkeyString('ctrl+k'));
            expect(result.type).toBe('none');
        });
    });

    describe('code translation in insertEntry', () => {
        it('populates KeyPress.code via layout service for letter keys', async () => {
            const { keyboardLayoutService } =
                await import('../../KeyboardLayoutService');
            await keyboardLayoutService.initialize();

            const freshManager = new HotkeyManager();
            const mockCb = vi.fn();
            freshManager.setOnChange(mockCb);

            freshManager.recalculate(
                [configEntry('kill-line', 'ctrl+k', 0)],
                [],
                [],
            );

            const [entries] = mockCb.mock.calls[0]!;
            expect(entries[0].key[0].code).toBe('KeyK');
            expect(entries[0].key[0].key).toBe('k');

            keyboardLayoutService.dispose();
        });

        it('populates KeyPress.code for special keys via SPECIAL_KEY_CODE_MAP', async () => {
            const { keyboardLayoutService } =
                await import('../../KeyboardLayoutService');
            await keyboardLayoutService.initialize();

            const freshManager = new HotkeyManager();
            const mockCb = vi.fn();
            freshManager.setOnChange(mockCb);

            freshManager.recalculate(
                [configEntry('keyboard-quit', 'Escape', 0)],
                [],
                [],
            );

            const [entries] = mockCb.mock.calls[0]!;
            expect(entries[0].key[0].code).toBe('Escape');

            keyboardLayoutService.dispose();
        });

        it('populates KeyPress.code for space key', async () => {
            const { keyboardLayoutService } =
                await import('../../KeyboardLayoutService');
            await keyboardLayoutService.initialize();

            const freshManager = new HotkeyManager();
            const mockCb = vi.fn();
            freshManager.setOnChange(mockCb);

            freshManager.recalculate(
                [configEntry('set-mark', 'ctrl+Space', 0)],
                [],
                [],
            );

            const [entries] = mockCb.mock.calls[0]!;
            expect(entries[0].key[0].code).toBe('Space');

            keyboardLayoutService.dispose();
        });

        it('translates chord sequence codes', async () => {
            const { keyboardLayoutService } =
                await import('../../KeyboardLayoutService');
            await keyboardLayoutService.initialize();

            const freshManager = new HotkeyManager();
            const mockCb = vi.fn();
            freshManager.setOnChange(mockCb);

            freshManager.recalculate(
                [configEntry('save', 'ctrl+x ctrl+s', 0)],
                [],
                [],
            );

            const [entries] = mockCb.mock.calls[0]!;
            expect(entries[0].key[0].code).toBe('KeyX');
            expect(entries[0].key[1].code).toBe('KeyS');

            keyboardLayoutService.dispose();
        });
    });
});
