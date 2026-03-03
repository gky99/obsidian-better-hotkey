import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSuggestCommands } from '../suggest-commands';
import { SUGGEST_COMMANDS } from '../../constants';
import type { Command } from '../../types';
import type { ExecutionContext } from '../../components/execution-context/ExecutionContext';

vi.mock('obsidian', () => ({
    SuggestModal: class {
        open() {}
        close() {}
    },
}));

function createMockContext() {
    return {
        suggestModalProxy: {
            moveUp: vi.fn(),
            moveDown: vi.fn(),
            getSelection: vi.fn().mockReturnValue({ from: 5, to: 5 }),
            setSelection: vi.fn(),
            getText: vi.fn().mockReturnValue('hello world'),
            getTextLength: vi.fn().mockReturnValue(11),
            insertText: vi.fn(),
            deleteText: vi.fn(),
        },
        killRing: {
            push: vi.fn(),
            getEntries: vi.fn().mockReturnValue(['yanked text']),
        },
    } as unknown as ExecutionContext;
}

describe('createSuggestCommands', () => {
    let commands: Command[];

    beforeEach(() => {
        vi.clearAllMocks();
        commands = createSuggestCommands();
    });

    it('returns 14 commands', () => {
        expect(commands).toHaveLength(14);
    });

    it('each command has a unique id', () => {
        const ids = commands.map((c) => c.id);
        expect(new Set(ids).size).toBe(14);
    });

    it('all command ids match SUGGEST_COMMANDS constants', () => {
        const ids = commands.map((c) => c.id);
        const expectedIds = Object.values(SUGGEST_COMMANDS);
        expect(ids).toEqual(expect.arrayContaining(expectedIds));
        expect(expectedIds).toEqual(expect.arrayContaining(ids));
    });

    describe('selection navigation', () => {
        describe('next-option', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.NEXT_OPTION,
                )!;
            });

            it('calls moveDown on suggestModalProxy', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.moveDown,
                ).toHaveBeenCalled();
            });

            it('passes the event to moveDown', () => {
                const context = createMockContext();
                const event = new KeyboardEvent('keydown');

                command.execute(undefined, context, event);

                expect(
                    (context as any).suggestModalProxy.moveDown,
                ).toHaveBeenCalledWith(event);
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('prev-option', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.PREV_OPTION,
                )!;
            });

            it('calls moveUp on suggestModalProxy', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.moveUp,
                ).toHaveBeenCalled();
            });

            it('passes the event to moveUp', () => {
                const context = createMockContext();
                const event = new KeyboardEvent('keydown');

                command.execute(undefined, context, event);

                expect(
                    (context as any).suggestModalProxy.moveUp,
                ).toHaveBeenCalledWith(event);
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });
    });

    describe('cursor movement', () => {
        describe('forward-char', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.FORWARD_CHAR,
                )!;
            });

            it('moves cursor forward by one character', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).toHaveBeenCalledWith({ from: 6, to: 6 });
            });

            it('does not move cursor past end of text', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 11,
                    to: 11,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).not.toHaveBeenCalled();
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('backward-char', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.BACKWARD_CHAR,
                )!;
            });

            it('moves cursor backward by one character', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).toHaveBeenCalledWith({ from: 4, to: 4 });
            });

            it('does not move cursor before start of text', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 0,
                    to: 0,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).not.toHaveBeenCalled();
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('forward-word', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.FORWARD_WORD,
                )!;
            });

            it('moves cursor to end of next word', () => {
                const context = createMockContext();
                // cursor at position 5 in "hello world" -> skips space, then "world" ends at 11
                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).toHaveBeenCalledWith({ from: 11, to: 11 });
            });

            it('moves from mid-word to end of word', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 2,
                    to: 2,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).toHaveBeenCalledWith({ from: 5, to: 5 });
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('backward-word', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.BACKWARD_WORD,
                )!;
            });

            it('moves cursor to start of previous word', () => {
                const context = createMockContext();
                // cursor at position 5 in "hello world" -> backward skips to start of "hello" at 0
                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).toHaveBeenCalledWith({ from: 0, to: 0 });
            });

            it('moves from mid-word to start of word', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 8,
                    to: 8,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).toHaveBeenCalledWith({ from: 6, to: 6 });
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('move-beginning-of-line', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.MOVE_BEGINNING_OF_LINE,
                )!;
            });

            it('moves cursor to position 0', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).toHaveBeenCalledWith({ from: 0, to: 0 });
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('move-end-of-line', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.MOVE_END_OF_LINE,
                )!;
            });

            it('moves cursor to end of text', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.setSelection,
                ).toHaveBeenCalledWith({ from: 11, to: 11 });
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });
    });

    describe('text modification', () => {
        describe('delete-char', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.DELETE_CHAR,
                )!;
            });

            it('deletes character after cursor', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).toHaveBeenCalledWith(5, 6);
            });

            it('does not delete past end of text', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 11,
                    to: 11,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).not.toHaveBeenCalled();
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('delete-backward-char', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.DELETE_BACKWARD_CHAR,
                )!;
            });

            it('deletes character before cursor', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).toHaveBeenCalledWith(4, 5);
            });

            it('does not delete before start of text', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 0,
                    to: 0,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).not.toHaveBeenCalled();
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('kill-line', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.KILL_LINE,
                )!;
            });

            it('kills text from cursor to end of line', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).killRing.push,
                ).toHaveBeenCalledWith(' world');
                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).toHaveBeenCalledWith(5, 11);
            });

            it('does not kill when cursor is at end of text', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 11,
                    to: 11,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).killRing.push,
                ).not.toHaveBeenCalled();
                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).not.toHaveBeenCalled();
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('kill-word', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.KILL_WORD,
                )!;
            });

            it('kills from cursor to end of next word', () => {
                const context = createMockContext();
                // cursor at 5 in "hello world" -> kills " world" (pos 5 to 11)
                command.execute(undefined, context);

                expect(
                    (context as any).killRing.push,
                ).toHaveBeenCalledWith(' world');
                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).toHaveBeenCalledWith(5, 11);
            });

            it('kills from mid-word to end of word', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 2,
                    to: 2,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).killRing.push,
                ).toHaveBeenCalledWith('llo');
                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).toHaveBeenCalledWith(2, 5);
            });

            it('does nothing at end of text', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 11,
                    to: 11,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).killRing.push,
                ).not.toHaveBeenCalled();
                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).not.toHaveBeenCalled();
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('backward-kill-word', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.BACKWARD_KILL_WORD,
                )!;
            });

            it('kills from cursor backward to start of word', () => {
                const context = createMockContext();
                // cursor at 5 in "hello world" -> backward kills "hello" (pos 0 to 5)
                command.execute(undefined, context);

                expect(
                    (context as any).killRing.push,
                ).toHaveBeenCalledWith('hello');
                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).toHaveBeenCalledWith(0, 5);
            });

            it('kills from mid-word to start of word', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 8,
                    to: 8,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).killRing.push,
                ).toHaveBeenCalledWith('wo');
                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).toHaveBeenCalledWith(6, 8);
            });

            it('does nothing at start of text', () => {
                const context = createMockContext();
                (context as any).suggestModalProxy.getSelection.mockReturnValue({
                    from: 0,
                    to: 0,
                });

                command.execute(undefined, context);

                expect(
                    (context as any).killRing.push,
                ).not.toHaveBeenCalled();
                expect(
                    (context as any).suggestModalProxy.deleteText,
                ).not.toHaveBeenCalled();
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });

        describe('yank', () => {
            let command: Command;

            beforeEach(() => {
                command = commands.find(
                    (c) => c.id === SUGGEST_COMMANDS.YANK,
                )!;
            });

            it('inserts text from kill ring at cursor position', () => {
                const context = createMockContext();

                command.execute(undefined, context);

                expect(
                    (context as any).killRing.getEntries,
                ).toHaveBeenCalled();
                expect(
                    (context as any).suggestModalProxy.insertText,
                ).toHaveBeenCalledWith('yanked text', 5);
            });

            it('does nothing when kill ring is empty', () => {
                const context = createMockContext();
                (context as any).killRing.getEntries.mockReturnValue([]);

                command.execute(undefined, context);

                expect(
                    (context as any).suggestModalProxy.insertText,
                ).not.toHaveBeenCalled();
            });

            it('does nothing when no context', () => {
                expect(() => command.execute()).not.toThrow();
            });
        });
    });
});
