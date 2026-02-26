# References for Context Key Expression System

## Similar Implementations

### VSCode Context Key Expression System

- **Location:** `src/vs/platform/contextkey/common/contextkey.ts`
- **Relevance:** The primary reference for expression type hierarchy and evaluation pattern
- **Key patterns:**
    - Discriminated union of expression types (Defined, Not, Equals, NotEquals, And, Or)
    - Each expression has `evaluate(context: IContext): boolean`
    - `IContext` interface with `getValue(key: string): T | undefined`
    - Static `deserialize()` for parsing string → expression
    - No numeric specificity scoring — uses declaration order + logical implication

### VSCode Keybinding Resolver

- **Location:** `src/vs/platform/keybinding/common/keybindingResolver.ts`
- **Relevance:** Shows how expressions integrate with keybinding resolution
- **Key patterns:**
    - `whenIsEntirelyIncluded()` for logical subsumption checking
    - Reverse iteration for last-declared-wins semantics
    - `contextMatchesRules()` for runtime evaluation

### Existing parseHotkeyString Parser

- **Location:** `src/utils/hotkey.ts`
- **Relevance:** Parsing pattern already used in this codebase
- **Key patterns:**
    - Step-by-step tokenization approach
    - Proper error handling with descriptive messages
    - Returns structured data from string input
