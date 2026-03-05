/**
 * Config Manager Component
 * Responsibility: Data provider for all hotkey configuration.
 * Loads preset JSON and user hotkeys from separate files, parses string notation,
 * manages user overrides and plugin registrations. Fires onChange callback
 * for HotkeyManager to recalculate.
 *
 * Does NOT perform keyboard layout translation (see ADR-010).
 * Based on Architecture.md § 3 - Global, Development Plan § 2.5
 */

import type { DataAdapter } from 'obsidian';
import { normalizePath } from 'obsidian';
import type { ConfigHotkeyEntry, Disposable, KeyPress } from '../types';
import { BASE_PRIORITY } from '../constants';
import { parseHotkeyString } from '../utils/hotkey';
import { deserialize } from './context-key-expression';

/**
 * Shape of a raw hotkey binding in JSON files (preset and user)
 */
interface RawHotkeyBinding {
    command: string;
    key?: string;
    when?: string;
    args?: Record<string, unknown>;
    priority?: number; // basePriority for conflict resolution; defaults to BASE_PRIORITY.EDITOR (0) if omitted
}

/**
 * Shape of a preset JSON file
 */
interface PresetFileData {
    name: string;
    description: string;
    version: string;
    hotkeys: RawHotkeyBinding[];
}

type OnChangeCallback = (
    preset: ConfigHotkeyEntry[],
    plugin: ConfigHotkeyEntry[],
    user: ConfigHotkeyEntry[],
) => void;

export class ConfigManager {
    private adapter: DataAdapter;
    private pluginDataPath: string;
    private presetEntries: ConfigHotkeyEntry[] = [];
    private pluginEntries: Map<string, ConfigHotkeyEntry[]> = new Map();
    private userEntries: ConfigHotkeyEntry[] = [];
    private onChange: OnChangeCallback | null = null;

    /**
     * @param adapter - Vault DataAdapter for file I/O
     * @param pluginDataPath - Plugin data directory relative to vault root
     *   (e.g. `${vault.configDir}/plugins/${manifest.id}`)
     */
    constructor(adapter: DataAdapter, pluginDataPath: string) {
        this.adapter = adapter;
        this.pluginDataPath = pluginDataPath;
    }

    /**
     * Set the onChange callback. HotkeyManager subscribes here.
     */
    setOnChange(callback: OnChangeCallback): void {
        this.onChange = callback;
    }

    /**
     * Load preset and user hotkeys from files, parse, fire onChange.
     */
    async loadAll(presetName: string): Promise<void> {
        // Load preset
        const presetPath = normalizePath(
            `${this.pluginDataPath}/presets/${presetName}.json`,
        );
        const presetData = await this.readJsonFile<PresetFileData>(presetPath);
        if (presetData !== null && Array.isArray(presetData.hotkeys)) {
            this.presetEntries = this.parseBindings(presetData.hotkeys);
        } else {
            this.presetEntries = [];
        }

        // Load user hotkeys
        const userPath = normalizePath(
            `${this.pluginDataPath}/user-hotkeys.json`,
        );
        const userData = await this.readJsonFile<RawHotkeyBinding[]>(userPath);
        if (userData !== null && Array.isArray(userData)) {
            this.userEntries = this.parseBindings(userData);
        } else {
            this.userEntries = [];
        }

        this.fireOnChange();
    }

    /**
     * Register hotkeys from a plugin. Same pluginName replaces all previous entries.
     * Returns Disposable that removes all entries for this plugin.
     * @param defaultBasePriority - Base priority for bindings without an explicit priority field
     */
    registerPluginHotkeys(
        pluginName: string,
        bindings: RawHotkeyBinding[],
        defaultBasePriority: number = BASE_PRIORITY.EXTENSION,
    ): Disposable {
        const entries = this.parseBindings(bindings, defaultBasePriority);
        this.pluginEntries.set(pluginName, entries);
        this.fireOnChange();

        return {
            dispose: () => {
                this.pluginEntries.delete(pluginName);
                this.fireOnChange();
            },
        };
    }

    /**
     * Add a user hotkey (or removal directive) and persist to file.
     * The when string is stored as-is (no parsing/validation in this phase).
     */
    async addUserHotkey(
        command: string,
        key?: string,
        when?: string,
        basePriority: number = BASE_PRIORITY.EDITOR,
    ): Promise<void> {
        const entry = this.parseConfigEntry(
            command,
            key,
            when,
            undefined,
            basePriority,
        );
        if (entry === null) {
            return;
        }
        this.userEntries.push(entry);
        await this.saveUserHotkeys();
        this.fireOnChange();
    }

    /**
     * Remove a hotkey by index. Placeholder — will be implemented with Settings UI.
     * @throws Error always (not yet implemented)
     */
    async removeHotkey(_index: number): Promise<void> {
        // TODO implement remove hotkey
        throw new Error(
            'Not implemented — will be implemented with Settings UI',
        );
    }

