import { parser } from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
	{
		ignores: [
			"node_modules/",
			"dist/",
			"esbuild.config.mjs",
			"eslint.config.js",
			"eslint.config.mts",
			"vitest.config.ts",
			"version-bump.mjs",
			"versions.json",
			"main.js",
			"**/mocks/",
			"**/*.test.ts",
		],
	},
	...(obsidianmd.configs?.recommended as any),
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser,
			parserOptions: { project: "./tsconfig.json" },
			globals: {
				...globals.browser,
			},
		},

		// You can add your own configuration to override or add rules
		rules: {
			// example: turn off a rule from the recommended set
			"obsidianmd/sample-names": "off",
			// // example: add a rule not in the recommended set and set its severity
			// "obsidianmd/prefer-file-manager-trash": "error",
		},
	},
]);
