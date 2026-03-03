import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { BetterHotkeySettingTab, DEFAULT_SETTINGS } from '../settings';
import type { MyPluginSettings } from '../settings';
import type { ConfigHotkeyEntry, Command } from '../types';
import { Priority } from '../types';
import { CONTEXT_KEY_TRUE } from '../components/context-key-expression';

// Polyfill Obsidian's createEl/createDiv on HTMLElement for jsdom
beforeAll(() => {
    if (!HTMLElement.prototype.createEl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (HTMLElement.prototype as any).createEl = function (
            this: HTMLElement,
            tag: string,
            opts?: { text?: string; cls?: string },
        ): HTMLElement {
            const el = document.createElement(tag);
            if (opts?.text) el.textContent = opts.text;
            if (opts?.cls) el.className = opts.cls;
            this.appendChild(el);
            return el;
        };
    }
    if (!HTMLElement.prototype.createDiv) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (HTMLElement.prototype as any).createDiv = function (
            this: HTMLElement,
            opts?: { text?: string; cls?: string },
        ): HTMLDivElement {
            const el = document.createElement('div');
            if (opts?.text) el.textContent = opts.text;
            if (opts?.cls) el.className = opts.cls;
            this.appendChild(el);
            return el;
        };
    }
    if (!HTMLElement.prototype.empty) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (HTMLElement.prototype as any).empty = function (
            this: HTMLElement,
        ): void {
            this.innerHTML = '';
        };
    }
    if (!HTMLElement.prototype.addClass) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (HTMLElement.prototype as any).addClass = function (
            this: HTMLElement,
            cls: string,
        ): void {
            this.classList.add(cls);
        };
    }
});

// --- Test Helpers ---

function makeConfigEntry(
    overrides: Partial<ConfigHotkeyEntry> & { command: string },
): ConfigHotkeyEntry {
    return {
        key: [
            {
                modifiers: new Set(['ctrl']),
                key: 'k',
                code: 'KeyK',
            },
        ],
        priority: Priority.Preset,
        removal: false,
        hotkeyString: 'ctrl+k',
        when: undefined,
        whenExpr: CONTEXT_KEY_TRUE,
        args: undefined,
        ...overrides,
    };
}

function makeCommand(id: string, name?: string): Command {
    return {
        id,
        name: name ?? id,
        execute: vi.fn(),
    };
}

interface MockPluginOptions {
    settings?: MyPluginSettings;
    presetEntries?: ConfigHotkeyEntry[];
    pluginEntriesWithNames?: {
        pluginName: string;
        entries: ConfigHotkeyEntry[];
    }[];
    userEntries?: ConfigHotkeyEntry[];
    commands?: Command[];
    hasInternals?: boolean;
}

function createMockPlugin(
    options: MockPluginOptions = {},
): Record<string, unknown> {
    const {
        settings = { ...DEFAULT_SETTINGS },
        presetEntries = [],
        pluginEntriesWithNames = [],
        userEntries = [],
        commands = [],
        hasInternals = true,
    } = options;

    const mockConfigManager = hasInternals
        ? {
              getPresetEntries: vi.fn(() => presetEntries),
              getPluginEntriesWithNames: vi.fn(() => pluginEntriesWithNames),
              getUserEntries: vi.fn(() => userEntries),
              getAvailablePresets: vi.fn(() => [
                  {
                      name: 'emacs',
                      description: 'Standard Emacs keybindings',
                  },
              ]),
              loadAll: vi.fn(),
          }
        : undefined;

    const mockCommandRegistry = hasInternals
        ? {
              getAllCommands: vi.fn(() => commands),
              getAllCommandIds: vi.fn(() => commands.map((c) => c.id)),
          }
        : undefined;

    const mockHotkeyContext = hasInternals
        ? {
              hotkeyManager: { getAll: vi.fn(() => []) },
              setChordTimeout: vi.fn(),
          }
        : undefined;

    return {
        settings,
        saveSettings: vi.fn(),
        updateStatusIndicatorVisibility: vi.fn(),
        configManager: mockConfigManager,
        commandRegistry: mockCommandRegistry,
        hotkeyContext: mockHotkeyContext,
        app: {},
    };
}

