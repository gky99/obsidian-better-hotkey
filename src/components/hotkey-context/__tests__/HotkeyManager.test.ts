import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HotkeyManager } from '../HotkeyManager';
import { HotkeyMatcher } from '../HotkeyMatcher';
import type { HotkeyEntry, KeyPress, ConfigHotkeyEntry } from '../../../types';
import { Priority } from '../../../types';
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
    priority: Priority = Priority.User,
): HotkeyEntry {
    return { command, key: seq, priority, whenExpr: CONTEXT_KEY_TRUE };
}

function configEntry(
    command: string,
    keyString: string,
    priority: Priority,
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
            const e = entry('cmd.save', [key('x'), key('s')], Priority.Plugin);

            manager.insert(e, Priority.User);

            // Should call rebuild with the inserted entry, and priority overridden to specified one
            expect(mockOnChange.mock.calls.length).toBe(1);
            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(1);
            expect(entries[0]).toEqual({ ...e, priority: Priority.User });
        });

        it('overwrites existing entry with same canonical sequence and command (composite key)', () => {
            const first = entry(
                'cmd.open',
                [key('x'), key('o')],
                Priority.Plugin,
            );
            const second = entry(
                'cmd.open',
                [key('x'), key('o')],
                Priority.Preset,
            );

            manager.insert(first, Priority.Plugin);
            manager.insert(second, Priority.User); // same composite key; should overwrite

            expect(mockOnChange.mock.calls.length).toBe(2);
            const [entries] = mockOnChange.mock.calls.at(-1)!;
            expect(entries).toHaveLength(1);
            expect(entries[0]).toEqual({ ...second, priority: Priority.User });
        });

        it('composite key uses canonicalized sequence (modifier ordering insensitive)', () => {
            const seq1 = [key('x', 'KeyX', ['ctrl', 'shift'])];
            const seq2 = [key('x', 'KeyX', ['shift', 'ctrl'])];

            // Different insertion orders for modifiers should canonicalize to same key
            manager.insert(
                entry('cmd.toggle', seq1, Priority.Plugin),
                Priority.Plugin,
            );
            manager.insert(
                entry('cmd.toggle', seq2, Priority.Plugin),
                Priority.User,
            );

            const [entries] = mockOnChange.mock.calls.at(-1)!;
            expect(entries).toHaveLength(1);
            // Last insert should win and reflect provided priority
            expect(entries[0].priority).toBe(Priority.User);
        });
    });

    describe('remove', () => {
        it('removes an existing entry and triggers matcher rebuild', () => {
            const e = entry('cmd.save', [key('x'), key('s')], Priority.Plugin);
            manager.insert(e, Priority.Plugin);
            expect(mockOnChange.mock.calls.length).toBe(1);

            manager.remove(e);

            expect(mockOnChange.mock.calls.length).toBe(2);
            const [entries] = mockOnChange.mock.calls.at(-1)!;
            expect(entries).toHaveLength(0);
        });

        it('no-op remove still triggers rebuild (idempotent behavior)', () => {
            const e = entry('cmd.missing', [key('z')], Priority.Plugin);

            manager.remove(e);

            expect(mockOnChange.mock.calls.length).toBe(1);
            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(0);
        });
    });

    describe('clear', () => {
        it('clears all entries when called without priority', () => {
            manager.insert(
                entry('cmd.a', [key('a')], Priority.User),
                Priority.User,
            );
            manager.insert(
                entry('cmd.b', [key('b')], Priority.Preset),
                Priority.Preset,
            );
            manager.insert(
                entry('cmd.c', [key('c')], Priority.Plugin),
                Priority.Plugin,
            );

            manager.clear();

            const [entries] = mockOnChange.mock.calls.at(-1)!;
            expect(entries).toHaveLength(0);
        });

        it('clears only entries of the specified priority', () => {
            manager.insert(
                entry('cmd.a', [key('a')], Priority.User),
                Priority.User,
            );
            manager.insert(
                entry('cmd.b', [key('b')], Priority.Preset),
                Priority.Preset,
            );
            manager.insert(
                entry('cmd.c', [key('c')], Priority.Plugin),
                Priority.Plugin,
            );

            manager.clear(Priority.Preset);

            const [entries] = mockOnChange.mock.calls.at(-1)!;
            // Should keep User and Plugin entries
            expect(entries).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        command: 'cmd.a',
                        priority: Priority.User,
                    }),
                    expect.objectContaining({
                        command: 'cmd.c',
                        priority: Priority.Plugin,
                    }),
                ]),
            );
            // And remove Preset
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'cmd.b'),
            ).toBeUndefined();
        });
    });

    describe('getAll and reindexMatcher', () => {
        it('getAll returns a shallow copy of current hotkeys', () => {
            const a = entry('cmd.a', [key('a')], Priority.User);
            const b = entry('cmd.b', [key('b')], Priority.Plugin);
            manager.insert(a, Priority.User);
            manager.insert(b, Priority.Plugin);

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
            manager.insert(entry('old-cmd', [key('z')]), Priority.User);
            mockOnChange.mockClear();

            manager.recalculate(
                [configEntry('preset-cmd', 'ctrl+k', Priority.Preset)],
                [configEntry('plugin-cmd', 'ctrl+p', Priority.Plugin)],
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

        it('inserts preset entries with Preset priority and plugin entries with Plugin priority', () => {
            manager.recalculate(
                [configEntry('preset-cmd', 'ctrl+k', Priority.Preset)],
                [configEntry('plugin-cmd', 'ctrl+p', Priority.Plugin)],
                [],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'preset-cmd')!
                    .priority,
            ).toBe(Priority.Preset);
            expect(
                entries.find((e: HotkeyEntry) => e.command === 'plugin-cmd')!
                    .priority,
            ).toBe(Priority.Plugin);
        });

        it('inserts user entries with User priority', () => {
            manager.recalculate(
                [],
                [],
                [configEntry('user-cmd', 'ctrl+u', Priority.User)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(1);
            expect(entries[0].command).toBe('user-cmd');
            expect(entries[0].priority).toBe(Priority.User);
        });

        it('removal by hotkeyString removes specific binding, keeps others for same command', () => {
            manager.recalculate(
                [
                    configEntry('kill-line', 'ctrl+k', Priority.Preset),
                    configEntry('kill-line', 'ctrl+shift+k', Priority.Preset),
                ],
                [],
                [configEntry('kill-line', 'ctrl+k', Priority.User, true)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            // Only ctrl+shift+k should remain
            expect(entries).toHaveLength(1);
            expect(entries[0].command).toBe('kill-line');
        });

        it('removal without hotkeyString is silently ignored', () => {
            manager.recalculate(
                [
                    configEntry('kill-word', 'meta+d', Priority.Preset),
                    configEntry('kill-word', 'ctrl+d', Priority.Preset),
                ],
                [],
                [configEntry('kill-word', '', Priority.User, true)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            // Both entries should remain — removal without key is ignored
            expect(entries).toHaveLength(2);
        });

        it('fires onChange exactly once', () => {
            manager.recalculate(
                [
                    configEntry('a', 'ctrl+a', Priority.Preset),
                    configEntry('b', 'ctrl+b', Priority.Preset),
                ],
                [configEntry('c', 'ctrl+c', Priority.Plugin)],
                [configEntry('d', 'ctrl+d', Priority.User)],
            );

            expect(mockOnChange).toHaveBeenCalledTimes(1);
        });

        it('user entry overrides preset with same key+command (higher priority)', () => {
            manager.recalculate(
                [configEntry('cmd', 'ctrl+k', Priority.Preset)],
                [],
                [configEntry('cmd', 'ctrl+k', Priority.User)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(1);
            expect(entries[0].priority).toBe(Priority.User);
        });

        it('removal of non-existent binding is silently ignored', () => {
            manager.recalculate(
                [configEntry('other', 'ctrl+o', Priority.Preset)],
                [],
                [configEntry('nonexistent', 'ctrl+z', Priority.User, true)],
            );

            const [entries] = mockOnChange.mock.calls[0]!;
            expect(entries).toHaveLength(1);
            expect(entries[0].command).toBe('other');
        });

        it('strips config metadata from stored entries', () => {
            manager.recalculate(
                [configEntry('test', 'ctrl+t', Priority.Preset)],
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
                    configEntry('cmd', 'ctrl+a', Priority.User),
                    configEntry('cmd', 'ctrl+a', Priority.User, true),
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
                [configEntry('kill-line', 'ctrl+k', Priority.Preset)],
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
                [configEntry('kill-line', 'ctrl+k', Priority.Preset)],
                [],
                [configEntry('kill-line', 'ctrl+k', Priority.User, true)],
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
                [configEntry('kill-line', 'ctrl+k', Priority.Preset)],
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
                [configEntry('keyboard-quit', 'escape', Priority.Preset)],
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
                [configEntry('set-mark', 'ctrl+space', Priority.Preset)],
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
                [configEntry('save', 'ctrl+x ctrl+s', Priority.Preset)],
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
