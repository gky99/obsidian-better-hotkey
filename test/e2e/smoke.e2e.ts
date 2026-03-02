/// <reference types="@wdio/mocha-framework" />
import { browser, expect } from '@wdio/globals';

describe('obsidian-better-hotkey E2E smoke test', function () {
    it('plugin should be loaded', async function () {
        const isLoaded = await browser.executeObsidian(({ plugins }) => {
            return plugins.obsidianBetterHotkey !== undefined;
        });
        expect(isLoaded).toBe(true);
    });

    it('should have plugin commands registered', async function () {
        const commands = await browser.executeObsidian(({ plugins }) => {
            const plugin = plugins.obsidianBetterHotkey as Record<string, any>;
            return plugin.commandRegistry.getAllCommandIds() as string[];
        });
        expect(commands.length).toBeGreaterThan(0);
    });
});
