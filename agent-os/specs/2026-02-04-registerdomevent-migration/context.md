# Architecture Context for registerDomEvent Migration

## Current Architecture

### InputHandler Component

**Responsibility:** Main orchestrator of the hotkey pipeline - captures global keyboard events, normalizes to internal representation, feeds to ChordSequenceBuffer, calls Matcher, executes commands, and decides event propagation.

**Location:** [src/components/InputHandler.ts](src/components/InputHandler.ts)

**Current Dependencies:**
- `CommandRegistry` - Command execution
- `HotkeyContext` - Hotkey matching and chord buffer
- `App` - Obsidian app instance (for ExecutionContext)

**Lifecycle:**
- Created in [main.ts:39-43](src/main.ts#L39-L43) during plugin onload
- Started via `start()` call in [main.ts:44](src/main.ts#L44)
- Stopped via `stop()` call in [main.ts:49](src/main.ts#L49) during plugin onunload

### Plugin Lifecycle Pattern

**Plugin Class:** [src/main.ts](src/main.ts)

```
onload():
  1. Load settings
  2. Create CommandRegistry
  3. Create HotkeyContext (with status bar item)
  4. Create InputHandler
  5. Start InputHandler → registers keydown listener

onunload():
  1. Stop InputHandler → removes keydown listener
  2. Destroy HotkeyContext
```

### Component Pattern

Other components (StatusIndicator, HotkeyContext) use `destroy()` methods for cleanup, but manage DOM elements rather than event listeners. InputHandler is unique in needing DOM event listener registration.

## After Migration

### InputHandler Component

**New Dependencies:**
- `CommandRegistry` - Command execution
- `HotkeyContext` - Hotkey matching and chord buffer
- `Plugin` - Plugin instance (provides app and registerDomEvent)

**Lifecycle:**
- Created in main.ts during plugin onload
- Started via `start()` call (registers via plugin.registerDomEvent)
- No explicit stop needed - automatic cleanup when plugin unloads

### Benefits

1. **Memory leak prevention** - No risk of orphaned event listeners if cleanup fails
2. **Consistent with Obsidian patterns** - Uses framework's lifecycle helpers
3. **Simpler code** - No manual tracking of handler references
4. **Plugin integration** - Event listener lifecycle tied to plugin lifecycle automatically

## Product Context

From [agent-os/product/mission.md](agent-os/product/mission.md):

> **Global hotkey management**: Single interception point that handles keyboard input across all Obsidian contexts (editor, modals, popovers, etc.)

The InputHandler is the critical "single interception point" - proper lifecycle management is essential to ensure:
- No duplicate listeners on plugin reload
- Clean shutdown on plugin unload
- Robust operation across long editing sessions
