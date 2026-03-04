import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CONTEXT_KEYS, FOCUS_STATES } from '../../../constants';
import type { FocusState } from '../../../constants';

// Mock contextEngine module
vi.mock('../../ContextEngine', () => ({
    contextEngine: {
        getContext: vi.fn(),
        setContext: vi.fn(),
    },
}));

import { contextEngine } from '../../ContextEngine';
import { FocusTracker } from '../FocusTracker';
import type { WorkspaceContext } from '../WorkspaceContext';
import type { SuggestModalProxy } from '../SuggestModalProxy';

// --- Helpers ---

function createMockWorkspaceContext(
    markdownView: unknown = null,
): WorkspaceContext {
    return {
        getActiveMarkdownView: vi.fn().mockReturnValue(markdownView),
    } as unknown as WorkspaceContext;
}

function createMockSuggestModalProxy(
    activeInstance: unknown = null,
): SuggestModalProxy {
    return {
        getActiveInstance: vi.fn().mockReturnValue(activeInstance),
    } as unknown as SuggestModalProxy;
}

/** Build a minimal MarkdownViewWithMode mock */
function createMockMarkdownViewWithMode(opts?: {
    searchInputEl?: HTMLInputElement;
    replaceInputEl?: HTMLInputElement;
    editorContainerEl?: HTMLElement;
    searchExists?: boolean;
}) {
    const searchInputEl =
        opts?.searchInputEl ?? document.createElement('input');
    const replaceInputEl =
        opts?.replaceInputEl ?? document.createElement('input');
    const editorContainerEl =
        opts?.editorContainerEl ?? document.createElement('div');

    return {
        currentMode: {
            search:
                opts?.searchExists === false
                    ? undefined
                    : {
                          searchInputEl,
                          replaceInputEl,
                          searchContainerEl: document.createElement('div'),
                          isActive: true,
                      },
            editor: {
                containerEl: editorContainerEl,
            },
            containerEl: document.createElement('div'),
            editorEl: document.createElement('div'),
        },
    };
}

const ALL_FOCUS_KEYS = [
    CONTEXT_KEYS.EDITOR_FOCUSED,
    CONTEXT_KEYS.EDITOR_SEARCH_FOCUSED,
    CONTEXT_KEYS.SUGGEST_MODAL_FOCUSED,
    CONTEXT_KEYS.OTHER_FOCUSED,
] as const;

