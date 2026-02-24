import { Plugin } from 'obsidian';
import {
    DEFAULT_SETTINGS,
    MyPluginSettings,
    SampleSettingTab,
} from './settings';
import { createCursorCommands, createKillYankCommands } from './commands';
import {
    InputHandler,
    CommandRegistry,
    HotkeyContext,
    ConfigManager,
} from './components';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    private inputHandler: InputHandler;
    private commandRegistry: CommandRegistry;
    private hotkeyContext: HotkeyContext;
    private configManager: ConfigManager;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new SampleSettingTab(this.app, this));

        // Initialize command registry
        this.commandRegistry = new CommandRegistry(this.app);

        // Register cursor movement commands (2.3.2)
        const cursorCommands = createCursorCommands();
        for (const cmd of cursorCommands) {
            this.commandRegistry.registerCommand(cmd);
        }

        // Register kill/yank commands (2.3.1)
        const killYankCommands = createKillYankCommands();
        for (const cmd of killYankCommands) {
            this.commandRegistry.registerCommand(cmd);
        }

        // Create Hotkey Context (wraps all hotkey components)
        const statusBarItem = this.addStatusBarItem();
        this.hotkeyContext = new HotkeyContext(
            this.settings.chordTimeout,
            statusBarItem,
        );

        // Create ConfigManager and wire onChange → HotkeyManager.recalculate
        const pluginDataPath = `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
        this.configManager = new ConfigManager(
            this.app.vault.adapter,
            pluginDataPath,
        );
        this.configManager.setOnChange((preset, plugin, user) => {
            this.hotkeyContext.hotkeyManager.recalculate(preset, plugin, user);
        });

        // Load config (triggers onChange → recalculate → Matcher.rebuild)
        await this.configManager.loadAll(this.settings.selectedPreset);

        // Create and start Input Handler (uses Obsidian Scope API per ADR-005)
        this.inputHandler = new InputHandler(
            this.commandRegistry,
            this.hotkeyContext,
            this,
        );
        this.inputHandler.start();
    }

    onunload() {
        this.hotkeyContext?.destroy();
        this.configManager?.dispose();
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            (await this.loadData()) as Partial<MyPluginSettings>,
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
