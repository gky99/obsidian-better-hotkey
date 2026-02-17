import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCursorCommands } from "../cursor-commands";
import type { Command } from "../../types";
import type { ExecutionContext } from "../../components/execution-context/ExecutionContext";
import { CURSOR_MOVEMENT_COMMANDS } from "../../constants";

// Hoist mock functions so vi.mock factory can reference them
const {
	mockCursorCharForward,
	mockCursorCharBackward,
	mockCursorLineDown,
	mockCursorLineUp,
	mockCursorLineStart,
	mockCursorLineEnd,
	mockCursorGroupForward,
	mockCursorGroupBackward,
	mockCursorPageDown,
	mockCursorPageUp,
	mockCursorDocStart,
	mockCursorDocEnd,
} = vi.hoisted(() => ({
	mockCursorCharForward: vi.fn().mockReturnValue(true),
	mockCursorCharBackward: vi.fn().mockReturnValue(true),
	mockCursorLineDown: vi.fn().mockReturnValue(true),
	mockCursorLineUp: vi.fn().mockReturnValue(true),
	mockCursorLineStart: vi.fn().mockReturnValue(true),
	mockCursorLineEnd: vi.fn().mockReturnValue(true),
	mockCursorGroupForward: vi.fn().mockReturnValue(true),
	mockCursorGroupBackward: vi.fn().mockReturnValue(true),
	mockCursorPageDown: vi.fn().mockReturnValue(true),
	mockCursorPageUp: vi.fn().mockReturnValue(true),
	mockCursorDocStart: vi.fn().mockReturnValue(true),
	mockCursorDocEnd: vi.fn().mockReturnValue(true),
}));

vi.mock("@codemirror/commands", () => ({
	cursorCharForward: mockCursorCharForward,
	cursorCharBackward: mockCursorCharBackward,
	cursorLineDown: mockCursorLineDown,
	cursorLineUp: mockCursorLineUp,
	cursorLineStart: mockCursorLineStart,
	cursorLineEnd: mockCursorLineEnd,
	cursorGroupForward: mockCursorGroupForward,
	cursorGroupBackward: mockCursorGroupBackward,
	cursorPageDown: mockCursorPageDown,
	cursorPageUp: mockCursorPageUp,
	cursorDocStart: mockCursorDocStart,
	cursorDocEnd: mockCursorDocEnd,
}));

vi.mock("obsidian", () => ({
	MarkdownView: vi.fn(),
}));

const mockEditorView = { state: {}, dispatch: vi.fn() };

function createMockContext(editorView: unknown = mockEditorView): ExecutionContext {
	return {
		killRing: {} as ExecutionContext["killRing"],
		workspaceContext: {
			getEditorProxy: () => ({
				getEditorView: () => editorView,
			}),
		} as unknown as ExecutionContext["workspaceContext"],
	} as ExecutionContext;
}

describe("createCursorCommands", () => {
	let commands: Command[];

	beforeEach(() => {
		vi.clearAllMocks();
		commands = createCursorCommands();
	});

	it("returns 12 commands", () => {
		expect(commands).toHaveLength(12);
	});

	it("each command has a unique id", () => {
		const ids = commands.map((c) => c.id);
		expect(new Set(ids).size).toBe(12);
	});

	it("all command ids match CURSOR_MOVEMENT_COMMANDS constants", () => {
		const ids = commands.map((c) => c.id);
		const expectedIds = Object.values(CURSOR_MOVEMENT_COMMANDS);
		expect(ids).toEqual(expect.arrayContaining(expectedIds));
		expect(expectedIds).toEqual(expect.arrayContaining(ids));
	});

	describe.each([
		[CURSOR_MOVEMENT_COMMANDS.FORWARD_CHAR, "Forward Char", mockCursorCharForward],
		[CURSOR_MOVEMENT_COMMANDS.BACKWARD_CHAR, "Backward Char", mockCursorCharBackward],
		[CURSOR_MOVEMENT_COMMANDS.NEXT_LINE, "Next Line", mockCursorLineDown],
		[CURSOR_MOVEMENT_COMMANDS.PREVIOUS_LINE, "Previous Line", mockCursorLineUp],
		[CURSOR_MOVEMENT_COMMANDS.MOVE_BEGINNING_OF_LINE, "Move Beginning of Line", mockCursorLineStart],
		[CURSOR_MOVEMENT_COMMANDS.MOVE_END_OF_LINE, "Move End of Line", mockCursorLineEnd],
		[CURSOR_MOVEMENT_COMMANDS.FORWARD_WORD, "Forward Word", mockCursorGroupForward],
		[CURSOR_MOVEMENT_COMMANDS.BACKWARD_WORD, "Backward Word", mockCursorGroupBackward],
		[CURSOR_MOVEMENT_COMMANDS.SCROLL_UP, "Scroll Up", mockCursorPageDown],
		[CURSOR_MOVEMENT_COMMANDS.SCROLL_DOWN, "Scroll Down", mockCursorPageUp],
		[CURSOR_MOVEMENT_COMMANDS.BEGINNING_OF_BUFFER, "Beginning of Buffer", mockCursorDocStart],
		[CURSOR_MOVEMENT_COMMANDS.END_OF_BUFFER, "End of Buffer", mockCursorDocEnd],
	])("%s", (id, name, mockFn) => {
		let command: Command;

		beforeEach(() => {
			command = commands.find((c) => c.id === id)!;
		});

		it(`has name "${name}"`, () => {
			expect(command.name).toBe(name);
		});

		it("calls CM6 function with EditorView when context is available", () => {
			const context = createMockContext();
			command.execute(undefined, context);
			expect(mockFn).toHaveBeenCalledWith(mockEditorView);
		});

		it("does nothing when no context is provided", () => {
			command.execute();
			expect(mockFn).not.toHaveBeenCalled();
		});

		it("does nothing when EditorView is null", () => {
			const context = createMockContext(null);
			command.execute(undefined, context);
			expect(mockFn).not.toHaveBeenCalled();
		});
	});
});
