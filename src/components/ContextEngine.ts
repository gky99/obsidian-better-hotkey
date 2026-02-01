/**
 * Context Engine Component (Stub Version - Phase 1.5)
 * Responsibility: Track context state, evaluate "when" clauses
 * Based on Design Documents/Components/Context Engine.md
 *
 * NOTE: This is a stub implementation. evaluate() always returns true.
 * Full implementation with real "when" clause parsing in Phase 3.1
 */

import type { HotkeyEntry, ContextSchema, Disposable } from "../types";

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
	 * Get context value
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
	 * Filter hotkey entries by their "when" clauses
	 * Uses evaluate() to determine if entry matches current context
	 */
	filter(entries: HotkeyEntry[]): HotkeyEntry[] {
		return entries.filter(entry => {
			if (!entry.when) {
				return true; // No condition means always active
			}
			return this.evaluate(entry.when);
		});
	}

	/**
	 * Evaluate "when" clause (STUB - always returns true)
	 * TODO: Implement real parsing in Phase 3.1
	 */
	private evaluate(whenClause: string): boolean {
		// Stub implementation - always returns true
		return true;
	}
}

/**
 * Global singleton instance of ContextEngine
 * Accessible to all components as per Architecture.md
 */
export const contextEngine = new ContextEngine();
