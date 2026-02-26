import { describe, it, expect, beforeEach } from 'vitest';
import { ContextEngine } from '../ContextEngine';
import { Priority } from '../../types';
import type { HotkeyEntry, KeyPress, ContextSchema } from '../../types';
import { deserialize, CONTEXT_KEY_TRUE } from '../context-key-expression';

// Helper to create test key presses
function key(
    k: string,
    modifiers: Array<'ctrl' | 'alt' | 'shift' | 'meta'> = [],
): KeyPress {
    return {
        key: k,
        code: k,
        modifiers: new Set(modifiers),
    };
}

// Helper to create test hotkey entries with parsed whenExpr
function entry(
    command: string,
    seq: KeyPress[],
    when?: string,
    priority: Priority = Priority.User,
): HotkeyEntry {
    return {
        command,
        key: seq,
        priority,
        when,
        whenExpr: deserialize(when ?? ''),
    };
}

describe('ContextEngine', () => {
    let engine: ContextEngine;

    beforeEach(() => {
        // Fresh instance per test for isolation
        engine = new ContextEngine();
    });

    describe('setContext', () => {
        it('stores context values', () => {
            engine.setContext('testKey', 'testValue');
            const value = engine.getContext('testKey');

            expect(value).toBe('testValue');
        });

        it('overwrites existing values', () => {
            engine.setContext('testKey', 'first');
            engine.setContext('testKey', 'second');

            const value = engine.getContext('testKey');
            expect(value).toBe('second');
        });

        it('stores different types correctly', () => {
            engine.setContext('stringKey', 'text');
            engine.setContext('numberKey', 42);
            engine.setContext('booleanKey', true);
            engine.setContext('objectKey', { nested: 'value' });
            engine.setContext('arrayKey', [1, 2, 3]);

            expect(engine.getContext('stringKey')).toBe('text');
            expect(engine.getContext('numberKey')).toBe(42);
            expect(engine.getContext('booleanKey')).toBe(true);
            expect(engine.getContext('objectKey')).toEqual({
                nested: 'value',
            });
            expect(engine.getContext('arrayKey')).toEqual([1, 2, 3]);
        });
    });

    describe('getContext', () => {
        it('retrieves stored values', () => {
            engine.setContext('key1', 'value1');
            engine.setContext('key2', 'value2');

            expect(engine.getContext('key1')).toBe('value1');
            expect(engine.getContext('key2')).toBe('value2');
        });

        it('returns undefined for missing keys', () => {
            const value = engine.getContext('nonexistent');
            expect(value).toBeUndefined();
        });

        it('handles falsy values correctly', () => {
            engine.setContext('zero', 0);
            engine.setContext('false', false);
            engine.setContext('null', null);
            engine.setContext('emptyString', '');

            expect(engine.getContext('zero')).toBe(0);
            expect(engine.getContext('false')).toBe(false);
            expect(engine.getContext('null')).toBeNull();
            expect(engine.getContext('emptyString')).toBe('');
        });
    });

    describe('getAllContext', () => {
        it('returns all context values as object', () => {
            engine.setContext('key1', 'value1');
            engine.setContext('key2', 42);
            engine.setContext('key3', true);

            const allContext = engine.getAllContext();

            expect(allContext).toEqual({
                key1: 'value1',
                key2: 42,
                key3: true,
            });
        });

        it('returns empty object when no context set', () => {
            const allContext = engine.getAllContext();
            expect(allContext).toEqual({});
        });

        it('returns snapshot of current state', () => {
            engine.setContext('key1', 'value1');
            const snapshot1 = engine.getAllContext();

            engine.setContext('key2', 'value2');
            const snapshot2 = engine.getAllContext();

            // First snapshot should not be modified
            expect(snapshot1).toEqual({ key1: 'value1' });
            expect(snapshot2).toEqual({ key1: 'value1', key2: 'value2' });
        });
    });

    describe('declareContext', () => {
        it('registers context key with schema', () => {
            const schema: ContextSchema = {
                type: 'boolean',
                description: 'Test context key',
            };

            const disposable = engine.declareContext('testContext', schema);

            expect(disposable).toBeDefined();
            expect(disposable.dispose).toBeInstanceOf(Function);
        });

        it('returns disposable that removes declaration', () => {
            const schema: ContextSchema = {
                type: 'string',
                description: 'Test key',
            };

            const disposable = engine.declareContext('testKey', schema);

            // Dispose should not throw
            expect(() => disposable.dispose()).not.toThrow();
        });

        it('allows declaring without schema', () => {
            const disposable = engine.declareContext('noSchema');

            expect(disposable).toBeDefined();
            expect(disposable.dispose).toBeInstanceOf(Function);
        });

        it('multiple declarations can be disposed independently', () => {
            const disposable1 = engine.declareContext('key1');
            const disposable2 = engine.declareContext('key2');

            expect(() => {
                disposable1.dispose();
                disposable2.dispose();
            }).not.toThrow();
        });
    });

    describe('filter', () => {
        it('returns all entries when no "when" clause (TrueExpr)', () => {
            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')]),
                entry('cmd2', [key('b')]),
                entry('cmd3', [key('c')]),
            ];

            const filtered = engine.filter(entries);

            expect(filtered).toHaveLength(3);
            expect(filtered).toEqual(entries);
        });

        it('keeps entries where when clause is satisfied by context', () => {
            engine.setContext('editorFocused', true);

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'editorFocused'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(1);
            expect(filtered[0]!.command).toBe('cmd1');
        });

        it('filters out entries where when clause is NOT satisfied', () => {
            // editorFocused is not set (undefined → falsy)
            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'editorFocused'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(0);
        });

        it('handles negation: !key filters when key is truthy', () => {
            engine.setContext('modalOpen', true);

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], '!modalOpen'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(0);
        });

        it('handles negation: !key passes when key is falsy', () => {
            engine.setContext('modalOpen', false);

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], '!modalOpen'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(1);
        });

        it('handles AND: both conditions must be true', () => {
            engine.setContext('editorFocused', true);
            engine.setContext('modalOpen', false);

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'editorFocused && !modalOpen'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(1);
        });

        it('handles AND: fails when any condition is false', () => {
            engine.setContext('editorFocused', true);
            engine.setContext('modalOpen', true);

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'editorFocused && !modalOpen'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(0);
        });

        it('handles OR: either condition can be true', () => {
            engine.setContext('modalOpen', true);

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'modalOpen || popoverOpen'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(1);
        });

        it('handles equality: key == "value"', () => {
            engine.setContext('activeViewType', 'editor');

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'activeViewType == "editor"'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(1);
        });

        it('handles equality: fails when value differs', () => {
            engine.setContext('activeViewType', 'graph');

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'activeViewType == "editor"'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(0);
        });

        it('handles inequality: key != "value"', () => {
            engine.setContext('activeViewType', 'editor');

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'activeViewType != "graph"'),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(1);
        });

        it('preserves entries without when clause', () => {
            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')]),
                entry('cmd2', [key('b')], 'editorFocused'),
            ];

            const filtered = engine.filter(entries);
            // cmd1 has TrueExpr (always passes), cmd2 fails (editorFocused not set)
            expect(filtered).toHaveLength(1);
            expect(filtered[0]!.command).toBe('cmd1');
        });

        it('handles mixed: some entries with when, some without', () => {
            engine.setContext('editorFocused', true);

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')]),
                entry('cmd2', [key('b')], 'editorFocused'),
                entry('cmd3', [key('c')], 'modalOpen'),
                entry('cmd4', [key('d')]),
            ];

            const filtered = engine.filter(entries);
            expect(filtered).toHaveLength(3);
            expect(filtered.map((e) => e.command)).toEqual([
                'cmd1',
                'cmd2',
                'cmd4',
            ]);
        });

        it('handles empty entry list', () => {
            const filtered = engine.filter([]);

            expect(filtered).toHaveLength(0);
            expect(filtered).toEqual([]);
        });

        it('preserves entry order', () => {
            engine.setContext('context1', true);
            engine.setContext('context2', true);
            engine.setContext('context3', true);

            const entries: HotkeyEntry[] = [
                entry('cmd3', [key('c')], 'context3', Priority.Plugin),
                entry('cmd1', [key('a')], 'context1', Priority.User),
                entry('cmd2', [key('b')], 'context2', Priority.Preset),
            ];

            const filtered = engine.filter(entries);

            expect(filtered[0]!.command).toBe('cmd3');
            expect(filtered[1]!.command).toBe('cmd1');
            expect(filtered[2]!.command).toBe('cmd2');
        });
    });

    describe('context isolation', () => {
        it('maintains independent context keys', () => {
            engine.setContext('key1', 'value1');
            engine.setContext('key2', 'value2');

            // Modify key1
            engine.setContext('key1', 'modified');

            // key2 should be unaffected
            expect(engine.getContext('key1')).toBe('modified');
            expect(engine.getContext('key2')).toBe('value2');
        });

        it('does not share state between instances', () => {
            const engine1 = new ContextEngine();
            const engine2 = new ContextEngine();

            engine1.setContext('key', 'engine1');
            engine2.setContext('key', 'engine2');

            expect(engine1.getContext('key')).toBe('engine1');
            expect(engine2.getContext('key')).toBe('engine2');
        });
    });

    describe('real evaluation integration', () => {
        it('editorFocused && !suggestionModalRendered: true when editor focused, no modal', () => {
            engine.setContext('editorFocused', true);
            engine.setContext('suggestionModalRendered', false);

            const entries: HotkeyEntry[] = [
                entry(
                    'cmd1',
                    [key('a')],
                    'editorFocused && !suggestionModalRendered',
                ),
            ];

            expect(engine.filter(entries)).toHaveLength(1);
        });

        it('editorFocused && !suggestionModalRendered: false when modal is rendered', () => {
            engine.setContext('editorFocused', true);
            engine.setContext('suggestionModalRendered', true);

            const entries: HotkeyEntry[] = [
                entry(
                    'cmd1',
                    [key('a')],
                    'editorFocused && !suggestionModalRendered',
                ),
            ];

            expect(engine.filter(entries)).toHaveLength(0);
        });

        it('activeViewType == "editor": true when view type matches', () => {
            engine.setContext('activeViewType', 'editor');

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'activeViewType == "editor"'),
            ];

            expect(engine.filter(entries)).toHaveLength(1);
        });

        it('activeViewType == "editor": false when view type differs', () => {
            engine.setContext('activeViewType', 'graph');

            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'activeViewType == "editor"'),
            ];

            expect(engine.filter(entries)).toHaveLength(0);
        });

        it('context changes affect filter results dynamically', () => {
            const entries: HotkeyEntry[] = [
                entry('cmd1', [key('a')], 'editorFocused'),
            ];

            // Initially not focused
            expect(engine.filter(entries)).toHaveLength(0);

            // Focus editor
            engine.setContext('editorFocused', true);
            expect(engine.filter(entries)).toHaveLength(1);

            // Unfocus editor
            engine.setContext('editorFocused', false);
            expect(engine.filter(entries)).toHaveLength(0);
        });
    });
});
