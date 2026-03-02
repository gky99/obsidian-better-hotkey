import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SuggestModal } from 'obsidian';
import { CONTEXT_KEYS } from '../../../constants';

// Mock contextEngine module
vi.mock('../../ContextEngine', () => ({
    contextEngine: {
        getContext: vi.fn(),
        setContext: vi.fn(),
    },
}));

import { contextEngine } from '../../ContextEngine';
import { SuggestModalProxy } from '../SuggestModalProxy';

describe('SuggestModalProxy', () => {
    let proxy: SuggestModalProxy;
    let origOpen: (...args: any[]) => void;
    let origClose: (...args: any[]) => void;

    beforeEach(() => {
        vi.clearAllMocks();
        origOpen = SuggestModal.prototype.open;
        origClose = SuggestModal.prototype.close;
        proxy = new SuggestModalProxy();
    });

    afterEach(() => {
        proxy.restore();
        SuggestModal.prototype.open = origOpen;
        SuggestModal.prototype.close = origClose;
    });

    describe('constructor', () => {
        it('saves original prototype references', () => {
            expect(SuggestModal.prototype.open).toBe(origOpen);
            expect(SuggestModal.prototype.close).toBe(origClose);
        });

        it('does not patch prototypes on construction', () => {
            expect(SuggestModal.prototype.open).toBe(origOpen);
            expect(SuggestModal.prototype.close).toBe(origClose);
        });

        it('starts with null active instance', () => {
            expect(proxy.getActiveInstance()).toBeNull();
        });
    });

    describe('patch', () => {
        it('replaces SuggestModal.prototype.open', () => {
            proxy.patch();
            expect(SuggestModal.prototype.open).not.toBe(origOpen);
        });

        it('replaces SuggestModal.prototype.close', () => {
            proxy.patch();
            expect(SuggestModal.prototype.close).not.toBe(origClose);
        });

        it('initializes suggestModalOpen context key to false', () => {
            proxy.patch();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.SUGGEST_MODAL_OPEN,
                false,
            );
        });

        it('is idempotent — calling patch twice does not break', () => {
            proxy.patch();
            const patchedOpen = SuggestModal.prototype.open;
            proxy.patch();
            expect(SuggestModal.prototype.open).toBe(patchedOpen);
        });
    });

    describe('open/close cycle', () => {
        beforeEach(() => {
            proxy.patch();
            vi.clearAllMocks();
        });

        it('open calls the original open method', () => {
            const spy = vi.fn();
            SuggestModal.prototype.open = origOpen;
            proxy.restore();

            SuggestModal.prototype.open = spy;
            SuggestModal.prototype.close = origClose;
            const newProxy = new SuggestModalProxy();
            newProxy.patch();

            const fakeModal = Object.create(SuggestModal.prototype);
            fakeModal.open();

            expect(spy).toHaveBeenCalledTimes(1);
            newProxy.restore();
        });

        it('open captures the modal instance', () => {
            const fakeModal = Object.create(SuggestModal.prototype);
            fakeModal.open();
            expect(proxy.getActiveInstance()).toBe(fakeModal);
        });

        it('open sets suggestModalOpen context key to true', () => {
            const fakeModal = Object.create(SuggestModal.prototype);
            fakeModal.open();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.SUGGEST_MODAL_OPEN,
                true,
            );
        });

        it('close clears the modal instance', () => {
            const fakeModal = Object.create(SuggestModal.prototype);
            fakeModal.open();
            fakeModal.close();
            expect(proxy.getActiveInstance()).toBeNull();
        });

        it('close sets suggestModalOpen context key to false', () => {
            const fakeModal = Object.create(SuggestModal.prototype);
            fakeModal.open();
            vi.clearAllMocks();
            fakeModal.close();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.SUGGEST_MODAL_OPEN,
                false,
            );
        });

        it('open called twice overwrites reference and context stays true', () => {
            const modal1 = Object.create(SuggestModal.prototype);
            const modal2 = Object.create(SuggestModal.prototype);
            modal1.open();
            modal2.open();
            expect(proxy.getActiveInstance()).toBe(modal2);
        });

        it('still updates context when original open throws', () => {
            proxy.restore();
            SuggestModal.prototype.open = () => {
                throw new Error('boom');
            };
            SuggestModal.prototype.close = origClose;
            const throwProxy = new SuggestModalProxy();
            throwProxy.patch();

            const fakeModal = Object.create(SuggestModal.prototype);
            expect(() => fakeModal.open()).toThrow('boom');
            expect(throwProxy.getActiveInstance()).toBe(fakeModal);
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.SUGGEST_MODAL_OPEN,
                true,
            );
            throwProxy.restore();
        });

        it('still clears context when original close throws', () => {
            proxy.restore();
            SuggestModal.prototype.open = origOpen;
            SuggestModal.prototype.close = () => {
                throw new Error('boom');
            };
            const throwProxy = new SuggestModalProxy();
            throwProxy.patch();

            const fakeModal = Object.create(SuggestModal.prototype);
            fakeModal.open();
            vi.clearAllMocks();
            expect(() => fakeModal.close()).toThrow('boom');
            expect(throwProxy.getActiveInstance()).toBeNull();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.SUGGEST_MODAL_OPEN,
                false,
            );
            throwProxy.restore();
        });
    });

    describe('restore', () => {
        it('restores SuggestModal.prototype.open to original', () => {
            proxy.patch();
            proxy.restore();
            expect(SuggestModal.prototype.open).toBe(origOpen);
        });

        it('restores SuggestModal.prototype.close to original', () => {
            proxy.patch();
            proxy.restore();
            expect(SuggestModal.prototype.close).toBe(origClose);
        });

        it('clears active instance', () => {
            proxy.patch();
            const fakeModal = Object.create(SuggestModal.prototype);
            fakeModal.open();
            proxy.restore();
            expect(proxy.getActiveInstance()).toBeNull();
        });

        it('resets suggestModalOpen context key to false', () => {
            proxy.patch();
            const fakeModal = Object.create(SuggestModal.prototype);
            fakeModal.open();
            vi.clearAllMocks();
            proxy.restore();
            expect(contextEngine.setContext).toHaveBeenCalledWith(
                CONTEXT_KEYS.SUGGEST_MODAL_OPEN,
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
            expect(SuggestModal.prototype.open).toBe(origOpen);
            expect(SuggestModal.prototype.close).toBe(origClose);
        });
    });
});
