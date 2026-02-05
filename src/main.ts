import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import {InputHandler} from "./components/InputHandler";
import {CommandRegistry} from "./components/CommandRegistry";
import {HotkeyContext} from "./components/hotkey-context/HotkeyContext";
import {defaultPreset} from "./presets/default";
import {createTestCommands} from "./commands/test-commands";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private inputHandler: InputHandler;
	private commandRegistry: CommandRegistry;
	private hotkeyContext: HotkeyContext;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		// Initialize command registry
		this.commandRegistry = new CommandRegistry();
		this.commandRegistry.setApp(this.app);

		// Register test commands
		const testCommands = createTestCommands();
		for (const cmd of testCommands) {
			this.commandRegistry.registerCommand(cmd);
		}

		// Create Hotkey Context (wraps all hotkey components + loads preset)
		const statusBarItem = this.addStatusBarItem();
		this.hotkeyContext = new HotkeyContext(
			this.settings.chordTimeout,
			statusBarItem,
			defaultPreset
		);

		// Create and start Input Handler (creates ExecutionContext internally)
		this.inputHandler = new InputHandler(
			this.commandRegistry,
			this.hotkeyContext,
			this, // Plugin instance (provides access to plugin.app and registerDomEvent)
		);
		this.inputHandler.start();
	}

	onunload() {
		// Event listener cleanup handled automatically by Plugin.registerDomEvent
		// Cleanup Hotkey Context
		this.hotkeyContext?.destroy();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
