# ESLint Disable Policy

`eslint-disable` is a **last resort**. Exhaust all type-safe alternatives first.

## Rules

1. Before adding any disable, **ask the user to confirm** it's truly necessary
2. Always use `eslint-disable-next-line`, never file-wide `eslint-disable`
   (exception: when entire file structurally requires it, e.g. StatusIndicator dynamic styles)
3. Every disable MUST have a `--` comment explaining why:
   ```ts
   // eslint-disable-next-line @typescript-eslint/unbound-method -- storing prototype method for monkey-patch
   ```
4. Prefer fixing the root cause over suppressing the lint error

## Alternatives to try first

- Define a typed interface instead of `as any`
- Use discriminated unions to narrow types
- Restructure code to avoid the lint violation
