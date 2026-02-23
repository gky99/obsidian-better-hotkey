/**
 * Keyboard Layout Service
 * Responsibility: Detect keyboard layout, translate physical key codes to base characters,
 * and monitor layout changes.
 * Based on ADR-008: Keyboard Layout Normalization
 */

import type { Disposable } from '../types';

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
 * Maps digit strings to their corresponding physical key codes.
 * Digits 0-9 always correspond to Digit0-Digit9 per the UI Events spec,
 * regardless of keyboard layout (the digit may be base or shifted).
 */
const DIGIT_CODES = {
    '0': 'Digit0',
    '1': 'Digit1',
    '2': 'Digit2',
    '3': 'Digit3',
    '4': 'Digit4',
    '5': 'Digit5',
    '6': 'Digit6',
    '7': 'Digit7',
    '8': 'Digit8',
    '9': 'Digit9',
} as const;

/** Predefined QWERTY layout mapping for fallback when Keyboard API is unavailable */
const QWERTY_LAYOUT: [string, string][] = [
    ['KeyA', 'a'],
    ['KeyB', 'b'],
    ['KeyC', 'c'],
    ['KeyD', 'd'],
    ['KeyE', 'e'],
    ['KeyF', 'f'],
    ['KeyG', 'g'],
    ['KeyH', 'h'],
    ['KeyI', 'i'],
    ['KeyJ', 'j'],
    ['KeyK', 'k'],
    ['KeyL', 'l'],
    ['KeyM', 'm'],
    ['KeyN', 'n'],
    ['KeyO', 'o'],
    ['KeyP', 'p'],
    ['KeyQ', 'q'],
    ['KeyR', 'r'],
    ['KeyS', 's'],
    ['KeyT', 't'],
    ['KeyU', 'u'],
    ['KeyV', 'v'],
    ['KeyW', 'w'],
    ['KeyX', 'x'],
    ['KeyY', 'y'],
    ['KeyZ', 'z'],
    ['Digit0', '0'],
    ['Digit1', '1'],
    ['Digit2', '2'],
    ['Digit3', '3'],
    ['Digit4', '4'],
    ['Digit5', '5'],
    ['Digit6', '6'],
    ['Digit7', '7'],
    ['Digit8', '8'],
    ['Digit9', '9'],
    ['BracketLeft', '['],
    ['BracketRight', ']'],
    ['Semicolon', ';'],
    ['Quote', "'"],
    ['Comma', ','],
    ['Period', '.'],
    ['Slash', '/'],
    ['Backquote', '`'],
    ['Minus', '-'],
    ['Equal', '='],
    ['Backslash', '\\'],
];

export class KeyboardLayoutService {
    /** Cached layout map: physical code → base character */
    private layoutMap: Map<string, string> | null = null;

    /** Reverse map: base character → physical key code (includes virtual digit entries) */
    private charToCode: Map<string, string> | null = null;

    /** Set of characters available as base keys (for isBaseKey), includes virtual digit entries */
    private baseCharSet: Set<string> | null = null;

    /** Single layout change callback */
    private onLayoutChangeCallback: (() => void) | null = null;

    /** Whether initialization has completed */
    private initialized: boolean = false;

    /** Bound focus handler reference (for cleanup) */
    private boundFocusHandler: (() => void) | null = null;

    /**
     * Initialize the service: load layout map, register focus listener.
     * Should be called once during plugin onload().
     */
    async initialize(): Promise<void> {
        await this.refreshLayoutMap();

        // Only monitor focus events if the Keyboard API is available
        const nav = navigator as unknown as Record<string, unknown>;
        if (nav.keyboard) {
            this.boundFocusHandler = () => {
                this.handleFocusEvent();
                // TODO check when it is called
            };
            window.addEventListener('focus', this.boundFocusHandler);
        }

        this.initialized = true;
    }

    /**
     * Returns the base character for a physical key code.
     */
    getBaseCharacter(code: string): string | null {
        return this.layoutMap?.get(code) ?? null;
    }

    /**
     * Returns the physical key code for a base character.
     * Digits 0-9 are always mapped to their DigitN codes as virtual entries,
     * even if they are not the actual base character on that layout.
     */
    getCode(character: string): string | null {
        // TODO if the digits are base char on the layout but moved. Then don't do the default DigitN map
        return this.charToCode?.get(character) ?? null;
    }

    /**
     * Checks if a character is available as a base key (without modifiers)
     * on the current keyboard layout or is a digit.
     */
    isBaseKey(character: string): boolean {
        return this.baseCharSet?.has(character) ?? false;
    }

    /**
     * Registers a callback to be invoked when a layout change is detected.
     * Only one callback is supported (subsequent calls replace the previous one).
     */
    setOnLayoutChange(callback: () => void): Disposable {
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
            window.removeEventListener('focus', this.boundFocusHandler);
            this.boundFocusHandler = null;
        }

        this.layoutMap = null;
        this.charToCode = null;
        this.baseCharSet = null;
        this.onLayoutChangeCallback = null;
        this.initialized = false;
    }

    /**
     * Reload the layout map and rebuild charToCode + baseCharSet.
     * Always succeeds — falls back to QWERTY data if API unavailable.
     */
    private async refreshLayoutMap(): Promise<void> {
        this.layoutMap = await this.getLayoutMap();

        // Build charToCode: reverse of layoutMap + virtual digit entries
        const charToCode = new Map<string, string>();
        for (const [code, char] of this.layoutMap) {
            charToCode.set(char, code);
        }
        // Virtual digit entries: digits always map to their DigitN code
        for (const [digit, code] of Object.entries(DIGIT_CODES)) {
            charToCode.set(digit, code);
        }
        this.charToCode = charToCode;

        // baseCharSet = all characters that have a physical code mapping
        this.baseCharSet = new Set(charToCode.keys());
    }

    /**
     * Handle window focus event: re-check layout and notify if changed.
     */
    private handleFocusEvent(): void {
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
     * Get the keyboard layout map from the Keyboard API.
     * Falls back to predefined QWERTY layout data if API unavailable or fails.
     * Always succeeds.
     */
    private async getLayoutMap(): Promise<Map<string, string>> {
        try {
            const nav = navigator as unknown as Record<string, unknown>;
            const keyboard = nav.keyboard as
                | { getLayoutMap?: () => Promise<KeyboardLayoutMap> }
                | undefined;
            if (keyboard && typeof keyboard.getLayoutMap === 'function') {
                const apiMap = await keyboard.getLayoutMap();
                const result = new Map<string, string>();
                apiMap.forEach((value, key) => result.set(key, value));
                return result;
            }
        } catch {
            // Fall through to QWERTY fallback
        }

        return new Map(QWERTY_LAYOUT);
    }
}

/**
 * Global singleton instance of KeyboardLayoutService
 * Accessible to all components as per Architecture.md
 */
export const keyboardLayoutService = new KeyboardLayoutService();
