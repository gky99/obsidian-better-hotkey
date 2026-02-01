# References for Phase 1 Core Infrastructure

## Design Documents

### Architecture.md

- **Location:** `c:\Users\gky99\Desktop\test-note\.obsidian\plugins\obsidian-better-hotkey\.ai\Architecture.md`
- **Relevance:** Defines system overview, component responsibilities, and data flows
- **Key sections:**
  - § 2: System Overview - component diagram and grouping (Global, Hotkey Context, Execution Context)
  - § 3: Components - detailed responsibilities for each component
  - § 4: Key Data Flow - hotkey processing pipeline
  - § 6: Key Constraints - character-based matching, 2-keypress limit, "when" clause syntax

**What to borrow:**
- Component interface expectations (method signatures are in code, but responsibilities are here)
- Pipeline flow: keyboard event → normalize → buffer → match → execute
- Context Engine design: global singleton, filter() for "when" clauses
- Priority resolution rules (User > Preset > Plugin)

### Development Plan.md

- **Location:** `c:\Users\gky99\Desktop\test-note\.obsidian\plugins\obsidian-better-hotkey\.ai\Development Plan.md`
- **Relevance:** Breaks down implementation into phases with task dependencies
- **Key sections:**
  - Phase 1: Core Infrastructure - detailed task list for 1.1-1.5
  - Task effort estimates and dependencies
  - Phase 1 deliverable: "Plugin that intercepts key sequences and executes commands (with hardcoded test hotkeys). The lastActionWasYank flag is written to the Hotkey Context Engine after every command execution."

**What to borrow:**
- Task sequencing and dependencies
- Acceptance criteria for Phase 1
- Understanding which features are deferred to later phases

### ADR Documents

**Location:** `c:\Users\gky99\Desktop\test-note\.obsidian\plugins\obsidian-better-hotkey\.ai\ADR\`

| ADR | Decision | Relevance to Phase 1 |
|-----|----------|---------------------|
| ADR-001 Key Representation | Character-based by default | Affects normalize() in InputHandler |
| ADR-002 Configuration Priority | User > Preset > Plugin | Affects HotkeyMatcher priority resolution |
| ADR-003 Clipboard Sync Strategy | Sync kill→clipboard, detect on yank | Affects KillRing implementation (already done) |
| ADR-004 Lifecycle Management | Return Disposable | Plugin API (deferred to Phase 3) |
| ADR-005 Event Interception Strategy | Global keydown via Input Handler | Core to InputHandler.start() |
| ADR-006 Conflict Resolution | Priority stacking with context coexistence | HotkeyMatcher.selectHighestPriority() |
| ADR-007 Context Engine Design | Black-boxed engine with "when" syntax | ContextEngine.filter() integration |

**Key patterns to follow:**
- ADR-005: Use capture phase (true flag) on addEventListener
- ADR-007: Matcher uses ContextEngine.filter() to evaluate "when" clauses
- ADR-002: Priority enum (User=0, Preset=1, Plugin=2) - lower number wins

## Product Context

### mission.md

- **Location:** `agent-os/product/mission.md`
- **Relevance:** Defines the problem and solution space
- **Key points:**
  - Problem: Obsidian lacks unified, global hotkey management with context awareness
  - Solution: Global interception point with VS Code-style "when" clauses
  - Target users: Power users, Emacs fans, plugin developers

**Design implications:**
- Global event listener (not per-context)
- Context-aware filtering (via ContextEngine)
- Extensible API (deferred to Phase 3)

### roadmap.md

- **Location:** `agent-os/product/roadmap.md`
- **Relevance:** Feature prioritization
- **Phase 1 (P0 - MVP):**
  - Key sequences/chords ✅
  - Kill ring ✅
  - Context system (stub for Phase 1) ✅
  - Configuration (hardcoded preset for Phase 1) ⚠️
  - Input Handler ✅
  - Plugin API ❌ (deferred to Phase 3)

**What's in scope for Phase 1:**
- Core pipeline working
- Hardcoded test preset
- Basic kill ring integration

**What's deferred:**
- Plugin context registration (Phase 2)
- Kill ring browser UI (Phase 2)
- Configuration UI (Phase 2)
- Advanced features (Phase 3-4)

### tech-stack.md

- **Location:** `agent-os/product/tech-stack.md`
- **Relevance:** Technology choices
- **Key points:**
  - TypeScript with esbuild
  - Vitest for testing
  - Obsidian Plugin API + Browser APIs (navigator.clipboard, DOM events)
  - pnpm for package management

**Build commands:**
- `pnpm dev` - development mode
- `pnpm build` - production build
- `pnpm test` - run tests
- `pnpm lint` - code linting

## Similar Code in Codebase

**None** - User confirmed no existing references. Building from scratch based on design documents.

## External References

### Obsidian Plugin API

- Used for: Editor API, Workspace API, Plugin lifecycle
- Pattern: Class-based plugins extending `Plugin` from 'obsidian'
- Key methods: `onload()`, `onunload()`, `loadSettings()`, `addStatusBarItem()`

### Browser APIs

- `navigator.clipboard` - for kill ring clipboard sync
- `document.addEventListener('keydown', handler, true)` - global keyboard interception (capture phase)

## Codebase Patterns Established

Based on existing implementations:

### Test Pattern Reference

- **Location:** `src/components/hotkey-context/__tests__/HotkeyManager.test.ts`
- **Relevance:** Established testing pattern for component unit tests
- **Key patterns:** Vitest structure, mocking dependencies, beforeEach isolation

### Testing Pattern

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ComponentName', () => {
  let component: ComponentName;

  beforeEach(() => {
    component = new ComponentName();
  });

  it('does something', () => {
    expect(component.method()).toBe(expected);
  });
});
```

**Test utilities:**
- `vi.fn()` for mocks
- `vi.useFakeTimers()` and `vi.advanceTimersByTime()` for timeout testing
- Helper factories: `key()`, `entry()` for creating test data

### Type Safety

- No `any` types in core logic
- Full TypeScript with strict checking
- Type imports use `import type { ... }`

### Error Handling

```typescript
try {
  // operation
} catch (error) {
  console.error('Component error:', error);
  // cleanup
}
```

### Documentation

- JSDoc comments on all public methods
- Inline comments for complex logic
- Component-level responsibility comments at file top

---

## Implementation Cross-References

When implementing tasks, refer to:

- **Task 2 (Review)** → Architecture.md § 3 for component responsibilities
- **Task 3 (Settings)** → Development Plan.md Phase 1.1 for settings structure
- **Task 4 (Preset)** → Architecture.md § 5 for preset format
- **Task 5 (Commands)** → Architecture.md § 4 for yank tracking flow
- **Task 6 (ContextEngine + Matcher)** → ADR-007 for filter() integration
- **Task 7 (InputHandler)** → Architecture.md § 4 and ADR-005 for pipeline flow
- **Task 8 (main.ts)** → Architecture.md § 4 for initialization order
- **Task 9 (Integration Tests)** → Development Plan.md Phase 1 deliverable for acceptance criteria
