import {
	Editor,
	MarkdownView,
	Menu,
	Modal,
	Notice,
	Plugin,
	Setting,
} from 'obsidian';
import { DEFAULT_SETTINGS, VeilbitSettings, VeilbitSettingTab } from './settings';
import { createSecretEditorExtension } from './secret-editor-extension';

const SECRET_PATTERN = /^veilbit-secret:([A-Za-z0-9_-]+)$/;

export default class VeilbitPlugin extends Plugin {
	settings!: VeilbitSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new VeilbitSettingTab(this.app, this));
		this.registerEditorExtension(
			createSecretEditorExtension(
				(encoded) => this.decodeSecret(encoded),
				(secret) => this.maskFor(secret),
				(encoded, from) => {
					const secret = this.decodeSecret(encoded);
					if (secret !== null) {
						this.openSecret(secret, (updatedSecret) => {
							this.replaceSecretAt(from, encoded, `\`veilbit-secret:${this.encodeSecret(updatedSecret)}\``);
						});
					}
				},
				(encoded, from) => {
					const secret = this.decodeSecret(encoded);
					if (secret !== null) this.replaceSecretAt(from, encoded, secret);
				},
			),
		);

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
				if (editor.getSelection()) {
					menu.addItem((item) =>
						item
							.setTitle('Hide as secret')
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
				display.setAttribute('aria-label', 'Open secret');
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
			name: 'Hide selected text as secret',
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
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) leaf.view.editor.refresh();
		});
	}

	private hideSelection(editor: Editor) {
		const selected = editor.getSelection();
		if (!selected) {
			new Notice('Select some text first.');
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

	private replaceSecretAt(from: number, oldEncoded: string, replacement: string) {
		const expected = `\`veilbit-secret:${oldEncoded}\``;
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		const editor = view.editor;
		const lineNumber = editor.offsetToPos(from).line;
		const lineStart = editor.posToOffset({ line: lineNumber, ch: 0 });
		const start = from - lineStart;
		const line = editor.getLine(lineNumber);
		if (line.slice(start, start + expected.length) !== expected) return;

		editor.replaceRange(
			replacement,
			{ line: lineNumber, ch: start },
			{ line: lineNumber, ch: start + expected.length },
		);
	}

	private openSecret(secret: string, onSave?: (secret: string) => void) {
		new SecretModal(this.app, secret, onSave).open();
	}
}

class SecretModal extends Modal {
	private value: string;
	private textarea!: HTMLTextAreaElement;

	constructor(
		app: VeilbitPlugin['app'],
		secret: string,
		private readonly onSave?: (secret: string) => void,
	) {
		super(app);
		this.value = secret;
	}

	onOpen() {
		this.titleEl.setText('Secret');
		this.contentEl.empty();
		const editor = this.contentEl.createEl('textarea', {
			cls: 'veilbit-secret-editor',
			attr: { 'aria-label': 'Secret value', rows: '1', wrap: 'soft' },
		});
		this.textarea = editor;
		this.textarea.value = this.value;
		this.textarea.addEventListener('input', () => {
			this.value = this.textarea.value;
			this.fitTextarea();
		});
		this.fitTextarea();

		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText('Copy')
				.setCta()
				.onClick(async () => {
					try {
						await navigator.clipboard.writeText(this.value);
						new Notice('Secret copied.');
					} catch {
						new Notice('Could not copy the secret.');
					}
				}),
		);
	}

	private fitTextarea() {
		this.textarea.setCssProps({ '--veilbit-textarea-height': `${Math.max(this.textarea.scrollHeight, 40)}px` });
	}

	onClose() {
		this.onSave?.(this.value);
		this.contentEl.empty();
	}
}
