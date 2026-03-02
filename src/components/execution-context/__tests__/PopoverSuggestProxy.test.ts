import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PopoverSuggest } from 'obsidian';
import { CONTEXT_KEYS } from '../../../constants';

// Mock contextEngine module
vi.mock('../../ContextEngine', () => ({
    contextEngine: {
        getContext: vi.fn(),
        setContext: vi.fn(),
    },
}));

import { contextEngine } from '../../ContextEngine';
import { PopoverSuggestProxy } from '../PopoverSuggestProxy';

describe('PopoverSuggestProxy', () => {
    let proxy: PopoverSuggestProxy;
    let origOpen: (...args: any[]) => void;
    let origClose: (...args: any[]) => void;

    beforeEach(() => {
        vi.clearAllMocks();
        origOpen = PopoverSuggest.prototype.open;
        origClose = PopoverSuggest.prototype.close;
        proxy = new PopoverSuggestProxy();
    });

    afterEach(() => {
        proxy.restore();
        PopoverSuggest.prototype.open = origOpen;
        PopoverSuggest.prototype.close = origClose;
    });

    describe('constructor', () => {
        it('saves original prototype references', () => {
            expect(PopoverSuggest.prototype.open).toBe(origOpen);
            expect(PopoverSuggest.prototype.close).toBe(origClose);
        });

        it('does not patch prototypes on construction', () => {
            expect(PopoverSuggest.prototype.open).toBe(origOpen);
            expect(PopoverSuggest.prototype.close).toBe(origClose);
        });

        it('starts with null active instance', () => {
            expect(proxy.getActiveInstance()).toBeNull();
        });
    });

    describe('patch', () => {
        it('replaces PopoverSuggest.prototype.open', () => {
            proxy.patch();
            expect(PopoverSuggest.prototype.open).not.toBe(origOpen);
        });

        it('replaces PopoverSuggest.prototype.close', () => {
            proxy.patch();
            expect(PopoverSuggest.prototype.close).not.toBe(origClose);
        });

        it('initializes popoverSuggestOpen context key to false', () => {
            proxy.patch();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.POPOVER_SUGGEST_OPEN,
                false,
            );
        });

        it('is idempotent — calling patch twice does not break', () => {
            proxy.patch();
            const patchedOpen = PopoverSuggest.prototype.open;
            proxy.patch();
            expect(PopoverSuggest.prototype.open).toBe(patchedOpen);
        });
    });

    describe('open/close cycle', () => {
        beforeEach(() => {
            proxy.patch();
            vi.clearAllMocks();
        });

        it('open calls the original open method', () => {
            const spy = vi.fn();
            PopoverSuggest.prototype.open = origOpen;
            proxy.restore();

            PopoverSuggest.prototype.open = spy;
            PopoverSuggest.prototype.close = origClose;
            const newProxy = new PopoverSuggestProxy();
            newProxy.patch();

            const fakePopover = Object.create(PopoverSuggest.prototype);
            fakePopover.open();

            expect(spy).toHaveBeenCalledTimes(1);
            newProxy.restore();
        });

        it('open captures the popover instance', () => {
            const fakePopover = Object.create(PopoverSuggest.prototype);
            fakePopover.open();
            expect(proxy.getActiveInstance()).toBe(fakePopover);
        });

        it('open sets popoverSuggestOpen context key to true', () => {
            const fakePopover = Object.create(PopoverSuggest.prototype);
            fakePopover.open();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.POPOVER_SUGGEST_OPEN,
                true,
            );
        });

        it('close clears the popover instance', () => {
            const fakePopover = Object.create(PopoverSuggest.prototype);
            fakePopover.open();
            fakePopover.close();
            expect(proxy.getActiveInstance()).toBeNull();
        });

        it('close sets popoverSuggestOpen context key to false', () => {
            const fakePopover = Object.create(PopoverSuggest.prototype);
            fakePopover.open();
            vi.clearAllMocks();
            fakePopover.close();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.POPOVER_SUGGEST_OPEN,
                false,
            );
        });

        it('open called twice overwrites reference and context stays true', () => {
            const popover1 = Object.create(PopoverSuggest.prototype);
            const popover2 = Object.create(PopoverSuggest.prototype);
            popover1.open();
            popover2.open();
            expect(proxy.getActiveInstance()).toBe(popover2);
        });

        it('still updates context when original open throws', () => {
            proxy.restore();
            PopoverSuggest.prototype.open = () => {
                throw new Error('boom');
            };
            PopoverSuggest.prototype.close = origClose;
            const throwProxy = new PopoverSuggestProxy();
            throwProxy.patch();

            const fakePopover = Object.create(PopoverSuggest.prototype);
            expect(() => fakePopover.open()).toThrow('boom');
            expect(throwProxy.getActiveInstance()).toBe(fakePopover);
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.POPOVER_SUGGEST_OPEN,
                true,
            );
            throwProxy.restore();
        });

        it('still clears context when original close throws', () => {
            proxy.restore();
            PopoverSuggest.prototype.open = origOpen;
            PopoverSuggest.prototype.close = () => {
                throw new Error('boom');
            };
            const throwProxy = new PopoverSuggestProxy();
            throwProxy.patch();

            const fakePopover = Object.create(PopoverSuggest.prototype);
            fakePopover.open();
            vi.clearAllMocks();
            expect(() => fakePopover.close()).toThrow('boom');
            expect(throwProxy.getActiveInstance()).toBeNull();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.POPOVER_SUGGEST_OPEN,
                false,
            );
            throwProxy.restore();
        });
    });

    describe('restore', () => {
        it('restores PopoverSuggest.prototype.open to original', () => {
            proxy.patch();
            proxy.restore();
            expect(PopoverSuggest.prototype.open).toBe(origOpen);
        });

        it('restores PopoverSuggest.prototype.close to original', () => {
            proxy.patch();
            proxy.restore();
            expect(PopoverSuggest.prototype.close).toBe(origClose);
        });

        it('clears active instance', () => {
            proxy.patch();
            const fakePopover = Object.create(PopoverSuggest.prototype);
            fakePopover.open();
            proxy.restore();
            expect(proxy.getActiveInstance()).toBeNull();
        });

        it('resets popoverSuggestOpen context key to false', () => {
            proxy.patch();
            const fakePopover = Object.create(PopoverSuggest.prototype);
            fakePopover.open();
            vi.clearAllMocks();
            proxy.restore();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.POPOVER_SUGGEST_OPEN,
                false,
            );
        });

        it('is idempotent — calling restore twice does not throw', () => {
            proxy.patch();
            proxy.restore();
            expect(() => proxy.restore()).not.toThrow();
        });
    });

    describe('edge cases', () => {
        it('restore before patch is a no-op', () => {
            expect(() => proxy.restore()).not.toThrow();
            expect(PopoverSuggest.prototype.open).toBe(origOpen);
            expect(PopoverSuggest.prototype.close).toBe(origClose);
        });
    });
});
