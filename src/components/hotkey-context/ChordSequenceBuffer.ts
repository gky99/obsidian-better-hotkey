/**
 * ChordSequenceBuffer Component
 * Responsibility: Track pending key sequence, manage timeout
 * Based on Architecture.md § 3 - Hotkey Context
 *
 * NOTE: Supports sequences of up to 2 keypresses only
 */

import type { KeyPress } from "../../types";

export class ChordSequenceBuffer {
	private pending?: KeyPress = undefined;
	timeoutTimer: ReturnType<typeof setTimeout> | null = null;
	timeoutDuration: number;
	// TODO: Initialize this callback to StatusIndicator.clear() when wiring components
	// This ensures the chord indicator is cleared when the sequence times out
	private onTimeoutCallback: (() => void) | null = null;

	constructor(timeoutDuration = 5000) {
		this.timeoutDuration = timeoutDuration;
	}

	/**
	 * Add key to sequence, returns current sequence
	 * If pending is empty, stores the key. If pending exists, returns a 2-key sequence.
	 */
	append(key: KeyPress): KeyPress[] {
		if (this.pending === undefined) {
			// First key in sequence
			this.pending = key;
			this.startTimeout();
			return [key];
		} else {
			// Second key - form a 2-key sequence
			const sequence = [this.pending, key];
			this.clear();
			return sequence;
		}
	}

	/**
	 * Reset pending sequence
	 */
	clear(): void {
		this.pending = undefined;
		this.cancelTimeout();
	}

	/**
	 * Set the callback to be called when timeout occurs
	 */
	setTimeoutCallback(callback: () => void): void {
		this.onTimeoutCallback = callback;
	}

	/**
	 * Set timeout duration
	 */
	setTimeoutDuration(duration: number): void {
		this.timeoutDuration = duration;
	}

	/**
	 * Start timeout timer
	 */
	private startTimeout(): void {
		if (!this.onTimeoutCallback) return;

		this.timeoutTimer = setTimeout(() => {
			this.onTimeoutCallback?.();
			this.clear();
		}, this.timeoutDuration);
	}

	/**
	 * Cancel timeout timer
	 */
	private cancelTimeout(): void {
		if (this.timeoutTimer !== null) {
			clearTimeout(this.timeoutTimer);
			this.timeoutTimer = null;
		}
	}
}
