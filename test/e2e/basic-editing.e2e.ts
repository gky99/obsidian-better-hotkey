/// <reference types="@wdio/mocha-framework" />
import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

/**
 * Helper: execute a plugin command via the internal CommandRegistry.
 * The plugin does NOT register commands with Obsidian's addCommand(),
 * so we access the plugin instance directly and call through its registry
 * with the InputHandler's execution context.
 */
async function executePluginCommand(commandId: string): Promise<boolean> {
    return browser.executeObsidian(
        ({ plugins }, [cmd]) => {
            const plugin = plugins.obsidianBetterHotkey as Record<string, any>;
            const ctx = plugin.inputHandler.executionContext;
            return plugin.commandRegistry.execute(
                cmd,
                ctx,
                new KeyboardEvent('keydown'),
            ) as boolean;
        },
        [commandId],
    );
}

describe('cursor movement and basic editing', function () {
    const testFile = 'E2E-Test-Scratch.md';
    const testContent = 'Hello World\nSecond line\nThird line';

    beforeEach(async function () {
        // Ensure clean state: create test document and open it
        await browser.executeObsidian(
            async ({ app }, [file, content]) => {
                const existing = app.vault.getAbstractFileByPath(file);
                if (existing) await app.vault.delete(existing);
                await app.vault.create(file, content);
            },
            [testFile, testContent],
        );

        await browser.executeObsidian(
            async ({ app }, [file]) => {
                const tfile = app.vault.getAbstractFileByPath(file);
                if (tfile) await app.workspace.openLinkText(file, '', false);
            },
            [testFile],
        );
    });

    afterEach(async function () {
        await obsidianPage.resetVault();
    });

    it('forward-char moves cursor right', async function () {
        // Place cursor at start of document
        await browser.executeObsidian(({ app }) => {
            const editor = app.workspace.activeEditor?.editor;
            if (editor) editor.setCursor({ line: 0, ch: 0 });
        });

        await executePluginCommand('editor:forward-char');

        const pos = await browser.executeObsidian(({ app }) => {
            const editor = app.workspace.activeEditor?.editor;
            return editor?.getCursor();
        });
        expect(pos?.ch).toBeGreaterThan(0);
    });

    it('kill-line removes text to end of line', async function () {
        // Place cursor at beginning of first line
        await browser.executeObsidian(({ app }) => {
            const editor = app.workspace.activeEditor?.editor;
            if (editor) editor.setCursor({ line: 0, ch: 0 });
        });

        await executePluginCommand('editor:kill-line');

        // Read from editor buffer (not vault file, which may not have flushed)
        const content = await browser.executeObsidian(({ app }) => {
            const editor = app.workspace.activeEditor?.editor;
            return editor?.getValue() ?? '';
        });
        // First line text should be killed, remaining lines intact
        expect(content).toContain('Second line');
    });

    it('delete-char removes character at cursor', async function () {
        // Place cursor at beginning of first line
        await browser.executeObsidian(({ app }) => {
            const editor = app.workspace.activeEditor?.editor;
            if (editor) editor.setCursor({ line: 0, ch: 0 });
        });

        await executePluginCommand('editor:delete-char');

        // Read from editor buffer (not vault file, which may not have flushed)
        const content = await browser.executeObsidian(({ app }) => {
            const editor = app.workspace.activeEditor?.editor;
            return editor?.getValue() ?? '';
        });
        // 'H' should be deleted from 'Hello World'
        expect(content.startsWith('ello World')).toBe(true);
    });
});
