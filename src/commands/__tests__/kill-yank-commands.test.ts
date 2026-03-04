import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createKillYankCommands,
    forwardWordEnd,
    backwardWordStart,
} from '../kill-yank-commands';
import type { Command } from '../../types';
import type { ExecutionContext } from '../../components/execution-context/ExecutionContext';
import { KILL_YANK_COMMANDS } from '../../constants';

const keydown = new KeyboardEvent('keydown');

vi.mock('obsidian', () => ({
    MarkdownView: vi.fn(),
}));

/**
 * Create a minimal mock EditorState that supports sliceDoc and doc operations.
 * Uses a real string as the backing document for accurate position-based testing.
 */
function createMockState(
    text: string,
    head: number,
    selectionFrom?: number,
    selectionTo?: number,
) {
    const from = selectionFrom ?? head;
    const to = selectionTo ?? head;
    return {
        doc: {
            length: text.length,
            lineAt: (pos: number) => {
                // Find line boundaries around pos
                let lineStart = pos;
                while (lineStart > 0 && text[lineStart - 1] !== '\n')
                    lineStart--;
                let lineEnd = pos;
                while (lineEnd < text.length && text[lineEnd] !== '\n')
                    lineEnd++;
                return { from: lineStart, to: lineEnd };
            },
        },
        sliceDoc: (fromPos: number, toPos: number) =>
            text.slice(fromPos, toPos),
        selection: {
            main: {
                head,
                from,
                to,
                empty: from === to,
                anchor: from,
            },
        },
    };
}

function createMockEditorView(
    text: string,
    head: number,
    selectionFrom?: number,
    selectionTo?: number,
) {
    return {
        state: createMockState(text, head, selectionFrom, selectionTo),
        dispatch: vi.fn(),
    };
}

function createMockContext(
    editorView?: ReturnType<typeof createMockEditorView> | null,
): ExecutionContext {
    return {
        killRing: {
            push: vi.fn(),
            yank: vi.fn().mockResolvedValue(null),
            yankPop: vi.fn().mockReturnValue(null),
            setYankRange: vi.fn(),
            getYankRange: vi.fn().mockReturnValue(null),
        },
        workspaceContext: {
            getEditorProxy: () => ({
                getEditorView: () => editorView ?? null,
            }),
            insertAtCursor: vi.fn().mockReturnValue(null),
            replaceRange: vi.fn().mockReturnValue(null),
        },
    } as unknown as ExecutionContext;
}

describe('forwardWordEnd', () => {
    function stateFor(text: string) {
        return createMockState(text, 0);
    }

    it('skips from mid-word to end of word', () => {
        const state = stateFor('hello world');
        expect(forwardWordEnd(state as never, 2)).toBe(5); // he|llo → hello|
    });

    it('skips whitespace then word at word boundary', () => {
        const state = stateFor('hello world');
        expect(forwardWordEnd(state as never, 5)).toBe(11); // hello| world → hello world|
    });

    it('crosses newline to next word', () => {
        const state = stateFor('hello\n  world');
        expect(forwardWordEnd(state as never, 5)).toBe(13); // hello|\n  world → hello\n  world|
    });

    it('returns same position at end of document', () => {
        const state = stateFor('hello');
        expect(forwardWordEnd(state as never, 5)).toBe(5);
    });

    it('skips punctuation before word', () => {
        const state = stateFor('foo...bar');
        expect(forwardWordEnd(state as never, 3)).toBe(9); // foo|...bar → foo...bar|
    });

    it('handles start of document', () => {
        const state = stateFor('hello');
        expect(forwardWordEnd(state as never, 0)).toBe(5);
    });
});

describe('backwardWordStart', () => {
    function stateFor(text: string) {
        return createMockState(text, 0);
    }

    it('skips from mid-word to start of word', () => {
        const state = stateFor('hello world');
        expect(backwardWordStart(state as never, 8)).toBe(6); // hello wo|rld → hello |world
    });

    it('skips whitespace then word at word boundary', () => {
        const state = stateFor('hello world');
        expect(backwardWordStart(state as never, 6)).toBe(0); // hello |world → |hello world
    });

    it('crosses newline to previous word', () => {
        const state = stateFor('hello\n  world');
        expect(backwardWordStart(state as never, 8)).toBe(0); // hello\n  |world → |hello\n  world
    });

    it('returns same position at start of document', () => {
        const state = stateFor('hello');
        expect(backwardWordStart(state as never, 0)).toBe(0);
    });

    it('skips punctuation before word', () => {
        const state = stateFor('foo...bar');
        expect(backwardWordStart(state as never, 6)).toBe(0); // foo...|bar → |foo...bar
    });
});

