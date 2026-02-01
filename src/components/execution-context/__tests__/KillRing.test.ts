import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KillRing } from '../KillRing';
import { COMMAND_NAMES, CONTEXT_KEYS } from '../../../constants';
import type { EditorRange } from 'obsidian';

// Mock contextEngine module
vi.mock('../../ContextEngine', () => ({
	contextEngine: {
		getContext: vi.fn(),
		setContext: vi.fn(),
	},
}));

import { contextEngine } from '../../ContextEngine';

describe('KillRing', () => {
	let killRing: KillRing;
	let mockClipboard: {
		writeText: ReturnType<typeof vi.fn>;
		readText: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		// Create fresh instance with default max size
		killRing = new KillRing();

		// Mock clipboard API
		mockClipboard = {
			writeText: vi.fn().mockResolvedValue(undefined),
			readText: vi.fn().mockResolvedValue(''),
		};

		Object.defineProperty(navigator, 'clipboard', {
			value: mockClipboard,
			writable: true,
			configurable: true,
		});

		// Reset context engine mocks
		vi.mocked(contextEngine.getContext).mockReturnValue(false);
		vi.mocked(contextEngine.setContext).mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('push', () => {
		it('adds text to front of ring', () => {
			killRing.push('first');
			killRing.push('second');

			const entries = killRing.getEntries();
			expect(entries[0]).toBe('second');
			expect(entries[1]).toBe('first');
		});

		it('enforces max size (default 60)', () => {
			const ring = new KillRing(3);

			ring.push('first');
			ring.push('second');
			ring.push('third');
			ring.push('fourth'); // Should push out 'first'

			const entries = ring.getEntries();
			expect(entries).toHaveLength(3);
			expect(entries[0]).toBe('fourth');
			expect(entries[1]).toBe('third');
			expect(entries[2]).toBe('second');
			expect(entries.find(e => e === 'first')).toBeUndefined();
		});

		it('syncs to clipboard', async () => {
			killRing.push('test text');

			// Wait for async clipboard operation
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
		});

		it('resets yank pointer on push', async () => {
			killRing.push('first');
			killRing.push('second');

			// Simulate yank operation
			vi.mocked(contextEngine.getContext).mockReturnValue(false);
			mockClipboard.readText.mockResolvedValue('second');
			await killRing.yank();

			// Push new item
			killRing.push('third');

			// Next yank should return 'third' (pointer reset to 0)
			mockClipboard.readText.mockResolvedValue('third');
			const result = await killRing.yank();
			expect(result).toBe('third');
		});

		it('ignores empty string push', () => {
			killRing.push('first');
			killRing.push('');
			killRing.push('second');

			const entries = killRing.getEntries();
			// Empty strings should not be added, but whitespace is allowed
			expect(entries).toHaveLength(2);
			expect(entries[0]).toBe('second');
			expect(entries[1]).toBe('first');
		});
	});

	describe('yank', () => {
		it('returns most recent entry', async () => {
			killRing.push('first');
			killRing.push('second');

			mockClipboard.readText.mockResolvedValue('second');
			const result = await killRing.yank();

			expect(result).toBe('second');
		});

		it('returns null when ring is empty', async () => {
			const result = await killRing.yank();
			expect(result).toBeNull();
		});

		it('syncs from clipboard (external copy detection)', async () => {
			killRing.push('internal');

			// Simulate external clipboard change
			mockClipboard.readText.mockResolvedValue('external clipboard content');

			const result = await killRing.yank();

			// Should return external content (now at head of ring)
			expect(result).toBe('external clipboard content');

			// Verify it was added to ring
			const entries = killRing.getEntries();
			expect(entries[0]).toBe('external clipboard content');
			expect(entries[1]).toBe('internal');
		});
	});

	describe('yankPop', () => {
		it('advances pointer and wraps around', () => {
			killRing.push('first');
			killRing.push('second');
			killRing.push('third');

			// Simulate lastActionWasYank = true
			vi.mocked(contextEngine.getContext).mockReturnValue(true);

			const result1 = killRing.yankPop();
			expect(result1).toBe('second'); // Pointer at 1

			const result2 = killRing.yankPop();
			expect(result2).toBe('first'); // Pointer at 2

			const result3 = killRing.yankPop();
			expect(result3).toBe('third'); // Wrapped around to 0
		});

		it('requires lastActionWasYank flag to be true', () => {
			killRing.push('text');

			// lastActionWasYank = false
			vi.mocked(contextEngine.getContext).mockReturnValue(false);

			const result = killRing.yankPop();
			expect(result).toBeNull();
		});


		it('returns null when ring is empty', () => {
			vi.mocked(contextEngine.getContext).mockReturnValue(true);

			const result = killRing.yankPop();
			expect(result).toBeNull();
		});
	});

	describe('setYankRange and getYankRange', () => {
		it('stores and retrieves yank range', () => {
			const range: EditorRange = {
				from: { line: 1, ch: 0 },
				to: { line: 1, ch: 5 },
			};

			killRing.setYankRange(range);
			const retrieved = killRing.getYankRange();

			expect(retrieved).toEqual(range);
		});

		it('returns null when no range set', () => {
			const result = killRing.getYankRange();
			expect(result).toBeNull();
		});
	});

	describe('updateLastActionWasYank', () => {
		it('sets flag to true for YANK command', () => {
			killRing.updateLastActionWasYank(COMMAND_NAMES.YANK);

			expect(contextEngine.setContext).toHaveBeenCalledWith(
				CONTEXT_KEYS.LAST_ACTION_WAS_YANK,
				true
			);
		});

		it('sets flag to true for YANK_POP after YANK', () => {
			// Simulate lastActionWasYank = true
			vi.mocked(contextEngine.getContext).mockReturnValue(true);

			killRing.updateLastActionWasYank(COMMAND_NAMES.YANK_POP);

			expect(contextEngine.setContext).toHaveBeenCalledWith(
				CONTEXT_KEYS.LAST_ACTION_WAS_YANK,
				true
			);
		});

		it('sets flag to false for YANK_POP when last action was not yank', () => {
			// Simulate lastActionWasYank = false
			vi.mocked(contextEngine.getContext).mockReturnValue(false);

			killRing.updateLastActionWasYank(COMMAND_NAMES.YANK_POP);

			expect(contextEngine.setContext).toHaveBeenCalledWith(
				CONTEXT_KEYS.LAST_ACTION_WAS_YANK,
				false
			);
		});

		it('clears flag for non-yank commands', () => {
			killRing.updateLastActionWasYank(COMMAND_NAMES.DELETE_WORD);

			expect(contextEngine.setContext).toHaveBeenCalledWith(
				CONTEXT_KEYS.LAST_ACTION_WAS_YANK,
				false
			);
		});

	});

	describe('getEntries', () => {
		it('returns readonly array of all entries', () => {
			killRing.push('first');
			killRing.push('second');
			killRing.push('third');

			const entries = killRing.getEntries();

			expect(entries).toHaveLength(3);
			expect(entries[0]).toBe('third');
			expect(entries[1]).toBe('second');
			expect(entries[2]).toBe('first');
		});

		it('returns empty array when ring is empty', () => {
			const entries = killRing.getEntries();
			expect(entries).toHaveLength(0);
		});
	});

	describe('setMaxSize', () => {
		it('updates max size and trims existing entries', () => {
			killRing.push('first');
			killRing.push('second');
			killRing.push('third');
			killRing.push('fourth');

			killRing.setMaxSize(2);

			const entries = killRing.getEntries();
			expect(entries).toHaveLength(2);
			expect(entries[0]).toBe('fourth');
			expect(entries[1]).toBe('third');
		});

		it('allows setting larger max size without trimming', () => {
			killRing.push('first');
			killRing.push('second');

			killRing.setMaxSize(100);

			const entries = killRing.getEntries();
			expect(entries).toHaveLength(2);
		});
	});
});
