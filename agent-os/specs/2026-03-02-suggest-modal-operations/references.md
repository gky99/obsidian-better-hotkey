# References for Suggest Modal Operations

## Similar Implementations

### Demo Test Commands

- **Location:** `src/commands/control-commands.ts` (lines 16-39, uncommitted on phase-3)
- **Relevance:** Shows the pattern for accessing `chooser.moveUp()`/`moveDown()` and `instance.inputEl`
- **Key patterns:**
  - Get active instance: `context.suggestModalProxy.getActiveInstance()`
  - Access chooser: `instance.chooser as any` (to be replaced with typed `SuggestModalWithChooser`)
  - Pass keyboard event to chooser methods

### SuggestModalProxy

- **Location:** `src/components/execution-context/SuggestModalProxy.ts`
- **Relevance:** The class we're extending to implement both interfaces
- **Key patterns:**
  - Proxy lifecycle (patch/restore)
  - Active instance tracking
  - Context key management

### Existing Command Factories

- **Location:** `src/commands/cursor-commands.ts`, `kill-yank-commands.ts`, `editing-commands.ts`, `control-commands.ts`
- **Relevance:** Pattern for `createXCommands()` factories returning `Command[]`
- **Key patterns:**
  - Factory function returning array of command objects
  - Consistent use of constants for command IDs
  - Context null-checking in execute methods
