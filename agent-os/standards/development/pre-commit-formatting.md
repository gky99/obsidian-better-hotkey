# Pre-commit Formatting

Prettier auto-formats staged files on every commit via `.githooks/pre-commit`.

- Hook activated by `prepare` script: `git config core.hooksPath .githooks`
- Formats: `*.ts`, `*.js`, `*.json`, `*.css`, `*.md`, `*.mjs`
- Re-stages formatted files automatically
- No manual formatting needed before commit
- CI runs `pnpm run build` (includes tsc) + `pnpm run lint` (ESLint)
