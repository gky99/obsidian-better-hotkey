/**
 * Context Engine Component
 * Responsibility: Track context state, evaluate "when" clauses
 * Based on Design Documents/Components/Context Engine.md
 *
 * Implements ContextReader interface so expression nodes can evaluate
 * against context state via getContext().
 */

import type { HotkeyEntry, ContextSchema, Disposable } from '../types';

export class ContextEngine {
    private state: Map<string, unknown> = new Map();
    private declarations: Map<string, ContextSchema> = new Map();

    /**
     * Update context value
     */
    setContext(key: string, value: unknown): void {
        this.state.set(key, value);
    }

    /**
     * Get context value.
     * Also satisfies the ContextReader interface used by expression evaluation.
     */
    getContext(key: string): unknown {
        return this.state.get(key);
    }

    /**
     * Get all context values
     */
    getAllContext(): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of this.state.entries()) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Register context key with optional schema
     */
    declareContext(key: string, schema?: ContextSchema): Disposable {
        if (schema) {
            this.declarations.set(key, schema);
        }
        return {
            dispose: () => {
                this.declarations.delete(key);
            },
        };
    }

    /**
     * Filter hotkey entries by their "when" clauses.
     * Evaluates entry.whenExpr against current context state.
     * Since whenExpr is always defined (TrueExpr when no "when" clause),
     * we simply evaluate it directly.
     */
    filter(entries: HotkeyEntry[]): HotkeyEntry[] {
        return entries.filter((entry) => entry.whenExpr.evaluate(this));
    }
}

/**
 * Global singleton instance of ContextEngine
 * Accessible to all components as per Architecture.md
 */
export const contextEngine = new ContextEngine();
