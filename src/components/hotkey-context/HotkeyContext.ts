/**
 * Hotkey Context Component
 * Responsibility: Wrapper for all hotkey processing components + preset loading
 * Coordinates HotkeyManager, HotkeyMatcher, ChordSequenceBuffer, StatusIndicator
 * Based on Architecture.md § 3 - Hotkey Context
 */

import type { HotkeyPreset } from "../../types";
import { Priority } from "../../types";
import { HotkeyManager } from "./HotkeyManager";
import { HotkeyMatcher } from "./HotkeyMatcher";
import { ChordSequenceBuffer } from "./ChordSequenceBuffer";
import { StatusIndicator } from "./StatusIndicator";

export class HotkeyContext {
	// Wrapped components (exposed for InputHandler)
	public readonly hotkeyManager: HotkeyManager;
	public readonly hotkeyMatcher: HotkeyMatcher;
	public readonly chordBuffer: ChordSequenceBuffer;
	public readonly statusIndicator: StatusIndicator;

	/**
	 * Create hotkey context and initialize components
	 * @param chordTimeout - Timeout in ms for chord sequences (from settings)
	 * @param statusBarItem - Status bar element for pending chord display
	 * @param preset - Initial preset to load (TypeScript object, future: JSON string)
	 */
	constructor(
		chordTimeout: number,
		statusBarItem: HTMLElement,
		preset: HotkeyPreset
	) {
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

		// Load preset hotkeys
		this.loadPreset(preset);
	}

	/**
	 * Load preset hotkeys into HotkeyManager
	 * Registers all hotkeys from preset with Preset priority
	 * TODO: Implement JSON preset loading in Phase 2
	 */
	loadPreset(preset: HotkeyPreset): void {
		// Clear existing preset hotkeys (preserves plugin and user overrides)
		this.hotkeyManager.clear(Priority.Preset);

		// Register all hotkeys from preset
		for (const entry of preset.hotkeys) {
			this.hotkeyManager.insert(entry, Priority.Preset);
		}

		// HotkeyManager.insert() automatically triggers onChange → rebuild
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
