import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	selectedPreset: string;
	chordTimeout: number;
	killRingMaxSize: number;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	selectedPreset: 'default',
	chordTimeout: 5000,  // ms
	killRingMaxSize: 60
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Preset')
			.setDesc('Select the keybinding preset')
			.addDropdown(dropdown => dropdown
				.addOption('default', 'Default Emacs-like')
				.setValue(this.plugin.settings.selectedPreset)
				.onChange(async (value) => {
					this.plugin.settings.selectedPreset = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Chord timeout')
			.setDesc('Timeout in milliseconds for chord sequences')
			.addText(text => text
				.setPlaceholder('5000')
				.setValue(String(this.plugin.settings.chordTimeout))
				.onChange(async (value) => {
					const num = Number(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.chordTimeout = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Kill ring max size')
			.setDesc('Maximum number of entries in the kill ring')
			.addText(text => text
				.setPlaceholder('60')
				.setValue(String(this.plugin.settings.killRingMaxSize))
				.onChange(async (value) => {
					const num = Number(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.killRingMaxSize = num;
						await this.plugin.saveSettings();
					}
				}));
	}
}
