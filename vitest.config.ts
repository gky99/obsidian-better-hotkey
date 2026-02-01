import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		environment: "jsdom",
		include: ["src/**/__tests__/*.test.ts"],
		coverage: {
			reporter: ["text", "html"],
		},
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, "./tests/mocks/obsidian.ts"),
		},
	},
});
