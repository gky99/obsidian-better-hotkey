# Proxy Lifecycle Pattern

All proxies follow: store originals → guard → patch → restore.

## Structure

```ts
class FooProxy {
    private origMethod: () => void;
    private patched = false;

    constructor() {
        // Store original in constructor
        this.origMethod = Foo.prototype.method;
    }

    patch(): void {
        if (this.patched) return;  // Guard against double-patch
        this.patched = true;
        const self = this;  // Closure for proxy reference

        Foo.prototype.method = function () {
            try {
                self.origMethod.call(this);
            } finally {
                // State updates in finally block
            }
        };
    }

    restore(): void {
        if (!this.patched) return;
        Foo.prototype.method = this.origMethod;
        this.patched = false;
    }
}
```

## Rules

- `patched` flag prevents double-patching
- `const self = this` for proxy reference inside replacement function
- `try/finally` ensures state updates even if original throws
- `restore()` must fully revert to original state
