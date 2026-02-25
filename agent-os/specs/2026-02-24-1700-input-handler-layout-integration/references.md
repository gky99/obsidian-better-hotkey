# References for Input Handler Layout Integration

## Design Documents

### ADR-008 Keyboard Layout Normalization
- **Location:** `.ai/ADR/ADR-008 Keyboard Layout Normalization.md`
- **Relevance:** Defines the layout-aware normalization approach
- **Key patterns:** getBaseCharacter/getCode API, dual matching for digits, QWERTY fallback

### ADR-010 Keyboard Layout Translation Timing
- **Location:** `.ai/ADR/ADR-010 Keyboard Layout Translation Timing.md`
- **Relevance:** Defines when translation happens (not at config load time)
- **Key patterns:** Config stays layout-independent, translation at match time

### ADR-001 Key Representation (updated)
- **Location:** `.ai/ADR/ADR-001 Key Representation.md`
- **Relevance:** Updated from character-based to code-based matching
- **Key patterns:** KeyPress.code for matching, KeyPress.key for display

## Similar Implementations

### Keyboard Layout Service
- **Location:** `src/components/KeyboardLayoutService.ts`
- **Relevance:** The service being integrated — already complete from task 2.7
- **Key patterns:** Singleton, QWERTY fallback, getBaseCharacter/getCode, layout change detection
