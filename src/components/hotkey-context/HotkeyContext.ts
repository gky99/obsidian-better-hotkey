/**
 * Hotkey Context Component
 * Responsibility: Wrapper for all hotkey processing components
 * Coordinates HotkeyManager, HotkeyMatcher, ChordSequenceBuffer, StatusIndicator
 * Based on Architecture.md § 3 - Hotkey Context
 */

import { HotkeyManager } from './HotkeyManager';
import { HotkeyMatcher } from './HotkeyMatcher';
import { ChordSequenceBuffer } from './ChordSequenceBuffer';
import { StatusIndicator } from './StatusIndicator';

export class HotkeyContext {
    // Wrapped components (exposed for InputHandler)
    public readonly hotkeyManager: HotkeyManager;
    public readonly hotkeyMatcher: HotkeyMatcher;
    public readonly chordBuffer: ChordSequenceBuffer;
    public readonly statusIndicator: StatusIndicator;

    /**
     * Create hotkey context and initialize components.
     * Hotkeys are loaded externally via HotkeyManager.recalculate(),
     * wired from ConfigManager.onChange in main.ts.
     * @param chordTimeout - Timeout in ms for chord sequences (from settings)
     * @param statusBarItem - Status bar element for pending chord display, or null to start disabled
     */
    constructor(chordTimeout: number, statusBarItem: HTMLElement | null) {
        // Initialize components
        this.hotkeyManager = new HotkeyManager();
        this.hotkeyMatcher = new HotkeyMatcher();
        this.chordBuffer = new ChordSequenceBuffer(chordTimeout);
        this.statusIndicator = new StatusIndicator(statusBarItem);

        // Wire HotkeyManager.onChange → HotkeyMatcher.rebuild()
        this.hotkeyManager.setOnChange((entries) => {
            this.hotkeyMatcher.rebuild(entries);
        });

        // Wire ChordBuffer timeout callback → StatusIndicator.clear()
        this.chordBuffer.setTimeoutCallback(() => {
            this.statusIndicator.clear();
        });
    }

    /**
     * Update chord timeout duration (called when settings change)
     */
    setChordTimeout(duration: number): void {
        this.chordBuffer.setTimeoutDuration(duration);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.statusIndicator.destroy();
        // Other components don't need explicit cleanup
    }
}
