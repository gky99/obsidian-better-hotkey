# Standards for Settings Tab

## architecture/component-folders

Settings tab lives at `src/settings.ts` (root level, not in `components/`). This is correct — settings is a top-level concern, not a domain component.

## testing/file-organization

Tests in `src/__tests__/settings.test.ts`. Naming: `ComponentName.test.ts`.

## testing/test-structure

Nested `describe` blocks, `beforeEach` for test isolation, descriptive test names.

## development/string-constants

Command IDs referenced as constants where applicable.

## development/git-worktree-workflow

Worktree isolation before implementation. Branch: `phase-3.5-settings-tab`.

## Obsidian UX guidelines (from AGENTS.md)

- Sentence case for headings, buttons, titles
- Clear, action-oriented descriptions
- Short, consistent, jargon-free in-app strings
