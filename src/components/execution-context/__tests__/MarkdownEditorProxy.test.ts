import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarkdownEditorProxy } from '../MarkdownEditorProxy';
import type { MarkdownView, Editor } from 'obsidian';

// Mock obsidian module
vi.mock('obsidian', () => ({
    MarkdownView: vi.fn(),
}));

function createMockEditor(cm?: unknown) {
    return {
        cm: cm ?? { state: {}, dispatch: vi.fn() },
        somethingSelected: vi.fn().mockReturnValue(false),
    } as unknown as Editor & { cm: unknown };
}

function createMockMarkdownView(options?: {
    isShown?: boolean;
    editor?: Editor & { cm: unknown };
}) {
    const editor = options?.editor ?? createMockEditor();
    return {
        editor,
        containerEl: {
            isShown: vi.fn().mockReturnValue(options?.isShown ?? true),
        },
    } as unknown as MarkdownView;
}

describe('MarkdownEditorProxy', () => {
    describe('constructor', () => {
        it('accepts a MarkdownView and stores it', () => {
            const view = createMockMarkdownView();
            const proxy = new MarkdownEditorProxy(view);

            expect(proxy.getMarkdownView()).toBe(view);
        });

        it('accepts null when no active view exists', () => {
            const proxy = new MarkdownEditorProxy(null);

            expect(proxy.getMarkdownView()).toBeNull();
        });
    });

    describe('updateView', () => {
        let proxy: MarkdownEditorProxy;

        beforeEach(() => {
            proxy = new MarkdownEditorProxy(null);
        });

        it('updates the tracked view', () => {
            const view = createMockMarkdownView();
            proxy.updateView(view);

            expect(proxy.getMarkdownView()).toBe(view);
        });

        it('replaces a previously tracked view', () => {
            const view1 = createMockMarkdownView();
            const view2 = createMockMarkdownView();

            proxy.updateView(view1);
            proxy.updateView(view2);

            expect(proxy.getMarkdownView()).toBe(view2);
        });
    });

    describe('isVisible', () => {
        it('returns true when the view is shown', () => {
            const view = createMockMarkdownView({ isShown: true });
            const proxy = new MarkdownEditorProxy(view);

            expect(proxy.isVisible()).toBe(true);
        });

        it('returns false when the view is not shown (closed)', () => {
            const view = createMockMarkdownView({ isShown: false });
            const proxy = new MarkdownEditorProxy(view);

            expect(proxy.isVisible()).toBe(false);
        });

        it('returns false when no view has been set', () => {
            const proxy = new MarkdownEditorProxy(null);

            expect(proxy.isVisible()).toBe(false);
        });
    });

    describe('getEditor', () => {
        it('returns the Editor when view is visible', () => {
            const editor = createMockEditor();
            const view = createMockMarkdownView({ isShown: true, editor });
            const proxy = new MarkdownEditorProxy(view);

            expect(proxy.getEditor()).toBe(editor);
        });

        it('returns null when view is not visible', () => {
            const view = createMockMarkdownView({ isShown: false });
            const proxy = new MarkdownEditorProxy(view);

            expect(proxy.getEditor()).toBeNull();
        });

        it('returns null when no view is tracked', () => {
            const proxy = new MarkdownEditorProxy(null);

            expect(proxy.getEditor()).toBeNull();
        });
    });

    describe('getEditorView', () => {
        it('returns the CM6 EditorView when view is visible', () => {
            const mockCm = { state: {}, dispatch: vi.fn() };
            const editor = createMockEditor(mockCm);
            const view = createMockMarkdownView({ isShown: true, editor });
            const proxy = new MarkdownEditorProxy(view);

            expect(proxy.getEditorView()).toBe(mockCm);
        });

        it('returns null when view is not visible', () => {
            const view = createMockMarkdownView({ isShown: false });
            const proxy = new MarkdownEditorProxy(view);

            expect(proxy.getEditorView()).toBeNull();
        });

        it('returns null when no view is tracked', () => {
            const proxy = new MarkdownEditorProxy(null);

            expect(proxy.getEditorView()).toBeNull();
        });
    });

    describe('getMarkdownView', () => {
        it('returns the tracked view', () => {
            const view = createMockMarkdownView();
            const proxy = new MarkdownEditorProxy(view);

            expect(proxy.getMarkdownView()).toBe(view);
        });

        it('returns null when no view is tracked', () => {
            const proxy = new MarkdownEditorProxy(null);

            expect(proxy.getMarkdownView()).toBeNull();
        });
    });
});
