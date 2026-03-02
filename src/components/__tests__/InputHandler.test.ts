import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputHandler } from '../InputHandler';
import { KILL_YANK_COMMANDS } from '../../constants';
import type { KeyPress, MatchResult } from '../../types';
import { Priority } from '../../types';
import type { Plugin, App } from 'obsidian';
import { Scope } from 'obsidian';
import { CONTEXT_KEY_TRUE } from '../context-key-expression';

// Mock obsidian module — Scope needs handleKey on its prototype
vi.mock('obsidian', () => {
    const MockScope = class MockScope {
        constructor(parent?: any) {}
        register() {
            return {};
        }
        unregister() {}
    };
    (MockScope.prototype as any).handleKey = vi.fn();
    return {
        Scope: MockScope,
        MarkdownView: vi.fn(),
        App: vi.fn(),
        Plugin: vi.fn(),
    };
});

// Mock factory for Plugin with keymap.scope for top-scope routing
function createMockPlugin() {
    const mockTopScope = {};
    const mockApp = {
        scope: {},
        keymap: {
            scope: mockTopScope,
        },
        workspace: {
            getActiveViewOfType: vi.fn().mockReturnValue(null),
            activeLeaf: null,
            on: vi.fn().mockReturnValue({}),
        },
    } as unknown as App;
    return {
        app: mockApp,
        register: vi.fn(),
        registerEvent: vi.fn(),
    } as unknown as Plugin;
}

