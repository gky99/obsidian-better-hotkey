import { App, PluginSettingTab, Setting } from 'obsidian';
import type MyPlugin from './main';
import type { ConfigHotkeyEntry } from './types';

export interface MyPluginSettings {
    selectedPreset: string;
    chordTimeout: number;
    killRingMaxSize: number;
    showStatusIndicator: boolean;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    selectedPreset: 'emacs',
    chordTimeout: 5000, // ms
    killRingMaxSize: 60,
    showStatusIndicator: true,
};

/**
 * A row in the hotkey bindings table.
 */
interface HotkeyRow {
    command: string;
    binding: string;
    when: string;
    source: string;
}

type SortColumn = 'command' | 'binding' | 'when' | 'source';
type SortDirection = 'asc' | 'desc';

export class BetterHotkeySettingTab extends PluginSettingTab {
    plugin: MyPlugin;
    private sortColumn: SortColumn = 'command';
    private sortDirection: SortDirection = 'asc';

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('bhk-settings');

        // Reset sort state on each display
        this.sortColumn = 'command';
        this.sortDirection = 'asc';

        this.addGeneralSection(containerEl);
        this.addHotkeyListSection(containerEl);
    }

    // --- General Section ---

    private addGeneralSection(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Chord timeout')
            .setDesc(
                'Timeout in milliseconds for chord sequences (100\u201330000)',
            )
            .addText((text) =>
                text
                    .setPlaceholder('5000')
                    .setValue(String(this.plugin.settings.chordTimeout))
                    .onChange(async (value) => {
                        const num = Number(value);
                        if (!isNaN(num) && num >= 100 && num <= 30000) {
                            this.plugin.settings.chordTimeout = num;
                            await this.plugin.saveSettings();
                            (
                                this.plugin as PluginInternals
                            ).hotkeyContext?.setChordTimeout(num);
                        }
                    }),
            );

        new Setting(containerEl)
            .setName('Kill ring max size')
            .setDesc('Maximum number of entries in the kill ring (1\u20131000)')
            .addText((text) =>
                text
                    .setPlaceholder('60')
                    .setValue(String(this.plugin.settings.killRingMaxSize))
                    .onChange(async (value) => {
                        const num = Number(value);
                        if (!isNaN(num) && num >= 1 && num <= 1000) {
                            this.plugin.settings.killRingMaxSize = num;
                            await this.plugin.saveSettings();
                        }
                    }),
            );

        new Setting(containerEl)
            .setName('Show status indicator')
            .setDesc('Show pending chord sequence in the status bar')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showStatusIndicator)
                    .onChange(async (value) => {
                        this.plugin.settings.showStatusIndicator = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateStatusIndicatorVisibility(value);
                    }),
            );
    }

    // --- Hotkey Bindings Section ---

    private addHotkeyListSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Hotkey bindings').setHeading();

        const internals = this.plugin as PluginInternals;
        const configManager = internals.configManager;
        const commandRegistry = internals.commandRegistry;

        if (!configManager || !commandRegistry) {
            containerEl.createEl('p', {
                text: 'Hotkey data not available yet. Close and reopen settings to refresh.',
                cls: 'bhk-hotkey-list-empty',
            });
            return;
        }

        const rows = this.buildHotkeyRows();

        if (rows.length === 0) {
            containerEl.createEl('p', {
                text: 'No commands registered.',
                cls: 'bhk-hotkey-list-empty',
            });
            return;
        }

        this.renderHotkeyTable(containerEl, rows);
    }

    /**
     * Build the merged hotkey rows from ConfigManager entries and CommandRegistry.
     *
     * Algorithm:
     * 1. Collect all config entries (preset, plugin, user) into a map keyed by command
     * 2. Apply user removal logic
     * 3. Add rows for commands from CommandRegistry that have no bindings
     */
    buildHotkeyRows(): HotkeyRow[] {
        const internals = this.plugin as PluginInternals;
        const configManager = internals.configManager;
        const commandRegistry = internals.commandRegistry;

        if (!configManager || !commandRegistry) return [];

        // Map<commandId, HotkeyRow[]> — accumulates rows per command
        const rowMap = new Map<string, HotkeyRow[]>();

        // 1. Preset entries
        for (const entry of configManager.getPresetEntries()) {
            if (entry.removal) continue;
            this.addRowToMap(rowMap, {
                command: entry.command,
                binding: entry.hotkeyString,
                when: entry.when ?? '',
                source: 'Preset',
            });
        }

        // 2. Plugin entries (with plugin names)
        for (const group of configManager.getPluginEntriesWithNames()) {
            for (const entry of group.entries) {
                if (entry.removal) continue;
                this.addRowToMap(rowMap, {
                    command: entry.command,
                    binding: entry.hotkeyString,
                    when: entry.when ?? '',
                    source: group.pluginName,
                });
            }
        }

        // 3. User entries (apply removals, add normal entries)
        for (const entry of configManager.getUserEntries()) {
            if (entry.removal) {
                this.applyRemovalToMap(rowMap, entry);
            } else {
                this.addRowToMap(rowMap, {
                    command: entry.command,
                    binding: entry.hotkeyString,
                    when: entry.when ?? '',
                    source: 'User',
                });
            }
        }

        // 4. Commands from CommandRegistry with no rows get an empty row
        for (const cmd of commandRegistry.getAllCommands()) {
            if (!rowMap.has(cmd.id)) {
                rowMap.set(cmd.id, [
                    {
                        command: cmd.id,
                        binding: '',
                        when: '',
                        source: '',
                    },
                ]);
            }
        }

        // Flatten and sort
        const allRows: HotkeyRow[] = [];
        for (const rows of rowMap.values()) {
            allRows.push(...rows);
        }

        return this.sortRows(allRows);
    }

    private addRowToMap(
        rowMap: Map<string, HotkeyRow[]>,
        row: HotkeyRow,
    ): void {
        const existing = rowMap.get(row.command);
        if (existing) {
            existing.push(row);
        } else {
            rowMap.set(row.command, [row]);
        }
    }

    /**
     * Apply a user removal entry:
     * - Find and remove the matching binding (by command + hotkeyString)
     * - If no other binding remains, keep the command with empty binding + "User" source
     */
    private applyRemovalToMap(
        rowMap: Map<string, HotkeyRow[]>,
        removal: ConfigHotkeyEntry,
    ): void {
        const rows = rowMap.get(removal.command);
        if (!rows) {
            // Command doesn't exist in map yet — add empty row with User source
            rowMap.set(removal.command, [
                {
                    command: removal.command,
                    binding: '',
                    when: '',
                    source: 'User',
                },
            ]);
            return;
        }

        // Find and remove the matching binding
        const idx = rows.findIndex((r) => r.binding === removal.hotkeyString);
        if (idx !== -1) {
            rows.splice(idx, 1);
        }

        // If no bindings remain, add empty row with User source
        if (rows.length === 0) {
            rows.push({
                command: removal.command,
                binding: '',
                when: '',
                source: 'User',
            });
        }
    }

    private sortRows(rows: HotkeyRow[]): HotkeyRow[] {
        const col = this.sortColumn;
        const dir = this.sortDirection === 'asc' ? 1 : -1;

        return rows.sort((a, b) => {
            const aVal = a[col];
            const bVal = b[col];
            return aVal.localeCompare(bVal) * dir;
        });
    }

    private renderHotkeyTable(
        containerEl: HTMLElement,
        rows: HotkeyRow[],
    ): void {
        const tableContainer = containerEl.createDiv({
            cls: 'bhk-hotkey-table-container',
        });
        const table = tableContainer.createEl('table', {
            cls: 'bhk-hotkey-table',
        });

        // Header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');

        const columns: { key: SortColumn; label: string }[] = [
            { key: 'command', label: 'Command' },
            { key: 'binding', label: 'Binding' },
            { key: 'when', label: 'When' },
            { key: 'source', label: 'Source' },
        ];

        for (const col of columns) {
            const th = headerRow.createEl('th', {
                cls: 'bhk-sortable-header',
            });
            th.textContent = col.label;

            // Sort indicator
            if (this.sortColumn === col.key) {
                const indicator =
                    this.sortDirection === 'asc' ? ' \u25B2' : ' \u25BC';
                th.textContent += indicator;
            }

            th.addEventListener('click', () => {
                if (this.sortColumn === col.key) {
                    this.sortDirection =
                        this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = col.key;
                    this.sortDirection = 'asc';
                }
                // Re-render just the table body
                const tbody = table.querySelector('tbody');
                if (tbody) tbody.remove();
                const sortedRows = this.sortRows([...rows]);
                this.renderTableBody(table, sortedRows);
                // Update header indicators
                for (const headerTh of Array.from(
                    headerRow.querySelectorAll('th'),
                )) {
                    const colDef = columns.find((c) =>
                        headerTh.textContent?.startsWith(c.label),
                    );
                    if (colDef) {
                        headerTh.textContent =
                            colDef.key === this.sortColumn
                                ? colDef.label +
                                  (this.sortDirection === 'asc'
                                      ? ' \u25B2'
                                      : ' \u25BC')
                                : colDef.label;
                    }
                }
            });
        }

        // Body
        this.renderTableBody(table, rows);
    }

    private renderTableBody(table: HTMLTableElement, rows: HotkeyRow[]): void {
        const tbody = table.createEl('tbody');

        for (const row of rows) {
            const tr = tbody.createEl('tr');
            const isEmpty = row.binding === '';

            // Command
            tr.createEl('td', {
                text: row.command,
                cls: 'bhk-hotkey-command',
            });

            // Binding
            const bindingCell = tr.createEl('td', {
                cls: 'bhk-hotkey-binding',
            });
            if (row.binding) {
                bindingCell.createEl('kbd', {
                    text: row.binding,
                    cls: 'bhk-kbd',
                });
            } else {
                bindingCell.createEl('span', {
                    text: '\u2014',
                    cls: 'bhk-hotkey-empty',
                });
            }

            // When
            tr.createEl('td', {
                text: row.when,
                cls: 'bhk-hotkey-when',
            });

            // Source
            const sourceCell = tr.createEl('td', {
                cls: 'bhk-hotkey-source',
            });
            if (row.source) {
                const sourceClass = this.getSourceClass(row.source);
                sourceCell.createEl('span', {
                    text: row.source,
                    cls: `bhk-source-badge ${sourceClass}`,
                });
            } else if (isEmpty) {
                sourceCell.createEl('span', {
                    text: '\u2014',
                    cls: 'bhk-hotkey-empty',
                });
            }
        }
    }

    private getSourceClass(source: string): string {
        switch (source) {
            case 'Preset':
                return 'bhk-source-preset';
            case 'User':
                return 'bhk-source-user';
            default:
                return 'bhk-source-plugin';
        }
    }
}

/**
 * Type assertion interface for accessing plugin internals from the settings tab.
 * These fields are initialized in onload() before display() is ever called.
 */
interface PluginInternals {
    configManager: import('./components').ConfigManager | undefined;
    commandRegistry: import('./components').CommandRegistry | undefined;
    hotkeyContext: import('./components').HotkeyContext | undefined;
}
