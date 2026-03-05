# Standards for Popover Suggest Selector Move

## type-safe-private-apis

Accessing `instance.suggestions` on `PopoverSuggest` requires a typed interface rather than `as any` casts.

Pattern used:
```typescript
export interface PopoverSuggestWithSuggestions extends PopoverSuggest<unknown> {
    suggestions: SuggestChooser;
}

// Usage:
const s = (this.activeInstance as unknown as PopoverSuggestWithSuggestions).suggestions;
s?.moveUp(event);
```

This mirrors `SuggestModalWithChooser` in `types.ts`.
