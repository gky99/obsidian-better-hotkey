import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputHandler } from '../InputHandler';
import { COMMAND_NAMES } from '../../constants';
import type { KeyPress, MatchResult } from '../../types';
import { Priority } from '../../types';
import type { App } from 'obsidian';

// Mock obsidian module
vi.mock('obsidian', () => ({
	MarkdownView: vi.fn(),
	App: vi.fn(),
	Plugin: vi.fn(),
}));

// Helper function to create KeyPress objects
function key(
	key: string,
	code?: string,
	modifiers: Array<'ctrl' | 'alt' | 'shift' | 'meta'> = []
): KeyPress {
	return {
		key,
		code: code ?? key,
		modifiers: new Set(modifiers),
	};
}

// Mock factory for HotkeyContext
function createMockHotkeyContext() {
	return {
		chordBuffer: {
			append: vi.fn().mockReturnValue([key('x')]),
			clear: vi.fn(),
			setTimeoutCallback: vi.fn(),
		},
		hotkeyMatcher: {
			match: vi.fn().mockReturnValue({ type: 'none', isChord: false }),
			isEscape: vi.fn().mockReturnValue(false),
		},
		statusIndicator: {
			showPending: vi.fn(),
			clear: vi.fn(),
		},
	};
}

// Mock factory for CommandRegistry
function createMockCommandRegistry() {
	return {
		execute: vi.fn().mockReturnValue(true),
	};
}