// Helper function to create KeyPress objects
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
    let mockPlugin: Plugin;
    let mockOriginalHandleKey: ReturnType<typeof vi.fn>;

    /** Invoke the patched handleKey as the top scope */
    function invokeHandler(event: KeyboardEvent): any {
        const patchedHandleKey = (Scope.prototype as any).handleKey;
        const topScope = (mockPlugin.app as any).keymap.scope;
        return patchedHandleKey.call(topScope, event, {});
    }

    /** Invoke the patched handleKey as a non-top scope */
    function invokeHandlerOnNonTopScope(event: KeyboardEvent): any {
        const patchedHandleKey = (Scope.prototype as any).handleKey;
        return patchedHandleKey.call({}, event, {});
    }

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset Scope.prototype.handleKey to a fresh mock
        mockOriginalHandleKey = vi.fn();
        (Scope.prototype as any).handleKey = mockOriginalHandleKey;

        // Create fresh mocks
        mockHotkeyContext = createMockHotkeyContext();
        mockCommandRegistry = createMockCommandRegistry();
        mockPlugin = createMockPlugin();

        // Create InputHandler with mocked dependencies
        inputHandler = new InputHandler(
            mockCommandRegistry as any,
            mockHotkeyContext as any,
            mockPlugin,
        );
    });

    describe('handleKey Patch Lifecycle', () => {
        it('start() patches Scope.prototype.handleKey', () => {
            inputHandler.start();
            expect((Scope.prototype as any).handleKey).not.toBe(
                mockOriginalHandleKey,
            );
        });

        it('start() registers teardown callback via plugin.register', () => {
            inputHandler.start();
            expect((mockPlugin as any).register).toHaveBeenCalledWith(
                expect.any(Function),
            );
        });

        it('stop() restores original Scope.prototype.handleKey', () => {
            inputHandler.start();
            inputHandler.stop();
            expect((Scope.prototype as any).handleKey).toBe(
                mockOriginalHandleKey,
            );
        });

        it('stop() is idempotent when not started', () => {
            expect(() => inputHandler.stop()).not.toThrow();
        });

        it('stop() is idempotent after already stopped', () => {
            inputHandler.start();
            inputHandler.stop();
            const fn = (Scope.prototype as any).handleKey;
            inputHandler.stop();
            expect((Scope.prototype as any).handleKey).toBe(fn);
        });
    });

    describe('Top Scope Routing', () => {
        it('runs pipeline when called on top scope', () => {
            mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                type: 'none',
                isChord: false,
            });

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            invokeHandler(event);

            expect(mockHotkeyContext.chordBuffer.append).toHaveBeenCalled();
        });

        it('skips pipeline when called on non-top scope', () => {
            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            invokeHandlerOnNonTopScope(event);

            expect(
                mockHotkeyContext.chordBuffer.append,
            ).not.toHaveBeenCalled();
        });

        it('calls original handleKey when called on non-top scope', () => {
            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            invokeHandlerOnNonTopScope(event);

            expect(mockOriginalHandleKey).toHaveBeenCalled();
        });

        it('calls original handleKey on top scope when no match (pass through)', () => {
            mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                type: 'none',
                isChord: false,
            });

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            invokeHandler(event);

            expect(mockOriginalHandleKey).toHaveBeenCalled();
        });

        it('does NOT call original handleKey on top scope when match found (suppress)', () => {
            mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                type: 'exact',
                entry: {
                    command: 'test:cmd',
                    key: [key('a', 'KeyA')],
                    priority: Priority.User,
                    whenExpr: CONTEXT_KEY_TRUE,
                },
            });

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            invokeHandler(event);

            expect(mockOriginalHandleKey).not.toHaveBeenCalled();
        });
    });

    describe('Pipeline Orchestration', () => {
        it('basic key press flows through pipeline', () => {
            mockHotkeyContext.chordBuffer.append.mockReturnValue([
                key('a', 'KeyA'),
            ]);
            mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                type: 'none',
                isChord: false,
            });

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            invokeHandler(event);

            // Verify pipeline flow
            expect(mockHotkeyContext.chordBuffer.append).toHaveBeenCalled();
            expect(mockHotkeyContext.hotkeyMatcher.match).toHaveBeenCalledWith([
                key('a', 'KeyA'),
            ]);
        });

        it('modifier-only keys are skipped (Control)', () => {
            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'Control',
                code: 'ControlLeft',
            });
            invokeHandler(event);

            expect(mockHotkeyContext.chordBuffer.append).not.toHaveBeenCalled();
            expect(
                mockHotkeyContext.hotkeyMatcher.match,
            ).not.toHaveBeenCalled();
            // Should pass through to original handleKey
            expect(mockOriginalHandleKey).toHaveBeenCalled();
        });

        it('modifier-only keys are skipped (Alt, Shift, Meta)', () => {
            inputHandler.start();

            const modifiers = ['Alt', 'Shift', 'Meta'];
            modifiers.forEach((mod) => {
                const event = new KeyboardEvent('keydown', {
                    key: mod,
                    code: `${mod}Left`,
                });
                invokeHandler(event);
            });

            expect(mockHotkeyContext.chordBuffer.append).not.toHaveBeenCalled();
            expect(
                mockHotkeyContext.hotkeyMatcher.match,
            ).not.toHaveBeenCalled();
        });

        it('escape key clears buffer and status', () => {
            mockHotkeyContext.hotkeyMatcher.isEscape.mockReturnValue(true);

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
            });
            invokeHandler(event);

            expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
            expect(mockHotkeyContext.statusIndicator.clear).toHaveBeenCalled();
            expect(
                mockHotkeyContext.hotkeyMatcher.match,
            ).not.toHaveBeenCalled();
            // Should pass through to original handleKey
            expect(mockOriginalHandleKey).toHaveBeenCalled();
        });

        it('escape key clears buffer even with pending sequence', () => {
            mockHotkeyContext.chordBuffer.append.mockReturnValue([
                key('x', 'KeyX', ['ctrl']),
            ]);
            mockHotkeyContext.hotkeyMatcher.isEscape.mockReturnValue(true);

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
            });
            invokeHandler(event);

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
                        whenExpr: CONTEXT_KEY_TRUE,
                    },
                };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    baseExactMatch,
                );

                testEvent = new KeyboardEvent('keydown', {
                    key: 's',
                    code: 'KeyS',
                    ctrlKey: true,
                });
            });

            it('executes command via commandRegistry', () => {
                inputHandler.start();
                invokeHandler(testEvent);

                expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
                    'test:command',
                    undefined,
                    expect.anything(),
                );
            });

            it('returns false to suppress event', () => {
                inputHandler.start();
                const result = invokeHandler(testEvent);

                expect(result).toBe(false);
            });

            it('clears buffer and status', () => {
                inputHandler.start();
                invokeHandler(testEvent);

                expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
                expect(
                    mockHotkeyContext.statusIndicator.clear,
                ).toHaveBeenCalled();
            });

            it('passes command args to registry', () => {
                const exactMatchWithArgs: MatchResult = {
                    type: 'exact',
                    entry: {
                        command: 'test:command',
                        key: [key('s', 'KeyS', ['ctrl'])],
                        priority: Priority.User,
                        whenExpr: CONTEXT_KEY_TRUE,
                        args: { count: 5 },
                    },
                };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    exactMatchWithArgs,
                );

                inputHandler.start();
                invokeHandler(testEvent);

                expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
                    'test:command',
                    { count: 5 },
                    expect.anything(),
                );
            });
        });

        describe('Prefix match flow', () => {
            let prefixMatch: MatchResult;
            let testEvent: KeyboardEvent;

            beforeEach(() => {
                prefixMatch = { type: 'prefix' };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    prefixMatch,
                );

                testEvent = new KeyboardEvent('keydown', {
                    key: 'x',
                    code: 'KeyX',
                    ctrlKey: true,
                });
            });

            it('shows pending status with sequence', () => {
                const sequence = [key('x', 'KeyX', ['ctrl'])];
                mockHotkeyContext.chordBuffer.append.mockReturnValue(sequence);

                inputHandler.start();
                invokeHandler(testEvent);

                expect(
                    mockHotkeyContext.statusIndicator.showPending,
                ).toHaveBeenCalledWith(sequence);
            });

            it('returns false to suppress event', () => {
                inputHandler.start();
                const result = invokeHandler(testEvent);

                expect(result).toBe(false);
            });

            it('does NOT clear buffer (keeps pending sequence)', () => {
                inputHandler.start();
                invokeHandler(testEvent);

                expect(
                    mockHotkeyContext.chordBuffer.clear,
                ).not.toHaveBeenCalled();
            });
        });

        describe('No match - chord (isChord: true)', () => {
            let noMatchChord: MatchResult;
            let testEvent: KeyboardEvent;

            beforeEach(() => {
                noMatchChord = { type: 'none', isChord: true };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    noMatchChord,
                );

                testEvent = new KeyboardEvent('keydown', {
                    key: 'z',
                    code: 'KeyZ',
                    ctrlKey: true,
                });
            });

            it('clears buffer', () => {
                inputHandler.start();
                invokeHandler(testEvent);

                expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
            });

            it('returns false to suppress event', () => {
                inputHandler.start();
                const result = invokeHandler(testEvent);

                expect(result).toBe(false);
            });

            it('clears status', () => {
                inputHandler.start();
                invokeHandler(testEvent);

                expect(
                    mockHotkeyContext.statusIndicator.clear,
                ).toHaveBeenCalled();
            });
        });

        describe('No match - non-chord (isChord: false)', () => {
            let noMatchNonChord: MatchResult;
            let testEvent: KeyboardEvent;

            beforeEach(() => {
                noMatchNonChord = { type: 'none', isChord: false };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    noMatchNonChord,
                );

                testEvent = new KeyboardEvent('keydown', {
                    key: 'a',
                    code: 'KeyA',
                });
            });

            it('clears buffer', () => {
                inputHandler.start();
                invokeHandler(testEvent);

                expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
            });

            it('passes through to original handleKey (normal typing)', () => {
                inputHandler.start();
                invokeHandler(testEvent);

                expect(mockOriginalHandleKey).toHaveBeenCalled();
            });

            it('clears status', () => {
                inputHandler.start();
                invokeHandler(testEvent);

                expect(
                    mockHotkeyContext.statusIndicator.clear,
                ).toHaveBeenCalled();
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
                });
                invokeHandler(event);

                expect(
                    mockHotkeyContext.hotkeyMatcher.match,
                ).toHaveBeenCalledWith(sequence);
            });

            it('first key in sequence creates single-key array', () => {
                const sequence = [key('x', 'KeyX', ['ctrl'])];
                mockHotkeyContext.chordBuffer.append.mockReturnValue(sequence);

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 'x',
                    code: 'KeyX',
                    ctrlKey: true,
                });
                invokeHandler(event);

                expect(
                    mockHotkeyContext.hotkeyMatcher.match,
                ).toHaveBeenCalledWith(sequence);
            });
        });

        describe('HotkeyMatcher integration', () => {
            it('calls isEscape before processing', () => {
                mockHotkeyContext.hotkeyMatcher.isEscape.mockReturnValue(false);

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 'a',
                    code: 'KeyA',
                });
                invokeHandler(event);

                expect(
                    mockHotkeyContext.hotkeyMatcher.isEscape,
                ).toHaveBeenCalled();
            });

            it('calls match with sequence from buffer', () => {
                const sequence = [key('a', 'KeyA')];
                mockHotkeyContext.chordBuffer.append.mockReturnValue(sequence);

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 'a',
                    code: 'KeyA',
                });
                invokeHandler(event);

                expect(
                    mockHotkeyContext.hotkeyMatcher.match,
                ).toHaveBeenCalledWith(sequence);
                expect(
                    mockHotkeyContext.hotkeyMatcher.match,
                ).toHaveBeenCalledTimes(1);
            });
        });

        describe('StatusIndicator integration', () => {
            it('shows pending for prefix match', () => {
                const sequence = [key('x', 'KeyX', ['ctrl'])];
                const prefixMatch: MatchResult = { type: 'prefix' };
                mockHotkeyContext.chordBuffer.append.mockReturnValue(sequence);
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    prefixMatch,
                );

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 'x',
                    code: 'KeyX',
                    ctrlKey: true,
                });
                invokeHandler(event);

                expect(
                    mockHotkeyContext.statusIndicator.showPending,
                ).toHaveBeenCalledWith(sequence);
            });

            it('clears status on exact match', () => {
                const exactMatch: MatchResult = {
                    type: 'exact',
                    entry: {
                        command: 'test:command',
                        key: [key('s', 'KeyS', ['ctrl'])],
                        priority: Priority.User,
                        whenExpr: CONTEXT_KEY_TRUE,
                    },
                };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    exactMatch,
                );

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 's',
                    code: 'KeyS',
                    ctrlKey: true,
                });
                invokeHandler(event);

                expect(
                    mockHotkeyContext.statusIndicator.clear,
                ).toHaveBeenCalled();
            });

            it('clears status on escape', () => {
                mockHotkeyContext.hotkeyMatcher.isEscape.mockReturnValue(true);

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                });
                invokeHandler(event);

                expect(
                    mockHotkeyContext.statusIndicator.clear,
                ).toHaveBeenCalled();
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
                        whenExpr: CONTEXT_KEY_TRUE,
                    },
                };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    exactMatch,
                );

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 't',
                    code: 'KeyT',
                    ctrlKey: true,
                });
                invokeHandler(event);

                expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
                    'cmd:test',
                    undefined,
                    expect.anything(),
                );
            });

            it('execute called with args if present', () => {
                const exactMatch: MatchResult = {
                    type: 'exact',
                    entry: {
                        command: 'cmd:test',
                        key: [key('t', 'KeyT', ['ctrl'])],
                        priority: Priority.User,
                        whenExpr: CONTEXT_KEY_TRUE,
                        args: { arg1: 'value' },
                    },
                };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    exactMatch,
                );

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 't',
                    code: 'KeyT',
                    ctrlKey: true,
                });
                invokeHandler(event);

                expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
                    'cmd:test',
                    { arg1: 'value' },
                    expect.anything(),
                );
            });

            it('execute called with execution context', () => {
                const exactMatch: MatchResult = {
                    type: 'exact',
                    entry: {
                        command: 'cmd:test',
                        key: [key('t', 'KeyT', ['ctrl'])],
                        priority: Priority.User,
                        whenExpr: CONTEXT_KEY_TRUE,
                    },
                };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    exactMatch,
                );

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 't',
                    code: 'KeyT',
                    ctrlKey: true,
                });
                invokeHandler(event);

                expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
                    'cmd:test',
                    undefined,
                    expect.objectContaining({
                        killRing: expect.anything(),
                    }),
                );
            });
        });

        describe('ExecutionContext integration', () => {
            it('killRing.updateLastActionWasYank called on exact match', () => {
                const exactMatch: MatchResult = {
                    type: 'exact',
                    entry: {
                        command: KILL_YANK_COMMANDS.YANK,
                        key: [key('y', 'KeyY', ['ctrl'])],
                        priority: Priority.User,
                        whenExpr: CONTEXT_KEY_TRUE,
                    },
                };
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue(
                    exactMatch,
                );

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 'y',
                    code: 'KeyY',
                    ctrlKey: true,
                });
                invokeHandler(event);

                expect(mockCommandRegistry.execute).toHaveBeenCalled();
            });
        });
    });

    describe('Edge Cases & Complex Scenarios', () => {
        describe('Error handling', () => {
            it('catches errors in handler and clears state', () => {
                mockHotkeyContext.hotkeyMatcher.match.mockImplementation(() => {
                    throw new Error('Test error');
                });

                const consoleSpy = vi
                    .spyOn(console, 'error')
                    .mockImplementation(() => {});

                inputHandler.start();
                const event = new KeyboardEvent('keydown', {
                    key: 'a',
                    code: 'KeyA',
                });

                invokeHandler(event);

                expect(mockHotkeyContext.chordBuffer.clear).toHaveBeenCalled();
                expect(
                    mockHotkeyContext.statusIndicator.clear,
                ).toHaveBeenCalled();
                expect(consoleSpy).toHaveBeenCalled();
                // On error, should pass through to original handleKey
                expect(mockOriginalHandleKey).toHaveBeenCalled();

                consoleSpy.mockRestore();
            });

            it('clears state after error before processing next key', () => {
                mockHotkeyContext.hotkeyMatcher.match
                    .mockImplementationOnce(() => {
                        throw new Error('Test error');
                    })
                    .mockReturnValue({ type: 'none', isChord: false });

                const consoleSpy = vi
                    .spyOn(console, 'error')
                    .mockImplementation(() => {});

                inputHandler.start();

                // First key with error
                const event1 = new KeyboardEvent('keydown', {
                    key: 'a',
                    code: 'KeyA',
                });
                invokeHandler(event1);

                // Clear the mocks to check second key
                mockHotkeyContext.chordBuffer.append.mockClear();
                mockHotkeyContext.hotkeyMatcher.match.mockClear();
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                    type: 'none',
                    isChord: false,
                });

                // Second key should process normally
                const event2 = new KeyboardEvent('keydown', {
                    key: 'b',
                    code: 'KeyB',
                });
                invokeHandler(event2);

                expect(mockHotkeyContext.chordBuffer.append).toHaveBeenCalled();
                expect(
                    mockHotkeyContext.hotkeyMatcher.match,
                ).toHaveBeenCalled();

                consoleSpy.mockRestore();
            });
        });

        describe('Rapid key sequences', () => {
            it('handles rapid single keys correctly', () => {
                mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                    type: 'none',
                    isChord: false,
                });

                inputHandler.start();

                for (let i = 0; i < 5; i++) {
                    const event = new KeyboardEvent('keydown', {
                        key: 'a',
                        code: 'KeyA',
                    });
                    invokeHandler(event);
                }

                expect(
                    mockHotkeyContext.chordBuffer.append,
                ).toHaveBeenCalledTimes(5);
                expect(
                    mockHotkeyContext.hotkeyMatcher.match,
                ).toHaveBeenCalledTimes(5);
                expect(
                    mockHotkeyContext.chordBuffer.clear,
                ).toHaveBeenCalledTimes(5);
            });

            it('handles rapid chord completion', () => {
                const sequence1 = [key('x', 'KeyX', ['ctrl'])];
                const sequence2 = [
                    key('x', 'KeyX', ['ctrl']),
                    key('s', 'KeyS'),
                ];

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
                            whenExpr: CONTEXT_KEY_TRUE,
                        },
                    });

                inputHandler.start();

                // First key (prefix)
                const event1 = new KeyboardEvent('keydown', {
                    key: 'x',
                    code: 'KeyX',
                    ctrlKey: true,
                });
                const result1 = invokeHandler(event1);
                expect(result1).toBe(false);

                // Second key immediately (exact match)
                const event2 = new KeyboardEvent('keydown', {
                    key: 's',
                    code: 'KeyS',
                });
                const result2 = invokeHandler(event2);
                expect(result2).toBe(false);

                expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
                    'test:chord',
                    undefined,
                    expect.anything(),
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

                const keys = ['a', 'b', 'c'];
                keys.forEach((k) => {
                    const event = new KeyboardEvent('keydown', {
                        key: k,
                        code: `Key${k.toUpperCase()}`,
                    });
                    invokeHandler(event);
                });

                expect(
                    mockHotkeyContext.chordBuffer.clear,
                ).toHaveBeenCalledTimes(3);
                expect(
                    mockHotkeyContext.statusIndicator.clear,
                ).toHaveBeenCalledTimes(3);
            });
        });
    });

    describe('Layout-aware normalization', () => {
        it('derives key from layout service getBaseCharacter for letter keys', () => {
            mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                type: 'none',
                isChord: false,
            });

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            invokeHandler(event);

            const appendCall =
                mockHotkeyContext.chordBuffer.append.mock.calls[0]![0];
            expect(appendCall.code).toBe('KeyA');
        });

        it('preserves event.code as-is for all keys', () => {
            mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                type: 'none',
                isChord: false,
            });

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                code: 'KeyK',
                ctrlKey: true,
            });
            invokeHandler(event);

            const appendCall =
                mockHotkeyContext.chordBuffer.append.mock.calls[0]![0];
            expect(appendCall.code).toBe('KeyK');
        });

        it('falls back to event.key for special keys (Escape)', () => {
            mockHotkeyContext.hotkeyMatcher.isEscape.mockReturnValue(true);

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
            });
            invokeHandler(event);

            const escapeCall =
                mockHotkeyContext.hotkeyMatcher.isEscape.mock.calls[0]![0];
            expect(escapeCall.key).toBe('Escape');
            expect(escapeCall.code).toBe('Escape');
        });

        it('handles macOS Option key scenario (event.key mangled, code correct)', async () => {
            const { keyboardLayoutService } =
                await import('../KeyboardLayoutService');
            await keyboardLayoutService.initialize();

            mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                type: 'none',
                isChord: false,
            });

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'é',
                code: 'KeyE',
                altKey: true,
            });
            invokeHandler(event);

            const appendCall =
                mockHotkeyContext.chordBuffer.append.mock.calls[0]![0];
            expect(appendCall.key).toBe('e');
            expect(appendCall.code).toBe('KeyE');

            keyboardLayoutService.dispose();
        });

        it('extracts modifiers correctly', () => {
            mockHotkeyContext.hotkeyMatcher.match.mockReturnValue({
                type: 'none',
                isChord: false,
            });

            inputHandler.start();
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                code: 'KeyK',
                ctrlKey: true,
                shiftKey: true,
            });
            invokeHandler(event);

            const appendCall =
                mockHotkeyContext.chordBuffer.append.mock.calls[0]![0];
            expect(appendCall.modifiers.has('ctrl')).toBe(true);
            expect(appendCall.modifiers.has('shift')).toBe(true);
            expect(appendCall.modifiers.has('alt')).toBe(false);
            expect(appendCall.modifiers.has('meta')).toBe(false);
        });
    });
});
