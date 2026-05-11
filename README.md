# Block Sites Chrome Extension

Block Sites is a small Chrome/Brave extension that helps reduce distractions by blocking user-defined URL patterns.

When the current page URL matches one of the configured patterns, the extension stops the page from loading and replaces it with a minimal blocking screen.

The blocking message is configurable from the options page and defaults to:

```text
Go back to work!
```

The extension uses Manifest V3, runs as a content script, stores settings in `chrome.storage.sync`, and includes an options page where blocked URL patterns and the block message can be edited, exported, and imported.

## Features

- Blocks configurable URL patterns.
- Supports `*` wildcards in URL patterns.
- Ships with a default list of distracting websites.
- Stores custom patterns with `chrome.storage.sync`.
- Stores a configurable block-page message with `chrome.storage.sync`.
- Provides an options page for editing the block list.
- Supports backup export as JSON.
- Supports backup import from JSON.
- Works in Chromium-based browsers such as Google Chrome and Brave.
- Does not require a build step.

## Default blocked sites

The default block list is defined in `defaults.js`.

Current defaults:

```text
https://x.com/*
https://www.youtube.com/*
https://mail.google.com/*
https://www.instagram.com/*
https://www.reddit.com/*
https://www.facebook.com/*
https://web.whatsapp.com/*
```

These defaults are used when no custom list has been saved yet, or when storage is unavailable.

## How it works

The extension has three main parts:

1. `manifest.json` registers the extension and injects scripts into pages.
2. `content.js` checks whether the current URL should be blocked.
3. `options.html`, `options.css`, and `options.js` provide the configuration UI.

### Runtime behavior

The extension is configured to inject `defaults.js` and `content.js` into all URLs:

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["defaults.js", "content.js"],
    "run_at": "document_start"
  }
]
```

This does not mean every site is blocked. It means the extension runs early on every page and then decides whether to block the page by comparing the current URL against the saved block list.

The decision flow is:

1. Load the storage key and default patterns from `defaults.js`.
2. Read saved patterns from `chrome.storage.sync`.
3. Fall back to the default patterns when no saved list exists.
4. Convert each wildcard pattern into a regular expression.
5. Compare the current page URL against the configured patterns.
6. If there is a match, call `window.stop()` and replace the page HTML with the blocking screen.

## Project structure

```text
.
├── assets/
│   └── icon.png
├── content.js
├── defaults.js
├── LICENSE
├── manifest.json
├── options.css
├── options.html
├── options.js
└── README.md
```

## File overview

### `manifest.json`

Main extension manifest.

It defines:

- Manifest V3 usage.
- Extension name and version.
- Extension icon paths.
- Options page: `options.html`.
- Content scripts: `defaults.js` and `content.js`.
- Script execution timing: `document_start`.
- Required permissions: `tabs` and `storage`.

### `defaults.js`

Shared configuration loaded by both the content script and the options page.

It defines:

```js
window.BLOCK_SITES_STORAGE_KEY = "blockedUrlPatterns";
window.BLOCK_SITES_BLOCK_MESSAGE_KEY = "blockPageMessage";
window.BLOCK_SITES_DEFAULT_BLOCK_MESSAGE = "Go back to work!";
```

And the default block list:

```js
window.BLOCK_SITES_DEFAULTS = Object.freeze([
  "https://x.com/*",
  "https://www.youtube.com/*",
  "https://mail.google.com/*",
  "https://www.instagram.com/*",
  "https://www.reddit.com/*",
  "https://www.facebook.com/*",
  "https://web.whatsapp.com/*"
]);
```

### `content.js`

Runs inside visited pages.

Responsibilities:

- Load blocked URL patterns from `chrome.storage.sync`.
- Fall back to default patterns when needed.
- Convert wildcard URL patterns into regular expressions.
- Check whether the current URL matches any blocked pattern.
- Load the block message from storage with default fallback.
- Stop and replace the page when a match is found.

The blocking screen is injected directly into `document.documentElement` and includes a dark background, a simple title, and the configured message.

### `options.html`

Configuration page for the extension.

It contains:

- A text input for the block page message.
- A textarea for editing blocked URL patterns.
- A `Save` button.
- An `Export backup` button.
- An `Import backup` button.
- A hidden file input for importing JSON backups.
- A status area for success/error messages.

### `options.js`

Controls the options page.

Responsibilities:

- Load saved patterns from `chrome.storage.sync`.
- Load the saved block page message from `chrome.storage.sync`.
- Initialize storage with defaults when no saved list exists.
- Parse one URL pattern per line.
- Validate patterns before saving.
- Validate the message before saving.
- Save patterns and message to browser sync storage.
- Export the current settings as `block-sites-backup.json`.
- Import patterns from either:
  - a JSON array; or
  - an object containing the `blockedUrlPatterns` key (and optional `blockPageMessage`).

### `options.css`

Styles the options page.

It defines the layout, textarea, buttons, and status messages.

## URL pattern format

Add one URL pattern per line.

Each pattern must include a protocol such as `https://` or `http://`.

The extension supports `*` as a wildcard.

Examples:

```text
https://www.youtube.com/*
https://x.com/*
https://*.example.com/*
http://example.com/*
https://example.com/articles/*
```

### Important examples

```text
https://www.youtube.com/*
```

Blocks URLs under `https://www.youtube.com/`.

```text
https://m.youtube.com/*
```

Blocks the mobile YouTube domain. This is separate from `www.youtube.com`.

```text
https://*.example.com/*
```

