/**
 * Input Handler Component
 * Responsibility: Main orchestrator of the hotkey pipeline - captures global keyboard events,
 * normalizes to internal representation, feeds to ChordSequenceBuffer, calls Matcher,
 * executes commands, and decides event propagation.
 * Based on ADR-005: Event Interception Strategy
 */

import type { KeyPress, MatchResult } from "../types";
import type { HotkeyContext } from "./hotkey-context/HotkeyContext";
import type { App } from "obsidian";
import { CommandRegistry } from "./CommandRegistry";
import { ExecutionContext } from "./execution-context/ExecutionContext";

export class InputHandler {
	private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

	// Hotkey context (passed from main.ts)
	private hotkeyContext: HotkeyContext;

	// Execution context (created internally)
	private executionContext: ExecutionContext;

	// External dependencies
	private commandRegistry: CommandRegistry;

	constructor(
		commandRegistry: CommandRegistry,
		hotkeyContext: HotkeyContext,
		app: App,
	) {
		this.commandRegistry = commandRegistry;
		this.hotkeyContext = hotkeyContext;

		// Create execution context
		this.executionContext = new ExecutionContext(app);
	}

	/**
	 * Begin listening to keyboard events
	 */
	start(): void {
		if (this.keydownHandler) {
			return; // Already listening
		}

		this.keydownHandler = this.onKeyDown.bind(this);
		window.addEventListener("keydown", this.keydownHandler, true);
	}

	/**
	 * Stop listening to keyboard events
	 */
	stop(): void {
		if (this.keydownHandler) {
			window.removeEventListener("keydown", this.keydownHandler, true);
			this.keydownHandler = null;
		}
	}

	/**
	 * Main event handler for keydown events
	 */
	private onKeyDown(event: KeyboardEvent): void {
		try {
			const keyPress = this.normalize(event);

			// Step 1: Skip if only modifier key pressed
			if (this.isOnlyModifier(keyPress)) {
				return; // Let it pass through
			}

			// Step 2: Check for escape key (clears chord sequence)
			if (this.hotkeyContext.hotkeyMatcher.isEscape(keyPress)) {
				this.hotkeyContext.chordBuffer.clear();
				this.hotkeyContext.statusIndicator.clear();
				return;
			}

			// Step 3: Add to chord buffer
			const sequence = this.hotkeyContext.chordBuffer.append(keyPress);

			// Step 4: Match against registered hotkeys
			const matchResult =
				this.hotkeyContext.hotkeyMatcher.match(sequence);

			// Step 5: Handle match result
			this.handleMatchResult(matchResult, sequence, event);
		} catch (error) {
			console.error("InputHandler error:", error);
			this.hotkeyContext.chordBuffer.clear();
			this.hotkeyContext.statusIndicator.clear();
		}
	}

	/**
	 * Handle different match result types
	 */
	private handleMatchResult(
		result: MatchResult,
		sequence: KeyPress[],
		event: KeyboardEvent,
	): void {
		switch (result.type) {
			case "exact": {
				// Execute command with execution context
				this.commandRegistry.execute(
					result.entry.command,
					result.entry.args,
					this.executionContext,
				);

				// Prevent default browser behavior
				event.preventDefault();
				event.stopPropagation();

				// Clear chord buffer and status
				this.hotkeyContext.chordBuffer.clear();
				this.hotkeyContext.statusIndicator.clear();

				// Track lastActionWasYank flag using ExecutionContext's killRing
				this.executionContext.killRing.updateLastActionWasYank(
					result.entry.command,
				);
				break;
			}

			case "prefix": {
				// Waiting for next key - show pending status
				this.hotkeyContext.statusIndicator.showPending(sequence);

				// Prevent default browser behavior
				event.preventDefault();
				event.stopPropagation();
				// Sequence is already stored in chord buffer from step 3
				break;
			}

			case "none": {
				// No match
				if (result.isChord) {
					// Has modifiers - prevent default (consumed by our system)
					event.preventDefault();
					event.stopPropagation();
				}
				// else: no modifiers, let it pass through (normal typing)

				// Clear buffer and status
				this.hotkeyContext.chordBuffer.clear();
				this.hotkeyContext.statusIndicator.clear();
				break;
			}
		}
	}

	/**
	 * Check if only modifier key pressed (no action key)
	 */
	private isOnlyModifier(keyPress: KeyPress): boolean {
		const modifierKeys = ["Control", "Alt", "Shift", "Meta"];
		return modifierKeys.includes(keyPress.key);
	}

	/**
	 * Convert browser KeyboardEvent to internal KeyPress representation
	 */
	private normalize(event: KeyboardEvent): KeyPress {
		const modifiers = new Set<"ctrl" | "alt" | "shift" | "meta">();

		if (event.ctrlKey) modifiers.add("ctrl");
		if (event.altKey) modifiers.add("alt");
		if (event.shiftKey) modifiers.add("shift");
		if (event.metaKey) modifiers.add("meta");

		// Get the character representation of the key
		let { key, code } = event;

		// Normalize special keys to lowercase
		if (key.length === 1) {
			key = key.toLowerCase();
		}

		// Handle special cases
		if (key === " ") {
			key = "space";
		}

		return {
			modifiers,
			key,
			code,
		};
	}
}
