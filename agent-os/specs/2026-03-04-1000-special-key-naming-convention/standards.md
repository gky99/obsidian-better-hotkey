# Standards for Special Key Naming Convention

## development/string-constants

Define reusable strings as exported constants. Use SCREAMING_SNAKE_CASE or group in objects/sets with `as const`. Exceptions: one-off UI strings, test data, local scope strings.

**Applied here**: Special key tokens are exported as `SPECIAL_KEYS` (Set) and `SPECIAL_KEY_TRANSLATIONS` (const object) so all callers reference the same canonical source.
