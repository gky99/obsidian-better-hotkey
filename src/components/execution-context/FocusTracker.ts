/**
 * FocusTracker Component
 * Responsibility: Detect which UI element has focus at key-event time
 * and set mutual-exclusive focus state context keys on ContextEngine.
 *
 * Called synchronously from InputHandler.handleKeyEvent() before matching.
 * Does NOT install any event listeners — purely on-demand detection.
 */

import type { WorkspaceContext } from './WorkspaceContext';
import type { SuggestModalProxy } from './SuggestModalProxy';
import type { MarkdownViewWithMode } from '../../types';
import { contextEngine } from '../ContextEngine';
import { CONTEXT_KEYS, FOCUS_STATES } from '../../constants';
import type { FocusState } from '../../constants';

const ALL_FOCUS_KEYS = [
    CONTEXT_KEYS.EDITOR_FOCUSED,
    CONTEXT_KEYS.EDITOR_SEARCH_FOCUSED,
    CONTEXT_KEYS.SUGGEST_MODAL_FOCUSED,
    CONTEXT_KEYS.OTHER_FOCUSED,
] as const;

export class FocusTracker {
    private workspaceContext: WorkspaceContext;
    private suggestModalProxy: SuggestModalProxy;
    private currentState: FocusState | null = null;

    constructor(
        workspaceContext: WorkspaceContext,
        suggestModalProxy: SuggestModalProxy,
    ) {
        this.workspaceContext = workspaceContext;
        this.suggestModalProxy = suggestModalProxy;

        // Initialize all focus keys to false
        for (const key of ALL_FOCUS_KEYS) {
            contextEngine.setContext(key, false);
        }
        contextEngine.setContext(CONTEXT_KEYS.TEXT_INPUT_FOCUSED, false);
    }

    /**
     * Set one focus state true and all others false.
     */
    setActiveFocus(state: FocusState): void {
        for (const key of ALL_FOCUS_KEYS) {
            contextEngine.setContext(key, key === state);
        }
        this.currentState = state;
    }

    /**
     * Inspect DOM + proxy state to determine current focus.
     * Also sets textInputFocused if the active element is a text input or textarea.
     * Detection priority (order matters):
     * 1. SuggestModal active → suggestModalFocused
     * 2. Editor search bar → editorSearchFocused
     * 3. Editor content → editorFocused
     * 4. None of the above → otherFocused
     */
    checkFocus(): void {
        const activeEl = document.activeElement;
        contextEngine.setContext(
            CONTEXT_KEYS.TEXT_INPUT_FOCUSED,
            isTextInput(activeEl),
        );

        // 1. SuggestModal takes highest priority (already tracked via proxy)
        if (this.suggestModalProxy.getActiveInstance()) {
            this.setActiveFocus(FOCUS_STATES.SUGGEST_MODAL);
            return;
        }

        // 2-3. Editor search / editor content — requires active MarkdownView
        const view = this.workspaceContext.getActiveMarkdownView();
        if (view) {
            const viewWithMode = view as MarkdownViewWithMode;
            const currentMode = viewWithMode.currentMode;

            if (currentMode) {
                // 2. Editor search bar (find/replace input)
                if (currentMode.search) {
                    if (
                        activeEl === currentMode.search.searchInputEl ||
                        activeEl === currentMode.search.replaceInputEl
                    ) {
                        this.setActiveFocus(FOCUS_STATES.EDITOR_SEARCH);
                        return;
                    }
                }

                // 3. Editor content (inside CM6 editor)
                if (currentMode.editor?.containerEl?.contains(activeEl)) {
                    this.setActiveFocus(FOCUS_STATES.EDITOR);
                    return;
                }
            }
        }

        // 4. Focus is on an untracked element
        this.setActiveFocus(FOCUS_STATES.OTHER);
    }

    /**
     * Get current focus state (for testing/debugging).
     */
    getCurrentState(): FocusState | null {
        return this.currentState;
    }
}

const TEXT_INPUT_TYPES = new Set([
    'text',
    'search',
    'url',
    'email',
    'number',
    'password',
    'tel',
]);

/** Check if an element is a text input or textarea (not contenteditable). */
function isTextInput(el: Element | null): boolean {
    if (!el) return false;
    if (el instanceof HTMLTextAreaElement) return true;
    return el instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(el.type);
}
