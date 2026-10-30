// CodeMirror is provided by Obsidian at runtime, not installed as a plugin dependency.
// eslint-disable-next-line import/no-extraneous-dependencies -- Obsidian provides this package at runtime.
import { Extension } from '@codemirror/state';
// eslint-disable-next-line import/no-extraneous-dependencies -- Obsidian provides this package at runtime.
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import { Menu } from 'obsidian';

const SECRET_PATTERN = /`veilbit-secret:([A-Za-z0-9_-]+)`/g;

class SecretWidget extends WidgetType {
	constructor(
		private readonly encoded: string,
		private readonly mask: string,
		private readonly from: number,
		private readonly openSecret: (encoded: string, from: number) => void,
		private readonly removeSecret: (encoded: string, from: number) => void,
	) {
		super();
	}

	eq(other: SecretWidget): boolean {
		return this.encoded === other.encoded && this.mask === other.mask && this.from === other.from;
	}

	toDOM(): HTMLElement {
		const element = createSpan();
		element.className = 'veilbit-secret';
		element.textContent = this.mask;
		element.setAttribute('role', 'button');
		element.setAttribute('tabindex', '0');
		element.setAttribute('aria-label', 'Open secret');
		element.addEventListener('mousedown', (event) => event.preventDefault());
		element.addEventListener('click', () => this.openSecret(this.encoded, this.from));
		element.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			event.stopPropagation();
			const menu = new Menu();
			menu.addItem((item) =>
				item
					.setTitle('Remove secret')
					.setIcon('eye-off')
					.onClick(() => this.removeSecret(this.encoded, this.from)),
			);
			menu.showAtMouseEvent(event);
		});
		element.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				this.openSecret(this.encoded, this.from);
			}
		});
		return element;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

export function createSecretEditorExtension(
	decodeSecret: (encoded: string) => string | null,
	maskFor: (secret: string) => string,
	openSecret: (encoded: string, from: number) => void,
	removeSecret: (encoded: string, from: number) => void,
): Extension {
	const secretPlugin = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			private buildDecorations(view: EditorView): DecorationSet {
				const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];
				const processedLines = new Set<number>();

				for (const range of view.visibleRanges) {
					const firstLine = view.state.doc.lineAt(range.from).number;
					const lastLine = view.state.doc.lineAt(range.to).number;
					for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber++) {
						if (processedLines.has(lineNumber)) continue;
						processedLines.add(lineNumber);

						const line = view.state.doc.line(lineNumber);
						SECRET_PATTERN.lastIndex = 0;
						for (const match of line.text.matchAll(SECRET_PATTERN)) {
							const encoded = match[1];
							const index = match.index;
							if (!encoded || index === undefined) continue;

							const secret = decodeSecret(encoded);
							if (secret === null) continue;

							const from = line.from + index;
							decorations.push({
								from,
								to: from + match[0].length,
								decoration: Decoration.replace({
									widget: new SecretWidget(
										encoded,
										maskFor(secret),
										from,
										openSecret,
										removeSecret,
									),
								}),
							});
						}
					}
				}

				return Decoration.set(
					decorations.map(({ from, to, decoration }) => decoration.range(from, to)),
					true,
				);
			}
		},
		{ decorations: (plugin) => plugin.decorations },
	);
	return [
		secretPlugin,
		EditorView.atomicRanges.of(
			(view) => view.plugin(secretPlugin)?.decorations ?? Decoration.none,
		),
	];
}
