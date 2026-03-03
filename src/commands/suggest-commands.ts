/**
 * Suggest Modal Commands
 * 14 commands for navigating suggestions and editing input in SuggestModal.
 *
 * Architecture:
 * - Helper functions accept interfaces (SuggestionSelector, InputFieldEditor)
 *   for reusability with PopoverSuggest later.
 * - KillRing is passed explicitly to helpers that need it (not injected into proxy).
 * - Word boundary helpers use \w regex matching Emacs-style word movement.
 */

import type { Command, SuggestionSelector, InputFieldEditor } from '../types';
import type { ExecutionContext } from '../components/execution-context/ExecutionContext';
import type { KillRing } from '../components/execution-context/KillRing';
import { SUGGEST_COMMANDS } from '../constants';

// ─── Word Boundary Helpers ───

/**
 * Find the end of the next word from the given position.
 * Emacs forward-word: skip non-word chars, then skip word chars.
 */
function forwardWordEnd(text: string, pos: number): number {
    let p = pos;
    while (p < text.length && !/\w/.test(text.charAt(p))) p++;
    while (p < text.length && /\w/.test(text.charAt(p))) p++;
    return p;
}

/**
 * Find the start of the previous word from the given position.
 * Emacs backward-word: skip non-word chars backward, then skip word chars backward.
 */
function backwardWordStart(text: string, pos: number): number {
    let p = pos;
    while (p > 0 && !/\w/.test(text.charAt(p - 1))) p--;
    while (p > 0 && /\w/.test(text.charAt(p - 1))) p--;
    return p;
}

// ─── Selection Helpers (take SuggestionSelector) ───

function moveSelectionDown(
    selector: SuggestionSelector,
    event?: KeyboardEvent,
): void {
    selector.moveDown(event);
}

function moveSelectionUp(
    selector: SuggestionSelector,
    event?: KeyboardEvent,
): void {
    selector.moveUp(event);
}

// ─── Cursor Movement Helpers (take InputFieldEditor) ───

function forwardChar(editor: InputFieldEditor): void {
    const sel = editor.getSelection();
    if (sel.from < editor.getTextLength()) {
        const pos = sel.from + 1;
        editor.setSelection({ from: pos, to: pos });
    }
}

function backwardChar(editor: InputFieldEditor): void {
    const sel = editor.getSelection();
    if (sel.from > 0) {
        const pos = sel.from - 1;
        editor.setSelection({ from: pos, to: pos });
    }
}

function forwardWord(editor: InputFieldEditor): void {
    const sel = editor.getSelection();
    const target = forwardWordEnd(editor.getText(), sel.from);
    editor.setSelection({ from: target, to: target });
}

function backwardWord(editor: InputFieldEditor): void {
    const sel = editor.getSelection();
    const target = backwardWordStart(editor.getText(), sel.from);
    editor.setSelection({ from: target, to: target });
}

function moveBeginningOfLine(editor: InputFieldEditor): void {
    editor.setSelection({ from: 0, to: 0 });
}

function moveEndOfLine(editor: InputFieldEditor): void {
    const len = editor.getTextLength();
    editor.setSelection({ from: len, to: len });
}

// ─── Text Modification Helpers (take InputFieldEditor + KillRing) ───

function deleteCharForward(editor: InputFieldEditor): void {
    const sel = editor.getSelection();
    if (sel.from < editor.getTextLength()) {
        editor.deleteText(sel.from, sel.from + 1);
    }
}

function deleteCharBackward(editor: InputFieldEditor): void {
    const sel = editor.getSelection();
    if (sel.from > 0) {
        editor.deleteText(sel.from - 1, sel.from);
    }
}

function killLine(editor: InputFieldEditor, killRing: KillRing): void {
    const sel = editor.getSelection();
    const len = editor.getTextLength();
    if (sel.from < len) {
        const killed = editor.getText().substring(sel.from);
        killRing.push(killed);
        editor.deleteText(sel.from, len);
    }
}

