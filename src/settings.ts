import { App, PluginSettingTab, Setting } from 'obsidian';
import VeilbitPlugin from './main';

export interface VeilbitSettings {
	maskSymbol: string;
	maskLength: number;
}

export const DEFAULT_SETTINGS: VeilbitSettings = {
	maskSymbol: '●',
	maskLength: 0,
};

export class VeilbitSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: VeilbitPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName('Secret display')
			.setHeading();

		new Setting(containerEl)
			.setName('Mask symbol')
			.setDesc('The character used to mask secrets. Defaults to ●.')
			.addText((text) =>
				text
					.setPlaceholder('●')
					.setValue(this.plugin.settings.maskSymbol)
					.onChange(async (value) => {
						this.plugin.settings.maskSymbol = Array.from(value)[0] || '●';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Mask length')
			.setDesc('Set to 0 to match the secret length, or enter a number for a fixed length.')
			.addText((text) =>
				text
					.setPlaceholder('0')
					.setValue(String(this.plugin.settings.maskLength))
					.onChange(async (value) => {
						const length = Number.parseInt(value, 10);
						this.plugin.settings.maskLength = Number.isFinite(length)
							? Math.max(0, Math.min(length, 1000))
							: 0;
						await this.plugin.saveSettings();
					}),
			);
	}
}
