/**
 * Command Registry Component
 * Responsibility: Store commands, execute with args
 * Based on Design Documents/Components/Command Registry.md
 */

import type { Command, Disposable } from '../types';
import type { ExecutionContext } from './execution-context/ExecutionContext';
import type { App } from 'obsidian';
import { loadObsidianCommands as loadFromObsidian } from '../commands/ObsidianCommandLoader';

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
                    `Registration refused.`,
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
     * Execute command with execution context and optional args.
     * Returns true if command was found and executed.
     * Returns false if command not found or canExecute() returns false.
     */
    execute(
        commandId: string,
        context: ExecutionContext,
        event: KeyboardEvent,
        args?: Record<string, unknown>,
    ): boolean {
        const command = this.getCommand(commandId);
        if (!command) {
            return false;
        }

        if (command.canExecute && !command.canExecute(context)) {
            return false;
        }

        try {
            const result = command.execute(context, event, args);

            // Handle async commands
            if (result instanceof Promise) {
                result.catch((error) => {
                    console.error(
                        `Error in async command ${commandId}:`,
                        error,
                    );
                });
            }

            return true;
        } catch (error) {
            console.error(`Error executing command ${commandId}:`, error);
            return false;
        }
    }

    /**
     * Load commands from Obsidian's internal command registry.
     * Wraps native commands into our Command interface.
     * Skips commands whose IDs are already registered (custom commands take priority).
     */
    loadObsidianCommands(): void {
        const obsidianCommands = loadFromObsidian(this.app);
        for (const cmd of obsidianCommands) {
            this.registerCommand(cmd);
        }
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
