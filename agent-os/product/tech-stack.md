# Tech Stack

## Platform

- **Obsidian Plugin** (client-side TypeScript plugin)
- Target: Obsidian desktop and mobile apps

## Language & Build

- **TypeScript**: Primary development language
- **esbuild**: Fast bundling and compilation
- **pnpm**: Package manager
- **ESLint**: Code linting with Obsidian-specific rules

## Testing

- **Vitest**: Unit test runner with watch mode

## Frontend/Integration

- **Obsidian Plugin API**: Core integration
  - Editor API for text manipulation
  - Workspace API for UI state observation
  - Plugin system for lifecycle and settings
- **Browser APIs**:
  - `navigator.clipboard` for clipboard sync
  - DOM events (keydown) for input capture
  - Class patching for UI component observation (SuggestModal, PopoverSuggest)

## Backend

N/A - Client-side plugin only

## Storage

N/A - In-memory state with JSON-based configuration persistence via Obsidian's plugin data storage. No database required.

## Development Workflow

- **Dev mode**: `pnpm dev`
- **Production build**: `pnpm build`
- **Linting**: `pnpm lint`
- **Testing**: `pnpm test` or `pnpm test:watch`
