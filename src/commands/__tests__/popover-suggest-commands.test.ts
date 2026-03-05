import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPopoverSuggestCommands } from '../popover-suggest-commands';
import { POPOVER_SUGGEST_COMMANDS } from '../../constants';
import type { Command } from '../../types';
import type { ExecutionContext } from '../../components/execution-context/ExecutionContext';

const keydown = new KeyboardEvent('keydown');

function createMockContext() {
    return {
        popoverSuggestProxy: {
            moveUp: vi.fn(),
            moveDown: vi.fn(),
        },
    } as unknown as ExecutionContext;
}

describe('createPopoverSuggestCommands', () => {
    let commands: Command[];

    beforeEach(() => {
        vi.clearAllMocks();
        commands = createPopoverSuggestCommands();
    });

    it('returns 2 commands', () => {
        expect(commands).toHaveLength(2);
    });

    it('each command has a unique id', () => {
        const ids = commands.map((c) => c.id);
        expect(new Set(ids).size).toBe(2);
    });

    it('all command ids match POPOVER_SUGGEST_COMMANDS constants', () => {
        const ids = commands.map((c) => c.id);
        const expectedIds = Object.values(POPOVER_SUGGEST_COMMANDS);
        expect(ids).toEqual(expect.arrayContaining(expectedIds));
        expect(expectedIds).toEqual(expect.arrayContaining(ids));
    });

    describe('next-option', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === POPOVER_SUGGEST_COMMANDS.NEXT_OPTION,
            )!;
        });

        it('calls moveDown on popoverSuggestProxy', () => {
            const context = createMockContext();
            command.execute(context, keydown);
            expect(context.popoverSuggestProxy.moveDown).toHaveBeenCalledWith(
                keydown,
            );
        });

        it('passes the keyboard event to moveDown', () => {
            const context = createMockContext();
            const event = new KeyboardEvent('keydown', { key: 'n' });
            command.execute(context, event);
            expect(context.popoverSuggestProxy.moveDown).toHaveBeenCalledWith(
                event,
            );
        });
    });

    describe('prev-option', () => {
        let command: Command;

        beforeEach(() => {
            command = commands.find(
                (c) => c.id === POPOVER_SUGGEST_COMMANDS.PREV_OPTION,
            )!;
        });

        it('calls moveUp on popoverSuggestProxy', () => {
            const context = createMockContext();
            command.execute(context, keydown);
            expect(context.popoverSuggestProxy.moveUp).toHaveBeenCalledWith(
                keydown,
            );
        });

        it('passes the keyboard event to moveUp', () => {
            const context = createMockContext();
            const event = new KeyboardEvent('keydown', { key: 'p' });
            command.execute(context, event);
            expect(context.popoverSuggestProxy.moveUp).toHaveBeenCalledWith(
                event,
            );
        });
    });
});
