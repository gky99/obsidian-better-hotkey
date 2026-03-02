/**
 * ScopeProxy
 * Encapsulates monkey-patching of Scope.prototype.handleKey to intercept
 * keyboard events before any scope's default handler runs.
 */

import type { Keymap, KeymapEventListener } from 'obsidian';
import { Scope } from 'obsidian';

/**
 * Helper types for Obsidian internal APIs used by the patching strategy.
 * These expose private members for type-safe prototype patching.
 */

/** Scope with private `handleKey` (same signature as KeymapEventListener). */
interface ObsidianScope extends Scope {
    handleKey: KeymapEventListener;
}

/** Keymap with private `scope` property (the current top-level active scope). */
export interface ObsidianKeymap extends Keymap {
    scope: Scope;
}

type ScopePrototype = typeof Scope.prototype & {
    handleKey: KeymapEventListener;
};

export class ScopeProxy {
    private originalHandleKey: KeymapEventListener | null = null;

    /**
     * Patch Scope.prototype.handleKey. The callback receives the Scope instance
     * that handleKey was called on, plus the KeyboardEvent.
     * Return false from callback to suppress; return undefined to pass through
     * to the original handleKey.
     */
    patch(
        callback: (
            scope: ObsidianScope,
            evt: KeyboardEvent,
        ) => false | undefined,
    ): void {
        const proto = Scope.prototype as ScopePrototype;
        const originalHandle = proto.handleKey;
        this.originalHandleKey = originalHandle;

        proto.handleKey = function (evt, ctx) {
            const result = callback(this as ObsidianScope, evt);
            if (result === false) {
                return false;
            }
            return originalHandle.call(this, evt, ctx) as false | undefined;
        };
    }

    /**
     * Restore original Scope.prototype.handleKey.
     */
    restore(): void {
        if (this.originalHandleKey) {
            (Scope.prototype as ScopePrototype).handleKey =
                this.originalHandleKey;
            this.originalHandleKey = null;
        }
    }
}
