# registerDomEvent Migration — Shaping Notes

## Scope

Update InputHandler to use Obsidian's `registerDomEvent` API instead of manual `addEventListener`/`removeEventListener` for proper lifecycle management and automatic cleanup.

## Decisions

- **Pass Plugin instance to InputHandler** - Chosen over alternatives (registration in main.ts, callback pattern) for better encapsulation and following Obsidian patterns
- **Remove app parameter** - Plugin instance provides `plugin.app`, eliminating redundancy
- **Keep start() method** - Maintain explicit lifecycle control from main.ts
- **Remove stop() method** - Cleanup is automatic via registerDomEvent, method serves no purpose
- **Remove keydownHandler property** - No longer needed without manual cleanup

## Context

- **Visuals:** None required - straightforward API migration
- **References:** AGENTS.md:175-181 documents registerDomEvent pattern, InputHandler.ts current implementation
- **Product alignment:** Global hotkey system requires robust lifecycle management to prevent memory leaks

## Standards Applied

@agent-os/standards/development/git-worktree-workflow.md - Use worktree for this multi-file implementation

Note: No existing standards for event listener registration. This migration establishes the pattern for future development.

## Discovery Process

1. User requested update to use registerDomEvent before Phase II
2. Searched codebase for current addEventListener usage - found only InputHandler.ts
3. Reviewed AGENTS.md for recommended patterns
4. Explored InputHandler, main.ts, and related components
5. Identified design options and consulted user for approach preference
6. User feedback: Remove app parameter (use plugin.app), keep start() method
