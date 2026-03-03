/**
 * Obsidian Command Loader
 * Responsibility: Load all commands from Obsidian's internal command registry,
 * wrap them into the plugin's Command interface for registration in CommandRegistry.
 *
 * Uses private API: app.commands.commands (not part of Obsidian's public API)
 * Uses public API: Command type from 'obsidian' for the command shape
 */

import type { App, Command as ObsidianCommand, MarkdownView } from 'obsidian';
import type { Command } from '../types';
import type { ExecutionContext } from '../components/execution-context/ExecutionContext';

/** Extended App type exposing the private commands registry */
interface AppWithCommands extends App {
    commands: {
        commands: Record<string, ObsidianCommand>;
    };
}

/**
 * Load all Obsidian commands and wrap them into our Command interface.
 * Filters out mobileOnly commands and commands with no usable callback.
 *
 * @param app - The Obsidian App instance
 * @returns Array of wrapped Command objects
 */
export function loadObsidianCommands(app: App): Command[] {
    const appWithCmds = app as AppWithCommands;
    const nativeCommands = appWithCmds.commands.commands;
    const result: Command[] = [];

    for (const nativeCmd of Object.values(nativeCommands)) {
        if (nativeCmd.mobileOnly) continue;

        const wrapped = wrapObsidianCommand(nativeCmd);
        if (wrapped) {
            result.push(wrapped);
        }
    }

    return result;
}

/**
 * Get the active MarkdownView from ExecutionContext.
 */
function getActiveView(context?: ExecutionContext): MarkdownView | null {
    return context?.workspaceContext.getActiveMarkdownView() ?? null;
}

/**
 * Wrap a single Obsidian command into our Command interface.
 * Selects the highest-priority callback and creates the execute() wrapper.
 * Returns null if the command has no usable callback.
 *
 * Callback priority (from Obsidian docs):
 *   editorCheckCallback > editorCallback > checkCallback > callback
 */
function wrapObsidianCommand(nativeCmd: ObsidianCommand): Command | null {
    if (nativeCmd.editorCheckCallback) {
        const ecCb = nativeCmd.editorCheckCallback;
        return {
            id: nativeCmd.id,
            name: nativeCmd.name,
            canExecute: (context?: ExecutionContext) => {
                const view = getActiveView(context);
                if (!view) return false;
                return ecCb(true, view.editor, view) !== false;
            },
            execute: (
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) => {
                const view = getActiveView(context);
                if (!view) return;
                ecCb(false, view.editor, view);
            },
        };
    }

    if (nativeCmd.editorCallback) {
        const eCb = nativeCmd.editorCallback;
        return {
            id: nativeCmd.id,
            name: nativeCmd.name,
            canExecute: (context?: ExecutionContext) => {
                return getActiveView(context) !== null;
            },
            execute: (
                _args?: Record<string, unknown>,
                context?: ExecutionContext,
            ) => {
                const view = getActiveView(context);
                if (!view) return;
                eCb(view.editor, view);
            },
        };
    }

    if (nativeCmd.checkCallback) {
        const cCb = nativeCmd.checkCallback;
        return {
            id: nativeCmd.id,
            name: nativeCmd.name,
            canExecute: () => {
                return cCb(true) !== false;
            },
            execute: () => {
                cCb(false);
            },
        };
    }

    if (nativeCmd.callback) {
        const cb = nativeCmd.callback;
        return {
            id: nativeCmd.id,
            name: nativeCmd.name,
            execute: () => {
                cb();
            },
        };
    }

    return null;
}
