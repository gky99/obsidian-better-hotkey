import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScopeProxy } from '../ScopeProxy';
import { Scope } from 'obsidian';

// Mock obsidian — Scope needs handleKey on its prototype
const mockOriginalHandleKey = vi.fn();

vi.mock('obsidian', () => {
    const MockScope = class MockScope {
        constructor(parent?: any) {}
        register() {
            return {};
        }
        unregister() {}
    };
    return {
        Scope: MockScope,
        MarkdownView: vi.fn(),
        App: vi.fn(),
        Plugin: vi.fn(),
    };
});

describe('ScopeProxy', () => {
    let scopeProxy: ScopeProxy;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset handleKey to a fresh mock before each test
        (Scope.prototype as any).handleKey = mockOriginalHandleKey;
        scopeProxy = new ScopeProxy();
    });

    describe('patch', () => {
        it('replaces Scope.prototype.handleKey', () => {
            scopeProxy.patch(() => undefined);

            expect((Scope.prototype as any).handleKey).not.toBe(
                mockOriginalHandleKey,
            );
        });

        it('calls callback with the scope instance and event', () => {
            const callback = vi.fn().mockReturnValue(undefined);
            scopeProxy.patch(callback);

            const scopeInstance = { iAmAScope: true };
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            const patchedFn = (Scope.prototype as any).handleKey;
            patchedFn.call(scopeInstance, event, {});

            expect(callback).toHaveBeenCalledWith(scopeInstance, event);
        });

        it('calls original handleKey when callback returns undefined', () => {
            const callback = vi.fn().mockReturnValue(undefined);
            scopeProxy.patch(callback);

            const scopeInstance = {};
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            const info = { someInfo: true };
            const patchedFn = (Scope.prototype as any).handleKey;
            patchedFn.call(scopeInstance, event, info);

            expect(mockOriginalHandleKey).toHaveBeenCalled();
            // Verify original was called with correct this and args
            expect(mockOriginalHandleKey.mock.instances[0]).toBe(scopeInstance);
        });

        it('does NOT call original handleKey when callback returns false', () => {
            const callback = vi.fn().mockReturnValue(false);
            scopeProxy.patch(callback);

            const scopeInstance = {};
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
            });
            const patchedFn = (Scope.prototype as any).handleKey;
            const result = patchedFn.call(scopeInstance, event, {});

            expect(result).toBe(false);
            expect(mockOriginalHandleKey).not.toHaveBeenCalled();
        });

        it('returns false when callback returns false', () => {
            const callback = vi.fn().mockReturnValue(false);
            scopeProxy.patch(callback);

            const patchedFn = (Scope.prototype as any).handleKey;
            const result = patchedFn.call(
                {},
                new KeyboardEvent('keydown', { key: 'a' }),
                {},
            );

            expect(result).toBe(false);
        });

        it('returns original handleKey result when callback returns undefined', () => {
            mockOriginalHandleKey.mockReturnValue('original-result');
            const callback = vi.fn().mockReturnValue(undefined);
            scopeProxy.patch(callback);

            const patchedFn = (Scope.prototype as any).handleKey;
            const result = patchedFn.call(
                {},
                new KeyboardEvent('keydown', { key: 'a' }),
                {},
            );

            expect(result).toBe('original-result');
        });
    });

    describe('restore', () => {
        it('restores original Scope.prototype.handleKey', () => {
            scopeProxy.patch(() => undefined);
            expect((Scope.prototype as any).handleKey).not.toBe(
                mockOriginalHandleKey,
            );

            scopeProxy.restore();
            expect((Scope.prototype as any).handleKey).toBe(
                mockOriginalHandleKey,
            );
        });

        it('is idempotent — second call does nothing', () => {
            scopeProxy.patch(() => undefined);
            scopeProxy.restore();

            // Set a new function to verify restore doesn't overwrite it
            const newFn = vi.fn();
            (Scope.prototype as any).handleKey = newFn;

            scopeProxy.restore();
            expect((Scope.prototype as any).handleKey).toBe(newFn);
        });

        it('does not throw when called without prior patch', () => {
            expect(() => scopeProxy.restore()).not.toThrow();
        });
    });
});
