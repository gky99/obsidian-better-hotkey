# ADR-003: Clipboard Sync Strategy

**Status:** Accepted

## Context

The kill ring and system clipboard are separate data stores. Users expect killed text to appear in the system clipboard (for pasting outside Obsidian), and also expect that text copied externally can be yanked inside Obsidian. The system needs a sync strategy that matches Emacs behavior without introducing complexity like infinite sync loops.

## Decision

**Always sync on kill (ring → clipboard), detect external copies on yank (clipboard → ring).**

## Options Considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| Ring and clipboard separate | Clean separation | Loses external clipboard content |
| Sync both directions always | Full integration | Complex, potential infinite loops |
| Sync kill→clipboard, detect on yank | Best of both, matches Emacs behavior | Slightly more logic on yank |

## Consequences

**Yank behavior:**

1. Read clipboard
2. If clipboard ≠ ring head → push clipboard to ring (external copy detected)
3. Return ring head
4. Reset pointer to 0

**Yank-pop behavior:**

1. Check `lastActionWasYank && editorFocused`
2. If false → open kill ring browser (fallback UI, P1 feature)
3. If true → advance pointer, return ring at pointer

**Trade-offs:**

- Every kill writes to the system clipboard — expected and desired.
- External copy detection happens lazily at yank time, not via polling — avoids performance overhead.
- The `lastActionWasYank` flag must be reset on any non-yank action (or editor focus loss) to prevent stale yank-pop state.
