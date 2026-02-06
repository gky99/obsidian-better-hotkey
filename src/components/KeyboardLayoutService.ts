/**
 * Keyboard Layout Service
 * Responsibility: Detect keyboard layout, translate physical key codes to base characters,
 * handle digit-to-character mapping, and monitor layout changes.
 * Based on ADR-008: Keyboard Layout Normalization
 */

import type { Disposable } from "../types";

/**
 * Minimal interface for the Keyboard API's layout map.
 * navigator.keyboard.getLayoutMap() returns a KeyboardLayoutMap (ReadonlyMap-like).
 * Defined locally because the Web Keyboard API types are not in the DOM lib.
 */
interface KeyboardLayoutMap {
	get(key: string): string | undefined;
	has(key: string): boolean;
	entries(): IterableIterator<[string, string]>;
	forEach(callbackfn: (value: string, key: string) => void): void;
	readonly size: number;
}

/**
 * Minimal interface for navigator.keyboard.
 * Defined locally for type safety since the Keyboard API is not in standard DOM types.
 */
interface NavigatorKeyboard {
	getLayoutMap(): Promise<KeyboardLayoutMap>;
}

/**
 * Maps digit strings to their corresponding physical key codes.
 * Digits 0-9 always correspond to Digit0-Digit9 per the UI Events spec,
 * regardless of keyboard layout (the digit may be base or shifted).
 */
const DIGIT_CODES = {
	"0": "Digit0",
	"1": "Digit1",
	"2": "Digit2",
	"3": "Digit3",
	"4": "Digit4",
	"5": "Digit5",
	"6": "Digit6",
	"7": "Digit7",
	"8": "Digit8",
	"9": "Digit9",
} as const;

/** Common QWERTY base symbols (available without modifiers) for identity fallback */
const QWERTY_BASE_SYMBOLS = new Set([
	";", "'", ",", ".", "/", "[", "]", "-", "=", "`", "\\",
]);

export class KeyboardLayoutService {
	/** Cached layout map: physical code → base character */
	private layoutMap: Map<string, string> | null = null;

	/** Set of characters available as base keys (for isBaseKey) */
	private baseCharSet: Set<string> | null = null;

	/** Digit → base character mapping (built from DIGIT_CODES + layoutMap) */
	private digitToChar: Map<string, string> | null = null;

	/** Detected layout name (heuristic), or null */
	private detectedLayoutName: string | null = null;

	/** Single layout change callback */
	private onLayoutChangeCallback: (() => void) | null = null;

	/** Whether the Keyboard API is available */
	private apiAvailable: boolean = false;

	/** Whether initialization has completed */
	private initialized: boolean = false;

	/** Bound focus handler reference (for cleanup) */
	private boundFocusHandler: (() => void) | null = null;

	/**
	 * Initialize the service: detect API, load layout map, register focus listener.
	 * Should be called once during plugin onload().
	 */
	async initialize(): Promise<void> {
		const keyboard = this.getNavigatorKeyboard();
		if (keyboard) {
			this.apiAvailable = true;
			await this.refreshLayoutMap();

			// Register window focus listener for layout change detection
			this.boundFocusHandler = () => {
				this.handleFocusEvent();
			};
			window.addEventListener("focus", this.boundFocusHandler);
		} else {
			console.warn(
				"KeyboardLayoutService: navigator.keyboard API not available. Using identity fallback.",
			);
		}

		this.initialized = true;
	}

	/**
	 * Returns the base character for a physical key code.
	 * Uses the layout map when available, falls back to QWERTY heuristic.
	 */
	getBaseCharacter(code: string): string | null {
		if (this.layoutMap) {
			return this.layoutMap.get(code) ?? null;
		}

		// Identity fallback: assume QWERTY
		return this.fallbackGetBaseCharacter(code);
	}

	/**
	 * Checks if a character is available as a base key (without modifiers)
	 * on the current keyboard layout.
	 */
	isBaseKey(character: string): boolean {
		if (this.baseCharSet) {
			return this.baseCharSet.has(character);
		}

		// Identity fallback: QWERTY base keys
		return this.fallbackIsBaseKey(character);
	}

	/**
	 * Translates a digit (0-9) to the base character of the corresponding
	 * physical key on the current layout.
	 *
	 * Example: On Programmer's Dvorak, translateNumber("3") → "}" because
	 * the physical key Digit3 has base character "}" on that layout.
	 */
	translateNumber(digit: string): string {
		// Validate input is a single digit
		if (!(digit in DIGIT_CODES)) {
			return digit;
		}

		if (this.digitToChar) {
			return this.digitToChar.get(digit) ?? digit;
		}

		// Identity fallback
		return digit;
	}

	/**
	 * Returns the detected layout name, or null if unknown/unavailable.
	 * Detection is heuristic-based (checks specific key mappings).
	 */
	getLayoutName(): string | null {
		return this.detectedLayoutName;
	}

	/**
	 * Registers a callback to be invoked when a layout change is detected.
	 * Only one callback is supported (subsequent calls replace the previous one).
	 */
	onLayoutChange(callback: () => void): Disposable {
		this.onLayoutChangeCallback = callback;
		return {
			dispose: () => {
				this.onLayoutChangeCallback = null;
			},
		};
	}

