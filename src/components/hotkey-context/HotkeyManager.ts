/**
 * Hotkey Manager Component
 * Responsibility: Manage hotkey table, coordinate with Matcher for updates
 * Based on Architecture.md § 3 - Hotkey Context
 */

import type { ConfigHotkeyEntry, HotkeyEntry } from '../../types';
import { canonicalizeSequence, SPECIAL_KEY_CODE_MAP } from '../../utils/hotkey';
import { keyboardLayoutService } from '../KeyboardLayoutService';

/**
 * Create composite key from hotkey entry
 * Format: ${canonicalSequence}::${commandName}
 */
function makeCompositeKey(entry: HotkeyEntry): string {
    const canonical = canonicalizeSequence(entry.key);
    return `${canonical}::${entry.command}`;
}

export class HotkeyManager {
    /**
     * Source hotkey table, keyed by composite key: ${canonicalSequence}::${commandName}
     */
    private hotkeyTable: Map<string, HotkeyEntry> = new Map();
    private onChange: ((entries: HotkeyEntry[]) => void) | null = null;

    /**
     * Set the onChange callback for table mutations
     * Typically wired to HotkeyMatcher.rebuild() during initialization
     */
    setOnChange(callback: (entries: HotkeyEntry[]) => void): void {
        this.onChange = callback;
    }

    /**
     * Add hotkey to table with specified final priority and trigger onChange callback
     */
    insert(entry: HotkeyEntry, finalPriority: number): void {
        const key = makeCompositeKey(entry);

        // Create a new entry with the specified priority
        const entryWithPriority: HotkeyEntry = {
            ...entry,
            priority: finalPriority,
        };

        this.hotkeyTable.set(key, entryWithPriority);
        // TODO: Implement manual reindex for batch update (Phase 2)
        this.triggerOnChange();
    }

    /**
     * Remove hotkey from table and trigger onChange callback
     */
    remove(entry: HotkeyEntry): void {
        const key = makeCompositeKey(entry);
        this.hotkeyTable.delete(key);
        this.triggerOnChange();
    }

    /**
     * Clear all hotkeys
     */
    clear(): void {
        this.hotkeyTable.clear();
        this.triggerOnChange();
    }

    /**
     * Batch replace the entire hotkey table from ConfigManager sources.
     * Processes preset → plugin → user entries, applies user removal directives,
     * then fires onChange exactly once.
     *
     * Two-phase approach:
     * 1. Insert/remove all entries using basePriority as the initial priority value.
     * 2. Reindex: assign finalPriority = basePriority + index for each surviving entry,
     *    in insertion order (Map preserves insertion order: preset → plugin → user).
     *
     * Higher index = higher final priority, so user entries always beat same-category
     * preset/plugin entries.
     */
    recalculate(
        preset: ConfigHotkeyEntry[],
        plugin: ConfigHotkeyEntry[],
        user: ConfigHotkeyEntry[],
    ): void {
        this.hotkeyTable.clear();

        // Phase 1: insert/remove (priority assigned in Phase 2)
        for (const entry of preset) {
            if (!entry.removal) {
                this.insertEntry(entry);
            }
        }

        for (const entry of plugin) {
            if (!entry.removal) {
                this.insertEntry(entry);
            }
        }

        for (const entry of user) {
            // There shouldn't be removal of a user-defined hotkey. The removal should just eliminate the hotkey from config directly.
            if (entry.removal) {
                this.applyRemoval(entry);
            } else {
                this.insertEntry(entry);
            }
        }

        // Phase 2: reindex — finalPriority = basePriority + index (Map iteration order = insertion order)
        let index = 0;
        for (const [key, entry] of this.hotkeyTable) {
            this.hotkeyTable.set(key, { ...entry, priority: entry.priority + index });
            index++;
        }

        this.triggerOnChange();
    }

    /**
     * Get all hotkey entries
     */
    getAll(): HotkeyEntry[] {
        return Array.from(this.hotkeyTable.values());
    }

    /**
     * Trigger onChange callback with current hotkey table
     */
    private triggerOnChange(): void {
        if (this.onChange) {
            const entries = this.getAll();
            this.onChange(entries);
        }
    }

    /**
     * Translate a parsed key character to its physical key code.
     * Tries the Keyboard Layout Service first (letter/symbol/digit keys),
     * then falls back to the special key code map (Space, Escape, etc.).
     */
    private translateCode(key: string): string {
        const code = keyboardLayoutService.getCode(key);
        if (code !== null) return code;
        if (key in SPECIAL_KEY_CODE_MAP) return SPECIAL_KEY_CODE_MAP[key]!;
        return '';
    }

    /**
     * Insert entry into table without triggering onChange.
     * Strips ConfigHotkeyEntry metadata (removal, hotkeyString) to store plain HotkeyEntry.
     * Translates each KeyPress.key to its physical code via the Keyboard Layout Service.
     * Priority is set to entry.basePriority; recalculate() reindexes after all insertions.
     */
    private insertEntry(entry: ConfigHotkeyEntry): void {
        const hotkeyEntry: HotkeyEntry = {
            command: entry.command,
            key: entry.key.map((kp) => ({
                ...kp,
                code: this.translateCode(kp.key),
            })),
            whenExpr: entry.whenExpr,
            priority: entry.priority,
            ...(entry.when !== undefined && { when: entry.when }),
            ...(entry.args !== undefined && { args: entry.args }),
        };
        const compositeKey = makeCompositeKey(hotkeyEntry);
        this.hotkeyTable.set(compositeKey, hotkeyEntry);
    }

    /**
     * Remove matching entries from the table.
     * With hotkeyString (key.length > 0): remove specific binding by canonical sequence + command.
     * Without hotkeyString (key.length === 0): silently ignored.
     */
    private applyRemoval(entry: ConfigHotkeyEntry): void {
        if (entry.key.length > 0) {
            const canonical = canonicalizeSequence(entry.key);
            const compositeKey = `${canonical}::${entry.command}`;
            this.hotkeyTable.delete(compositeKey);
        }
        // Removal without hotkeyString is silently ignored
    }
}
