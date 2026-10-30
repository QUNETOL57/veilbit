import {
	Editor,
	Menu,
	Modal,
	Notice,
	Plugin,
	Setting,
} from 'obsidian';
import { DEFAULT_SETTINGS, VeilbitSettings, VeilbitSettingTab } from './settings';

const SECRET_PATTERN = /^veilbit-secret:([A-Za-z0-9_-]+)$/;

export default class VeilbitPlugin extends Plugin {
	settings!: VeilbitSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new VeilbitSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
				if (editor.getSelection()) {
					menu.addItem((item) =>
						item
							.setTitle('Скрыть как секрет')
							.setIcon('eye-off')
							.onClick(() => this.hideSelection(editor)),
					);
				}
			}),
		);

		this.registerMarkdownPostProcessor((element) => {
			for (const codeEl of Array.from(element.querySelectorAll('code'))) {
				if (codeEl.closest('pre')) continue;
				const match = SECRET_PATTERN.exec(codeEl.textContent ?? '');
				const encoded = match?.[1];
				if (!encoded) continue;

				const secret = this.decodeSecret(encoded);
				if (secret === null) continue;

				const display = createSpan();
				display.className = 'veilbit-secret';
				display.textContent = this.maskFor(secret);
				display.setAttribute('role', 'button');
				display.setAttribute('tabindex', '0');
				display.setAttribute('aria-label', 'Открыть секрет');
				display.addEventListener('click', () => this.openSecret(secret));
				display.addEventListener('keydown', (event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						this.openSecret(secret);
					}
				});
				codeEl.replaceWith(display);
			}
		});

		this.addCommand({
			id: 'hide-selection-as-secret',
			name: 'Скрыть выделенный текст как секрет',
			editorCallback: (editor: Editor) => this.hideSelection(editor),
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<VeilbitSettings>,
		);
		if (typeof this.settings.maskLength !== 'number' || this.settings.maskLength < 0) {
			this.settings.maskLength = 0;
		}
		if (!this.settings.maskSymbol) this.settings.maskSymbol = DEFAULT_SETTINGS.maskSymbol;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private hideSelection(editor: Editor) {
		const selected = editor.getSelection();
		if (!selected) {
			new Notice('Сначала выделите текст.');
			return;
		}

		const encoded = this.encodeSecret(selected);
		editor.replaceSelection(`\`veilbit-secret:${encoded}\``);
	}

	private encodeSecret(secret: string): string {
		const bytes = new TextEncoder().encode(secret);
		let binary = '';
		for (const byte of bytes) binary += String.fromCharCode(byte);
		return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
	}

	private decodeSecret(encoded: string): string | null {
		try {
			const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
			const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
			const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
			return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		} catch {
			return null;
		}
	}

	private maskFor(secret: string): string {
		const length = this.settings.maskLength > 0
			? this.settings.maskLength
			: Array.from(secret).length;
		return this.settings.maskSymbol.repeat(Math.min(length, 1000));
	}

	private openSecret(secret: string) {
		new SecretModal(this.app, secret).open();
	}
}

class SecretModal extends Modal {
	constructor(app: VeilbitPlugin['app'], private readonly secret: string) {
		super(app);
	}

	onOpen() {
		this.titleEl.setText('Секрет');
		this.contentEl.empty();
		new Setting(this.contentEl)
			.setName('Значение')
			.addText((text) => {
				text.setValue(this.secret);
				text.inputEl.readOnly = true;
			});
		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText('Копировать')
				.setCta()
				.onClick(async () => {
					try {
						await navigator.clipboard.writeText(this.secret);
						new Notice('Секрет скопирован.');
					} catch {
						new Notice('Не удалось скопировать секрет.');
					}
				}),
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
