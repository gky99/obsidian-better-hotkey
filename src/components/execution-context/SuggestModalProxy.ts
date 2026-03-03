/**
 * SuggestModalProxy
 * Patches SuggestModal.prototype.open/close to capture the active instance
 * and set the suggestModalOpen context key on ContextEngine.
 *
 * Also implements SuggestionSelector and InputFieldEditor interfaces
 * for controlling the suggestion list and input field.
 */

import { SuggestModal } from 'obsidian';
import { contextEngine } from '../ContextEngine';
import { CONTEXT_KEYS } from '../../constants';
import type {
    SuggestionSelector,
    InputFieldEditor,
    InputSelection,
    SuggestModalWithChooser,
} from '../../types';

export class SuggestModalProxy
    implements SuggestionSelector, InputFieldEditor
{
    private origOpen: () => void;
    private origClose: () => void;
    private activeInstance: SuggestModal<unknown> | null = null;
    private patched = false;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/unbound-method -- storing prototype method for monkey-patch
        this.origOpen = SuggestModal.prototype.open;
        // eslint-disable-next-line @typescript-eslint/unbound-method -- storing prototype method for monkey-patch
        this.origClose = SuggestModal.prototype.close;
    }

    patch(): void {
        if (this.patched) return;
        this.patched = true;

        contextEngine.setContext(CONTEXT_KEYS.SUGGEST_MODAL_OPEN, false);

        // eslint-disable-next-line @typescript-eslint/no-this-alias -- closure for proxy reference inside replacement function
        const self = this;

        SuggestModal.prototype.open = function () {
            try {
                self.origOpen.call(this);
            } finally {
                self.activeInstance = this;
                contextEngine.setContext(
                    CONTEXT_KEYS.SUGGEST_MODAL_OPEN,
                    true,
                );
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

    // ─── SuggestionSelector ───

    moveUp(event?: KeyboardEvent): void {
        if (!this.activeInstance) return;
        const chooser = (
            this.activeInstance as unknown as SuggestModalWithChooser
        ).chooser;
        chooser?.moveUp(event);
    }

    moveDown(event?: KeyboardEvent): void {
        if (!this.activeInstance) return;
        const chooser = (
            this.activeInstance as unknown as SuggestModalWithChooser
        ).chooser;
        chooser?.moveDown(event);
    }

    // ─── InputFieldEditor ───

    getSelection(): InputSelection {
        if (!this.activeInstance) return { from: 0, to: 0 };
        const el = this.activeInstance.inputEl;
        return { from: el.selectionStart ?? 0, to: el.selectionEnd ?? 0 };
    }

    setSelection(selection: InputSelection): void {
        if (!this.activeInstance) return;
        const el = this.activeInstance.inputEl;
        el.selectionStart = selection.from;
        el.selectionEnd = selection.to;
    }

    getText(): string {
        if (!this.activeInstance) return '';
        return this.activeInstance.inputEl.value;
    }

    getTextLength(): number {
        if (!this.activeInstance) return 0;
        return this.activeInstance.inputEl.value.length;
    }

    insertText(text: string, from: number, to?: number): void {
        if (!this.activeInstance) return;
        const el = this.activeInstance.inputEl;
        el.setRangeText(text, from, to ?? from, 'end');
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    deleteText(from: number, to: number): void {
        if (!this.activeInstance) return;
        const el = this.activeInstance.inputEl;
        el.setRangeText('', from, to, 'end');
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
}
