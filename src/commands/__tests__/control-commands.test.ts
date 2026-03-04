import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createControlCommands } from '../control-commands';
import type { Command } from '../../types';
import type { ExecutionContext } from '../../components/execution-context/ExecutionContext';
import { CONTROL_COMMANDS, CONTEXT_KEYS } from '../../constants';

const keydown = new KeyboardEvent('keydown');

// Hoist mock functions so vi.mock factory can reference them
const { mockSetContext, mockGetContext } = vi.hoisted(() => ({
    mockSetContext: vi.fn(),
    mockGetContext: vi.fn(),
}));

vi.mock('../../components/ContextEngine', () => ({
    contextEngine: {
        setContext: mockSetContext,
        getContext: mockGetContext,
    },
}));

vi.mock('obsidian', () => ({
    MarkdownView: vi.fn(),
}));

const { MockEditorView } = vi.hoisted(() => {
    const mockScrollIntoView = vi
        .fn()
        .mockReturnValue({ type: 'scrollIntoView' });
    return {
        MockEditorView: { scrollIntoView: mockScrollIntoView },
    };
});

vi.mock('@codemirror/view', () => ({
    EditorView: MockEditorView,
}));

const { MockEditorSelection } = vi.hoisted(() => {
    const mockCursor = vi.fn((pos: number) => ({ anchor: pos, head: pos }));
    const mockCreate = vi.fn((ranges: unknown[]) => ({ ranges }));
    return {
        MockEditorSelection: { cursor: mockCursor, create: mockCreate },
    };
});

vi.mock('@codemirror/state', () => ({
    EditorSelection: MockEditorSelection,
}));

function createMockEditorViewWithSelection(
    ranges: Array<{ head: number; from: number; to: number }>,
) {
    return {
        state: {
            selection: {
                ranges: ranges.map((r) => ({
                    ...r,
                    empty: r.from === r.to,
                })),
                main: ranges[0],
            },
        },
        dispatch: vi.fn(),
    };
}

function createMockContext(
    opts: { editorView?: unknown; editor?: unknown } = {},
): ExecutionContext {
    const mockEditorView =
        opts.editorView !== undefined
            ? opts.editorView
            : {
                  state: {
                      selection: {
                          ranges: [],
                          main: { head: 0 },
                      },
                  },
                  dispatch: vi.fn(),
              };
    const mockEditor =
        opts.editor !== undefined ? opts.editor : { undo: vi.fn() };
    return {
        killRing: {} as ExecutionContext['killRing'],
        workspaceContext: {
            getEditorProxy: () => ({
                getEditorView: () => mockEditorView,
                getEditor: () => mockEditor,
            }),
        } as unknown as ExecutionContext['workspaceContext'],
    } as ExecutionContext;
}

describe('createControlCommands', () => {
    let commands: Command[];

    beforeEach(() => {
        vi.clearAllMocks();
        commands = createControlCommands();
    });

    it('returns 3 commands', () => {
        expect(commands).toHaveLength(3);
    });

    it('each command has a unique id', () => {
        const ids = commands.map((c) => c.id);
        expect(new Set(ids).size).toBe(3);
    });

    it('all command ids match CONTROL_COMMANDS constants', () => {
        const ids = commands.map((c) => c.id);
        const expectedIds = Object.values(CONTROL_COMMANDS);
        expect(ids).toEqual(expect.arrayContaining(expectedIds));
        expect(expectedIds).toEqual(expect.arrayContaining(ids));
    });

    describe('keyboard-quit', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === CONTROL_COMMANDS.KEYBOARD_QUIT,
            )!;
        });

        it('calls contextEngine.setContext to reset LAST_ACTION_WAS_YANK', () => {
            const context = createMockContext();
            command.execute(context, keydown);
            expect(mockSetContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.LAST_ACTION_WAS_YANK,
                false,
            );
        });

        it('dispatches selection collapse', () => {
            const mockView = createMockEditorViewWithSelection([
                { head: 5, from: 0, to: 5 },
            ]);
            const context = createMockContext({ editorView: mockView });
            command.execute(context, keydown);
            expect(mockView.dispatch).toHaveBeenCalled();
        });

        it('collapses multiple selections to cursors at head', () => {
            const mockView = createMockEditorViewWithSelection([
                { head: 5, from: 0, to: 5 },
                { head: 15, from: 10, to: 15 },
            ]);
            const context = createMockContext({ editorView: mockView });
            command.execute(context, keydown);
            expect(MockEditorSelection.cursor).toHaveBeenCalledWith(5);
            expect(MockEditorSelection.cursor).toHaveBeenCalledWith(15);
            expect(MockEditorSelection.create).toHaveBeenCalled();
            expect(mockView.dispatch).toHaveBeenCalled();
        });

        it('still resets context when EditorView is null', () => {
            const context = createMockContext({ editorView: null });
            command.execute(context, keydown);
            expect(mockSetContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.LAST_ACTION_WAS_YANK,
                false,
            );
        });
    });

    describe('recenter-top-bottom', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === CONTROL_COMMANDS.RECENTER_TOP_BOTTOM,
            )!;
        });

        it('first call dispatches with center and sets context to 1', () => {
            mockGetContext.mockReturnValue(undefined);
            const mockView = createMockEditorViewWithSelection([
                { head: 10, from: 10, to: 10 },
            ]);
            const context = createMockContext({ editorView: mockView });
            command.execute(context, keydown);
            expect(MockEditorView.scrollIntoView).toHaveBeenCalledWith(10, {
                y: 'center',
            });
            expect(mockView.dispatch).toHaveBeenCalled();
            expect(mockSetContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.RECENTER_CYCLE_POSITION,
                1,
            );
        });

        it('second call dispatches with start and sets context to 2', () => {
            mockGetContext.mockReturnValue(1);
            const mockView = createMockEditorViewWithSelection([
                { head: 10, from: 10, to: 10 },
            ]);
            const context = createMockContext({ editorView: mockView });
            command.execute(context, keydown);
            expect(MockEditorView.scrollIntoView).toHaveBeenCalledWith(10, {
                y: 'start',
            });
            expect(mockSetContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.RECENTER_CYCLE_POSITION,
                2,
            );
        });

        it('third call dispatches with end and sets context to 0', () => {
            mockGetContext.mockReturnValue(2);
            const mockView = createMockEditorViewWithSelection([
                { head: 10, from: 10, to: 10 },
            ]);
            const context = createMockContext({ editorView: mockView });
            command.execute(context, keydown);
            expect(MockEditorView.scrollIntoView).toHaveBeenCalledWith(10, {
                y: 'end',
            });
            expect(mockSetContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.RECENTER_CYCLE_POSITION,
                0,
            );
        });

        it('does nothing when EditorView is null', () => {
            const context = createMockContext({ editorView: null });
            command.execute(context, keydown);
            expect(MockEditorView.scrollIntoView).not.toHaveBeenCalled();
        });
    });

    describe('undo', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find((c) => c.id === CONTROL_COMMANDS.UNDO)!;
        });

        it('calls editor.undo()', () => {
            const mockEditor = { undo: vi.fn() };
            const context = createMockContext({ editor: mockEditor });
            command.execute(context, keydown);
            expect(mockEditor.undo).toHaveBeenCalled();
        });

        it('does nothing when editor is null', () => {
            const context = createMockContext({ editor: null });
            command.execute(context, keydown);
            // No error thrown
        });
    });
});
