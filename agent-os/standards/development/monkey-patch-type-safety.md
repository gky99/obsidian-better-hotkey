# Monkey-Patch Type Safety

Define extending interfaces before casting prototypes. Never use raw `as any`.

## Pattern

```ts
// GOOD: Define interface first
interface ObsidianScope extends Scope {
    handleKey: KeymapEventListener;
}
const proto = Scope.prototype as ScopePrototype;

// BAD: Raw as any
(Scope.prototype as any).handleKey = ...;
```

- Create a typed interface that documents the private members you need
- Cast the prototype to the extended type, not to `any`
- This preserves IDE autocompletion and catches typos at compile time
