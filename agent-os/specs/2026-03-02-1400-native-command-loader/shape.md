# Native Obsidian Command Loader — Shaping Notes

## Scope

Load ALL commands from Obsidian's internal `app.commands.commands` registry (native + other plugin commands), wrap them into our plugin's Command interface, and register them in CommandRegistry. This enables any Obsidian command to be rebound through our hotkey system.

## Decisions

- Load all commands (native + other plugins), skip `mobileOnly === true`
- Two callback interfaces: empty input (`callback`/`checkCallback`) and editor input (`editorCallback`/`editorCheckCallback`)
- For editor callbacks, derive editor + context from workspace via `app.workspace.getActiveViewOfType(MarkdownView)` at execution time
- Respect Obsidian's callback priority: `editorCheckCallback` > `editorCallback` > `checkCallback` > `callback`
- Pre-check with `checkCallback(true)` before executing — if unavailable, pass keypress through to Obsidian (not consumed)
- Use Obsidian's public `Command` type (aliased as `ObsidianCommand`) — only define private type for `AppWithCommands` accessor
- New `canExecute?()` optional method on Command interface enables pre-check signaling
- ObsidianCommandLoader is a stateless utility module in `src/components/`
- Custom commands registered first take priority via existing duplicate detection in CommandRegistry

## Context

- **Visuals:** None
- **References:** CommandRegistry (src/components/CommandRegistry.ts), cursor-commands.ts wrapping pattern, WorkspaceContext (src/components/execution-context/WorkspaceContext.ts)
- **Product alignment:** Supports mission of "global hotkey management" — allows rebinding any Obsidian command

## Standards Applied

- development/private-api-types — AppWithCommands interface for app.commands accessor (local to loader file)
- development/string-constants — No new constants needed (command IDs come from Obsidian)
- architecture/component-folders — Loader placed in src/components/ root (stateless utility)
- testing/file-organization — Tests in src/components/__tests__/ObsidianCommandLoader.test.ts
- testing/test-structure — Nested describe blocks, beforeEach isolation
- development/git-worktree-workflow — Worktree created as Task 1
