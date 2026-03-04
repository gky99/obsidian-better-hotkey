/**
 * Cursor Movement Commands (Dev Plan 2.3.2)
 * 12 commands using CM6 Direct Call strategy.
 * Each wraps a @codemirror/commands function via MarkdownEditorProxy.getEditorView().
 */

import {
    cursorCharForward,
    cursorCharBackward,
    cursorLineDown,
    cursorLineUp,
    cursorLineStart,
    cursorLineEnd,
    cursorGroupForward,
    cursorGroupBackward,
    cursorPageDown,
    cursorPageUp,
    cursorDocStart,
    cursorDocEnd,
} from '@codemirror/commands';
import { Command as CM6Command } from '@codemirror/view';
import type { Command } from '../types';
import type { ExecutionContext } from '../components/execution-context/ExecutionContext';
import { CURSOR_MOVEMENT_COMMANDS } from '../constants';

/**
 * Create a Command that delegates to a CM6 cursor function.
 */
function cm6CursorCommand(
    id: string,
    name: string,
    cm6Fn: CM6Command,
): Command {
    return {
        id,
        name,
        execute: (context: ExecutionContext) => {
            const editorView = context.workspaceContext
                .getEditorProxy()
                .getEditorView();
            if (editorView) cm6Fn(editorView);
        },
    };
}

export function createCursorCommands(): Command[] {
    return [
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.FORWARD_CHAR,
            'Forward Char',
            cursorCharForward,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.BACKWARD_CHAR,
            'Backward Char',
            cursorCharBackward,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.NEXT_LINE,
            'Next Line',
            cursorLineDown,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.PREVIOUS_LINE,
            'Previous Line',
            cursorLineUp,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.MOVE_BEGINNING_OF_LINE,
            'Move Beginning of Line',
            cursorLineStart,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.MOVE_END_OF_LINE,
            'Move End of Line',
            cursorLineEnd,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.FORWARD_WORD,
            'Forward Word',
            cursorGroupForward,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.BACKWARD_WORD,
            'Backward Word',
            cursorGroupBackward,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.SCROLL_UP,
            'Scroll Up',
            cursorPageDown,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.SCROLL_DOWN,
            'Scroll Down',
            cursorPageUp,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.BEGINNING_OF_BUFFER,
            'Beginning of Buffer',
            cursorDocStart,
        ),
        cm6CursorCommand(
            CURSOR_MOVEMENT_COMMANDS.END_OF_BUFFER,
            'End of Buffer',
            cursorDocEnd,
        ),
    ];
}