	/**
	 * Clean up resources: remove focus listener, clear all state.
	 */
	dispose(): void {
		if (this.boundFocusHandler) {
			window.removeEventListener("focus", this.boundFocusHandler);
			this.boundFocusHandler = null;
		}

		this.layoutMap = null;
		this.baseCharSet = null;
		this.digitToChar = null;
		this.detectedLayoutName = null;
		this.onLayoutChangeCallback = null;
		this.apiAvailable = false;
		this.initialized = false;
	}

	/**
	 * Reload the layout map from the Keyboard API.
	 * Builds layoutMap, baseCharSet, digitToChar, and detects layout name.
	 */
	private async refreshLayoutMap(): Promise<void> {
		const keyboard = this.getNavigatorKeyboard();
		if (!keyboard) {
			this.layoutMap = null;
			this.baseCharSet = null;
			this.digitToChar = null;
			this.detectedLayoutName = null;
			return;
		}

		try {
			const apiMap = await keyboard.getLayoutMap();

			// Build layoutMap from API response
			const newLayoutMap = new Map<string, string>();
			apiMap.forEach((value: string, key: string) => {
				newLayoutMap.set(key, value);
			});
			this.layoutMap = newLayoutMap;

			// Build baseCharSet (reverse lookup)
			this.baseCharSet = new Set(newLayoutMap.values());
			
			// Build digitToChar mapping
			const newDigitToChar = new Map<string, string>();
			for (const [digit, code] of Object.entries(DIGIT_CODES)) {
				const baseChar = newLayoutMap.get(code);
				if (baseChar !== undefined) {
					newDigitToChar.set(digit, baseChar);
				}
			}
			this.digitToChar = newDigitToChar;

			// Detect layout name (heuristic)
			this.detectedLayoutName = this.detectLayoutName(newLayoutMap);
		} catch (error) {
			console.warn(
				"KeyboardLayoutService: Failed to get layout map.",
				error,
			);
			this.layoutMap = null;
			this.baseCharSet = null;
			this.digitToChar = null;
			this.detectedLayoutName = null;
		}
	}

	/**
	 * Handle window focus event: re-check layout and notify if changed.
	 */
	private handleFocusEvent(): void {
		if (!this.apiAvailable) return;

		const previousMap = this.layoutMap;
		void this.refreshLayoutMap().then(() => {
			if (this.hasLayoutChanged(previousMap, this.layoutMap)) {
				this.onLayoutChangeCallback?.();
			}
		});
	}

	/**
	 * Compare two layout maps to detect changes.
	 */
	private hasLayoutChanged(
		previous: Map<string, string> | null,
		current: Map<string, string> | null,
	): boolean {
		if (previous === null && current === null) return false;
		if (previous === null || current === null) return true;
		if (previous.size !== current.size) return true;

		for (const [key, value] of previous) {
			if (current.get(key) !== value) return true;
		}
		return false;
	}

	/**
	 * Detect layout name by checking specific key mappings.
	 * Returns null for unrecognized layouts.
	 */
	private detectLayoutName(layoutMap: Map<string, string>): string | null {
		const keyQ = layoutMap.get("KeyQ");
		const keyW = layoutMap.get("KeyW");
		const keyZ = layoutMap.get("KeyZ");
		const keyA = layoutMap.get("KeyA");

		if (keyQ === "q" && keyW === "w") {
			if (keyZ === "z") return "QWERTY";
			if (keyZ === "y") return "QWERTZ";
		}

		if (keyQ === "a" && keyW === "z") return "AZERTY";
		if (keyQ === "'" && keyW === ",") return "Dvorak";

		return null;
	}

	/**
	 * Get navigator.keyboard with type safety.
	 * Returns null if the API is not available.
	 */
	private getNavigatorKeyboard(): NavigatorKeyboard | null {
		const nav = navigator as unknown as Record<string, unknown>;
		const keyboard = nav.keyboard as NavigatorKeyboard | undefined;
		if (keyboard && typeof keyboard.getLayoutMap === "function") {
			return keyboard;
		}
		return null;
	}

	/**
	 * Fallback: extract base character from key code assuming QWERTY.
	 */
	private fallbackGetBaseCharacter(code: string): string | null {
		// "KeyA" → "a", "KeyB" → "b", etc.
		if (code.startsWith("Key") && code.length === 4) {
			return code.charAt(3).toLowerCase();
		}

		// "Digit0" → "0", "Digit1" → "1", etc.
		if (code.startsWith("Digit") && code.length === 6) {
			return code.charAt(5);
		}

		return null;
	}

	/**
	 * Fallback: check if character is a QWERTY base key.
	 */
	private fallbackIsBaseKey(character: string): boolean {
		// Lowercase letters
		if (character.length === 1 && character >= "a" && character <= "z") {
			return true;
		}

		// Digits
		if (character.length === 1 && character >= "0" && character <= "9") {
			return true;
		}

		// Common QWERTY base symbols
		return QWERTY_BASE_SYMBOLS.has(character);
	}
}

/**
 * Global singleton instance of KeyboardLayoutService
 * Accessible to all components as per Architecture.md
 */
export const keyboardLayoutService = new KeyboardLayoutService();
