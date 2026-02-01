# Phase 1 Core Infrastructure — Shaping Notes

## Scope

Implement all remaining Phase 1 tasks (1.2-1.5) for the Obsidian Better Hotkey plugin:

- **Phase 1.2**: Hotkey Context Components (ChordSequenceBuffer, HotkeyManager, HotkeyMatcher, StatusIndicator)
- **Phase 1.3**: Hotkey Context Engine (Stub implementation)
- **Phase 1.4**: Command Registry
- **Phase 1.5**: Input Handler (main orchestrator)

**Key Discovery:** Exploration revealed that most components (1.2-1.4) are already fully implemented with comprehensive tests. The main work is:
- Review existing implementations against design documents
- Complete InputHandler pipeline orchestration
- Wire all components together in main.ts
- Create test commands and default preset

## Decisions

### Approach: Review + Integrate (Not Full Reimplementation)

User confirmed preference to **review existing implementations and then integrate**, rather than starting from scratch or focusing only on integration.

**Rationale:**
- Existing implementations appear solid with good test coverage
- Reviewing ensures alignment with design documents before integration
- Safer approach - validates before committing to integration

### Integration Strategy: Singleton + Simplified Wiring

**ContextEngine as Singleton:**
- ContextEngine exported as singleton from ContextEngine.ts
- Components import it directly when needed (no constructor injection)
- Aligns with Architecture.md: "global singleton initialized at plugin load, accessible to all components"

**Simplified Component Wiring:**
- InputHandler receives main orchestration dependencies (ChordBuffer, Matcher, CommandRegistry, StatusIndicator)
- Lower-level components (ChordSequenceBuffer, StatusIndicator) don't need DI - passed from main.ts
- Components remain loosely coupled and testable

### Test Commands for Phase 1

Create minimal test commands to validate the pipeline:
- `test:chord-x` - Single chord (C-x)
- `test:save` - Two-key sequence (C-x C-s)
- `editor:delete-word` - Kill command (M-d)
- `editor:yank` - Yank command (C-y)

All commands MUST update `lastActionWasYank` flag in ContextEngine.

### Event Propagation Logic

Based on match result:
- **Exact match** → preventDefault + stopPropagation + execute command
- **Prefix match** → preventDefault + stopPropagation + show pending + wait for next key
- **No match with chord** → preventDefault + stopPropagation (consumed)
- **No match without chord** → pass through (normal typing)

### "Pending" State Logic (Clarified 2026-02-02)

**Key Understanding:**
- Single-key hotkeys (like M-d for delete-word) can exist as complete commands
- We only know if we're "pending" (waiting for more keys) AFTER the matcher returns the result
- When `matchResult.type === 'prefix'`, we know this input is part of a pending chord sequence
- The "pending" state is determined by the matcher result, NOT by sequence length

**Implementation:**
- Do NOT show pending status based on sequence length (before matching)
- Only show pending status when `matchResult.type === 'prefix'`
- Single-key hotkeys execute immediately without showing pending status

**Example Flow:**
1. User presses M-d (single-key hotkey)
   - Buffer: [M-d]
   - Matcher: Returns `{ type: 'exact', entry: ... }` (delete-word command)
   - Status: No pending shown, command executes immediately

2. User presses C-x (prefix of C-x C-s)
   - Buffer: [C-x]
   - Matcher: Returns `{ type: 'prefix' }` (C-x C-s exists)
   - Status: "C-x" shown as pending, waiting for next key

3. User presses C-s
   - Buffer: [C-x, C-s]
   - Matcher: Returns `{ type: 'exact', entry: ... }` (save command)
   - Status: Pending cleared, command executes

### Stub Implementation for Context Engine

Phase 1 uses stub `evaluate()` that always returns `true`. Real implementation deferred to Phase 3.1. All stubs must be explicitly documented with inline comments and TODOs.

## Context

### Visuals
None needed - this is backend infrastructure work.

### References

**Design Documents:**
- `c:\Users\gky99\Desktop\test-note\.obsidian\plugins\obsidian-better-hotkey\.ai\Architecture.md` - System architecture and component responsibilities
- `c:\Users\gky99\Desktop\test-note\.obsidian\plugins\obsidian-better-hotkey\.ai\Development Plan.md` - Phase breakdown and task dependencies
- ADR documents in `.ai/ADR/` - Architectural decision records

**Product Context:**
- `agent-os/product/mission.md` - Product mission and target users
- `agent-os/product/roadmap.md` - Feature prioritization (P0/P1/P2/P3)
- `agent-os/product/tech-stack.md` - Technology choices and build configuration

### Product Alignment

Phase 1 implements P0 (MVP) features from the roadmap:
- ✅ Key sequences/chords - ChordSequenceBuffer manages up to 2 keypresses
- ✅ Kill ring - Integration with KillRing and WorkspaceContext
- ✅ Context system - Hotkey Context Engine (stub for Phase 1, real in Phase 3)
- ✅ Input Handler - Global keydown orchestrator
- 🔄 Configuration - Hardcoded preset for Phase 1, full system in Phase 2
- 🔄 Plugin API - Deferred to Phase 3

