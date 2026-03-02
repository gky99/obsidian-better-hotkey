# Private API Type Placement

Helper types for private/undocumented APIs: centralize if shared, keep local if single-use.

- **Shared across files** → define in `src/types.ts`
- **Used in one file only** → define at top of that file

```ts
// Local (single-use): ScopeProxy.ts
interface ObsidianScope extends Scope {
    handleKey: KeymapEventListener;
}

// Shared: src/types.ts
export interface PluginInternals { ... }
```

- For non-standard browser APIs, use two-step assertion:
  `as unknown as Record<string, unknown>` (not raw `as any`)
