# Domain Abuse Reporter Chrome Extension

A Chrome extension that auto-fills form fields on domain abuse reporting websites.

## Features

- Detects supported abuse reporting pages
- Auto-fills domain, reason, and email fields
- Works with Google, Cloudflare, and Radix abuse report forms
- Saves last used values for quick re-use
- Visual notifications when forms are filled

## Supported Websites

- Google Spam Report
- Google Phishing Report
- Google DMCA Forms
- Cloudflare Abuse Report
- Radix Abuse Report

## Installation

### Developer Mode Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension should now appear in your extensions list

### Getting the Extension ID

After installation:
1. Go to `chrome://extensions/`
2. Find "Domain Abuse Reporter Helper"
3. Copy the ID (looks like: `abcdefghijklmnopqrstuvwxyz123456`)
4. Update your backend `.env` file with `EXTENSION_ID=your-id-here`

## Usage

### Method 1: Using the Popup

1. Navigate to any supported abuse report website
2. Click the extension icon in your toolbar
3. Fill in the domain, reason, and email fields
4. Click "Fill Form on Current Page"
5. The form on the page will be auto-filled
6. Complete any captcha manually
7. Submit the form

### Method 2: Automatic Fill (via Web App)

When you use the "Report All" feature from the web app:
1. Multiple tabs will open automatically
2. The extension detects each page
3. Forms are auto-filled automatically
4. You just need to complete captchas and submit

## How It Works

### Content Script
- Runs on supported abuse report pages
- Detects form fields using multiple selector strategies
- Fills fields with provided data
- Shows visual notifications

### Background Script
- Listens for messages from the web app
- Manages tab creation and data storage
- Coordinates auto-fill across multiple tabs

### Popup Interface
- Manual control for filling forms
- Stores last used values
- Quick access to extension features

## Form Field Detection

The extension uses smart detection to find form fields:

**Domain/URL Fields:**
- `input[name="url"]`
- `input[type="url"]`
- `input[name="domain"]`
- And many more patterns

**Reason/Description Fields:**
- `textarea[name="description"]`
- `textarea[name="reason"]`
- `textarea[name="details"]`
- And more patterns

**Email Fields:**
- `input[type="email"]`
- `input[name="email"]`
- And related patterns

## Security & Privacy

- Extension only has access to specific abuse reporting domains
- No data is sent to external servers
- All data is stored locally in Chrome storage
- No tracking or analytics

## Permissions

- `storage` - Save user preferences and form data
- `tabs` - Create and manage tabs for reporting
- `activeTab` - Access current tab for auto-fill
- `host_permissions` - Access to supported abuse report websites

## Troubleshooting

**Extension not auto-filling:**
- Ensure you're on a supported website
- Check that the page has fully loaded
- Try using the popup manual fill option
- Check browser console for errors

**Form fields not detected:**
- Some websites use dynamic forms that may not be detected
- Try filling manually
- Report the website so we can add better selectors

## Development

To modify the extension:

1. Edit the files in the `chrome-extension` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## File Structure

```
chrome-extension/
├── manifest.json       # Extension configuration
├── background.js       # Service worker
├── content.js          # Content script (runs on pages)
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
├── icons/              # Extension icons
└── README.md           # This file
```

## Future Enhancements

- Support for more abuse report websites
- Better form field detection
- Template management
- Export report history
- Keyboard shortcuts for quick filling
