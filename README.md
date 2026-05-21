# ModHeader — HTTP Header Modifier

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4f8cff?logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4f8cff)](https://developer.chrome.com/docs/extensions/mv3/intro/)

A Chrome extension for modifying HTTP request and response headers. Built with Manifest V3 and the `declarativeNetRequest` API — no `webRequest` required, no background page overhead.

![Screenshot](chrome-extension/icons/icon128.png)

## Features

- **Request & Response Headers** — Add, edit, or remove custom HTTP headers on both requests and responses.
- **Toggle On/Off** — Enable or disable individual headers, or toggle the entire extension with a single switch.
- **Multiple Profiles** — Create separate sets of headers for different scenarios and switch between them instantly.
- **URL Filtering** — Apply headers to all URLs, or narrow down by:
  - URL contains
  - URL starts with
  - URL matches regex
  - URL equals
- **Drag & Drop Reorder** — Rearrange headers by dragging.
- **Import / Export** — Backup or share your configuration as JSON.
- **Dark Theme** — Easy on the eyes.

## Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ModHeader.git
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `chrome-extension` folder.
5. The extension icon will appear in your toolbar.

### From Chrome Web Store

_Coming soon._

## Usage

1. Click the ModHeader icon in the Chrome toolbar to open the popup.
2. Toggle **Enable ModHeader** on.
3. Select the **Request Headers** or **Response Headers** tab.
4. Click **+ Add Header** and enter a header name and value.
5. Headers are applied immediately — no save button needed.
6. Use the checkbox to temporarily disable a header without deleting it.
7. Create multiple **Profiles** to group headers for different environments (dev, staging, production).

### URL Filtering

By default, headers apply to all URLs. To restrict them:

1. Choose a filter type from the dropdown (e.g., "URL contains").
2. Enter the filter value (e.g., `api.example.com`).
3. Only requests matching the filter will have headers applied.

## Permissions

| Permission | Reason |
|---|---|
| `declarativeNetRequest` | Required to modify HTTP headers using Chrome's declarative rules API. |
| `storage` | Stores your header configurations and profiles locally. |
| `<all_urls>` | Required to apply header modifications to all websites you visit. |

## Technical Overview

Built on the **`declarativeNetRequest`** API (Manifest V3):

- Headers are managed as **dynamic rules** through `chrome.declarativeNetRequest`.
- A **service worker** (`background.js`) listens for configuration changes via `chrome.storage.onChanged` and syncs the active rules.
- No persistent background page — the service worker wakes only when needed.
- All data is stored in `chrome.storage.local`.

### Project Structure

```
ModHeader/
├── chrome-extension/
│   ├── manifest.json       # Extension manifest
│   ├── background.js        # Service worker — rule management
│   ├── popup.html           # Popup UI
│   ├── popup.css            # Popup styles (dark theme)
│   ├── popup.js             # Popup logic
│   ├── options.html         # Options page
│   ├── options.css          # Options page styles
│   ├── options.js           # Options page logic
│   └── icons/               # Extension icons
├── README.md
└── .gitignore
```

## Development

### Prerequisites

- Google Chrome (or any Chromium-based browser)
- No build tools required — this is a vanilla JS extension.

### Making Changes

1. Edit the source files in `chrome-extension/`.
2. Go to `chrome://extensions`, find ModHeader, and click the **refresh** icon on the extension card.
3. Open the popup to test your changes.

### Adding Icons

Replace the PNG files in `chrome-extension/icons/`:
- `icon16.png` — 16×16
- `icon48.png` — 48×48
- `icon128.png` — 128×128

## License

[MIT](LICENSE)
