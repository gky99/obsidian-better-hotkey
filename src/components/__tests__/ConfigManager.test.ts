import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigManager } from '../ConfigManager';
import type { ConfigHotkeyEntry } from '../../types';
import { Priority } from '../../types';
import type { DataAdapter } from 'obsidian';

/**
 * Create a mock DataAdapter backed by an in-memory file map.
 */
function createMockAdapter(files: Record<string, string> = {}): DataAdapter {
  return {
    exists: async (path: string) => path in files,
    read: async (path: string) => {
      if (!(path in files)) throw new Error(`Not found: ${path}`);
      return files[path]!;
    },
    write: async (path: string, data: string) => {
      files[path] = data;
    },
    getName: () => "mock",
    stat: async () => null,
    list: async () => ({ files: [], folders: [] }),
    readBinary: async () => new ArrayBuffer(0),
    writeBinary: async () => {},
    append: async () => {},
    process: async () => "",
    getResourcePath: () => "",
    mkdir: async () => {},
    trashSystem: async () => false,
    trashLocal: async () => {},
    rmdir: async () => {},
    remove: async () => {},
    rename: async () => {},
    copy: async () => {},
  } as unknown as DataAdapter;
}

const pluginDataPath = ".obsidian/plugins/obsidian-better-hotkey";
const PRESET_PATH = `${pluginDataPath}/presets/emacs.json`;
const USER_PATH = `${pluginDataPath}/user-hotkeys.json`;

function makePresetJson(hotkeys: Array<{ command: string; key?: string; when?: string }>): string {
  return JSON.stringify({
    name: "Test Preset",
    description: "Test",
    version: "1.0.0",
    hotkeys,
  });
}

