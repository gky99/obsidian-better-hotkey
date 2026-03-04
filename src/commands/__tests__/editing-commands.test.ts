import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEditingCommands } from '../editing-commands';
import type { Command } from '../../types';
import type { ExecutionContext } from '../../components/execution-context/ExecutionContext';
import { EDITING_COMMANDS } from '../../constants';

const keydown = new KeyboardEvent('keydown');

// Hoist mock functions so vi.mock factory can reference them
const { mockDeleteCharForward, mockTransposeChars, mockSplitLine } = vi.hoisted(
    () => ({
        mockDeleteCharForward: vi.fn().mockReturnValue(true),
        mockTransposeChars: vi.fn().mockReturnValue(true),
        mockSplitLine: vi.fn().mockReturnValue(true),
    }),
);

vi.mock('@codemirror/commands', () => ({
    deleteCharForward: mockDeleteCharForward,
    transposeChars: mockTransposeChars,
    splitLine: mockSplitLine,
}));

vi.mock('@codemirror/view', () => ({
    EditorView: vi.fn(),
}));

vi.mock('@codemirror/state', () => ({
    EditorSelection: {
        cursor: (pos: number) => ({ anchor: pos, head: pos }),
        create: (ranges: unknown[]) => ({ ranges }),
        range: (from: number, to: number) => ({
            anchor: from,
            head: to,
            from,
            to,
            empty: from === to,
        }),
    },
}));

vi.mock('obsidian', () => ({
    MarkdownView: vi.fn(),
}));

const mockEditorView = { state: {}, dispatch: vi.fn() };

function createMockContext(
    editorView: unknown = mockEditorView,
): ExecutionContext {
    return {
        killRing: {} as ExecutionContext['killRing'],
        workspaceContext: {
            getEditorProxy: () => ({
                getEditorView: () => editorView,
            }),
        } as unknown as ExecutionContext['workspaceContext'],
    } as ExecutionContext;
}

function createCaseMockEditorView(text: string, cursorPos: number) {
    return {
        state: {
            doc: {
                length: text.length,
                sliceString: (from: number, to: number) => text.slice(from, to),
            },
            selection: {
                ranges: [
                    {
                        head: cursorPos,
                        from: cursorPos,
                        to: cursorPos,
                        empty: true,
                    },
                ],
            },
        },
        dispatch: vi.fn(),
    };
}

function createSelectionMockEditorView(
    text: string,
    selFrom: number,
    selTo: number,
) {
    return {
        state: {
            doc: {
                length: text.length,
                sliceString: (from: number, to: number) => text.slice(from, to),
            },
            selection: {
                ranges: [
                    { head: selTo, from: selFrom, to: selTo, empty: false },
                ],
            },
            changeByRange: (
                fn: (range: {
                    from: number;
                    to: number;
                    head: number;
                    empty: boolean;
                }) => unknown,
            ) => {
                const range = {
                    from: selFrom,
                    to: selTo,
                    head: selTo,
                    empty: false,
                };
                const result = fn(range) as {
                    changes: unknown;
                    range: unknown;
                };
                return {
                    changes: [result.changes],
                    selection: { ranges: [result.range] },
                };
            },
        },
        dispatch: vi.fn(),
    };
}

function createEmptySelectionMockEditorView(text: string, cursorPos: number) {
    return {
        state: {
            doc: {
                length: text.length,
                sliceString: (from: number, to: number) => text.slice(from, to),
            },
            selection: {
                ranges: [
                    {
                        head: cursorPos,
                        from: cursorPos,
                        to: cursorPos,
                        empty: true,
                    },
                ],
            },
            changeByRange: vi.fn(),
        },
        dispatch: vi.fn(),
    };
}

