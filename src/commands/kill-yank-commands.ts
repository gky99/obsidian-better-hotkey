/**
 * Kill & Yank Commands (Dev Plan 2.3.1)
 * 7 commands with custom implementation — Kill Ring integration,
 * word boundary computation, and clipboard sync.
 *
 * Kill commands use CM6 EditorView directly for precise range computation.
 * Yank commands use WorkspaceContext for EditorRange compatibility with KillRing.
 */

import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { Command } from '../types';
import type { ExecutionContext } from '../components';
import { KILL_YANK_COMMANDS } from '../constants';

/**
 * Get EditorView from ExecutionContext, or null if unavailable.
 */
function getEditorView(context: ExecutionContext): EditorView | null {
    return context.workspaceContext.getEditorProxy().getEditorView();
}

/**
 * Skip non-word chars forward, then word chars. Returns end position.
 * Matches Emacs forward-word behavior: crosses whitespace, newlines, punctuation
 * to find the end of the next word.
 */
export function forwardWordEnd(state: EditorState, head: number): number {
    const docLength = state.doc.length;
    let pos = head;

    // Skip non-word chars (whitespace, newlines, punctuation)
    while (pos < docLength) {
        const char = state.sliceDoc(pos, pos + 1);
        if (/\w/.test(char)) break;
        pos++;
    }

    // Skip word chars
    while (pos < docLength) {
        const char = state.sliceDoc(pos, pos + 1);
        if (!/\w/.test(char)) break;
        pos++;
    }

    return pos;
}

/**
 * Skip non-word chars backward, then word chars. Returns start position.
 * Matches Emacs backward-word behavior: crosses whitespace, newlines, punctuation
 * to find the start of the previous word.
 */
export function backwardWordStart(state: EditorState, head: number): number {
    let pos = head;

    // Skip non-word chars backward
    while (pos > 0) {
        const char = state.sliceDoc(pos - 1, pos);
        if (/\w/.test(char)) break;
        pos--;
    }

    // Skip word chars backward
    while (pos > 0) {
        const char = state.sliceDoc(pos - 1, pos);
        if (!/\w/.test(char)) break;
        pos--;
    }

    return pos;
}

export function createKillYankCommands(): Command[] {
    return [
        // kill-line (C-k): Cursor to EOL, or kill newline at EOL
        {
            id: KILL_YANK_COMMANDS.KILL_LINE,
            name: 'Kill Line',
            execute: (context: ExecutionContext) => {
                const view = getEditorView(context);
                if (!view) return;

                const { state } = view;
                const head = state.selection.main.head;
                const line = state.doc.lineAt(head);

                if (head === line.to) {
                    // At end of line — kill the newline character (join lines)
                    if (head < state.doc.length) {
                        context.killRing.push('\n');
                        view.dispatch({
                            changes: { from: head, to: head + 1 },
                        });
                    }
                    // At end of document — no-op
                } else {
                    // Kill from cursor to end of line
                    const text = state.sliceDoc(head, line.to);
                    if (text) {
                        context.killRing.push(text);
                        view.dispatch({
                            changes: { from: head, to: line.to },
                        });
                    }
                }
            },
        },

        // kill-region (C-w): Kill selected text
        {
            id: KILL_YANK_COMMANDS.KILL_REGION,
            name: 'Kill Region',
            execute: (context: ExecutionContext) => {
                const view = getEditorView(context);
                if (!view) return;

                const { state } = view;
                const range = state.selection.main;

                if (range.empty) return;

                const text = state.sliceDoc(range.from, range.to);
                context.killRing.push(text);
                view.dispatch({
                    changes: { from: range.from, to: range.to },
                    selection: { anchor: range.from },
                });
            },
        },

        // kill-word (M-d): Kill forward word
        {
            id: KILL_YANK_COMMANDS.KILL_WORD,
            name: 'Kill Word',
            execute: (context: ExecutionContext) => {
                const view = getEditorView(context);
                if (!view) return;

                const { state } = view;
                const head = state.selection.main.head;
                const target = forwardWordEnd(state, head);

                if (target === head) return;

                const text = state.sliceDoc(head, target);
                context.killRing.push(text);
                view.dispatch({
                    changes: { from: head, to: target },
                });
            },
        },

        // backward-kill-word (M-Backspace): Kill backward word
        {
            id: KILL_YANK_COMMANDS.BACKWARD_KILL_WORD,
            name: 'Backward Kill Word',
            execute: (context: ExecutionContext) => {
                const view = getEditorView(context);
                if (!view) return;

                const { state } = view;
                const head = state.selection.main.head;
                const target = backwardWordStart(state, head);

                if (target === head) return;

                const text = state.sliceDoc(target, head);
                context.killRing.push(text);
                view.dispatch({
                    changes: { from: target, to: head },
                });
            },
        },

        // copy-region (M-w): Copy selected text to kill ring (no delete)
        {
            id: KILL_YANK_COMMANDS.COPY_REGION,
            name: 'Copy Region',
            execute: (context: ExecutionContext) => {
                const view = getEditorView(context);
                if (!view) return;

                const { state } = view;
                const range = state.selection.main;

                if (range.empty) return;

                const text = state.sliceDoc(range.from, range.to);
                context.killRing.push(text);

                // Deselect — move cursor to head position
                view.dispatch({
                    selection: { anchor: range.head },
                });
            },
        },

        // yank (C-y): Insert from kill ring
        {
            id: KILL_YANK_COMMANDS.YANK,
            name: 'Yank',
            execute: async (context: ExecutionContext) => {
                const text = await context.killRing.yank();
                if (!text) return;

                const range = context.workspaceContext.insertAtCursor(text);
                if (range) {
                    context.killRing.setYankRange(range);
                }
            },
        },

        // yank-pop (M-y): Cycle kill ring, replace last yank
        {
            id: KILL_YANK_COMMANDS.YANK_POP,
            name: 'Yank Pop',
            execute: (context: ExecutionContext) => {
                const text = context.killRing.yankPop();
                if (!text) return;

                const yankRange = context.killRing.getYankRange();
                if (!yankRange) return;

                const newRange = context.workspaceContext.replaceRange(
                    yankRange,
                    text,
                );
                if (newRange) {
                    context.killRing.setYankRange(newRange);
                }
            },
        },
    ];
}
