import { parser } from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
    {
        ignores: [
            'node_modules/',
            'dist/',
            '.worktrees/',
            'esbuild.config.mjs',
            'eslint.config.js',
            'eslint.config.mts',
            'vitest.config.ts',
            'wdio.conf.mts',
            'version-bump.mjs',
            'versions.json',
            'main.js',
            '**/mocks/',
            '**/*.test.ts',
            'test/e2e/',
        ],
    },
    ...(obsidianmd.configs?.recommended as any),
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser,
            parserOptions: { project: './tsconfig.json' },
            globals: {
                ...globals.browser,
            },
        },

        // You can add your own configuration to override or add rules
        rules: {
            // example: turn off a rule from the recommended set
            'obsidianmd/sample-names': 'off',
            // // example: add a rule not in the recommended set and set its severity
            // "obsidianmd/prefer-file-manager-trash": "error",
        },
    },
    prettierConfig,
]);
