# References for registerDomEvent Migration

## Obsidian API Documentation

### Plugin.registerDomEvent

```typescript
registerDomEvent(
  target: Window | Document | HTMLElement,
  event: string,
  callback: Function,
  options?: boolean | AddEventListenerOptions
): EventRef
```

**Purpose:** Register a DOM event listener that will be automatically removed when the plugin unloads.

**Returns:** EventRef - Reference to the registered event, tracked by the plugin for automatic cleanup.

**Usage pattern:**
```typescript
this.registerDomEvent(window, "keydown", (event: KeyboardEvent) => {
  // Handle event
}, true);
```

## Internal References

### AGENTS.md Pattern

[AGENTS.md:175-181](AGENTS.md#L175-L181) - Register listeners safely

```typescript
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

### Current Implementation

[InputHandler.ts:48](src/components/InputHandler.ts#L48) - Current addEventListener usage
```typescript
window.addEventListener("keydown", this.keydownHandler, true);
```

[InputHandler.ts:56](src/components/InputHandler.ts#L56) - Current manual cleanup
```typescript
window.removeEventListener("keydown", this.keydownHandler, true);
```

### Similar Components

[StatusIndicator.ts](src/components/hotkey-context/StatusIndicator.ts) - Component with destroy() method pattern
[HotkeyContext.ts](src/components/hotkey-context/HotkeyContext.ts) - Component with destroy() method pattern

These components use explicit destroy() methods but don't register DOM events. InputHandler will now use Obsidian's automatic cleanup instead of manual stop() method.

## External Resources

- Obsidian Plugin API: https://docs.obsidian.md
- Obsidian Sample Plugin: https://github.com/obsidianmd/obsidian-sample-plugin