describe('createKillYankCommands', () => {
    let commands: Command[];

    beforeEach(() => {
        vi.clearAllMocks();
        commands = createKillYankCommands();
    });

    it('returns 7 commands', () => {
        expect(commands).toHaveLength(7);
    });

    it('each command has a unique id', () => {
        const ids = commands.map((c) => c.id);
        expect(new Set(ids).size).toBe(7);
    });

    it('all command ids match KILL_YANK_COMMANDS constants', () => {
        const ids = commands.map((c) => c.id);
        const expectedIds = Object.values(KILL_YANK_COMMANDS);
        expect(ids).toEqual(expect.arrayContaining(expectedIds));
        expect(expectedIds).toEqual(expect.arrayContaining(ids));
    });

    describe('kill-line', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === KILL_YANK_COMMANDS.KILL_LINE,
            )!;
        });

        it('kills text from cursor to end of line', () => {
            const view = createMockEditorView('hello world', 5); // hello| world
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith(' world');
            expect(view.dispatch).toHaveBeenCalledWith({
                changes: { from: 5, to: 11 },
            });
        });

        it('kills newline when at end of line', () => {
            const view = createMockEditorView('hello\nworld', 5); // hello|\nworld
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith('\n');
            expect(view.dispatch).toHaveBeenCalledWith({
                changes: { from: 5, to: 6 },
            });
        });

        it('does nothing at end of document', () => {
            const view = createMockEditorView('hello', 5); // hello|
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).not.toHaveBeenCalled();
            expect(view.dispatch).not.toHaveBeenCalled();
        });

        it('does nothing when EditorView is null', () => {
            const context = createMockContext(null);
            command.execute(context, keydown);
            expect(context.killRing.push).not.toHaveBeenCalled();
        });
    });

    describe('kill-region', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === KILL_YANK_COMMANDS.KILL_REGION,
            )!;
        });

        it('kills selected text', () => {
            const view = createMockEditorView('hello world', 8, 5, 8); // hello [wor]ld
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith(' wo');
            expect(view.dispatch).toHaveBeenCalledWith({
                changes: { from: 5, to: 8 },
                selection: { anchor: 5 },
            });
        });

        it('does nothing with empty selection', () => {
            const view = createMockEditorView('hello world', 5); // hello| world
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).not.toHaveBeenCalled();
            expect(view.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('kill-word', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === KILL_YANK_COMMANDS.KILL_WORD,
            )!;
        });

        it('kills from mid-word to end of word', () => {
            const view = createMockEditorView('hello world', 2); // he|llo world
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith('llo');
            expect(view.dispatch).toHaveBeenCalledWith({
                changes: { from: 2, to: 5 },
            });
        });

        it('kills whitespace + next word at word boundary', () => {
            const view = createMockEditorView('hello world', 5); // hello| world
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith(' world');
            expect(view.dispatch).toHaveBeenCalledWith({
                changes: { from: 5, to: 11 },
            });
        });

        it('crosses newline to kill next word', () => {
            const view = createMockEditorView('hello\nworld', 5); // hello|\nworld
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith('\nworld');
            expect(view.dispatch).toHaveBeenCalledWith({
                changes: { from: 5, to: 11 },
            });
        });

        it('does nothing at end of document', () => {
            const view = createMockEditorView('hello', 5);
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).not.toHaveBeenCalled();
            expect(view.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('backward-kill-word', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === KILL_YANK_COMMANDS.BACKWARD_KILL_WORD,
            )!;
        });

        it('kills from mid-word to start of word', () => {
            const view = createMockEditorView('hello world', 8); // hello wo|rld
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith('wo');
            expect(view.dispatch).toHaveBeenCalledWith({
                changes: { from: 6, to: 8 },
            });
        });

        it('kills previous word + whitespace at word boundary', () => {
            const view = createMockEditorView('hello world', 6); // hello |world
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith('hello ');
            expect(view.dispatch).toHaveBeenCalledWith({
                changes: { from: 0, to: 6 },
            });
        });

        it('crosses newline to kill previous word', () => {
            const view = createMockEditorView('hello\nworld', 6); // hello\n|world
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith('hello\n');
            expect(view.dispatch).toHaveBeenCalledWith({
                changes: { from: 0, to: 6 },
            });
        });

        it('does nothing at start of document', () => {
            const view = createMockEditorView('hello', 0);
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).not.toHaveBeenCalled();
            expect(view.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('copy-region', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === KILL_YANK_COMMANDS.COPY_REGION,
            )!;
        });

        it('copies selected text without deleting', () => {
            const view = createMockEditorView('hello world', 8, 5, 8); // hello [wor]ld
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).toHaveBeenCalledWith(' wo');
            // Should only deselect, not delete
            expect(view.dispatch).toHaveBeenCalledWith({
                selection: { anchor: 8 },
            });
        });

        it('does nothing with empty selection', () => {
            const view = createMockEditorView('hello world', 5);
            const context = createMockContext(view);

            command.execute(context, keydown);

            expect(context.killRing.push).not.toHaveBeenCalled();
            expect(view.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('yank', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find((c) => c.id === KILL_YANK_COMMANDS.YANK)!;
        });

        it('inserts text from kill ring and sets yank range', async () => {
            const view = createMockEditorView('hello', 5);
            const context = createMockContext(view);
            const mockRange = {
                from: { line: 0, ch: 5 },
                to: { line: 0, ch: 11 },
            };

            vi.mocked(context.killRing.yank).mockResolvedValue('yanked');
            vi.mocked(context.workspaceContext.insertAtCursor).mockReturnValue(
                mockRange,
            );

            await command.execute(context, keydown);

            expect(context.killRing.yank).toHaveBeenCalled();
            expect(
                context.workspaceContext.insertAtCursor,
            ).toHaveBeenCalledWith('yanked');
            expect(context.killRing.setYankRange).toHaveBeenCalledWith(
                mockRange,
            );
        });

        it('does nothing when kill ring is empty', async () => {
            const view = createMockEditorView('hello', 5);
            const context = createMockContext(view);

            vi.mocked(context.killRing.yank).mockResolvedValue(null);

            await command.execute(context, keydown);

            expect(
                context.workspaceContext.insertAtCursor,
            ).not.toHaveBeenCalled();
            expect(context.killRing.setYankRange).not.toHaveBeenCalled();
        });
    });

    describe('yank-pop', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === KILL_YANK_COMMANDS.YANK_POP,
            )!;
        });

        it('replaces yank range with next kill ring entry', () => {
            const view = createMockEditorView('hello yanked', 12);
            const context = createMockContext(view);
            const oldRange = {
                from: { line: 0, ch: 6 },
                to: { line: 0, ch: 12 },
            };
            const newRange = {
                from: { line: 0, ch: 6 },
                to: { line: 0, ch: 10 },
            };

            vi.mocked(context.killRing.yankPop).mockReturnValue('next');
            vi.mocked(context.killRing.getYankRange).mockReturnValue(oldRange);
            vi.mocked(context.workspaceContext.replaceRange).mockReturnValue(
                newRange,
            );

            command.execute(context, keydown);

            expect(context.killRing.yankPop).toHaveBeenCalled();
            expect(context.workspaceContext.replaceRange).toHaveBeenCalledWith(
                oldRange,
                'next',
            );
            expect(context.killRing.setYankRange).toHaveBeenCalledWith(
                newRange,
            );
        });

        it('does nothing when yankPop returns null', () => {
            const view = createMockEditorView('hello', 5);
            const context = createMockContext(view);

            vi.mocked(context.killRing.yankPop).mockReturnValue(null);

            command.execute(context, keydown);

            expect(
                context.workspaceContext.replaceRange,
            ).not.toHaveBeenCalled();
            expect(context.killRing.setYankRange).not.toHaveBeenCalled();
        });

        it('does nothing when no yank range stored', () => {
            const view = createMockEditorView('hello', 5);
            const context = createMockContext(view);

            vi.mocked(context.killRing.yankPop).mockReturnValue('text');
            vi.mocked(context.killRing.getYankRange).mockReturnValue(null);

            command.execute(context, keydown);

            expect(
                context.workspaceContext.replaceRange,
            ).not.toHaveBeenCalled();
        });
    });
});
