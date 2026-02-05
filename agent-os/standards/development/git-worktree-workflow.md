# Git Worktree Workflow

**ALWAYS use `/using-git-worktrees` skill BEFORE implementing any code changes.**

## Trigger Points

Call `/using-git-worktrees` immediately when:

1. **Shape Spec complete** → Before writing any implementation code
2. **Plan approved** → After `/writing-plans` or `/executing-plans` planning phase ends
3. **Feature work starting** → Before any multi-file changes
4. **Bug fix confirmed** → After investigation, before fixing

## Required Flow

```text
Planning Phase → /using-git-worktrees → Implementation
```

- Plan first, worktree second, implement third
- Never implement in main workspace when worktree is appropriate

## Exceptions (NO worktree needed)

- Single-file trivial changes (typos, config tweaks)
- Documentation-only changes (README, comments)
- Investigation/research (no code changes)

## Plan Integration (MANDATORY)

**Every generated plan or spec MUST include worktree setup as Task 0.**

When `/writing-plans`, `/shape-spec`, or any planning skill generates an implementation plan:

```
Task 0: Call /using-git-worktrees to create isolated workspace
Task 1: [First actual implementation task]
Task 2: ...
```

- Task 0 is non-negotiable for any plan involving code changes
- Skills that generate plans must inject this automatically
- Reviewers should reject plans missing Task 0

## Complete Workflow

```
# 1. Finish planning (shape spec, writing plans, etc.)
# 2. IMMEDIATELY call:
/using-git-worktrees

# 3. Develop in isolated worktree
# 4. Run tests frequently
# 5. Finish with:
/finishing-a-development-branch
```

## Why

- Clean baseline before starting implementation
- Main workspace stays stable
- Forces explicit transition from planning to coding