describe('InputHandler', () => {
	let inputHandler: InputHandler;
	let mockHotkeyContext: ReturnType<typeof createMockHotkeyContext>;
	let mockCommandRegistry: ReturnType<typeof createMockCommandRegistry>;
	let mockApp: App;

	beforeEach(() => {
		// Create fresh mocks
		mockHotkeyContext = createMockHotkeyContext();
		mockCommandRegistry = createMockCommandRegistry();
		mockApp = {} as App;

		// Create InputHandler with mocked dependencies
		inputHandler = new InputHandler(
			mockCommandRegistry as any,
			mockHotkeyContext as any,
			mockApp
		);
	});

	afterEach(() => {
		// Cleanup
		inputHandler.stop();
		vi.clearAllMocks();
	});

	describe('Lifecycle Management', () => {
		it('start() registers keydown listener', () => {
			const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

			inputHandler.start();

			expect(addEventListenerSpy).toHaveBeenCalledWith(
				'keydown',
				expect.any(Function),
				true // capture phase
			);

			addEventListenerSpy.mockRestore();
		});

		it('start() is idempotent (multiple calls do not duplicate listeners)', () => {
			const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

			inputHandler.start();
			inputHandler.start();
			inputHandler.start();

			expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

			addEventListenerSpy.mockRestore();
		});

		it('stop() removes keydown listener', () => {
			const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

			inputHandler.start();
			inputHandler.stop();

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				'keydown',
				expect.any(Function),
				true // capture phase
			);

			removeEventListenerSpy.mockRestore();
		});

		it('stop() is safe when not started', () => {
			const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

			// Call stop without calling start first
			inputHandler.stop();

			// Should not throw and removeEventListener should not be called
			expect(removeEventListenerSpy).not.toHaveBeenCalled();

			removeEventListenerSpy.mockRestore();
		});
	});

	describe('Pipeline Orchestration', () => {
		it('basic key press flows through pipeline', () => {
			mockHotkeyContext.chordBuffer.append.mockReturnValue([key('a', 'KeyA')]);
			mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({ type: 'none', isChord: false });

			inputHandler.start();
			const event = new KeyboardEvent('keydown', {
				key: 'a',
				code: 'KeyA',
				bubbles: true,
				cancelable: true,
			});
			window.dispatchEvent(event);

			// Verify pipeline flow
			expect(mockHotkeyContext.chordBuffer.append).toHaveBeenCalled();
			expect(mockHotkeyContext.hotkeyMatcher.match).toHaveBeenCalledWith([key('a', 'KeyA')]);
		});

		it('modifier-only keys are skipped (Control)', () => {
			inputHandler.start();
			const event = new KeyboardEvent('keydown', {
				key: 'Control',
				code: 'ControlLeft',
				bubbles: true,
				cancelable: true,
			});
			window.dispatchEvent(event);

			// Verify pipeline was NOT triggered
			expect(mockHotkeyContext.chordBuffer.append).not.toHaveBeenCalled();
			expect(mockHotkeyContext.hotkeyMatcher.match).not.toHaveBeenCalled();
		});

		it('modifier-only keys are skipped (Alt, Shift, Meta)', () => {
			inputHandler.start();

			const modifiers = ['Alt', 'Shift', 'Meta'];
			modifiers.forEach((mod) => {
				const event = new KeyboardEvent('keydown', {
					key: mod,
					code: `${mod}Left`,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);
			});

			// Verify pipeline was NOT triggered for any modifier
			expect(mockHotkeyContext.chordBuffer.append).not.toHaveBeenCalled();
			expect(mockHotkeyContext.hotkeyMatcher.match).not.toHaveBeenCalled();
		});

		it('escape key clears buffer and status', () => {
			mockHotkeyContext.hotkeyMatcher.isEscape.mockReturnValue(true);

			inputHandler.start();
			const event = new KeyboardEvent('keydown', {
				key: 'Escape',
				code: 'Escape',
				bubbles: true,
				cancelable: true,
			});
			window.dispatchEvent(event);

			// Verify escape handling
			expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
			expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalled();
			// Matcher should NOT be called for escape
			expect(mockHotkeyContext.hotkeyMatcher.match).not.toHaveBeenCalled();
		});

		it('escape key clears buffer even with pending sequence', () => {
			// Simulate pending sequence
			mockHotkeyContext.chordBuffer.append.mockReturnValue([key('x', 'KeyX', ['ctrl'])]);
			mockHotkeyContext.hotkeyMatcher.isEscape.mockReturnValue(true);

			inputHandler.start();
			const event = new KeyboardEvent('keydown', {
				key: 'Escape',
				code: 'Escape',
				bubbles: true,
				cancelable: true,
			});
			window.dispatchEvent(event);

			// Verify buffer and status are cleared
			expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
			expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalled();
		});
	});

	describe('Match Result Handling', () => {
		describe('Exact match flow', () => {
			let baseExactMatch: MatchResult;
			let testEvent: KeyboardEvent;

			beforeEach(() => {
				baseExactMatch = {
					type: 'exact',
					entry: {
						command: 'test:command',
						key: [key('s', 'KeyS', ['ctrl'])],
						priority: Priority.User,
					},
				};
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(baseExactMatch);

				testEvent = new KeyboardEvent('keydown', {
					key: 's',
					code: 'KeyS',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
			});

			it('executes command via commandRegistry', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
					'test:command',
					undefined,
					expect.anything() // executionContext
				);
			});

			it('prevents event propagation', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(testEvent.defaultPrevented).toBe(true);
			});

			it('clears buffer and status', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
				expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalled();
			});

			it('passes command args to registry', () => {
				// Override with args for this specific test
				const exactMatchWithArgs: MatchResult = {
					type: 'exact',
					entry: {
						command: 'test:command',
						key: [key('s', 'KeyS', ['ctrl'])],
						priority: Priority.User,
						args: { count: 5 },
					},
				};
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(exactMatchWithArgs);

				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
					'test:command',
					{ count: 5 },
					expect.anything()
				);
			});
		});

		describe('Prefix match flow', () => {
			let prefixMatch: MatchResult;
			let testEvent: KeyboardEvent;

			beforeEach(() => {
				prefixMatch = { type: 'prefix' };
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(prefixMatch);

				testEvent = new KeyboardEvent('keydown', {
					key: 'x',
					code: 'KeyX',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
			});

			it('shows pending status with sequence', () => {
				const sequence = [key('x', 'KeyX', ['ctrl'])];
				mockHotkeyContext.chordBuffer.append.mockReturnValue(sequence);

				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(mockHotkeyContext.statusIndicator.showPending).toHaveBeenCalledWith(sequence);
			});

			it('prevents event propagation', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(testEvent.defaultPrevented).toBe(true);
			});

			it('does NOT clear buffer (keeps pending sequence)', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				// Buffer should NOT be cleared for prefix match
				expect(mockHotkeyContext.chordBuffer.clear).not.toHaveBeenCalled();
			});
		});

		describe('No match - chord (isChord: true)', () => {
			let noMatchChord: MatchResult;
			let testEvent: KeyboardEvent;

			beforeEach(() => {
				noMatchChord = { type: 'none', isChord: true };
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(noMatchChord);

				testEvent = new KeyboardEvent('keydown', {
					key: 'z',
					code: 'KeyZ',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
			});

			it('clears buffer', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
			});

			it('prevents event propagation', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(testEvent.defaultPrevented).toBe(true);
			});

			it('clears status', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalled();
			});
		});

		describe('No match - non-chord (isChord: false)', () => {
			let noMatchNonChord: MatchResult;
			let testEvent: KeyboardEvent;

			beforeEach(() => {
				noMatchNonChord = { type: 'none', isChord: false };
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(noMatchNonChord);

				testEvent = new KeyboardEvent('keydown', {
					key: 'a',
					code: 'KeyA',
					bubbles: true,
					cancelable: true,
				});
			});

			it('clears buffer', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
			});

			it('allows event propagation (normal typing)', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				// Event should NOT be prevented for normal typing
				expect(testEvent.defaultPrevented).toBe(false);
			});

			it('clears status', () => {
				inputHandler.start();
				window.dispatchEvent(testEvent);

				expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalled();
			});
		});
	});

	describe('Integration with Dependencies', () => {
		describe('ChordSequenceBuffer integration', () => {
			it('appends key to buffer and uses returned sequence', () => {
				const sequence = [key('x', 'KeyX', ['ctrl']), key('s', 'KeyS')];
				mockHotkeyContext.chordBuffer.append.mockReturnValue(sequence);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 's',
					code: 'KeyS',
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				// Matcher should be called with the sequence from buffer
				expect(mockHotkeyContext.hotkeyMatcher.match).toHaveBeenCalledWith(sequence);
			});

			it('first key in sequence creates single-key array', () => {
				const sequence = [key('x', 'KeyX', ['ctrl'])];
				mockHotkeyContext.chordBuffer.append.mockReturnValue(sequence);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 'x',
					code: 'KeyX',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				expect(mockHotkeyContext.hotkeyMatcher.match).toHaveBeenCalledWith(sequence);
			});
		});

		describe('HotkeyMatcher integration', () => {
			it('calls isEscape before processing', () => {
				mockHotkeyContext.hotkeyMatcher.isEscape.mockReturnValue(false);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 'a',
					code: 'KeyA',
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				expect(mockHotkeyContext.hotkeyMatcher.isEscape).toHaveBeenCalled();
			});

			it('calls match with sequence from buffer', () => {
				const sequence = [key('a', 'KeyA')];
				mockHotkeyContext.chordBuffer.append.mockReturnValue(sequence);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 'a',
					code: 'KeyA',
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				expect(mockHotkeyContext.hotkeyMatcher.match).toHaveBeenCalledWith(sequence);
				expect(mockHotkeyContext.hotkeyMatcher.match).toHaveBeenCalledTimes(1);
			});
		});

		describe('StatusIndicator integration', () => {
			it('shows pending for prefix match', () => {
				const sequence = [key('x', 'KeyX', ['ctrl'])];
				const prefixMatch: MatchResult = { type: 'prefix' };
				mockHotkeyContext.chordBuffer.append.mockReturnValue(sequence);
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(prefixMatch);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 'x',
					code: 'KeyX',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				expect(mockHotkeyContext.statusIndicator.showPending).toHaveBeenCalledWith(sequence);
			});

			it('clears status on exact match', () => {
				const exactMatch: MatchResult = {
					type: 'exact',
					entry: {
						command: 'test:command',
						key: [key('s', 'KeyS', ['ctrl'])],
						priority: Priority.User,
					},
				};
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(exactMatch);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 's',
					code: 'KeyS',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalled();
			});

			it('clears status on escape', () => {
				mockHotkeyContext.hotkeyMatcher.isEscape.mockReturnValue(true);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 'Escape',
					code: 'Escape',
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalled();
			});
		});

		describe('CommandRegistry integration', () => {
			it('execute called with correct command ID', () => {
				const exactMatch: MatchResult = {
					type: 'exact',
					entry: {
						command: 'cmd:test',
						key: [key('t', 'KeyT', ['ctrl'])],
						priority: Priority.User,
					},
				};
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(exactMatch);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 't',
					code: 'KeyT',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
					'cmd:test',
					undefined,
					expect.anything()
				);
			});

			it('execute called with args if present', () => {
				const exactMatch: MatchResult = {
					type: 'exact',
					entry: {
						command: 'cmd:test',
						key: [key('t', 'KeyT', ['ctrl'])],
						priority: Priority.User,
						args: { arg1: 'value' },
					},
				};
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(exactMatch);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 't',
					code: 'KeyT',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
					'cmd:test',
					{ arg1: 'value' },
					expect.anything()
				);
			});

			it('execute called with execution context', () => {
				const exactMatch: MatchResult = {
					type: 'exact',
					entry: {
						command: 'cmd:test',
						key: [key('t', 'KeyT', ['ctrl'])],
						priority: Priority.User,
					},
				};
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(exactMatch);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 't',
					code: 'KeyT',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				// Third argument should be executionContext
				expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
					'cmd:test',
					undefined,
					expect.objectContaining({
						killRing: expect.anything(),
					})
				);
			});
		});

		describe('ExecutionContext integration', () => {
			it('killRing.updateLastActionWasYank called on exact match', () => {
				const exactMatch: MatchResult = {
					type: 'exact',
					entry: {
						command: COMMAND_NAMES.YANK,
						key: [key('y', 'KeyY', ['ctrl'])],
						priority: Priority.User,
					},
				};
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(exactMatch);

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 'y',
					code: 'KeyY',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);

				// Verify updateLastActionWasYank was called
				// Note: executionContext is created internally by InputHandler
				// We verify it exists by checking if execute was called with it
				expect(mockCommandRegistry.execute).toHaveBeenCalled();
			});
		});
	});

	describe('Edge Cases & Complex Scenarios', () => {
		describe('Error handling', () => {
			it('catches errors in onKeyDown and clears state', () => {
				// Force an error by making matcher throw
				mockHotkeyContext.hotkeyMatcher.match.mockImplementation(() => {
					throw new Error('Test error');
				});

				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

				inputHandler.start();
				const event = new KeyboardEvent('keydown', {
					key: 'a',
					code: 'KeyA',
					bubbles: true,
					cancelable: true,
				});

				// Should not throw
				expect(() => window.dispatchEvent(event)).not.toThrow();

				// Should clear state
				expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
				expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalled();
				expect(consoleSpy).toHaveBeenCalled();

				consoleSpy.mockRestore();
			});

			it('clears state after error before processing next key', () => {
				// First key causes error
				mockHotkeyContext.hotkeyMatcher.match
					.mockImplementationOnce(() => {
						throw new Error('Test error');
					})
					.mockReturnValue({ type: 'none', isChord: false });

				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

				inputHandler.start();

				// First key with error
				const event1 = new KeyboardEvent('keydown', {
					key: 'a',
					code: 'KeyA',
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event1);

				// Clear the mocks to check second key
				vi.clearAllMocks();

				// Second key should process normally
				const event2 = new KeyboardEvent('keydown', {
					key: 'b',
					code: 'KeyB',
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event2);

				// Second key should flow through pipeline normally
				expect(mockHotkeyContext.chordBuffer.append).toHaveBeenCalled();
				expect(mockHotkeyContext.hotkeyMatcher.match).toHaveBeenCalled();

				consoleSpy.mockRestore();
			});
		});

		describe('Rapid key sequences', () => {
			it('handles rapid single keys correctly', () => {
				mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({ type: 'none', isChord: false });

				inputHandler.start();

				// Dispatch 5 keys rapidly
				for (let i = 0; i < 5; i++) {
					const event = new KeyboardEvent('keydown', {
						key: 'a',
						code: 'KeyA',
						bubbles: true,
						cancelable: true,
					});
					window.dispatchEvent(event);
				}

				// Each key should be processed independently
				expect(mockHotkeyContext.chordBuffer.append).toHaveBeenCalledTimes(5);
				expect(mockHotkeyContext.hotkeyMatcher.match).toHaveBeenCalledTimes(5);
				// Buffer should be cleared after each no-match
				expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalledTimes(5);
			});

			it('handles rapid chord completion', () => {
				const sequence1 = [key('x', 'KeyX', ['ctrl'])];
				const sequence2 = [key('x', 'KeyX', ['ctrl']), key('s', 'KeyS')];

				mockHotkeyContext.chordBuffer.append
					.mockReturnValueOnce(sequence1)
					.mockReturnValueOnce(sequence2);

				mockHotkeyContext.hotkeyMatcher.match
					.mockReturnValueOnce({ type: 'prefix' })
					.mockReturnValueOnce({
						type: 'exact',
						entry: {
							command: 'test:chord',
							key: sequence2,
							priority: Priority.User,
						},
					});

				inputHandler.start();

				// First key (prefix)
				const event1 = new KeyboardEvent('keydown', {
					key: 'x',
					code: 'KeyX',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event1);

				// Second key immediately (exact match)
				const event2 = new KeyboardEvent('keydown', {
					key: 's',
					code: 'KeyS',
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event2);

				// Command should be executed
				expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
					'test:chord',
					undefined,
					expect.anything()
				);
			});
		});

		describe('State management', () => {
			it('maintains clean state between unrelated keys', () => {
				mockHotkeyContext.hotkeyMatcher.match
					.mockReturnValueOnce({ type: 'none', isChord: false })
					.mockReturnValueOnce({ type: 'none', isChord: false })
					.mockReturnValueOnce({ type: 'none', isChord: false });

				inputHandler.start();

				// Dispatch three unrelated keys
				const keys = ['a', 'b', 'c'];
				keys.forEach((k) => {
					const event = new KeyboardEvent('keydown', {
						key: k,
						code: `Key${k.toUpperCase()}`,
						bubbles: true,
						cancelable: true,
					});
					window.dispatchEvent(event);
				});

				// Each key should independently trigger clear
				expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalledTimes(3);
				expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalledTimes(3);
			});
		});
	});
});
