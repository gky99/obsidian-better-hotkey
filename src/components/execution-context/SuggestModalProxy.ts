/**
 * SuggestModalProxy
 * Patches SuggestModal.prototype.open/close to capture the active instance
 * and set the suggestModalOpen context key on ContextEngine.
 */

import { SuggestModal } from 'obsidian';
import { contextEngine } from '../ContextEngine';
import { CONTEXT_KEYS } from '../../constants';

export class SuggestModalProxy {
    private origOpen: () => void;
    private origClose: () => void;
    private activeInstance: SuggestModal<unknown> | null = null;
    private patched = false;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.origOpen = SuggestModal.prototype.open;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.origClose = SuggestModal.prototype.close;
    }

    patch(): void {
        if (this.patched) return;
        this.patched = true;

        contextEngine.setContext(CONTEXT_KEYS.SUGGEST_MODAL_OPEN, false);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        SuggestModal.prototype.open = function () {
            try {
                self.origOpen.call(this);
            } finally {
                self.activeInstance = this;
                contextEngine.setContext(CONTEXT_KEYS.SUGGEST_MODAL_OPEN, true);
            }
        };

        SuggestModal.prototype.close = function () {
            try {
                self.origClose.call(this);
            } finally {
                self.activeInstance = null;
                contextEngine.setContext(
                    CONTEXT_KEYS.SUGGEST_MODAL_OPEN,
                    false,
                );
            }
        };
    }

    restore(): void {
        if (!this.patched) return;

        SuggestModal.prototype.open = this.origOpen;
        SuggestModal.prototype.close = this.origClose;

        this.activeInstance = null;
        contextEngine.setContext(CONTEXT_KEYS.SUGGEST_MODAL_OPEN, false);

        this.patched = false;
    }

    getActiveInstance(): SuggestModal<unknown> | null {
        return this.activeInstance;
    }
}
