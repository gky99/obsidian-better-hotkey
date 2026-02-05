/**
 * Command Registry Component
 * Responsibility: Store commands, execute with args
 * Based on Design Documents/Components/Command Registry.md
 */

import type { Command, Disposable } from "../types";
import type { ExecutionContext } from "./execution-context/ExecutionContext";
import type { App } from "obsidian";


export class CommandRegistry {
	private commands: Map<string, Command> = new Map();
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Register a command
	 * Returns null if command ID is already registered
	 */
	registerCommand(command: Command): Disposable | null {
		// Check for duplicate
		if (this.commands.has(command.id)) {
			console.warn(
				`CommandRegistry: Command "${command.id}" is already registered. ` +
				`Registration refused.`
			);
			return null;
		}

		// Register command
		this.commands.set(command.id, command);
		return {
			dispose: () => {
				this.commands.delete(command.id);
			},
		};
	}

	/**
	 * Get command by ID
	 */
	getCommand(id: string): Command | null {
		return this.commands.get(id) ?? null;
	}

	/**
	 * Execute command with optional args and execution context
	 * Returns true if command was found and executed
	 */
	execute(commandId: string, args?: Record<string, unknown>, context?: ExecutionContext): boolean {
		const command = this.getCommand(commandId);
		if (!command) {
			return false;
		}

		try {
			const result = command.execute(args, context);

			// Handle async commands
			if (result instanceof Promise) {
				result.catch(error => {
					console.error(`Error in async command ${commandId}:`, error);
				});
			}

			return true;
		} catch (error) {
			console.error(`Error executing command ${commandId}:`, error);
			return false;
		}
	}

	/**
	 * Load commands from Obsidian's command registry
	 * TODO: Implement in integration phase when wiring with Obsidian app
	 */
	loadObsidianCommands(): void {
		// TODO: Iterate through app.commands.commands and register them
		// This will be implemented during integration phase
		// For now, this is a placeholder
	}

	/**
	 * Get all registered command IDs
	 */
	getAllCommandIds(): string[] {
		return Array.from(this.commands.keys());
	}

	/**
	 * Get all registered commands
	 */
	getAllCommands(): Command[] {
		return Array.from(this.commands.values());
	}
}
