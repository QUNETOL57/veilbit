# Veilbit

Veilbit masks secret values in your Obsidian notes and lets you reveal or copy them when needed. In Live Preview and Reading view, secrets are replaced with a configurable mask.

## Installation

After Veilbit is available in the Community plugins directory, install it from **Settings → Community plugins → Browse**. To install a release manually, copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/veilbit/`, then reload Obsidian and enable Veilbit under **Settings → Community plugins**.

## Usage

1. Select text in the editor and open the context menu, then choose **Hide as secret**.

   ![Context menu with the Hide as secret action](screenshots/hide-secret-context-menu.png)

2. The selected text is replaced with a mask in Live Preview.

   ![A secret displayed as mask characters in a note](screenshots/masked-secret.png)

3. Click the masked value in Live Preview to open the secret. Edit the value if needed; changes are saved to the note when you close the dialog. Select **Copy** to copy the current value to your clipboard.

   ![Secret dialog with an editable value and Copy button](screenshots/secret-dialog.png)

4. To restore the original text, right-click the masked secret and choose **Remove secret**.

   ![Context menu with the Remove secret action](screenshots/remove-secret-context-menu.png)

You can also run **Hide selected text as secret** from the Command Palette.

## Settings

- **Mask symbol** — the character used to display a masked secret. Defaults to `●`.
- **Mask length** — set to `0` to show one mask character per character in the secret, or enter a positive number for a fixed mask length.

## Storage and privacy

Secret values are stored in the Markdown note as base64url-encoded text. This encoding is not encryption; anyone with access to the note can decode the value. Do not use Veilbit to protect data from someone who can read your vault files.

Veilbit works locally and does not send note contents to external services.

## Development

Install dependencies with `npm ci`. Use `npm run dev` to watch and rebuild, `npm run build` to create a production build, and `npm run lint` to run ESLint.

## Release

Build the plugin with `npm run build`, then attach `main.js`, `manifest.json`, and `styles.css` to the GitHub release whose tag matches the version in `manifest.json` (without a `v` prefix).
