# References for Popover Suggest Selector Move

## Similar Implementations

### SuggestModalProxy

- **Location:** `src/components/execution-context/SuggestModalProxy.ts`
- **Relevance:** Already implements `SuggestionSelector` using `instance.chooser.moveUp/Down` — PopoverSuggestProxy mirrors this pattern using `instance.suggestions` instead
- **Key patterns:** `implements SuggestionSelector`, cast to `SuggestModalWithChooser`, `chooser?.moveUp(event)` null-safe call

### SuggestChooser / SuggestModalWithChooser

- **Location:** `src/types.ts`
- **Relevance:** `SuggestChooser` interface (`moveUp/moveDown`) is reused for `PopoverSuggestWithSuggestions.suggestions`
- **Key patterns:** `extends SuggestModal<unknown>` with additional private property typed via dedicated interface

### suggest-commands.ts

- **Location:** `src/commands/suggest-commands.ts`
- **Relevance:** Pattern for creating commands that delegate to a proxy implementing `SuggestionSelector`
- **Key patterns:** `createSuggestCommands()` factory, command calls `context.suggestModalProxy.moveDown(event)`
