# Standards for String Parser & Config Manager

## architecture/component-folders

ConfigManager at `src/components/` root (global component, not in a subdirectory).

## development/string-constants

`PLUGIN_DATA_PATH` constant in `constants.ts`, SCREAMING_SNAKE_CASE, `as const`.

## testing/file-organization

- Parser tests: `src/utils/__tests__/parseHotkeyString.test.ts`
- ConfigManager tests: `src/components/__tests__/ConfigManager.test.ts`

## testing/test-structure

Nested describe blocks, beforeEach for fresh instances, descriptive test names.
