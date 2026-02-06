import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KeyboardLayoutService } from "../KeyboardLayoutService";

// --- Mock Helpers ---

/**
 * Create a mock KeyboardLayoutMap from key-value pairs.
 */
function createMockLayoutMap(entries: [string, string][]) {
	const map = new Map(entries);
	return {
		get: (key: string) => map.get(key),
		has: (key: string) => map.has(key),
		entries: () => map.entries(),
		forEach: (cb: (value: string, key: string) => void) => map.forEach(cb),
		size: map.size,
	};
}

/** QWERTY layout entries */
const QWERTY_ENTRIES: [string, string][] = [
	["KeyA", "a"], ["KeyB", "b"], ["KeyC", "c"], ["KeyD", "d"],
	["KeyE", "e"], ["KeyF", "f"], ["KeyG", "g"], ["KeyH", "h"],
	["KeyI", "i"], ["KeyJ", "j"], ["KeyK", "k"], ["KeyL", "l"],
	["KeyM", "m"], ["KeyN", "n"], ["KeyO", "o"], ["KeyP", "p"],
	["KeyQ", "q"], ["KeyR", "r"], ["KeyS", "s"], ["KeyT", "t"],
	["KeyU", "u"], ["KeyV", "v"], ["KeyW", "w"], ["KeyX", "x"],
	["KeyY", "y"], ["KeyZ", "z"],
	["Digit0", "0"], ["Digit1", "1"], ["Digit2", "2"], ["Digit3", "3"],
	["Digit4", "4"], ["Digit5", "5"], ["Digit6", "6"], ["Digit7", "7"],
	["Digit8", "8"], ["Digit9", "9"],
	["BracketLeft", "["], ["BracketRight", "]"],
	["Semicolon", ";"], ["Quote", "'"],
	["Comma", ","], ["Period", "."], ["Slash", "/"],
	["Backquote", "`"], ["Minus", "-"], ["Equal", "="],
	["Backslash", "\\"],
];

/** Programmer's Dvorak layout entries (partial — digits and some letters) */
const PROGRAMMER_DVORAK_ENTRIES: [string, string][] = [
	["KeyA", "a"], ["KeyB", "x"], ["KeyC", "j"], ["KeyD", "e"],
	["KeyE", "."], ["KeyF", "u"], ["KeyG", "i"], ["KeyH", "d"],
	["KeyI", "c"], ["KeyJ", "h"], ["KeyK", "t"], ["KeyL", "n"],
	["KeyM", "m"], ["KeyN", "b"], ["KeyO", "r"], ["KeyP", "l"],
	["KeyQ", ";"], ["KeyR", "p"], ["KeyS", "o"], ["KeyT", "y"],
	["KeyU", "g"], ["KeyV", "k"], ["KeyW", ","], ["KeyX", "q"],
	["KeyY", "f"], ["KeyZ", "'"],
	["Digit0", "]"], ["Digit1", "&"], ["Digit2", "["], ["Digit3", "{"],
	["Digit4", "}"], ["Digit5", "("], ["Digit6", "="], ["Digit7", "*"],
	["Digit8", ")"], ["Digit9", "+"],
	["BracketLeft", "/"], ["BracketRight", "@"],
	["Semicolon", "s"], ["Quote", "-"],
	["Comma", "w"], ["Period", "v"], ["Slash", "z"],
	["Backquote", "$"], ["Minus", "&"], ["Equal", "#"],
];

/**
 * Install a mock navigator.keyboard on the global navigator object.
 * Returns cleanup function and reference to the mock.
 */
function installMockKeyboard(layoutMap: ReturnType<typeof createMockLayoutMap>) {
	const mockKeyboard = {
		getLayoutMap: vi.fn().mockResolvedValue(layoutMap),
	};

	const originalKeyboard = Object.getOwnPropertyDescriptor(navigator, "keyboard");
	Object.defineProperty(navigator, "keyboard", {
		value: mockKeyboard,
		writable: true,
		configurable: true,
	});

	return {
		mockKeyboard,
		cleanup: () => {
			if (originalKeyboard) {
				Object.defineProperty(navigator, "keyboard", originalKeyboard);
			} else {
				// biome-ignore lint: need delete to remove property
				delete (navigator as unknown as Record<string, unknown>).keyboard;
			}
		},
	};
}