function killWord(editor: InputFieldEditor, killRing: KillRing): void {
    const sel = editor.getSelection();
    const target = forwardWordEnd(editor.getText(), sel.from);
    if (target > sel.from) {
        const killed = editor.getText().substring(sel.from, target);
        killRing.push(killed);
        editor.deleteText(sel.from, target);
    }
}

function backwardKillWord(
    editor: InputFieldEditor,
    killRing: KillRing,
): void {
    const sel = editor.getSelection();
    const target = backwardWordStart(editor.getText(), sel.from);
    if (target < sel.from) {
        const killed = editor.getText().substring(target, sel.from);
        killRing.push(killed);
        editor.deleteText(target, sel.from);
    }
}

function yankText(editor: InputFieldEditor, killRing: KillRing): void {
    const entries = killRing.getEntries();
    const text = entries[0];
    if (text === undefined) return;
    const sel = editor.getSelection();
    editor.insertText(text, sel.from);
}

// ─── Command Factory ───

export function createSuggestCommands(): Command[] {
    return [
        // Selection navigation
        {
            id: SUGGEST_COMMANDS.NEXT_OPTION,
            name: 'Next Suggestion',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
                event?: KeyboardEvent,
            ) {
                if (!context) return;
                moveSelectionDown(context.suggestModalProxy, event);
            },
        },
        {
            id: SUGGEST_COMMANDS.PREV_OPTION,
            name: 'Previous Suggestion',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
                event?: KeyboardEvent,
            ) {
                if (!context) return;
                moveSelectionUp(context.suggestModalProxy, event);
            },
        },
        // Cursor movement
        {
            id: SUGGEST_COMMANDS.FORWARD_CHAR,
            name: 'Suggest Forward Char',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                forwardChar(context.suggestModalProxy);
            },
        },
        {
            id: SUGGEST_COMMANDS.BACKWARD_CHAR,
            name: 'Suggest Backward Char',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                backwardChar(context.suggestModalProxy);
            },
        },
        {
            id: SUGGEST_COMMANDS.FORWARD_WORD,
            name: 'Suggest Forward Word',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                forwardWord(context.suggestModalProxy);
            },
        },
        {
            id: SUGGEST_COMMANDS.BACKWARD_WORD,
            name: 'Suggest Backward Word',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                backwardWord(context.suggestModalProxy);
            },
        },
        {
            id: SUGGEST_COMMANDS.MOVE_BEGINNING_OF_LINE,
            name: 'Suggest Move Beginning of Line',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                moveBeginningOfLine(context.suggestModalProxy);
            },
        },
        {
            id: SUGGEST_COMMANDS.MOVE_END_OF_LINE,
            name: 'Suggest Move End of Line',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                moveEndOfLine(context.suggestModalProxy);
            },
        },
        // Text modification
        {
            id: SUGGEST_COMMANDS.DELETE_CHAR,
            name: 'Suggest Delete Char',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                deleteCharForward(context.suggestModalProxy);
            },
        },
        {
            id: SUGGEST_COMMANDS.DELETE_BACKWARD_CHAR,
            name: 'Suggest Delete Backward Char',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                deleteCharBackward(context.suggestModalProxy);
            },
        },
        {
            id: SUGGEST_COMMANDS.KILL_LINE,
            name: 'Suggest Kill Line',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                killLine(context.suggestModalProxy, context.killRing);
            },
        },
        {
            id: SUGGEST_COMMANDS.KILL_WORD,
            name: 'Suggest Kill Word',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                killWord(context.suggestModalProxy, context.killRing);
            },
        },
        {
            id: SUGGEST_COMMANDS.BACKWARD_KILL_WORD,
            name: 'Suggest Backward Kill Word',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                backwardKillWord(
                    context.suggestModalProxy,
                    context.killRing,
                );
            },
        },
        {
            id: SUGGEST_COMMANDS.YANK,
            name: 'Suggest Yank',
            execute(
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) {
                if (!context) return;
                yankText(context.suggestModalProxy, context.killRing);
            },
        },
    ];
}
