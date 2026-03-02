/**
 * PopoverSuggestProxy
 * Patches PopoverSuggest.prototype.open/close to capture the active instance
 * and set the popoverSuggestOpen context key on ContextEngine.
 */

import { PopoverSuggest } from 'obsidian';
import { contextEngine } from '../ContextEngine';
import { CONTEXT_KEYS } from '../../constants';

export class PopoverSuggestProxy {
    private origOpen: () => void;
    private origClose: () => void;
    private activeInstance: PopoverSuggest<unknown> | null = null;
    private patched = false;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.origOpen = PopoverSuggest.prototype.open;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.origClose = PopoverSuggest.prototype.close;
    }

    patch(): void {
        if (this.patched) return;
        this.patched = true;

        contextEngine.setContext(CONTEXT_KEYS.POPOVER_SUGGEST_OPEN, false);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        PopoverSuggest.prototype.open = function () {
            try {
                self.origOpen.call(this);
            } finally {
                self.activeInstance = this;
                contextEngine.setContext(
                    CONTEXT_KEYS.POPOVER_SUGGEST_OPEN,
                    true,
                );
            }
        };

        PopoverSuggest.prototype.close = function () {
            try {
                self.origClose.call(this);
            } finally {
                self.activeInstance = null;
                contextEngine.setContext(
                    CONTEXT_KEYS.POPOVER_SUGGEST_OPEN,
                    false,
                );
            }
        };
    }

    restore(): void {
        if (!this.patched) return;

        PopoverSuggest.prototype.open = this.origOpen;
        PopoverSuggest.prototype.close = this.origClose;

        this.activeInstance = null;
        contextEngine.setContext(CONTEXT_KEYS.POPOVER_SUGGEST_OPEN, false);

        this.patched = false;
    }

    getActiveInstance(): PopoverSuggest<unknown> | null {
        return this.activeInstance;
    }
}
