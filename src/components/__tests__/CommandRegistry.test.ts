import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CommandRegistry } from '../CommandRegistry';
import type { Command, Disposable } from '../../types';
import type { ExecutionContext } from '../execution-context/ExecutionContext';
import type { App } from 'obsidian';

// Helper to create test commands
function createCommand(
	id: string,
	execute: (args?: Record<string, unknown>, context?: ExecutionContext) => void | Promise<void> = () => {}
): Command {
	return {
		id,
		name: `Test Command ${id}`,
		execute,
	};
}

describe('CommandRegistry', () => {
	let registry: CommandRegistry;

	beforeEach(() => {
		// Fresh instance per test for isolation
		registry = new CommandRegistry();
	});

	afterEach(() => {
		// Clear all mocks after each test
		vi.restoreAllMocks();
	});

	describe('registerCommand', () => {
		it('registers command and returns Disposable', () => {
			const cmd = createCommand('test-command');
			const disposable = registry.registerCommand(cmd);

			expect(disposable).toBeDefined();
			expect(disposable.dispose).toBeInstanceOf(Function);
		});

		it('allows retrieving registered command', () => {
			const cmd = createCommand('test-command');
			registry.registerCommand(cmd);

			const retrieved = registry.getCommand('test-command');
			expect(retrieved).toBe(cmd);
		});

		it('overwrites duplicate command IDs', () => {
			const cmd1 = createCommand('duplicate-id');
			const cmd2 = createCommand('duplicate-id');

			registry.registerCommand(cmd1);
			registry.registerCommand(cmd2);

			const retrieved = registry.getCommand('duplicate-id');
			expect(retrieved).toBe(cmd2);
		});

		it('Disposable.dispose() removes command', () => {
			const cmd = createCommand('test-command');
			const disposable = registry.registerCommand(cmd);

			disposable.dispose();

			const retrieved = registry.getCommand('test-command');
			expect(retrieved).toBeNull();
		});

		it('multiple commands can be registered independently', () => {
			const cmd1 = createCommand('cmd1');
			const cmd2 = createCommand('cmd2');
			const cmd3 = createCommand('cmd3');

			registry.registerCommand(cmd1);
			registry.registerCommand(cmd2);
			registry.registerCommand(cmd3);

			expect(registry.getCommand('cmd1')).toBe(cmd1);
			expect(registry.getCommand('cmd2')).toBe(cmd2);
			expect(registry.getCommand('cmd3')).toBe(cmd3);
		});

		it('disposing one command does not affect others', () => {
			const cmd1 = createCommand('cmd1');
			const cmd2 = createCommand('cmd2');

			const disposable1 = registry.registerCommand(cmd1);
			registry.registerCommand(cmd2);

			disposable1.dispose();

			expect(registry.getCommand('cmd1')).toBeNull();
			expect(registry.getCommand('cmd2')).toBe(cmd2);
		});
	});

	describe('getCommand', () => {
		it('returns registered command by ID', () => {
			const cmd = createCommand('test-command');
			registry.registerCommand(cmd);

			const retrieved = registry.getCommand('test-command');
			expect(retrieved).toBe(cmd);
		});

		it('returns null for non-existent command', () => {
			const retrieved = registry.getCommand('nonexistent');
			expect(retrieved).toBeNull();
		});

		it('returns correct command after multiple registrations', () => {
			const cmd1 = createCommand('cmd1');
			const cmd2 = createCommand('cmd2');
			const cmd3 = createCommand('cmd3');

			registry.registerCommand(cmd1);
			registry.registerCommand(cmd2);
			registry.registerCommand(cmd3);

			expect(registry.getCommand('cmd2')).toBe(cmd2);
		});

		it('returns null after command is disposed', () => {
			const cmd = createCommand('test-command');
			const disposable = registry.registerCommand(cmd);

			disposable.dispose();

			expect(registry.getCommand('test-command')).toBeNull();
		});
	});

	describe('execute', () => {
		it('executes synchronous command successfully', () => {
			const executeMock = vi.fn();
			const cmd = createCommand('test-command', executeMock);

			registry.registerCommand(cmd);
			const result = registry.execute('test-command');

			expect(result).toBe(true);
			expect(executeMock).toHaveBeenCalledOnce();
		});

		it('executes async/Promise command successfully', () => {
			const executeMock = vi.fn().mockResolvedValue(undefined);
			const cmd = createCommand('async-command', executeMock);

			registry.registerCommand(cmd);
			const result = registry.execute('async-command');

			expect(result).toBe(true);
			expect(executeMock).toHaveBeenCalledOnce();
		});

		it('passes arguments to command.execute()', () => {
			const executeMock = vi.fn();
			const cmd = createCommand('test-command', executeMock);
			const args = { key: 'value', count: 42 };

			registry.registerCommand(cmd);
			registry.execute('test-command', args);

			expect(executeMock).toHaveBeenCalledWith(args, undefined);
		});

		it('passes execution context to command.execute()', () => {
			const executeMock = vi.fn();
			const cmd = createCommand('test-command', executeMock);
			const context = {} as ExecutionContext;

			registry.registerCommand(cmd);
			registry.execute('test-command', undefined, context);

			expect(executeMock).toHaveBeenCalledWith(undefined, context);
		});

		it('passes both arguments and context to command.execute()', () => {
			const executeMock = vi.fn();
			const cmd = createCommand('test-command', executeMock);
			const args = { key: 'value' };
			const context = {} as ExecutionContext;

			registry.registerCommand(cmd);
			registry.execute('test-command', args, context);

			expect(executeMock).toHaveBeenCalledWith(args, context);
		});

		it('returns true on successful execution', () => {
			const cmd = createCommand('test-command');
			registry.registerCommand(cmd);

			const result = registry.execute('test-command');
			expect(result).toBe(true);
		});

		it('returns false when command not found', () => {
			const result = registry.execute('nonexistent');
			expect(result).toBe(false);
		});

		it('returns false when execution throws error', () => {
			const executeMock = vi.fn().mockImplementation(() => {
				throw new Error('Command execution failed');
			});
			const cmd = createCommand('failing-command', executeMock);

			registry.registerCommand(cmd);
			const result = registry.execute('failing-command');

			expect(result).toBe(false);
		});

		it('handles async rejection (Promise.reject)', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const executeMock = vi.fn().mockRejectedValue(new Error('Async failure'));
			const cmd = createCommand('async-failing-command', executeMock);

			registry.registerCommand(cmd);
			const result = registry.execute('async-failing-command');

			expect(result).toBe(true); // Returns true immediately for async commands

			// Wait for Promise rejection to be handled
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Error in async command'),
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});

		it('logs errors to console on sync execution failure', () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const error = new Error('Sync command failed');
			const executeMock = vi.fn().mockImplementation(() => {
				throw error;
			});
			const cmd = createCommand('failing-command', executeMock);

			registry.registerCommand(cmd);
			registry.execute('failing-command');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Error executing command'),
				error
			);

			consoleErrorSpy.mockRestore();
		});

		it('executes command multiple times', () => {
			const executeMock = vi.fn();
			const cmd = createCommand('test-command', executeMock);

			registry.registerCommand(cmd);
			registry.execute('test-command');
			registry.execute('test-command');
			registry.execute('test-command');

			expect(executeMock).toHaveBeenCalledTimes(3);
		});
	});

	describe('getAllCommandIds', () => {
		it('returns empty array when no commands', () => {
			const ids = registry.getAllCommandIds();
			expect(ids).toEqual([]);
		});

		it('returns all registered command IDs', () => {
			const cmd1 = createCommand('cmd1');
			const cmd2 = createCommand('cmd2');
			const cmd3 = createCommand('cmd3');

			registry.registerCommand(cmd1);
			registry.registerCommand(cmd2);
			registry.registerCommand(cmd3);

			const ids = registry.getAllCommandIds();
			expect(ids).toHaveLength(3);
			expect(ids).toContain('cmd1');
			expect(ids).toContain('cmd2');
			expect(ids).toContain('cmd3');
		});

		it('updates after commands are disposed', () => {
			const cmd1 = createCommand('cmd1');
			const cmd2 = createCommand('cmd2');

			const disposable1 = registry.registerCommand(cmd1);
			registry.registerCommand(cmd2);

			disposable1.dispose();

			const ids = registry.getAllCommandIds();
			expect(ids).toHaveLength(1);
			expect(ids).toContain('cmd2');
			expect(ids).not.toContain('cmd1');
		});
	});

	describe('getAllCommands', () => {
		it('returns empty array when no commands', () => {
			const commands = registry.getAllCommands();
			expect(commands).toEqual([]);
		});

		it('returns all registered commands', () => {
			const cmd1 = createCommand('cmd1');
			const cmd2 = createCommand('cmd2');
			const cmd3 = createCommand('cmd3');

			registry.registerCommand(cmd1);
			registry.registerCommand(cmd2);
			registry.registerCommand(cmd3);

			const commands = registry.getAllCommands();
			expect(commands).toHaveLength(3);
			expect(commands).toContain(cmd1);
			expect(commands).toContain(cmd2);
			expect(commands).toContain(cmd3);
		});

		it('updates after commands are disposed', () => {
			const cmd1 = createCommand('cmd1');
			const cmd2 = createCommand('cmd2');

			const disposable1 = registry.registerCommand(cmd1);
			registry.registerCommand(cmd2);

			disposable1.dispose();

			const commands = registry.getAllCommands();
			expect(commands).toHaveLength(1);
			expect(commands).toContain(cmd2);
			expect(commands).not.toContain(cmd1);
		});
	});

	describe('setApp', () => {
		it('stores app reference', () => {
			const mockApp = {} as App;

			expect(() => registry.setApp(mockApp)).not.toThrow();
		});

		it('allows setting app after construction', () => {
			const mockApp = {} as App;

			registry.setApp(mockApp);

			// Verify by calling loadObsidianCommands which uses app
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			// With app set, should not warn
			registry.loadObsidianCommands();
			expect(consoleWarnSpy).not.toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});
	});

	describe('loadObsidianCommands', () => {
		it('warns when app is not set', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			registry.loadObsidianCommands();

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Cannot load Obsidian commands')
			);

			consoleWarnSpy.mockRestore();
		});

		it('does not warn when app is set', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const mockApp = {} as App;

			registry.setApp(mockApp);
			registry.loadObsidianCommands();

			expect(consoleWarnSpy).not.toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});
	});
});
