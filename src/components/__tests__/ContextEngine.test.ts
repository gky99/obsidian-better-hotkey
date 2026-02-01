import { describe, it, expect, beforeEach } from 'vitest';
import { ContextEngine } from '../ContextEngine';
import { Priority } from '../../types';
import type { HotkeyEntry, KeyPress, ContextSchema } from '../../types';

// Helper to create test key presses
function key(key: string, modifiers: Array<'ctrl'|'alt'|'shift'|'meta'> = []): KeyPress {
	return {
		key,
		code: key,
		modifiers: new Set(modifiers),
	};
}

// Helper to create test hotkey entries
function entry(
	command: string,
	seq: KeyPress[],
	when?: string,
	priority: Priority = Priority.User
): HotkeyEntry {
	return { command, key: seq, priority, when };
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
			expect(engine.getContext('objectKey')).toEqual({ nested: 'value' });
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
		it('returns all entries when no "when" clause', () => {
			const entries: HotkeyEntry[] = [
				entry('cmd1', [key('a')]),
				entry('cmd2', [key('b')]),
				entry('cmd3', [key('c')]),
			];

			const filtered = engine.filter(entries);

			expect(filtered).toHaveLength(3);
			expect(filtered).toEqual(entries);
		});

		it('uses evaluate() for entries with "when" clause', () => {
			const entries: HotkeyEntry[] = [
				entry('cmd1', [key('a')], 'editorFocus'),
				entry('cmd2', [key('b')], '!editorFocus'),
				entry('cmd3', [key('c')]), // No when clause
			];

			const filtered = engine.filter(entries);

			// In stub implementation, evaluate() always returns true
			// So all entries should be returned
			expect(filtered).toHaveLength(3);
		});

		it('stub implementation always returns all entries with "when" clauses', () => {
			const entries: HotkeyEntry[] = [
				entry('cmd1', [key('a')], 'editorFocus && !inputFocus'),
				entry('cmd2', [key('b')], 'inputFocus'),
				entry('cmd3', [key('c')], 'false'), // Even explicit false
			];

			const filtered = engine.filter(entries);

			// Stub evaluate() always returns true
			expect(filtered).toHaveLength(3);
			expect(filtered).toEqual(entries);
		});

		it('handles empty entry list', () => {
			const filtered = engine.filter([]);

			expect(filtered).toHaveLength(0);
			expect(filtered).toEqual([]);
		});

		it('preserves entry order', () => {
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

	describe('stub behavior verification', () => {
		it('evaluate is called for entries with when clause (implicit via filter)', () => {
			// This test verifies stub behavior: evaluate() always returns true
			const entriesWithWhen: HotkeyEntry[] = [
				entry('cmd1', [key('a')], 'someCondition'),
			];

			const filtered = engine.filter(entriesWithWhen);

			// If evaluate() returned false, this would be filtered out
			// But stub always returns true
			expect(filtered).toHaveLength(1);
			expect(filtered[0]!.command).toBe('cmd1');
		});

		it('stub allows all conditional entries through', () => {
			const entries: HotkeyEntry[] = [
				entry('cmd1', [key('a')], 'condition1'),
				entry('cmd2', [key('b')], 'condition2'),
				entry('cmd3', [key('c')], 'condition3'),
			];

			const filtered = engine.filter(entries);

			// All entries should pass through (stub behavior)
			expect(filtered).toHaveLength(3);
		});
	});
});