describe('ConfigManager', () => {
  let files: Record<string, string>;
  let adapter: DataAdapter;
  let manager: ConfigManager;
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    files = {};
    adapter = createMockAdapter(files);
    manager = new ConfigManager(adapter, pluginDataPath);
    mockOnChange = vi.fn();
    manager.setOnChange(mockOnChange as unknown as (
      p: ConfigHotkeyEntry[],
      pl: ConfigHotkeyEntry[],
      u: ConfigHotkeyEntry[],
    ) => void);
  });

  describe('initial state', () => {
    it('returns empty arrays for all getters', () => {
      expect(manager.getPresetEntries()).toEqual([]);
      expect(manager.getPluginEntries()).toEqual([]);
      expect(manager.getUserEntries()).toEqual([]);
    });
  });

  describe('loadAll', () => {
    describe('preset loading', () => {
      it('loads valid preset and assigns Priority.Preset', async () => {
        files[PRESET_PATH] = makePresetJson([
          { command: "kill-line", key: "ctrl+k" },
        ]);
        await manager.loadAll("emacs");

        const entries = manager.getPresetEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0]!.command).toBe("kill-line");
        expect(entries[0]!.priority).toBe(Priority.Preset);
        expect(entries[0]!.hotkeyString).toBe("ctrl+k");
        expect(entries[0]!.removal).toBe(false);
        expect(entries[0]!.key).toHaveLength(1);
        expect(entries[0]!.key[0]!.modifiers).toEqual(new Set(["ctrl"]));
        expect(entries[0]!.key[0]!.key).toBe("k");
      });

      it('parses chord sequences correctly', async () => {
        files[PRESET_PATH] = makePresetJson([
          { command: "test:save", key: "ctrl+x ctrl+s" },
        ]);
        await manager.loadAll("emacs");

        const entries = manager.getPresetEntries();
        expect(entries[0]!.key).toHaveLength(2);
        expect(entries[0]!.key[0]!.key).toBe("x");
        expect(entries[0]!.key[1]!.key).toBe("s");
        expect(entries[0]!.hotkeyString).toBe("ctrl+x ctrl+s");
      });

      it('handles missing preset file gracefully', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await manager.loadAll("nonexistent");

        expect(manager.getPresetEntries()).toEqual([]);
        // Should not throw, should fire onChange
        expect(mockOnChange).toHaveBeenCalled();
        warnSpy.mockRestore();
      });

      it('handles malformed JSON gracefully', async () => {
        files[PRESET_PATH] = "not valid json{{{";
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await manager.loadAll("emacs");

        expect(manager.getPresetEntries()).toEqual([]);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
      });

      it('skips invalid entries and keeps valid ones', async () => {
        files[PRESET_PATH] = makePresetJson([
          { command: "valid", key: "ctrl+k" },
          { command: "invalid", key: "ctrl+" },  // + as base key
          { command: "also-valid", key: "meta+x" },
        ]);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await manager.loadAll("emacs");

        const entries = manager.getPresetEntries();
        expect(entries).toHaveLength(2);
        expect(entries[0]!.command).toBe("valid");
        expect(entries[1]!.command).toBe("also-valid");
        warnSpy.mockRestore();
      });

      it('fires onChange after loading', async () => {
        files[PRESET_PATH] = makePresetJson([{ command: "test", key: "ctrl+t" }]);
        await manager.loadAll("emacs");

        expect(mockOnChange).toHaveBeenCalledTimes(1);
        const [preset, plugin, user] = mockOnChange.mock.calls[0]!;
        expect(preset).toHaveLength(1);
        expect(plugin).toHaveLength(0);
        expect(user).toHaveLength(0);
      });
    });

    describe('user hotkey loading', () => {
      it('loads user hotkeys and assigns Priority.User', async () => {
        files[USER_PATH] = JSON.stringify([
          { command: "kill-line", key: "ctrl+shift+k" },
        ]);
        await manager.loadAll("emacs");

        const entries = manager.getUserEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0]!.command).toBe("kill-line");
        expect(entries[0]!.priority).toBe(Priority.User);
        expect(entries[0]!.removal).toBe(false);
      });

      it('handles removal entries: "-command" prefix', async () => {
        files[USER_PATH] = JSON.stringify([
          { command: "-copy-region", key: "meta+w" },
        ]);
        await manager.loadAll("emacs");

        const entries = manager.getUserEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0]!.command).toBe("copy-region");  // stripped "-"
        expect(entries[0]!.removal).toBe(true);
        expect(entries[0]!.hotkeyString).toBe("meta+w");
      });

      it('handles removal without key', async () => {
        files[USER_PATH] = JSON.stringify([
          { command: "-kill-word" },
        ]);
        await manager.loadAll("emacs");

        const entries = manager.getUserEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0]!.command).toBe("kill-word");
        expect(entries[0]!.removal).toBe(true);
        expect(entries[0]!.key).toEqual([]);
        expect(entries[0]!.hotkeyString).toBe("");
      });

      it('handles missing user file gracefully (empty array)', async () => {
        await manager.loadAll("emacs");
        expect(manager.getUserEntries()).toEqual([]);
        // No error, onChange still fires
        expect(mockOnChange).toHaveBeenCalled();
      });

      it('fires onChange with all three sources', async () => {
        files[PRESET_PATH] = makePresetJson([{ command: "test", key: "ctrl+t" }]);
        files[USER_PATH] = JSON.stringify([{ command: "user-cmd", key: "ctrl+u" }]);
        manager.registerPluginHotkeys("test-plugin", [{ command: "plugin-cmd", key: "ctrl+p" }]);
        mockOnChange.mockClear();

        await manager.loadAll("emacs");

        expect(mockOnChange).toHaveBeenCalledTimes(1);
        const [preset, plugin, user] = mockOnChange.mock.calls[0]!;
        expect(preset).toHaveLength(1);
        expect(plugin).toHaveLength(1);
        expect(user).toHaveLength(1);
      });
    });
  });

  describe('registerPluginHotkeys', () => {
    it('registers entries with Priority.Plugin and fires onChange', () => {
      manager.registerPluginHotkeys("my-plugin", [
        { command: "plugin:cmd", key: "ctrl+p" },
      ]);

      const entries = manager.getPluginEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.command).toBe("plugin:cmd");
      expect(entries[0]!.priority).toBe(Priority.Plugin);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('returns Disposable that removes all entries for that plugin', () => {
      const disposable = manager.registerPluginHotkeys("my-plugin", [
        { command: "cmd1", key: "ctrl+a" },
        { command: "cmd2", key: "ctrl+b" },
      ]);

      expect(manager.getPluginEntries()).toHaveLength(2);
      mockOnChange.mockClear();

      disposable.dispose();
      expect(manager.getPluginEntries()).toHaveLength(0);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('re-registering same pluginName replaces previous entries', () => {
      manager.registerPluginHotkeys("my-plugin", [
        { command: "old-cmd", key: "ctrl+a" },
      ]);
      manager.registerPluginHotkeys("my-plugin", [
        { command: "new-cmd", key: "ctrl+b" },
      ]);

      const entries = manager.getPluginEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.command).toBe("new-cmd");
    });

    it('skips invalid entries and keeps valid ones', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      manager.registerPluginHotkeys("my-plugin", [
        { command: "valid", key: "ctrl+a" },
        { command: "invalid", key: "ctrl+" },
        { command: "also-valid", key: "ctrl+b" },
      ]);

      const entries = manager.getPluginEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0]!.command).toBe("valid");
      expect(entries[1]!.command).toBe("also-valid");
      warnSpy.mockRestore();
    });

    it('multiple plugins produce separate entry groups', () => {
      manager.registerPluginHotkeys("plugin-a", [{ command: "a:cmd", key: "ctrl+a" }]);
      manager.registerPluginHotkeys("plugin-b", [{ command: "b:cmd", key: "ctrl+b" }]);

      expect(manager.getPluginEntries()).toHaveLength(2);
    });
  });

  describe('addUserHotkey', () => {
    it('adds entry, persists to file, and fires onChange', async () => {
      await manager.addUserHotkey("my-command", "ctrl+m");

      const entries = manager.getUserEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.command).toBe("my-command");
      expect(entries[0]!.hotkeyString).toBe("ctrl+m");
      expect(entries[0]!.priority).toBe(Priority.User);

      // Check file was written
      expect(files[USER_PATH]).toBeDefined();
      const written = JSON.parse(files[USER_PATH]!) as Array<{ command: string; key?: string }>;
      expect(written).toHaveLength(1);
      expect(written[0]!.command).toBe("my-command");
      expect(written[0]!.key).toBe("ctrl+m");

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles removal syntax', async () => {
      await manager.addUserHotkey("-kill-line", "ctrl+k");

      const entries = manager.getUserEntries();
      expect(entries[0]!.command).toBe("kill-line");
      expect(entries[0]!.removal).toBe(true);

      // Serialized with "-" prefix
      const written = JSON.parse(files[USER_PATH]!) as Array<{ command: string }>;
      expect(written[0]!.command).toBe("-kill-line");
    });

    it('serialized JSON preserves "-" prefix for removals', async () => {
      await manager.addUserHotkey("-my-cmd", "ctrl+x");

      const written = JSON.parse(files[USER_PATH]!) as Array<{ command: string; key?: string }>;
      expect(written[0]!.command).toBe("-my-cmd");
      expect(written[0]!.key).toBe("ctrl+x");
    });

    it('stores when string as-is', async () => {
      await manager.addUserHotkey("my-cmd", "ctrl+k", "editorFocused");

      const entries = manager.getUserEntries();
      expect(entries[0]!.when).toBe("editorFocused");

      const written = JSON.parse(files[USER_PATH]!) as Array<{ when?: string }>;
      expect(written[0]!.when).toBe("editorFocused");
    });
  });

  describe('removeHotkey', () => {
    it('throws "not implemented" error (placeholder)', async () => {
      await expect(manager.removeHotkey(0)).rejects.toThrow(/Not implemented/);
    });
  });

  describe('dispose', () => {
    it('clears all state and nulls onChange', async () => {
      files[PRESET_PATH] = makePresetJson([{ command: "test", key: "ctrl+t" }]);
      await manager.loadAll("emacs");
      manager.registerPluginHotkeys("test", [{ command: "p", key: "ctrl+p" }]);

      manager.dispose();

      expect(manager.getPresetEntries()).toEqual([]);
      expect(manager.getPluginEntries()).toEqual([]);
      expect(manager.getUserEntries()).toEqual([]);

      // onChange should be null — no more callbacks
      mockOnChange.mockClear();
      manager.registerPluginHotkeys("test", [{ command: "p", key: "ctrl+p" }]);
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('round-trip', () => {
    it('addUserHotkey then loadAll reads same data back', async () => {
      await manager.addUserHotkey("my-command", "ctrl+k");
      mockOnChange.mockClear();

      // Reload from disk
      await manager.loadAll("emacs");

      const entries = manager.getUserEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.command).toBe("my-command");
      expect(entries[0]!.hotkeyString).toBe("ctrl+k");
    });

    it('removal entry round-trips correctly', async () => {
      await manager.addUserHotkey("-kill-line", "ctrl+k");
      mockOnChange.mockClear();

      await manager.loadAll("emacs");

      const entries = manager.getUserEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.command).toBe("kill-line");
      expect(entries[0]!.removal).toBe(true);
      expect(entries[0]!.hotkeyString).toBe("ctrl+k");
    });
  });

  describe('getAvailablePresets', () => {
    it('returns hardcoded list', () => {
      const presets = manager.getAvailablePresets();
      expect(presets).toEqual([{ name: "emacs", description: "Standard Emacs keybindings" }]);
    });
  });
});