describe('createEditingCommands', () => {
    let commands: Command[];

    beforeEach(() => {
        vi.clearAllMocks();
        commands = createEditingCommands();
    });

    it('returns 7 commands', () => {
        expect(commands).toHaveLength(7);
    });

    it('each command has a unique id', () => {
        const ids = commands.map((c) => c.id);
        expect(new Set(ids).size).toBe(7);
    });

    it('all command ids match EDITING_COMMANDS constants', () => {
        const ids = commands.map((c) => c.id);
        const expectedIds = Object.values(EDITING_COMMANDS);
        expect(ids).toEqual(expect.arrayContaining(expectedIds));
        expect(expectedIds).toEqual(expect.arrayContaining(ids));
    });

    describe.each([
        [EDITING_COMMANDS.DELETE_CHAR, 'Delete Char', mockDeleteCharForward],
        [
            EDITING_COMMANDS.TRANSPOSE_CHARS,
            'Transpose Chars',
            mockTransposeChars,
        ],
        [EDITING_COMMANDS.OPEN_LINE, 'Open Line', mockSplitLine],
    ])('%s', (id, name, mockFn) => {
        let command: Command;

        beforeEach(() => {
            command = commands.find((c) => c.id === id)!;
        });

        it(`has name "${name}"`, () => {
            expect(command.name).toBe(name);
        });

        it('calls CM6 function with EditorView when context is available', () => {
            const context = createMockContext();
            command.execute(context, keydown);
            expect(mockFn).toHaveBeenCalledWith(mockEditorView);
        });

        it('does nothing when EditorView is null', () => {
            const context = createMockContext(null);
            command.execute(context, keydown);
            expect(mockFn).not.toHaveBeenCalled();
        });
    });

    describe('Case Transformation Commands', () => {
        describe('Word Commands', () => {
            it('upcase-word transforms word at cursor start to uppercase', () => {
                const mockView = createCaseMockEditorView('hello world', 0);
                const context = createMockContext(mockView);
                const command = commands.find(
                    (c) => c.id === EDITING_COMMANDS.UPCASE_WORD,
                )!;

                command.execute(context, keydown);

                expect(mockView.dispatch).toHaveBeenCalledTimes(1);
                const call = mockView.dispatch.mock.calls[0]![0];
                expect(call.changes).toEqual([
                    { from: 0, to: 5, insert: 'HELLO' },
                ]);
            });

            it('downcase-word transforms full word when cursor is in middle', () => {
                const mockView = createCaseMockEditorView('HELLO world', 2);
                const context = createMockContext(mockView);
                const command = commands.find(
                    (c) => c.id === EDITING_COMMANDS.DOWNCASE_WORD,
                )!;

                command.execute(context, keydown);

                expect(mockView.dispatch).toHaveBeenCalledTimes(1);
                const call = mockView.dispatch.mock.calls[0]![0];
                expect(call.changes).toEqual([
                    { from: 0, to: 5, insert: 'hello' },
                ]);
            });

            it('word command at whitespace finds and transforms next word', () => {
                // "hello  world" with cursor at position 6 (second space)
                // pos=6 is ' ', pos-1=5 is ' ', so it skips forward to "world"
                const mockView = createCaseMockEditorView('hello  world', 6);
                const context = createMockContext(mockView);
                const command = commands.find(
                    (c) => c.id === EDITING_COMMANDS.UPCASE_WORD,
                )!;

                command.execute(context, keydown);

                expect(mockView.dispatch).toHaveBeenCalledTimes(1);
                const call = mockView.dispatch.mock.calls[0]![0];
                expect(call.changes).toEqual([
                    { from: 7, to: 12, insert: 'WORLD' },
                ]);
            });

            it('word command does nothing with null EditorView', () => {
                const context = createMockContext(null);
                const command = commands.find(
                    (c) => c.id === EDITING_COMMANDS.UPCASE_WORD,
                )!;
                command.execute(context, keydown);
                // No error thrown
            });
        });

        describe('Region Commands', () => {
            it('upcase-region transforms selected text to uppercase', () => {
                const mockView = createSelectionMockEditorView(
                    'hello world',
                    0,
                    5,
                );
                const context = createMockContext(mockView);
                const command = commands.find(
                    (c) => c.id === EDITING_COMMANDS.UPCASE_REGION,
                )!;

                command.execute(context, keydown);

                expect(mockView.dispatch).toHaveBeenCalledTimes(1);
            });

            it('downcase-region transforms selected text to lowercase', () => {
                const mockView = createSelectionMockEditorView(
                    'HELLO world',
                    0,
                    5,
                );
                const context = createMockContext(mockView);
                const command = commands.find(
                    (c) => c.id === EDITING_COMMANDS.DOWNCASE_REGION,
                )!;

                command.execute(context, keydown);

                expect(mockView.dispatch).toHaveBeenCalledTimes(1);
            });

            it('region command with empty selection does not dispatch', () => {
                const mockView = createEmptySelectionMockEditorView(
                    'hello world',
                    3,
                );
                const context = createMockContext(mockView);
                const command = commands.find(
                    (c) => c.id === EDITING_COMMANDS.UPCASE_REGION,
                )!;

                command.execute(context, keydown);

                expect(mockView.dispatch).not.toHaveBeenCalled();
                expect(mockView.state.changeByRange).not.toHaveBeenCalled();
            });

            it('region command does nothing with null EditorView', () => {
                const context = createMockContext(null);
                const command = commands.find(
                    (c) => c.id === EDITING_COMMANDS.UPCASE_REGION,
                )!;
                command.execute(context, keydown);
                // No error thrown
            });
        });
    });
});