    getPresetEntries(): ConfigHotkeyEntry[] {
        return [...this.presetEntries];
    }

    getPluginEntries(): ConfigHotkeyEntry[] {
        const all: ConfigHotkeyEntry[] = [];
        for (const entries of this.pluginEntries.values()) {
            all.push(...entries);
        }
        return all;
    }

    /**
     * Get plugin entries with their associated plugin names preserved.
     * Used by the settings tab to display the source plugin name.
     */
    getPluginEntriesWithNames(): {
        pluginName: string;
        entries: ConfigHotkeyEntry[];
    }[] {
        const result: {
            pluginName: string;
            entries: ConfigHotkeyEntry[];
        }[] = [];
        for (const [name, entries] of this.pluginEntries) {
            result.push({ pluginName: name, entries: [...entries] });
        }
        return result;
    }

    getUserEntries(): ConfigHotkeyEntry[] {
        return [...this.userEntries];
    }

    getAvailablePresets(): { name: string; description: string }[] {
        return [{ name: 'emacs', description: 'Standard Emacs keybindings' }];
    }

    dispose(): void {
        this.presetEntries = [];
        this.pluginEntries.clear();
        this.userEntries = [];
        this.onChange = null;
    }

    // --- Private helpers ---

    /**
     * Parse an array of raw bindings into ConfigHotkeyEntry[], skipping invalid entries.
     * @param defaultBasePriority - Used when a binding does not specify its own priority
     */
    private parseBindings(
        bindings: RawHotkeyBinding[],
        defaultBasePriority: number = BASE_PRIORITY.EDITOR,
    ): ConfigHotkeyEntry[] {
        const result: ConfigHotkeyEntry[] = [];
        for (const binding of bindings) {
            const entry = this.parseConfigEntry(
                binding.command,
                binding.key,
                binding.when,
                binding.args,
                binding.priority ?? defaultBasePriority,
            );
            if (entry !== null) {
                result.push(entry);
            }
        }
        return result;
    }

    /**
     * Parse a single config entry. Returns null if invalid (logs warning).
     */
    private parseConfigEntry(
        rawCommand: string,
        keyString: string | undefined,
        when: string | undefined,
        args: Record<string, unknown> | undefined,
        priority: number,
    ): ConfigHotkeyEntry | null {
        // Detect removal: command starts with "-"
        let command = rawCommand;
        let removal = false;
        if (command.startsWith('-')) {
            removal = true;
            command = command.slice(1);
        }

        // Parse key string
        let keyPresses: KeyPress[] = [];
        let hotkeyString = '';

        if (keyString !== undefined && keyString !== '') {
            try {
                keyPresses = parseHotkeyString(keyString);
                hotkeyString = keyString;
            } catch (e) {
                console.warn(
                    `Skipping invalid hotkey "${keyString}" for command "${rawCommand}": ${e instanceof Error ? e.message : String(e)}`,
                );
                return null;
            }
        }

        const whenExpr = deserialize(when ?? '');

        return {
            command,
            key: keyPresses,
            when,
            whenExpr,
            args,
            priority,
            removal,
            hotkeyString,
        };
    }

    /**
     * Serialize and persist user hotkeys to disk.
     */
    private async saveUserHotkeys(): Promise<void> {
        const data: RawHotkeyBinding[] = this.userEntries.map((entry) => {
            const binding: RawHotkeyBinding = {
                command: entry.removal ? `-${entry.command}` : entry.command,
            };
            if (entry.hotkeyString) {
                binding.key = entry.hotkeyString;
            }
            if (entry.when) {
                binding.when = entry.when;
            }
            if (entry.priority !== BASE_PRIORITY.EDITOR) {
                binding.priority = entry.priority;
            }
            return binding;
        });

        const userPath = normalizePath(
            `${this.pluginDataPath}/user-hotkeys.json`,
        );
        await this.writeJsonFile(userPath, data);
    }

    private fireOnChange(): void {
        if (this.onChange) {
            this.onChange(
                this.getPresetEntries(),
                this.getPluginEntries(),
                this.getUserEntries(),
            );
        }
    }

    private async readJsonFile<T>(path: string): Promise<T | null> {
        try {
            const exists = await this.adapter.exists(path);
            if (!exists) {
                return null;
            }
            const content = await this.adapter.read(path);
            return JSON.parse(content) as T;
        } catch (e) {
            console.warn(
                `Failed to read ${path}: ${e instanceof Error ? e.message : String(e)}`,
            );
            return null;
        }
    }

    private async writeJsonFile(path: string, data: unknown): Promise<void> {
        await this.adapter.write(path, JSON.stringify(data, null, 2));
    }
}
