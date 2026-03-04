/**
 * Execution Context Component
 * Responsibility: Wrapper exposing execution-related components as properties
 * Provides unified access to kill ring and workspace operations for commands
 * Based on Architecture.md § 3 - Execution Context
 */

import type { Plugin } from 'obsidian';
import { KillRing } from './KillRing';
import { WorkspaceContext } from './WorkspaceContext';
import { SuggestModalProxy } from './SuggestModalProxy';
import { PopoverSuggestProxy } from './PopoverSuggestProxy';
import { FocusTracker } from './FocusTracker';
import { FOCUS_STATES } from '../../constants';

export class ExecutionContext {
    public readonly killRing: KillRing;
    public readonly workspaceContext: WorkspaceContext;
    public readonly suggestModalProxy: SuggestModalProxy;
    public readonly popoverSuggestProxy: PopoverSuggestProxy;
    public readonly focusTracker: FocusTracker;

    /**
     * Create execution context with plugin instance
     * @param plugin - Obsidian Plugin instance (provides app + lifecycle management)
     */
    constructor(plugin: Plugin) {
        this.killRing = new KillRing();
        this.workspaceContext = new WorkspaceContext(plugin);
        this.suggestModalProxy = new SuggestModalProxy();
        this.suggestModalProxy.patch();
        this.popoverSuggestProxy = new PopoverSuggestProxy();
        this.popoverSuggestProxy.patch();
        this.focusTracker = new FocusTracker(
            this.workspaceContext,
            this.suggestModalProxy,
        );
    }

    /**
     * Restore all prototype patches
     */
    destroy(): void {
        this.focusTracker.setActiveFocus(FOCUS_STATES.OTHER);
        this.suggestModalProxy.restore();
        this.popoverSuggestProxy.restore();
    }
}