## Constraints

- **Character-based matching** by default (ADR-001) - physical scan-code matching deferred to P2
- **At most 2 keypresses** in chord sequences
- **Stub context evaluation** - "when" clause always returns true in Phase 1
- **Global singleton ContextEngine** - accessible to all components
- **In-memory kill ring** - no persistence across sessions
- **No preset loading from files** - hardcoded default preset only for Phase 1

## Implementation Notes

### Component State

**Already Implemented (with tests):**
- ChordSequenceBuffer - 11 tests covering append, clear, timeout
- HotkeyMatcher - 8 tests covering matching, priority, prefixes
- HotkeyManager - 8 tests covering CRUD operations
- StatusIndicator - DOM manipulation for status bar
- CommandRegistry - command storage and execution
- ContextEngine - state tracking, stub evaluate()
- KillRing - text buffer with clipboard sync
- WorkspaceContext - editor operations

**Needs Integration:**
- InputHandler - has start/stop and normalize(), but onKeyDown just logs
- main.ts - minimal scaffold, needs full component wiring

### Dependencies & Sequencing

Components are self-contained and well-tested individually. Main work is orchestration:

1. Settings update (add chordTimeout, killRingMaxSize, selectedPreset)
2. Create default preset with test hotkeys
3. Create test command implementations
4. Update HotkeyMatcher to use ContextEngine.filter()
5. Complete InputHandler pipeline
6. Wire all components in main.ts
7. Integration tests

## Risks & Mitigation

### Risk: Existing implementations don't match design docs
**Mitigation:** Task 2 explicitly reviews components against design. If discrepancies found, ask user which version is correct before proceeding.

### Risk: Event propagation issues with Obsidian UI
**Mitigation:** Use capture phase (true flag on addEventListener) as already implemented. Extensive manual testing across different UI states.

### Risk: TypeScript compilation errors during integration
**Mitigation:** Run `pnpm build` after each task. Use incremental approach.

### Risk: Circular dependencies between components
**Mitigation:** Follow dependency injection pattern. Components don't import each other.

## Test Coverage Extension (2026-02-01)

Adding comprehensive unit test coverage for:
- **KillRing** - 21 unit tests covering all public methods
- **ContextEngine** - 22 unit tests covering stub implementation

**Rationale:** Both components are implemented and integrated but lack test coverage. Tests will follow existing patterns (HotkeyManager.test.ts) and project standards.

## ExecutionContext and HotkeyContext Addition (2026-02-02)

### Scope Extension

Adding wrapper classes to organize components by domain:

**ExecutionContext:**
- Wrapper exposing execution-related components (KillRing, WorkspaceContext) as properties
- Created by InputHandler, passed to commands via CommandRegistry
- Replaces `Record<string, unknown>` context parameter in Command.execute()

**HotkeyContext:**
- Wrapper for all hotkey processing components (HotkeyManager, HotkeyMatcher, ChordSequenceBuffer, StatusIndicator)
- Handles preset loading and hotkey registration
- Created in main.ts, passed to InputHandler
- Owns component lifecycle and wiring

### Decisions

**Wrapper Pattern:**
- ExecutionContext exposes component instances as public properties (e.g., `context.killRing.push()`)
- HotkeyContext wraps all hotkey components AND handles preset loading/registration
- Both are instance-based (not singletons) for better testability

**Wiring:**
- main.ts creates HotkeyContext → passes to InputHandler
- InputHandler creates ExecutionContext (receives App instance)
- HotkeyContext handles all internal component wiring in constructor

**Preset Loading:**
- HotkeyContext.loadPreset() loads TypeScript HotkeyPreset object in Phase 1
- Future: JSON string parsing (Phase 2) - documented with TODO comment
- Preset loading happens in HotkeyContext constructor

**KillRing Singleton Removal:**
- Remove `export const killRing = new KillRing()` singleton
- KillRing instantiated by ExecutionContext with configured maxSize
- Eliminates hidden global state

### Impact

**Breaking Changes:**
- Command.execute() signature changes from `context?: Record<string, unknown>` to `context?: ExecutionContext`
- KillRing singleton removed - all components now use ExecutionContext instance
- Acceptable for Phase 1 (no external users yet)

**Files Modified:**
- 2 new files: ExecutionContext.ts, HotkeyContext.ts
- 7 existing files updated: types.ts, main.ts, InputHandler.ts, CommandRegistry.ts, test-commands.ts, KillRing.ts, index.ts

## Success Metrics

**Technical:**
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] No TypeScript errors
- [ ] lastActionWasYank flag updated after every command
- [ ] ExecutionContext properly exposes killRing and workspaceContext
- [ ] HotkeyContext wraps all hotkey components
- [ ] Preset hotkeys registered in HotkeyManager
- [ ] Component wiring works correctly

**Functional:**
- [ ] C-x shows in status bar, waits for next key
- [ ] C-x C-s executes command
- [ ] Escape clears pending chord
- [ ] M-d kills word, adds to kill ring
- [ ] C-y yanks from kill ring
- [ ] Normal typing passes through
- [ ] Commands receive ExecutionContext with valid components