describe('FocusTracker', () => {
    let tracker: FocusTracker;
    let mockWorkspaceCtx: WorkspaceContext;
    let mockSuggestProxy: SuggestModalProxy;

    beforeEach(() => {
        vi.clearAllMocks();
        mockWorkspaceCtx = createMockWorkspaceContext();
        mockSuggestProxy = createMockSuggestModalProxy();
        tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);
    });

    describe('constructor', () => {
        it('initializes all focus keys to false', () => {
            for (const key of ALL_FOCUS_KEYS) {
                expect(contextEngine.setContext).toHaveBeenCalledWith(
                    key,
                    false,
                );
            }
        });

        it('starts with null current state', () => {
            expect(tracker.getCurrentState()).toBeNull();
        });
    });

    describe('setActiveFocus', () => {
        it('sets specified state true and all others false', () => {
            vi.clearAllMocks();
            tracker.setActiveFocus(FOCUS_STATES.EDITOR);

            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.EDITOR_FOCUSED,
                true,
            );
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.EDITOR_SEARCH_FOCUSED,
                false,
            );
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.SUGGEST_MODAL_FOCUSED,
                false,
            );
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.OTHER_FOCUSED,
                false,
            );
        });

        it('updates getCurrentState', () => {
            tracker.setActiveFocus(FOCUS_STATES.OTHER);
            expect(tracker.getCurrentState()).toBe(FOCUS_STATES.OTHER);
        });

        it('is idempotent — calling twice with same state produces same result', () => {
            tracker.setActiveFocus(FOCUS_STATES.EDITOR_SEARCH);
            vi.clearAllMocks();
            tracker.setActiveFocus(FOCUS_STATES.EDITOR_SEARCH);

            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.EDITOR_SEARCH_FOCUSED,
                true,
            );
            expect(tracker.getCurrentState()).toBe(FOCUS_STATES.EDITOR_SEARCH);
        });

        it('switching states clears previous state', () => {
            tracker.setActiveFocus(FOCUS_STATES.EDITOR);
            vi.clearAllMocks();
            tracker.setActiveFocus(FOCUS_STATES.SUGGEST_MODAL);

            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.EDITOR_FOCUSED,
                false,
            );
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.SUGGEST_MODAL_FOCUSED,
                true,
            );
        });

        it.each([
            [FOCUS_STATES.EDITOR, CONTEXT_KEYS.EDITOR_FOCUSED],
            [FOCUS_STATES.EDITOR_SEARCH, CONTEXT_KEYS.EDITOR_SEARCH_FOCUSED],
            [FOCUS_STATES.SUGGEST_MODAL, CONTEXT_KEYS.SUGGEST_MODAL_FOCUSED],
            [FOCUS_STATES.OTHER, CONTEXT_KEYS.OTHER_FOCUSED],
        ] as [FocusState, string][])(
            'setActiveFocus(%s) sets %s to true',
            (state, expectedKey) => {
                vi.clearAllMocks();
                tracker.setActiveFocus(state);
                expect(contextEngine.setContext).toHaveBeenCalledWith(
                    expectedKey,
                    true,
                );
            },
        );
    });

    describe('checkFocus', () => {
        describe('SuggestModal active', () => {
            it('detects suggestModalFocused when proxy has active instance', () => {
                const fakeModal = {};
                mockSuggestProxy = createMockSuggestModalProxy(fakeModal);
                tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);

                tracker.checkFocus();

                expect(tracker.getCurrentState()).toBe(
                    FOCUS_STATES.SUGGEST_MODAL,
                );
            });
        });

        describe('Editor search focused', () => {
            it('detects editorSearchFocused when activeElement is searchInputEl', () => {
                const searchInput = document.createElement('input');
                document.body.appendChild(searchInput);

                const view = createMockMarkdownViewWithMode({
                    searchInputEl: searchInput,
                });
                mockWorkspaceCtx = createMockWorkspaceContext(view);
                tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);

                searchInput.focus();
                tracker.checkFocus();

                expect(tracker.getCurrentState()).toBe(
                    FOCUS_STATES.EDITOR_SEARCH,
                );

                document.body.removeChild(searchInput);
            });

            it('detects editorSearchFocused when activeElement is replaceInputEl', () => {
                const replaceInput = document.createElement('input');
                document.body.appendChild(replaceInput);

                const view = createMockMarkdownViewWithMode({
                    replaceInputEl: replaceInput,
                });
                mockWorkspaceCtx = createMockWorkspaceContext(view);
                tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);

                replaceInput.focus();
                tracker.checkFocus();

                expect(tracker.getCurrentState()).toBe(
                    FOCUS_STATES.EDITOR_SEARCH,
                );

                document.body.removeChild(replaceInput);
            });
        });

        describe('Editor content focused', () => {
            it('detects editorFocused when activeElement is inside editor containerEl', () => {
                const editorContainer = document.createElement('div');
                const contentDiv = document.createElement('div');
                contentDiv.setAttribute('contenteditable', 'true');
                contentDiv.tabIndex = 0; // Make focusable
                editorContainer.appendChild(contentDiv);
                document.body.appendChild(editorContainer);

                const view = createMockMarkdownViewWithMode({
                    editorContainerEl: editorContainer,
                });
                mockWorkspaceCtx = createMockWorkspaceContext(view);
                tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);

                contentDiv.focus();
                tracker.checkFocus();

                expect(tracker.getCurrentState()).toBe(FOCUS_STATES.EDITOR);

                document.body.removeChild(editorContainer);
            });
        });

        describe('Untracked element focused', () => {
            it('sets otherFocused when activeElement is document.body', () => {
                // Ensure nothing specific is focused
                (document.activeElement as HTMLElement)?.blur?.();
                tracker.setActiveFocus(FOCUS_STATES.EDITOR);

                tracker.checkFocus();

                expect(tracker.getCurrentState()).toBe(FOCUS_STATES.OTHER);
            });

            it('sets otherFocused when no markdown view is active', () => {
                // mockWorkspaceCtx returns null by default
                tracker.setActiveFocus(FOCUS_STATES.EDITOR);

                tracker.checkFocus();

                expect(tracker.getCurrentState()).toBe(FOCUS_STATES.OTHER);
            });
        });

        describe('Detection priority', () => {
            it('SuggestModal takes priority over editor search', () => {
                const searchInput = document.createElement('input');
                document.body.appendChild(searchInput);

                const view = createMockMarkdownViewWithMode({
                    searchInputEl: searchInput,
                });
                mockWorkspaceCtx = createMockWorkspaceContext(view);
                mockSuggestProxy = createMockSuggestModalProxy({});
                tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);

                searchInput.focus();
                tracker.checkFocus();

                expect(tracker.getCurrentState()).toBe(
                    FOCUS_STATES.SUGGEST_MODAL,
                );

                document.body.removeChild(searchInput);
            });

            it('Editor search takes priority over editor content', () => {
                // Create editor container with search input inside it
                const editorContainer = document.createElement('div');
                const searchInput = document.createElement('input');
                editorContainer.appendChild(searchInput);
                document.body.appendChild(editorContainer);

                const view = createMockMarkdownViewWithMode({
                    searchInputEl: searchInput,
                    editorContainerEl: editorContainer,
                });
                mockWorkspaceCtx = createMockWorkspaceContext(view);
                tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);

                searchInput.focus();
                tracker.checkFocus();

                expect(tracker.getCurrentState()).toBe(
                    FOCUS_STATES.EDITOR_SEARCH,
                );

                document.body.removeChild(editorContainer);
            });
        });

        describe('Edge cases', () => {
            it('handles missing currentMode gracefully', () => {
                const view = { currentMode: undefined };
                mockWorkspaceCtx = createMockWorkspaceContext(view);
                tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);

                tracker.checkFocus();
                expect(tracker.getCurrentState()).toBe(FOCUS_STATES.OTHER);
            });

            it('handles missing search object on currentMode', () => {
                const view = createMockMarkdownViewWithMode({
                    searchExists: false,
                });
                mockWorkspaceCtx = createMockWorkspaceContext(view);
                tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);

                tracker.checkFocus();
                expect(tracker.getCurrentState()).toBe(FOCUS_STATES.OTHER);
            });

            it('handles missing editor.containerEl gracefully', () => {
                const view = {
                    currentMode: {
                        search: null,
                        editor: { containerEl: null },
                    },
                };
                mockWorkspaceCtx = createMockWorkspaceContext(view);
                tracker = new FocusTracker(mockWorkspaceCtx, mockSuggestProxy);

                tracker.checkFocus();
                expect(tracker.getCurrentState()).toBe(FOCUS_STATES.OTHER);
            });
        });

        describe('textInputFocused', () => {
            it('sets textInputFocused true for <input type="text">', () => {
                const input = document.createElement('input');
                input.type = 'text';
                document.body.appendChild(input);
                input.focus();

                vi.clearAllMocks();
                tracker.checkFocus();

                expect(contextEngine.setContext).toHaveBeenCalledWith(
                    CONTEXT_KEYS.TEXT_INPUT_FOCUSED,
                    true,
                );
                document.body.removeChild(input);
            });

            it('sets textInputFocused true for <textarea>', () => {
                const textarea = document.createElement('textarea');
                document.body.appendChild(textarea);
                textarea.focus();

                vi.clearAllMocks();
                tracker.checkFocus();

                expect(contextEngine.setContext).toHaveBeenCalledWith(
                    CONTEXT_KEYS.TEXT_INPUT_FOCUSED,
                    true,
                );
                document.body.removeChild(textarea);
            });

            it('sets textInputFocused false for contenteditable', () => {
                const div = document.createElement('div');
                div.setAttribute('contenteditable', 'true');
                div.tabIndex = 0;
                document.body.appendChild(div);
                div.focus();

                vi.clearAllMocks();
                tracker.checkFocus();

                expect(contextEngine.setContext).toHaveBeenCalledWith(
                    CONTEXT_KEYS.TEXT_INPUT_FOCUSED,
                    false,
                );
                document.body.removeChild(div);
            });

            it('sets textInputFocused true for <input type="search">', () => {
                const input = document.createElement('input');
                input.type = 'search';
                document.body.appendChild(input);
                input.focus();

                vi.clearAllMocks();
                tracker.checkFocus();

                expect(contextEngine.setContext).toHaveBeenCalledWith(
                    CONTEXT_KEYS.TEXT_INPUT_FOCUSED,
                    true,
                );
                document.body.removeChild(input);
            });

            it('sets textInputFocused false for <input type="checkbox">', () => {
                const input = document.createElement('input');
                input.type = 'checkbox';
                document.body.appendChild(input);
                input.focus();

                vi.clearAllMocks();
                tracker.checkFocus();

                expect(contextEngine.setContext).toHaveBeenCalledWith(
                    CONTEXT_KEYS.TEXT_INPUT_FOCUSED,
                    false,
                );
                document.body.removeChild(input);
            });

            it('sets textInputFocused false for <button>', () => {
                const button = document.createElement('button');
                document.body.appendChild(button);
                button.focus();

                vi.clearAllMocks();
                tracker.checkFocus();

                expect(contextEngine.setContext).toHaveBeenCalledWith(
                    CONTEXT_KEYS.TEXT_INPUT_FOCUSED,
                    false,
                );
                document.body.removeChild(button);
            });

            it('sets textInputFocused false when nothing is focused', () => {
                (document.activeElement as HTMLElement)?.blur?.();

                vi.clearAllMocks();
                tracker.checkFocus();

                expect(contextEngine.setContext).toHaveBeenCalledWith(
                    CONTEXT_KEYS.TEXT_INPUT_FOCUSED,
                    false,
                );
            });
        });
    });
});
