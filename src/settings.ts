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

type VeilbitSettingDefinition = {
	name: string;
	desc: string;
	control:
		| {
				type: 'text';
				key: 'maskSymbol';
				defaultValue: string;
				placeholder: string;
			}
		| {
				type: 'number';
				key: 'maskLength';
				defaultValue: number;
				min: number;
				max: number;
			};
};

export class VeilbitSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: VeilbitPlugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): VeilbitSettingDefinition[] {
		return [
			{
				name: 'Mask symbol',
				desc: 'The character used to mask secrets. Defaults to ●.',
				control: {
					type: 'text',
					key: 'maskSymbol',
					defaultValue: DEFAULT_SETTINGS.maskSymbol,
					placeholder: DEFAULT_SETTINGS.maskSymbol,
				},
			},
			{
				name: 'Mask length',
				desc: 'Set to 0 to match the secret length, or enter a number for a fixed length.',
				control: {
					type: 'number',
					key: 'maskLength',
					defaultValue: DEFAULT_SETTINGS.maskLength,
					min: 0,
					max: 1000,
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		if (key === 'maskSymbol') return this.plugin.settings.maskSymbol;
		if (key === 'maskLength') return this.plugin.settings.maskLength;
		return undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === 'maskSymbol' && typeof value === 'string') {
			this.plugin.settings.maskSymbol = Array.from(value)[0] || DEFAULT_SETTINGS.maskSymbol;
		} else if (key === 'maskLength' && typeof value === 'number') {
			this.plugin.settings.maskLength = Math.max(0, Math.min(Math.round(value), 1000));
		} else {
			return;
		}

		await this.plugin.saveSettings();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

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