Blocks subdomains such as `https://app.example.com/` or `https://admin.example.com/`.

```text
https://example.com/*
```

Blocks only `https://example.com/` and paths under it. It does not automatically cover `http://example.com/` unless you add another pattern for `http://`.

## Installing in Google Chrome using Developer mode

1. Clone this repository:

```bash
git clone https://github.com/Chavao/block-sites-chrome-extension.git
```

2. Open Google Chrome.

3. Go to:

```text
chrome://extensions
```

4. Enable **Developer mode** in the top-right corner.

5. Click **Load unpacked**.

6. Select the root folder of this repository.

   Select the folder that contains `manifest.json` directly. Do not select the `assets` folder or any nested folder.

7. The extension should appear as **Block Sites**.

8. Open one of the default blocked sites, for example:

```text
https://www.youtube.com/
```

9. The page should be replaced by the blocking screen.

## Installing in Brave using Developer mode

1. Clone this repository:

```bash
git clone https://github.com/Chavao/block-sites-chrome-extension.git
```

2. Open Brave.

3. Go to:

```text
brave://extensions
```

4. Enable **Developer mode**.

5. Click **Load unpacked**.

6. Select the root folder of this repository.

   The selected folder must contain `manifest.json` directly.

7. The extension should appear as **Block Sites**.

8. Test it by opening one of the configured blocked URLs.

## Opening the options page

After installing the extension, open the configuration page using one of these methods.

### Chrome

1. Go to:

```text
chrome://extensions
```

2. Find **Block Sites**.

3. Click **Details**.

4. Click **Extension options**.

### Brave

1. Go to:

```text
brave://extensions
```

2. Find **Block Sites**.

3. Click **Details**.

4. Click **Extension options**.

Depending on the browser UI version, you may also be able to right-click the extension icon in the toolbar and choose **Options**.

## Editing settings

1. Open the extension options page.
2. Update the block page message if needed.
3. Add one pattern per line.
4. Click **Save**.
5. Reload any already-open tab you want to test.

Example list:

```text
https://x.com/*
https://www.youtube.com/*
https://www.reddit.com/*
https://news.ycombinator.com/*
```

Invalid patterns are rejected before saving. A valid pattern must include `://` and must still be parseable as a URL after replacing wildcards with placeholder characters.

## Exporting a backup

1. Open the extension options page.
2. Review the current pattern list.
3. Click **Export backup**.
4. The browser downloads a file named:

```text
block-sites-backup.json
```

The exported file contains configured settings in JSON format: blocked URL patterns and block-page message.

## Importing a backup

1. Open the extension options page.
2. Click **Import backup**.
3. Select a JSON backup file.
4. The extension validates the imported settings.
5. If valid, the list and message are rendered and saved to `chrome.storage.sync`.

Accepted backup formats:

```json
[
  "https://x.com/*",
  "https://www.youtube.com/*"
]
```

Or:

```json
{
  "blockedUrlPatterns": [
    "https://x.com/*",
    "https://www.youtube.com/*"
  ],
  "blockPageMessage": "Go back to work!"
}
```

## Development workflow

There is no build command. The extension is loaded directly from the source files.

Typical workflow:

1. Edit `manifest.json`, `defaults.js`, `content.js`, `options.html`, `options.css`, or `options.js`.
2. Open `chrome://extensions` or `brave://extensions`.
3. Click **Reload** on the **Block Sites** extension card.
4. Reload the target browser tab.
5. Test the behavior.

## Troubleshooting

### The extension does not appear after Load unpacked

Make sure you selected the repository root folder. The selected folder must contain `manifest.json` directly.

### The site is not blocked

Check the following:

- The URL pattern is present in the options page.
- The pattern includes the correct protocol: `http://` or `https://`.
- The actual domain matches the configured domain.
- The pattern includes a wildcard when needed.
- The pattern was saved successfully.
- The target tab was reloaded after saving.

Example: this pattern:

```text
https://www.youtube.com/*
```

Does not necessarily block:

```text
https://m.youtube.com/*
```

Add both patterns if you want both domains blocked.

### Changes to source files are not applied

After editing source files, reload the extension from the browser extensions page.

For changes to the block list made through the options page, saving is usually enough. Reload the already-open target tab to test again.

### The backup import fails

The imported file must be valid JSON and must contain either:

- a JSON array of patterns; or
- an object with a `blockedUrlPatterns` array.

Each pattern must be valid according to the same validation rules used by the options page.

### The extension only blocks sites in one browser

This is expected. The extension only affects the browser where it is installed. It does not block sites at the operating system, DNS, router, or network level.

## Permissions

The extension currently requests:

```json
[
  "tabs",
  "storage"
]
```

`storage` is used to persist the custom blocked URL list.

`tabs` is currently declared in the manifest. Review whether it is still needed before publishing the extension, because the current blocking flow mainly depends on the content script and storage access.

## Limitations

- Blocking is browser-local.
- It does not prevent access from other browsers or devices.
- It does not block network requests outside the browser.
- It does not include password protection.
- It does not include scheduling.
- It does not include categories or profiles.
- It relies on user-defined URL patterns.

## Possible improvements

- Add schedule-based blocking.
- Add temporary pause/unblock mode.
- Add password or challenge-based unlock.
- Add preset categories such as social media, video, chat, or news.
- Add import/export versioning.
- Add tests for pattern parsing and matching.
- Remove unused permissions if confirmed unnecessary.
- Improve the blocked page UI.

## License

This project is licensed under the MIT License. See [`LICENSE`](./LICENSE) for details.
