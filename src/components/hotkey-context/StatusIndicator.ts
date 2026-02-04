/* eslint-disable obsidianmd/no-static-styles-assignment */
/**
 * Status Indicator Component
 * Responsibility: Display pending key sequence in status bar
 * Based on Design Documents/Components/Status Indicator.md
 */

import type { KeyPress } from "../../types";
import { canonicalizeSequence } from "../../utils/hotkey";

export class StatusIndicator {
	private indicatorRef: HTMLElement | null = null;

	/**
	 * Initialize the status indicator with a status bar element
	 */
	constructor(statusBarEl: HTMLElement) {
		this.indicatorRef = this.createStatusBarElement(statusBarEl);
	}

	/**
	 * Display pending key sequence
	 */
	showPending(sequence: KeyPress[]): void {
		if (!this.indicatorRef) return;

		const displayText = canonicalizeSequence(sequence);
		this.render(displayText);
	}

	/**
	 * Hide the indicator
	 */
	clear(): void {
		if (!this.indicatorRef) return;
		this.render("");
	}

	/**
	 * Render content to the status bar element
	 */
	private render(content: string): void {
		if (!this.indicatorRef) return;

		if (content === "") {
			this.indicatorRef.style.display = "none";
			this.indicatorRef.textContent = "";
		} else {
			this.indicatorRef.style.display = "inline-block";
			this.indicatorRef.textContent = content;
		}
	}

	/**
	 * Create and configure the status bar element
	 */
	private createStatusBarElement(statusBarEl: HTMLElement): HTMLElement {
		const el = statusBarEl.createEl("span", {
			cls: "better-hotkey-status-indicator",
		});

		// Initially hidden
		el.style.display = "none";
		el.style.marginLeft = "8px";
		el.style.padding = "2px 6px";
		el.style.backgroundColor = "var(--interactive-accent)";
		el.style.color = "var(--text-on-accent)";
		el.style.borderRadius = "3px";
		el.style.fontSize = "0.9em";
		el.style.fontFamily = "var(--font-monospace)";

		return el;
	}

	/**
	 * Clean up the status bar element
	 */
	destroy(): void {
		if (this.indicatorRef) {
			this.indicatorRef.remove();
			this.indicatorRef = null;
		}
	}
}
