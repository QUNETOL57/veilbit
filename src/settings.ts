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
			.setName('Отображение секретов')
			.setHeading();

		new Setting(containerEl)
			.setName('Символ маски')
			.setDesc('Символ, которым отображается секрет. По умолчанию — ●.')
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
			.setName('Длина маски')
			.setDesc('0 — столько же символов, сколько в секрете. Укажите число, чтобы задать фиксированную длину.')
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
