import { describe, it, expect, vi } from 'vitest';
import { loadObsidianCommands } from '../ObsidianCommandLoader';
import type { App, Command as ObsidianCommand } from 'obsidian';
import type { Command } from '../../types';
import type { ExecutionContext } from '../../components/execution-context/ExecutionContext';

const keydown = new KeyboardEvent('keydown');

/**
 * Helper to get a single command from result array after asserting length.
 */
function firstCommand(result: Command[]): Command {
    expect(result).toHaveLength(1);
    return result[0]!;
}

/**
 * Create a mock App with the private commands registry populated.
 */
function createMockApp(
    commands: Record<string, Partial<ObsidianCommand>>,
): App {
    return {
        commands: { commands },
    } as unknown as App;
}

/**
 * Create a mock ExecutionContext with controllable getActiveMarkdownView.
 */
function createMockContext(view: unknown = null): ExecutionContext {
    return {
        workspaceContext: {
            getActiveMarkdownView: vi.fn().mockReturnValue(view),
        },
    } as unknown as ExecutionContext;
}

/**
 * Create a mock MarkdownView with editor for testing editor callbacks.
 */
function createMockMarkdownView() {
    const mockEditor = { getValue: vi.fn() };
    return { editor: mockEditor };
}

describe('ObsidianCommandLoader', () => {
    describe('loadObsidianCommands', () => {
        describe('filtering', () => {
            it('includes commands with mobileOnly: false', () => {
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        mobileOnly: false,
                        callback: vi.fn(),
                    },
                });

                const result = loadObsidianCommands(app);
                const cmd = firstCommand(result);
                expect(cmd.id).toBe('test:cmd');
            });

            it('includes commands with mobileOnly: undefined', () => {
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        callback: vi.fn(),
                    },
                });

                const result = loadObsidianCommands(app);
                expect(result).toHaveLength(1);
            });

            it('excludes commands with mobileOnly: true', () => {
                const app = createMockApp({
                    'mobile:cmd': {
                        id: 'mobile:cmd',
                        name: 'Mobile Only',
                        mobileOnly: true,
                        callback: vi.fn(),
                    },
                });

                const result = loadObsidianCommands(app);
                expect(result).toHaveLength(0);
            });

            it('excludes commands with no callback', () => {
                const app = createMockApp({
                    'no-cb:cmd': {
                        id: 'no-cb:cmd',
                        name: 'No Callback',
                    },
                });

                const result = loadObsidianCommands(app);
                expect(result).toHaveLength(0);
            });

            it('returns empty array when no commands exist', () => {
                const app = createMockApp({});
                const result = loadObsidianCommands(app);
                expect(result).toEqual([]);
            });

            it('filters mixed commands correctly', () => {
                const app = createMockApp({
                    'valid:cmd': {
                        id: 'valid:cmd',
                        name: 'Valid',
                        callback: vi.fn(),
                    },
                    'mobile:cmd': {
                        id: 'mobile:cmd',
                        name: 'Mobile',
                        mobileOnly: true,
                        callback: vi.fn(),
                    },
                    'no-cb:cmd': {
                        id: 'no-cb:cmd',
                        name: 'No CB',
                    },
                    'also-valid:cmd': {
                        id: 'also-valid:cmd',
                        name: 'Also Valid',
                        checkCallback: vi.fn(),
                    },
                });

                const result = loadObsidianCommands(app);
                expect(result).toHaveLength(2);
                const ids = result.map((c) => c.id);
                expect(ids).toContain('valid:cmd');
                expect(ids).toContain('also-valid:cmd');
            });
        });

        describe('callback priority', () => {
            it('uses editorCheckCallback when all callbacks present', () => {
                const editorCheckCb = vi.fn();
                const editorCb = vi.fn();
                const checkCb = vi.fn();
                const cb = vi.fn();
                const mockView = createMockMarkdownView();
                const context = createMockContext(mockView);

                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        editorCheckCallback: editorCheckCb,
                        editorCallback: editorCb,
                        checkCallback: checkCb,
                        callback: cb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                cmd.execute(context, keydown);

                expect(editorCheckCb).toHaveBeenCalledWith(
                    false,
                    mockView.editor,
                    mockView,
                );
                expect(editorCb).not.toHaveBeenCalled();
                expect(checkCb).not.toHaveBeenCalled();
                expect(cb).not.toHaveBeenCalled();
            });

            it('uses editorCallback when no editorCheckCallback', () => {
                const editorCb = vi.fn();
                const checkCb = vi.fn();
                const cb = vi.fn();
                const mockView = createMockMarkdownView();
                const context = createMockContext(mockView);

                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        editorCallback: editorCb,
                        checkCallback: checkCb,
                        callback: cb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                cmd.execute(context, keydown);

                expect(editorCb).toHaveBeenCalledWith(
                    mockView.editor,
                    mockView,
                );
                expect(checkCb).not.toHaveBeenCalled();
                expect(cb).not.toHaveBeenCalled();
            });

            it('uses checkCallback when no editor callbacks', () => {
                const checkCb = vi.fn();
                const cb = vi.fn();

                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        checkCallback: checkCb,
                        callback: cb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                cmd.execute({} as unknown as ExecutionContext, keydown);

                expect(checkCb).toHaveBeenCalledWith(false);
                expect(cb).not.toHaveBeenCalled();
            });

            it('uses callback when it is the only callback', () => {
                const cb = vi.fn();

                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        callback: cb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                cmd.execute({} as unknown as ExecutionContext, keydown);

                expect(cb).toHaveBeenCalledOnce();
            });
        });

        describe('editor callback wrapping', () => {
            it('derives editor and view from context at execution time', () => {
                const editorCb = vi.fn();
                const mockView = createMockMarkdownView();

                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        editorCallback: editorCb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));

                // First call: no view available
                const noViewCtx = createMockContext(null);
                cmd.execute(noViewCtx, keydown);
                expect(editorCb).not.toHaveBeenCalled();

                // Second call: view becomes available
                const withViewCtx = createMockContext(mockView);
                cmd.execute(withViewCtx, keydown);
                expect(editorCb).toHaveBeenCalledWith(
                    mockView.editor,
                    mockView,
                );
            });

            it('calls editorCheckCallback with checking=false', () => {
                const ecCb = vi.fn();
                const mockView = createMockMarkdownView();
                const context = createMockContext(mockView);

                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        editorCheckCallback: ecCb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                cmd.execute(context, keydown);

                expect(ecCb).toHaveBeenCalledWith(
                    false,
                    mockView.editor,
                    mockView,
                );
            });
        });

        describe('canExecute pre-check', () => {
            it('editorCheckCallback: canExecute returns false when no view', () => {
                const ecCb = vi.fn().mockReturnValue(true);
                const context = createMockContext(null);
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        editorCheckCallback: ecCb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.canExecute!(context)).toBe(false);
            });

            it('editorCheckCallback: canExecute returns false when check fails', () => {
                const ecCb = vi.fn().mockReturnValue(false);
                const mockView = createMockMarkdownView();
                const context = createMockContext(mockView);
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        editorCheckCallback: ecCb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.canExecute!(context)).toBe(false);
                expect(ecCb).toHaveBeenCalledWith(
                    true,
                    mockView.editor,
                    mockView,
                );
            });

            it('editorCheckCallback: canExecute returns true when check passes', () => {
                const ecCb = vi.fn().mockReturnValue(true);
                const mockView = createMockMarkdownView();
                const context = createMockContext(mockView);
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        editorCheckCallback: ecCb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.canExecute!(context)).toBe(true);
            });

            it('editorCallback: canExecute returns false when no view', () => {
                const context = createMockContext(null);
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        editorCallback: vi.fn(),
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.canExecute!(context)).toBe(false);
            });

            it('editorCallback: canExecute returns true when view exists', () => {
                const mockView = createMockMarkdownView();
                const context = createMockContext(mockView);
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        editorCallback: vi.fn(),
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.canExecute!(context)).toBe(true);
            });

            it('checkCallback: canExecute returns false when check fails', () => {
                const cCb = vi.fn().mockReturnValue(false);
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        checkCallback: cCb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.canExecute!()).toBe(false);
                expect(cCb).toHaveBeenCalledWith(true);
            });

            it('checkCallback: canExecute returns true when check passes', () => {
                const cCb = vi.fn().mockReturnValue(true);
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        checkCallback: cCb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.canExecute!()).toBe(true);
            });

            it('callback: no canExecute defined (always available)', () => {
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        callback: vi.fn(),
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.canExecute).toBeUndefined();
            });
        });

        describe('non-editor callback wrapping', () => {
            it('calls callback directly', () => {
                const cb = vi.fn();
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        callback: cb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                cmd.execute({} as unknown as ExecutionContext, keydown);

                expect(cb).toHaveBeenCalledOnce();
                expect(cb).toHaveBeenCalledWith();
            });

            it('calls checkCallback with checking=false', () => {
                const cCb = vi.fn();
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        checkCallback: cCb,
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                cmd.execute({} as unknown as ExecutionContext, keydown);

                expect(cCb).toHaveBeenCalledWith(false);
            });
        });

        describe('wrapped command shape', () => {
            it('preserves original command id', () => {
                const app = createMockApp({
                    'app:open-settings': {
                        id: 'app:open-settings',
                        name: 'Open Settings',
                        callback: vi.fn(),
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.id).toBe('app:open-settings');
            });

            it('preserves original command name', () => {
                const app = createMockApp({
                    'app:open-settings': {
                        id: 'app:open-settings',
                        name: 'Open Settings',
                        callback: vi.fn(),
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd.name).toBe('Open Settings');
            });

            it('returns Command objects with execute function', () => {
                const app = createMockApp({
                    'test:cmd': {
                        id: 'test:cmd',
                        name: 'Test',
                        callback: vi.fn(),
                    },
                });

                const cmd = firstCommand(loadObsidianCommands(app));
                expect(cmd).toHaveProperty('id');
                expect(cmd).toHaveProperty('name');
                expect(cmd.execute).toBeInstanceOf(Function);
            });
        });
    });
});