/**
 * Remove navigator.keyboard to simulate unsupported environment.
 */
function removeMockKeyboard() {
	const originalKeyboard = Object.getOwnPropertyDescriptor(navigator, "keyboard");
	if ("keyboard" in navigator) {
		// biome-ignore lint: need delete to remove property
		delete (navigator as unknown as Record<string, unknown>).keyboard;
	}

	return {
		cleanup: () => {
			if (originalKeyboard) {
				Object.defineProperty(navigator, "keyboard", originalKeyboard);
			}
		},
	};
}

// --- Tests ---

describe("KeyboardLayoutService", () => {
	let service: KeyboardLayoutService;
	let cleanupFns: (() => void)[];

	beforeEach(() => {
		service = new KeyboardLayoutService();
		cleanupFns = [];
		vi.spyOn(window, "addEventListener");
		vi.spyOn(window, "removeEventListener");
	});

	afterEach(() => {
		service.dispose();
		for (const cleanup of cleanupFns) {
			cleanup();
		}
		vi.restoreAllMocks();
	});

	describe("initialization", () => {
		it("initializes successfully when navigator.keyboard is available", async () => {
			const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
			cleanupFns.push(cleanup);

			await service.initialize();

			// Should have loaded layout map — getBaseCharacter should work
			expect(service.getBaseCharacter("KeyA")).toBe("a");
		});

		it("initializes in fallback mode when navigator.keyboard is undefined", async () => {
			const { cleanup } = removeMockKeyboard();
			cleanupFns.push(cleanup);

			await service.initialize();

			// Fallback mode — should still return results
			expect(service.getBaseCharacter("KeyA")).toBe("a");
		});

		it("initializes in fallback mode when getLayoutMap rejects", async () => {
			const mockKeyboard = {
				getLayoutMap: vi.fn().mockRejectedValue(new Error("API error")),
			};
			const originalKeyboard = Object.getOwnPropertyDescriptor(navigator, "keyboard");
			Object.defineProperty(navigator, "keyboard", {
				value: mockKeyboard,
				writable: true,
				configurable: true,
			});
			cleanupFns.push(() => {
				if (originalKeyboard) {
					Object.defineProperty(navigator, "keyboard", originalKeyboard);
				} else {
					// biome-ignore lint: need delete to remove property
					delete (navigator as unknown as Record<string, unknown>).keyboard;
				}
			});

			await service.initialize();

			// Should fall back gracefully
			expect(service.getBaseCharacter("KeyA")).toBe("a");
		});

		it("registers window focus listener when API is available", async () => {
			const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
			cleanupFns.push(cleanup);

			await service.initialize();

			expect(window.addEventListener).toHaveBeenCalledWith(
				"focus",
				expect.any(Function),
			);
		});

		it("does not register focus listener when API is unavailable", async () => {
			const { cleanup } = removeMockKeyboard();
			cleanupFns.push(cleanup);

			await service.initialize();

			expect(window.addEventListener).not.toHaveBeenCalledWith(
				"focus",
				expect.any(Function),
			);
		});
	});

	describe("getBaseCharacter", () => {
		describe("with layout map available (QWERTY)", () => {
			beforeEach(async () => {
				const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("returns base character for letter key codes", () => {
				expect(service.getBaseCharacter("KeyA")).toBe("a");
				expect(service.getBaseCharacter("KeyZ")).toBe("z");
			});

			it("returns base character for digit key codes", () => {
				expect(service.getBaseCharacter("Digit3")).toBe("3");
				expect(service.getBaseCharacter("Digit0")).toBe("0");
			});

			it("returns base character for symbol key codes", () => {
				expect(service.getBaseCharacter("BracketLeft")).toBe("[");
				expect(service.getBaseCharacter("Semicolon")).toBe(";");
			});

			it("returns null for unknown key codes", () => {
				expect(service.getBaseCharacter("UnknownKey")).toBeNull();
			});
		});

		describe("with layout map available (Programmer Dvorak)", () => {
			beforeEach(async () => {
				const { cleanup } = installMockKeyboard(
					createMockLayoutMap(PROGRAMMER_DVORAK_ENTRIES),
				);
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("returns translated character for digit keys", () => {
				expect(service.getBaseCharacter("Digit1")).toBe("&");
				expect(service.getBaseCharacter("Digit3")).toBe("{");
			});

			it("returns translated character for rearranged keys", () => {
				// On Programmer's Dvorak, KeyQ maps to ";"
				expect(service.getBaseCharacter("KeyQ")).toBe(";");
			});
		});

		describe("identity fallback (no API)", () => {
			beforeEach(async () => {
				const { cleanup } = removeMockKeyboard();
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("extracts character from KeyX codes", () => {
				expect(service.getBaseCharacter("KeyA")).toBe("a");
				expect(service.getBaseCharacter("KeyZ")).toBe("z");
			});

			it("extracts digit from DigitX codes", () => {
				expect(service.getBaseCharacter("Digit3")).toBe("3");
				expect(service.getBaseCharacter("Digit0")).toBe("0");
			});

			it("returns null for non-standard codes", () => {
				expect(service.getBaseCharacter("BracketLeft")).toBeNull();
				expect(service.getBaseCharacter("Semicolon")).toBeNull();
			});
		});
	});

	describe("isBaseKey", () => {
		describe("with layout map available", () => {
			beforeEach(async () => {
				const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("returns true for characters in the layout map", () => {
				expect(service.isBaseKey("a")).toBe(true);
				expect(service.isBaseKey("0")).toBe(true);
				expect(service.isBaseKey("[")).toBe(true);
			});

			it("returns false for characters not in the layout map", () => {
				expect(service.isBaseKey("A")).toBe(false);
				expect(service.isBaseKey("!")).toBe(false);
				expect(service.isBaseKey("@")).toBe(false);
			});
		});

		describe("with Programmer Dvorak layout", () => {
			beforeEach(async () => {
				const { cleanup } = installMockKeyboard(
					createMockLayoutMap(PROGRAMMER_DVORAK_ENTRIES),
				);
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("returns true for characters that are base keys on this layout", () => {
				expect(service.isBaseKey("(")).toBe(true);
				expect(service.isBaseKey("}")).toBe(true);
			});

			it("returns false for characters not available as base keys", () => {
				// On Programmer's Dvorak, "3" is shifted (not a base key)
				expect(service.isBaseKey("3")).toBe(false);
			});
		});

		describe("identity fallback", () => {
			beforeEach(async () => {
				const { cleanup } = removeMockKeyboard();
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("returns true for lowercase letters", () => {
				expect(service.isBaseKey("a")).toBe(true);
				expect(service.isBaseKey("z")).toBe(true);
			});

			it("returns true for digits", () => {
				expect(service.isBaseKey("0")).toBe(true);
				expect(service.isBaseKey("9")).toBe(true);
			});

			it("returns true for common QWERTY base symbols", () => {
				expect(service.isBaseKey(";")).toBe(true);
				expect(service.isBaseKey("[")).toBe(true);
				expect(service.isBaseKey("`")).toBe(true);
			});

			it("returns false for uppercase letters", () => {
				expect(service.isBaseKey("A")).toBe(false);
			});

			it("returns false for shifted symbols", () => {
				expect(service.isBaseKey("!")).toBe(false);
				expect(service.isBaseKey("@")).toBe(false);
			});
		});
	});

	describe("translateNumber", () => {
		describe("with layout map available (QWERTY)", () => {
			beforeEach(async () => {
				const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("returns identity on QWERTY", () => {
				expect(service.translateNumber("3")).toBe("3");
				expect(service.translateNumber("0")).toBe("0");
			});

			it("translates all 10 digits correctly", () => {
				for (let i = 0; i <= 9; i++) {
					expect(service.translateNumber(String(i))).toBe(String(i));
				}
			});
		});

		describe("with Programmer Dvorak layout", () => {
			beforeEach(async () => {
				const { cleanup } = installMockKeyboard(
					createMockLayoutMap(PROGRAMMER_DVORAK_ENTRIES),
				);
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("translates digits to Dvorak base characters", () => {
				expect(service.translateNumber("1")).toBe("&");
				expect(service.translateNumber("3")).toBe("{");
				expect(service.translateNumber("0")).toBe("]");
			});
		});

		describe("invalid input", () => {
			beforeEach(async () => {
				const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("returns input unchanged for non-digit input", () => {
				expect(service.translateNumber("a")).toBe("a");
				expect(service.translateNumber("")).toBe("");
				expect(service.translateNumber("10")).toBe("10");
			});
		});

		describe("identity fallback", () => {
			beforeEach(async () => {
				const { cleanup } = removeMockKeyboard();
				cleanupFns.push(cleanup);
				await service.initialize();
			});

			it("returns digit unchanged", () => {
				expect(service.translateNumber("3")).toBe("3");
				expect(service.translateNumber("0")).toBe("0");
			});
		});
	});

	describe("getLayoutName", () => {
		it("returns null before initialization", () => {
			expect(service.getLayoutName()).toBeNull();
		});

		it("returns QWERTY for QWERTY layout", async () => {
			const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
			cleanupFns.push(cleanup);

			await service.initialize();

			expect(service.getLayoutName()).toBe("QWERTY");
		});

		it("returns null when API unavailable", async () => {
			const { cleanup } = removeMockKeyboard();
			cleanupFns.push(cleanup);

			await service.initialize();

			expect(service.getLayoutName()).toBeNull();
		});

		it("returns null for unrecognized layouts", async () => {
			// Layout where KeyQ maps to something unusual
			const unknownLayout: [string, string][] = [
				["KeyQ", "x"], ["KeyW", "y"], ["KeyZ", "z"],
			];
			const { cleanup } = installMockKeyboard(createMockLayoutMap(unknownLayout));
			cleanupFns.push(cleanup);

			await service.initialize();

			expect(service.getLayoutName()).toBeNull();
		});

		it("detects AZERTY layout", async () => {
			const azertyLayout: [string, string][] = [
				["KeyQ", "a"], ["KeyW", "z"], ["KeyZ", "w"],
				["KeyA", "q"],
			];
			const { cleanup } = installMockKeyboard(createMockLayoutMap(azertyLayout));
			cleanupFns.push(cleanup);

			await service.initialize();

			expect(service.getLayoutName()).toBe("AZERTY");
		});

		it("detects QWERTZ layout", async () => {
			const qwertzLayout: [string, string][] = [
				["KeyQ", "q"], ["KeyW", "w"], ["KeyZ", "y"],
			];
			const { cleanup } = installMockKeyboard(createMockLayoutMap(qwertzLayout));
			cleanupFns.push(cleanup);

			await service.initialize();

			expect(service.getLayoutName()).toBe("QWERTZ");
		});

		it("detects Dvorak layout", async () => {
			const dvorakLayout: [string, string][] = [
				["KeyQ", "'"], ["KeyW", ","], ["KeyZ", ";"],
			];
			const { cleanup } = installMockKeyboard(createMockLayoutMap(dvorakLayout));
			cleanupFns.push(cleanup);

			await service.initialize();

			expect(service.getLayoutName()).toBe("Dvorak");
		});
	});

	describe("onLayoutChange", () => {
		it("returns a Disposable", async () => {
			const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
			cleanupFns.push(cleanup);
			await service.initialize();

			const disposable = service.onLayoutChange(() => {});

			expect(disposable).toBeDefined();
			expect(disposable.dispose).toBeInstanceOf(Function);
		});

		it("callback is invoked when layout changes on focus", async () => {
			const qwertyMap = createMockLayoutMap(QWERTY_ENTRIES);
			const dvorakMap = createMockLayoutMap(PROGRAMMER_DVORAK_ENTRIES);
			const { mockKeyboard, cleanup } = installMockKeyboard(qwertyMap);
			cleanupFns.push(cleanup);
			await service.initialize();

			const callback = vi.fn();
			service.onLayoutChange(callback);

			// Simulate layout change: return different map on next getLayoutMap call
			mockKeyboard.getLayoutMap.mockResolvedValue(dvorakMap);

			// Get the focus handler and call it
			const focusCall = vi.mocked(window.addEventListener).mock.calls.find(
				(call) => call[0] === "focus",
			);
			expect(focusCall).toBeDefined();
			const focusHandler = focusCall![1] as () => void;
			focusHandler();

			// Wait for async refreshLayoutMap to complete
			await vi.waitFor(() => {
				expect(callback).toHaveBeenCalledTimes(1);
			});
		});

		it("callback is not invoked when layout has not changed", async () => {
			const qwertyMap = createMockLayoutMap(QWERTY_ENTRIES);
			const { cleanup } = installMockKeyboard(qwertyMap);
			cleanupFns.push(cleanup);
			await service.initialize();

			const callback = vi.fn();
			service.onLayoutChange(callback);

			// Get the focus handler and call it (same layout)
			const focusCall = vi.mocked(window.addEventListener).mock.calls.find(
				(call) => call[0] === "focus",
			);
			const focusHandler = focusCall![1] as () => void;
			focusHandler();

			// Wait a tick for async to settle
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(callback).not.toHaveBeenCalled();
		});

		it("disposed callback is not invoked", async () => {
			const qwertyMap = createMockLayoutMap(QWERTY_ENTRIES);
			const dvorakMap = createMockLayoutMap(PROGRAMMER_DVORAK_ENTRIES);
			const { mockKeyboard, cleanup } = installMockKeyboard(qwertyMap);
			cleanupFns.push(cleanup);
			await service.initialize();

			const callback = vi.fn();
			const disposable = service.onLayoutChange(callback);
			disposable.dispose();

			// Simulate layout change
			mockKeyboard.getLayoutMap.mockResolvedValue(dvorakMap);

			const focusCall = vi.mocked(window.addEventListener).mock.calls.find(
				(call) => call[0] === "focus",
			);
			const focusHandler = focusCall![1] as () => void;
			focusHandler();

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(callback).not.toHaveBeenCalled();
		});

		it("layout map is rebuilt before callback fires", async () => {
			const qwertyMap = createMockLayoutMap(QWERTY_ENTRIES);
			const dvorakMap = createMockLayoutMap(PROGRAMMER_DVORAK_ENTRIES);
			const { mockKeyboard, cleanup } = installMockKeyboard(qwertyMap);
			cleanupFns.push(cleanup);
			await service.initialize();

			// Verify initial state
			expect(service.getBaseCharacter("Digit3")).toBe("3");

			let characterDuringCallback: string | null = null;
			service.onLayoutChange(() => {
				// When callback fires, map should already be updated
				characterDuringCallback = service.getBaseCharacter("Digit3");
			});

			// Simulate layout change
			mockKeyboard.getLayoutMap.mockResolvedValue(dvorakMap);
			const focusCall = vi.mocked(window.addEventListener).mock.calls.find(
				(call) => call[0] === "focus",
			);
			const focusHandler = focusCall![1] as () => void;
			focusHandler();

			await vi.waitFor(() => {
				expect(characterDuringCallback).toBe("{");
			});
		});
	});

	describe("dispose", () => {
		it("removes window focus event listener", async () => {
			const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
			cleanupFns.push(cleanup);
			await service.initialize();

			service.dispose();

			expect(window.removeEventListener).toHaveBeenCalledWith(
				"focus",
				expect.any(Function),
			);
		});

		it("clears internal state", async () => {
			const { cleanup } = installMockKeyboard(createMockLayoutMap(QWERTY_ENTRIES));
			cleanupFns.push(cleanup);
			await service.initialize();

			// Verify state exists before dispose
			expect(service.getBaseCharacter("KeyA")).toBe("a");

			service.dispose();

			// After dispose, should use fallback (still returns "a" for KeyA)
			expect(service.getBaseCharacter("KeyA")).toBe("a");
			// But layout name should be cleared
			expect(service.getLayoutName()).toBeNull();
		});

		it("subsequent calls to getBaseCharacter use fallback", async () => {
			const { cleanup } = installMockKeyboard(
				createMockLayoutMap(PROGRAMMER_DVORAK_ENTRIES),
			);
			cleanupFns.push(cleanup);
			await service.initialize();

			// With Dvorak map, Digit3 → "{"
			expect(service.getBaseCharacter("Digit3")).toBe("{");

			service.dispose();

			// After dispose, fallback returns "3" for Digit3
			expect(service.getBaseCharacter("Digit3")).toBe("3");
		});
	});
});