// --- Tests ---

describe('BetterHotkeySettingTab', () => {
    let tab: BetterHotkeySettingTab;
    let mockPlugin: ReturnType<typeof createMockPlugin>;

    beforeEach(() => {
        mockPlugin = createMockPlugin({
            commands: [
                makeCommand('kill-line'),
                makeCommand('forward-char'),
                makeCommand('backward-char'),
            ],
            presetEntries: [
                makeConfigEntry({
                    command: 'kill-line',
                    hotkeyString: 'ctrl+k',
                }),
                makeConfigEntry({
                    command: 'forward-char',
                    hotkeyString: 'ctrl+f',
                    key: [
                        {
                            modifiers: new Set(['ctrl']),
                            key: 'f',
                            code: 'KeyF',
                        },
                    ],
                }),
                makeConfigEntry({
                    command: 'backward-char',
                    hotkeyString: 'ctrl+b',
                    key: [
                        {
                            modifiers: new Set(['ctrl']),
                            key: 'b',
                            code: 'KeyB',
                        },
                    ],
                }),
            ],
        });

        tab = new BetterHotkeySettingTab({} as never, mockPlugin as never);
    });

    describe('display', () => {
        describe('general section', () => {
            it('renders chord timeout setting', () => {
                tab.display();
                const settings = tab.containerEl.querySelectorAll(
                    '[data-name="Chord timeout"]',
                );
                expect(settings.length).toBe(1);
            });

            it('renders kill ring max size setting', () => {
                tab.display();
                const settings = tab.containerEl.querySelectorAll(
                    '[data-name="Kill ring max size"]',
                );
                expect(settings.length).toBe(1);
            });

            it('renders status indicator toggle', () => {
                tab.display();
                const settings = tab.containerEl.querySelectorAll(
                    '[data-name="Show status indicator"]',
                );
                expect(settings.length).toBe(1);
            });
        });

        describe('hotkey bindings section', () => {
            it('renders section heading', () => {
                tab.display();
                const headings =
                    tab.containerEl.querySelectorAll('.setting-heading');
                const names = Array.from(headings).map(
                    (el) => (el as HTMLElement).dataset.name,
                );
                expect(names).toContain('Hotkey bindings');
            });

            it('shows empty message when internals are not available', () => {
                const noInternalsPlugin = createMockPlugin({
                    hasInternals: false,
                });
                const noInternalsTab = new BetterHotkeySettingTab(
                    {} as never,
                    noInternalsPlugin as never,
                );
                noInternalsTab.display();
                const emptyMsg = noInternalsTab.containerEl.querySelector(
                    '.bhk-hotkey-list-empty',
                );
                expect(emptyMsg).not.toBeNull();
                expect(emptyMsg?.textContent).toContain(
                    'Hotkey data not available',
                );
            });

            it('shows empty state when no commands registered', () => {
                const emptyPlugin = createMockPlugin({
                    commands: [],
                    presetEntries: [],
                });
                const emptyTab = new BetterHotkeySettingTab(
                    {} as never,
                    emptyPlugin as never,
                );
                emptyTab.display();
                const emptyMsg = emptyTab.containerEl.querySelector(
                    '.bhk-hotkey-list-empty',
                );
                expect(emptyMsg).not.toBeNull();
                expect(emptyMsg?.textContent).toContain(
                    'No commands registered',
                );
            });

            it('renders table with correct column headers', () => {
                tab.display();
                const headers = tab.containerEl.querySelectorAll(
                    '.bhk-hotkey-table th',
                );
                const headerTexts = Array.from(headers).map((h) =>
                    h.textContent?.replace(/[▲▼ ]/g, ''),
                );
                expect(headerTexts).toEqual([
                    'Command',
                    'Binding',
                    'When',
                    'Source',
                ]);
            });

            it('renders a row for each command with binding', () => {
                tab.display();
                const rows = tab.containerEl.querySelectorAll(
                    '.bhk-hotkey-table tbody tr',
                );
                expect(rows.length).toBe(3);
            });

            it('renders row with empty binding for command without binding', () => {
                const pluginWithUnbound = createMockPlugin({
                    commands: [
                        makeCommand('kill-line'),
                        makeCommand('set-mark'),
                    ],
                    presetEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                        }),
                    ],
                });
                const unboundTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginWithUnbound as never,
                );
                unboundTab.display();

                const rows = unboundTab.containerEl.querySelectorAll(
                    '.bhk-hotkey-table tbody tr',
                );
                expect(rows.length).toBe(2);

                // set-mark should have an em dash for binding
                const emptyBindings =
                    unboundTab.containerEl.querySelectorAll(
                        '.bhk-hotkey-empty',
                    );
                expect(emptyBindings.length).toBeGreaterThan(0);
            });

            it('shows hotkeyString in config format', () => {
                tab.display();
                const kbds = tab.containerEl.querySelectorAll('.bhk-kbd');
                const texts = Array.from(kbds).map((k) => k.textContent);
                expect(texts).toContain('ctrl+k');
                expect(texts).toContain('ctrl+f');
                expect(texts).toContain('ctrl+b');
            });

            it('shows source as Preset for preset entries', () => {
                tab.display();
                const badges =
                    tab.containerEl.querySelectorAll('.bhk-source-preset');
                expect(badges.length).toBe(3);
                expect(badges[0]?.textContent).toBe('Preset');
            });

            it('shows source as User for user entries', () => {
                const pluginWithUser = createMockPlugin({
                    commands: [makeCommand('kill-line')],
                    presetEntries: [],
                    userEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                            priority: Priority.User,
                        }),
                    ],
                });
                const userTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginWithUser as never,
                );
                userTab.display();

                const badges =
                    userTab.containerEl.querySelectorAll('.bhk-source-user');
                expect(badges.length).toBe(1);
                expect(badges[0]?.textContent).toBe('User');
            });

            it('shows plugin name for plugin entries', () => {
                const pluginWithExt = createMockPlugin({
                    commands: [makeCommand('ext-cmd')],
                    presetEntries: [],
                    pluginEntriesWithNames: [
                        {
                            pluginName: 'MyExtPlugin',
                            entries: [
                                makeConfigEntry({
                                    command: 'ext-cmd',
                                    hotkeyString: 'ctrl+shift+e',
                                    priority: Priority.Plugin,
                                }),
                            ],
                        },
                    ],
                });
                const extTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginWithExt as never,
                );
                extTab.display();

                const badges =
                    extTab.containerEl.querySelectorAll('.bhk-source-plugin');
                expect(badges.length).toBe(1);
                expect(badges[0]?.textContent).toBe('MyExtPlugin');
            });

            it('handles user removal: removed binding shows empty + User source', () => {
                const pluginWithRemoval = createMockPlugin({
                    commands: [makeCommand('kill-line')],
                    presetEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                        }),
                    ],
                    userEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                            removal: true,
                            priority: Priority.User,
                        }),
                    ],
                });
                const removalTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginWithRemoval as never,
                );
                removalTab.display();

                const rows = removalTab.containerEl.querySelectorAll(
                    '.bhk-hotkey-table tbody tr',
                );
                expect(rows.length).toBe(1);

                // Should show User source
                const userBadge = rows[0]?.querySelector('.bhk-source-user');
                expect(userBadge).not.toBeNull();
                expect(userBadge?.textContent).toBe('User');

                // Should have empty binding (em dash)
                const emptyBinding =
                    rows[0]?.querySelector('.bhk-hotkey-empty');
                expect(emptyBinding).not.toBeNull();
            });

            it('handles user removal: if another binding exists, shows that one', () => {
                const pluginWithPartialRemoval = createMockPlugin({
                    commands: [makeCommand('kill-line')],
                    presetEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                        }),
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+shift+k',
                        }),
                    ],
                    userEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                            removal: true,
                            priority: Priority.User,
                        }),
                    ],
                });
                const partialTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginWithPartialRemoval as never,
                );
                partialTab.display();

                // Should show the remaining binding
                const kbds =
                    partialTab.containerEl.querySelectorAll('.bhk-kbd');
                expect(kbds.length).toBe(1);
                expect(kbds[0]?.textContent).toBe('ctrl+shift+k');
            });

            it('handles chord sequences in binding display', () => {
                const pluginWithChord = createMockPlugin({
                    commands: [makeCommand('upcase-region')],
                    presetEntries: [
                        makeConfigEntry({
                            command: 'upcase-region',
                            hotkeyString: 'ctrl+x ctrl+u',
                        }),
                    ],
                });
                const chordTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginWithChord as never,
                );
                chordTab.display();

                const kbds = chordTab.containerEl.querySelectorAll('.bhk-kbd');
                expect(kbds.length).toBe(1);
                expect(kbds[0]?.textContent).toBe('ctrl+x ctrl+u');
            });

            it('shows when clause when present', () => {
                const pluginWithWhen = createMockPlugin({
                    commands: [makeCommand('modal-select')],
                    presetEntries: [
                        makeConfigEntry({
                            command: 'modal-select',
                            hotkeyString: 'ctrl+n',
                            when: 'suggestionModalRendered',
                        }),
                    ],
                });
                const whenTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginWithWhen as never,
                );
                whenTab.display();

                const whenCells =
                    whenTab.containerEl.querySelectorAll('.bhk-hotkey-when');
                const texts = Array.from(whenCells)
                    .map((c) => c.textContent)
                    .filter(Boolean);
                expect(texts).toContain('suggestionModalRendered');
            });
        });

        describe('sorting', () => {
            it('default sort is by command name ascending', () => {
                tab.display();
                const commandCells = tab.containerEl.querySelectorAll(
                    '.bhk-hotkey-command',
                );
                const commands = Array.from(commandCells).map(
                    (c) => c.textContent,
                );
                expect(commands).toEqual([
                    'backward-char',
                    'forward-char',
                    'kill-line',
                ]);
            });

            it('clicking a header sorts by that column', () => {
                tab.display();

                // Click the Binding header
                const headers = tab.containerEl.querySelectorAll(
                    '.bhk-sortable-header',
                );
                const bindingHeader = Array.from(headers).find((h) =>
                    h.textContent?.startsWith('Binding'),
                );
                expect(bindingHeader).not.toBeUndefined();
                (bindingHeader as HTMLElement).click();

                // After clicking Binding header, should sort by binding
                const kbds = tab.containerEl.querySelectorAll('.bhk-kbd');
                const bindings = Array.from(kbds).map((k) => k.textContent);
                // Ascending by binding: ctrl+b, ctrl+f, ctrl+k
                expect(bindings).toEqual(['ctrl+b', 'ctrl+f', 'ctrl+k']);
            });

            it('clicking same header reverses sort direction', () => {
                tab.display();

                // Command header is already sorted ascending, click to reverse
                const headers = tab.containerEl.querySelectorAll(
                    '.bhk-sortable-header',
                );
                const commandHeader = Array.from(headers).find((h) =>
                    h.textContent?.startsWith('Command'),
                );
                expect(commandHeader).not.toBeUndefined();
                (commandHeader as HTMLElement).click();

                const commandCells = tab.containerEl.querySelectorAll(
                    '.bhk-hotkey-command',
                );
                const commands = Array.from(commandCells).map(
                    (c) => c.textContent,
                );
                // Descending: kill-line, forward-char, backward-char
                expect(commands).toEqual([
                    'kill-line',
                    'forward-char',
                    'backward-char',
                ]);
            });
        });

        describe('merged data', () => {
            it('commands from registry with no config entry shown with empty binding', () => {
                const pluginMixed = createMockPlugin({
                    commands: [
                        makeCommand('kill-line'),
                        makeCommand('set-mark'),
                        makeCommand('select-all'),
                    ],
                    presetEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                        }),
                    ],
                });
                const mixedTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginMixed as never,
                );
                mixedTab.display();

                const rows = mixedTab.containerEl.querySelectorAll(
                    '.bhk-hotkey-table tbody tr',
                );
                // 1 with binding + 2 without = 3 rows
                expect(rows.length).toBe(3);

                // Two empty bindings
                const emptyBindings = mixedTab.containerEl.querySelectorAll(
                    '.bhk-hotkey-binding .bhk-hotkey-empty',
                );
                expect(emptyBindings.length).toBe(2);
            });

            it('preset + user entries for same command both shown', () => {
                const pluginBoth = createMockPlugin({
                    commands: [makeCommand('kill-line')],
                    presetEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                        }),
                    ],
                    userEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+shift+k',
                            priority: Priority.User,
                        }),
                    ],
                });
                const bothTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginBoth as never,
                );
                bothTab.display();

                const kbds = bothTab.containerEl.querySelectorAll('.bhk-kbd');
                const bindings = Array.from(kbds).map((k) => k.textContent);
                expect(bindings).toContain('ctrl+k');
                expect(bindings).toContain('ctrl+shift+k');
            });

            it('user removal of preset binding shows command with empty binding', () => {
                const pluginRemoved = createMockPlugin({
                    commands: [makeCommand('kill-line')],
                    presetEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                        }),
                    ],
                    userEntries: [
                        makeConfigEntry({
                            command: 'kill-line',
                            hotkeyString: 'ctrl+k',
                            removal: true,
                            priority: Priority.User,
                        }),
                    ],
                });
                const removedTab = new BetterHotkeySettingTab(
                    {} as never,
                    pluginRemoved as never,
                );
                removedTab.display();

                const rows = removedTab.containerEl.querySelectorAll(
                    '.bhk-hotkey-table tbody tr',
                );
                expect(rows.length).toBe(1);

                // Verify it's empty binding
                const emptyBinding =
                    rows[0]?.querySelector('.bhk-hotkey-empty');
                expect(emptyBinding).not.toBeNull();

                // Verify source is User
                const userBadge = rows[0]?.querySelector('.bhk-source-user');
                expect(userBadge).not.toBeNull();
            });
        });
    });

    describe('buildHotkeyRows', () => {
        it('returns empty array when internals not available', () => {
            const noInternalsPlugin = createMockPlugin({
                hasInternals: false,
            });
            const noInternalsTab = new BetterHotkeySettingTab(
                {} as never,
                noInternalsPlugin as never,
            );
            const rows = noInternalsTab.buildHotkeyRows();
            expect(rows).toEqual([]);
        });

        it('merges entries from all sources correctly', () => {
            const fullPlugin = createMockPlugin({
                commands: [
                    makeCommand('kill-line'),
                    makeCommand('ext-cmd'),
                    makeCommand('set-mark'),
                ],
                presetEntries: [
                    makeConfigEntry({
                        command: 'kill-line',
                        hotkeyString: 'ctrl+k',
                    }),
                ],
                pluginEntriesWithNames: [
                    {
                        pluginName: 'ExtPlugin',
                        entries: [
                            makeConfigEntry({
                                command: 'ext-cmd',
                                hotkeyString: 'ctrl+e',
                                priority: Priority.Plugin,
                            }),
                        ],
                    },
                ],
                userEntries: [],
            });
            const fullTab = new BetterHotkeySettingTab(
                {} as never,
                fullPlugin as never,
            );
            const rows = fullTab.buildHotkeyRows();

            // 3 commands total
            expect(rows.length).toBe(3);

            const killLine = rows.find((r) => r.command === 'kill-line');
            expect(killLine?.binding).toBe('ctrl+k');
            expect(killLine?.source).toBe('Preset');

            const extCmd = rows.find((r) => r.command === 'ext-cmd');
            expect(extCmd?.binding).toBe('ctrl+e');
            expect(extCmd?.source).toBe('ExtPlugin');

            const setMark = rows.find((r) => r.command === 'set-mark');
            expect(setMark?.binding).toBe('');
            expect(setMark?.source).toBe('');
        });
    });
});
