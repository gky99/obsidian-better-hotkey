import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceContext } from '../WorkspaceContext';
import { MarkdownEditorProxy } from '../MarkdownEditorProxy';
import type { Plugin, WorkspaceLeaf, MarkdownView } from 'obsidian';

// MockMarkdownView must be hoisted alongside vi.mock for instanceof checks
const { MockMarkdownView } = vi.hoisted(() => ({
	MockMarkdownView: vi.fn(),
}));

vi.mock('obsidian', () => ({
	MarkdownView: MockMarkdownView,
}));

function createMockMarkdownView() {
	const view = Object.create(MockMarkdownView.prototype);
	view.editor = { cm: { state: {}, dispatch: vi.fn() } };
	view.containerEl = { isShown: vi.fn().mockReturnValue(true) };
	return view as MarkdownView;
}

function createMockLeaf(view?: unknown): WorkspaceLeaf {
	return { view: view ?? {} } as unknown as WorkspaceLeaf;
}

type LeafChangeCallback = (leaf: WorkspaceLeaf | null) => void;

function createMockPlugin(options?: { activeView?: MarkdownView | null; activeLeaf?: WorkspaceLeaf | null }) {
	let leafChangeCallback: LeafChangeCallback | null = null;

	const mockPlugin = {
		app: {
			workspace: {
				getActiveViewOfType: vi.fn().mockReturnValue(options?.activeView ?? null),
				activeLeaf: options?.activeLeaf ?? null,
				on: vi.fn((event: string, cb: LeafChangeCallback) => {
					if (event === 'active-leaf-change') {
						leafChangeCallback = cb;
					}
					return { /* EventRef mock */ };
				}),
			},
		},
		registerEvent: vi.fn(),
	} as unknown as Plugin;

	const simulateLeafChange = (leaf: WorkspaceLeaf | null) => {
		leafChangeCallback?.(leaf);
	};

	return { mockPlugin, simulateLeafChange };
}

describe('WorkspaceContext', () => {
	describe('constructor', () => {
		it('registers active-leaf-change event via plugin.registerEvent', () => {
			const { mockPlugin } = createMockPlugin();
			new WorkspaceContext(mockPlugin);

			expect(mockPlugin.registerEvent).toHaveBeenCalled();
			expect(mockPlugin.app.workspace.on).toHaveBeenCalledWith(
				'active-leaf-change',
				expect.any(Function),
			);
		});

		it('eagerly initializes proxy from current active markdown view', () => {
			const activeView = createMockMarkdownView();
			const { mockPlugin } = createMockPlugin({ activeView });
			const ctx = new WorkspaceContext(mockPlugin);

			expect(ctx.getEditorProxy().getMarkdownView()).toBe(activeView);
		});

		it('proxy has null view when no markdown view is active', () => {
			const { mockPlugin } = createMockPlugin({ activeView: null });
			const ctx = new WorkspaceContext(mockPlugin);

			expect(ctx.getEditorProxy().getMarkdownView()).toBeNull();
		});
	});

	describe('getEditorProxy', () => {
		it('always returns a MarkdownEditorProxy (never null)', () => {
			const { mockPlugin } = createMockPlugin();
			const ctx = new WorkspaceContext(mockPlugin);

			expect(ctx.getEditorProxy()).toBeInstanceOf(MarkdownEditorProxy);
		});

		it('returns the same proxy instance on repeated calls', () => {
			const { mockPlugin } = createMockPlugin();
			const ctx = new WorkspaceContext(mockPlugin);

			const proxy1 = ctx.getEditorProxy();
			const proxy2 = ctx.getEditorProxy();
			expect(proxy1).toBe(proxy2);
		});
	});

	describe('active-leaf-change handling', () => {
		let ctx: WorkspaceContext;
		let simulateLeafChange: (leaf: WorkspaceLeaf | null) => void;

		beforeEach(() => {
			const setup = createMockPlugin();
			ctx = new WorkspaceContext(setup.mockPlugin);
			simulateLeafChange = setup.simulateLeafChange;
		});

		it('updates proxy when leaf has a MarkdownView', () => {
			const mdView = createMockMarkdownView();
			const leaf = createMockLeaf(mdView);
			simulateLeafChange(leaf);

			expect(ctx.getEditorProxy().getMarkdownView()).toBe(mdView);
		});

		it('does not change proxy view when leaf is not a MarkdownView', () => {
			// First set a markdown view
			const mdView = createMockMarkdownView();
			const mdLeaf = createMockLeaf(mdView);
			simulateLeafChange(mdLeaf);

			// Then switch to a non-markdown view
			const otherLeaf = createMockLeaf({ getViewType: () => 'other' });
			simulateLeafChange(otherLeaf);

			// Proxy should still reference the markdown view
			expect(ctx.getEditorProxy().getMarkdownView()).toBe(mdView);
		});

		it('retains proxy view when leaf is null', () => {
			const mdView = createMockMarkdownView();
			const leaf = createMockLeaf(mdView);
			simulateLeafChange(leaf);

			simulateLeafChange(null);

			// Proxy retains previous markdown view
			expect(ctx.getEditorProxy().getMarkdownView()).toBe(mdView);
		});

		it('updates activeLeaf on every change', () => {
			const leaf1 = createMockLeaf();
			simulateLeafChange(leaf1);
			expect(ctx.getActiveLeaf()).toBe(leaf1);

			const leaf2 = createMockLeaf();
			simulateLeafChange(leaf2);
			expect(ctx.getActiveLeaf()).toBe(leaf2);
		});

		it('clears activeLeaf when null', () => {
			const leaf = createMockLeaf();
			simulateLeafChange(leaf);
			simulateLeafChange(null);

			expect(ctx.getActiveLeaf()).toBeNull();
		});
	});

	describe('getActiveLeaf', () => {
		it('returns null before any leaf change', () => {
			const { mockPlugin } = createMockPlugin();
			const ctx = new WorkspaceContext(mockPlugin);

			expect(ctx.getActiveLeaf()).toBeNull();
		});
	});

	describe('existing editor methods (live query)', () => {
		it('getActiveEditor queries workspace directly, not the proxy', () => {
			const { mockPlugin } = createMockPlugin();
			const ctx = new WorkspaceContext(mockPlugin);

			// hasSelection calls getActiveEditor internally
			ctx.hasSelection();

			// Should call getActiveViewOfType (live workspace query)
			expect(mockPlugin.app.workspace.getActiveViewOfType).toHaveBeenCalled();
		});
	});
});
