/**
 * Editing Commands (Dev Plan 2.3.3 + 2.3.4)
 * 3 basic editing commands using CM6 Direct Call strategy.
 * 4 case transformation commands using custom implementation via view.dispatch.
 */

import {
    deleteCharForward,
    transposeChars,
    splitLine,
} from "@codemirror/commands";
import { Command as CM6Command } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import type { Text } from "@codemirror/state";
import type { Command } from "../types";
import type { ExecutionContext } from "../components/execution-context/ExecutionContext";
import { EDITING_COMMANDS } from "../constants";

/**
 * Create a Command that delegates to a CM6 editing function.
 */
function cm6EditCommand(
    id: string,
    name: string,
    cm6Fn: CM6Command,
): Command {
    return {
        id,
        name,
        execute: (
            _args?: Record<string, unknown>,
            context?: ExecutionContext,
        ) => {
            if (!context) return;
            const editorView = context.workspaceContext
                .getEditorProxy()
                .getEditorView();
            if (editorView) cm6Fn(editorView);
        },
    };
}

/**
 * Find the full word at or near the given position.
 * If the cursor is on a word character, expand in both directions.
 * If at whitespace/non-word, skip forward to the next word.
 */
function findWordAt(doc: Text, pos: number): { from: number; to: number } | null {
    const len = doc.length;

    // Check if cursor is in a word character
    if (pos < len && /\w/.test(doc.sliceString(pos, pos + 1))) {
        // Expand backward
        let from = pos;
        while (from > 0 && /\w/.test(doc.sliceString(from - 1, from))) from--;
        // Expand forward
        let to = pos;
        while (to < len && /\w/.test(doc.sliceString(to, to + 1))) to++;
        return { from, to };
    }

    // Check character before cursor
    if (pos > 0 && /\w/.test(doc.sliceString(pos - 1, pos))) {
        let from = pos - 1;
        while (from > 0 && /\w/.test(doc.sliceString(from - 1, from))) from--;
        let to = pos;
        while (to < len && /\w/.test(doc.sliceString(to, to + 1))) to++;
        return { from, to };
    }

    // Skip forward to next word
    let nextPos = pos;
    while (nextPos < len && !/\w/.test(doc.sliceString(nextPos, nextPos + 1))) nextPos++;
    if (nextPos >= len) return null;

    let from = nextPos;
    let to = nextPos;
    while (to < len && /\w/.test(doc.sliceString(to, to + 1))) to++;
    return { from, to };
}

/**
 * Create a case transformation command that operates on the word under the cursor.
 */
function caseWordCommand(
    id: string,
    name: string,
    transform: (s: string) => string,
): Command {
    return {
        id,
        name,
        execute: (
            _args?: Record<string, unknown>,
            context?: ExecutionContext,
        ) => {
            if (!context) return;
            const editorView = context.workspaceContext
                .getEditorProxy()
                .getEditorView();
            if (!editorView) return;

            const { state } = editorView;
            const changes: { from: number; to: number; insert: string }[] = [];
            const selections: { anchor: number; head: number }[] = [];

            for (const range of state.selection.ranges) {
                const word = findWordAt(state.doc, range.head);
                if (word) {
                    const text = state.doc.sliceString(word.from, word.to);
                    const transformed = transform(text);
                    changes.push({ from: word.from, to: word.to, insert: transformed });
                    selections.push({ anchor: word.from + transformed.length, head: word.from + transformed.length });
                } else {
                    selections.push({ anchor: range.head, head: range.head });
                }
            }

            if (changes.length > 0) {
                editorView.dispatch({
                    changes,
                    selection: EditorSelection.create(
                        selections.map((s) => EditorSelection.cursor(s.head)),
                    ),
                });
            }
        },
    };
}

/**
 * Create a case transformation command that operates on the selected region.
 */
function caseRegionCommand(
    id: string,
    name: string,
    transform: (s: string) => string,
): Command {
    return {
        id,
        name,
        execute: (
            _args?: Record<string, unknown>,
            context?: ExecutionContext,
        ) => {
            if (!context) return;
            const editorView = context.workspaceContext
                .getEditorProxy()
                .getEditorView();
            if (!editorView) return;

            const { state } = editorView;

            // No-op if all ranges are empty (no selection)
            if (state.selection.ranges.every((r) => r.empty)) return;

            const result = state.changeByRange((range) => {
                if (range.empty) {
                    return { range };
                }
                const text = state.doc.sliceString(range.from, range.to);
                const transformed = transform(text);
                return {
                    changes: { from: range.from, to: range.to, insert: transformed },
                    range: EditorSelection.range(range.from, range.from + transformed.length),
                };
            });

            editorView.dispatch(result);
        },
    };
}

export function createEditingCommands(): Command[] {
    return [
        // Basic Editing (2.3.3) — CM6 Direct Call
        cm6EditCommand(
            EDITING_COMMANDS.DELETE_CHAR,
            "Delete Char",
            deleteCharForward,
        ),
        cm6EditCommand(
            EDITING_COMMANDS.TRANSPOSE_CHARS,
            "Transpose Chars",
            transposeChars,
        ),
        cm6EditCommand(
            EDITING_COMMANDS.OPEN_LINE,
            "Open Line",
            splitLine,
        ),
        // Case Transformation (2.3.4) — Custom
        caseWordCommand(
            EDITING_COMMANDS.UPCASE_WORD,
            "Upcase Word",
            (s) => s.toUpperCase(),
        ),
        caseWordCommand(
            EDITING_COMMANDS.DOWNCASE_WORD,
            "Downcase Word",
            (s) => s.toLowerCase(),
        ),
        caseRegionCommand(
            EDITING_COMMANDS.UPCASE_REGION,
            "Upcase Region",
            (s) => s.toUpperCase(),
        ),
        caseRegionCommand(
            EDITING_COMMANDS.DOWNCASE_REGION,
            "Downcase Region",
            (s) => s.toLowerCase(),
        ),
    ];
}
