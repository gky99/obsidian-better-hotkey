# References for SuggestProxy

## Similar Implementations

### obsidian-quick-select plugin

- **Location:** `/Users/gky/Documents/obsidian-test-playground/.obsidian/plugins/obsidian-quick-select/src/main.ts`
- **Relevance:** Patches exactly the same Obsidian APIs (`SuggestModal.prototype.open/close`, `PopoverSuggest.prototype.open/close`)
- **Key patterns:**
  - Save originals as class properties at field initialization time
  - `const self = this` closure pattern for accessing plugin instance inside patched methods
  - `.apply(this, args)` to delegate to original with correct binding
  - Restore originals in `onunload()` by reassigning prototype methods
  - Error handling with try/catch around patched logic
