# SaveChat Chrome Extension

A Chrome extension that allows you to save ChatGPT responses for later reference. Features a modern popup interface and seamless integration with ChatGPT.

## Features

### 🚀 Core Functionality
- **Auto-detection** of ChatGPT responses
- **One-click saving** with visual feedback
- **Multiple response saving** from conversation chains
- **Context preservation** (conversation title, previous messages)
- **Modern popup UI** showing most recent saved response

### 🎨 User Interface
- **Clean, modern design** with smooth animations
- **Dark mode support** (adapts to ChatGPT's theme)
- **Responsive popup** with proper scrolling
- **Visual feedback** for save actions
- **Copy to clipboard** functionality

### 📊 Data Management
- **Local storage** for privacy and speed
- **Export/Import** functionality (planned)
- **Statistics tracking** (total saved, character count)
- **Automatic cleanup** and organization

## File Structure

```
extension/
├── manifest.json          # Extension configuration
├── content.js             # Content script (injects into ChatGPT)
├── content.css            # Styles for save buttons
├── popup.html             # Popup interface
├── popup.css              # Popup styles
├── popup.js               # Popup functionality
├── background.js          # Service worker
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Installation

### Development Installation

1. **Clone or download** the extension files
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top right)
4. **Click "Load unpacked"** and select the `extension/` folder
5. **Pin the extension** to your toolbar for easy access

### Production Installation

Once published to the Chrome Web Store:
1. Visit the SaveChat extension page
2. Click "Add to Chrome"
3. Confirm the installation

## Usage

### Saving Responses

1. **Navigate to ChatGPT** (chatgpt.com)
2. **Start a conversation** or open an existing one
3. **Look for save buttons** (💾) that appear next to each response
4. **Click "Save Response"** to save the response
5. **See confirmation** with a green checkmark (✅)

### Viewing Saved Responses

1. **Click the SaveChat icon** in your Chrome toolbar
2. **View the most recent** saved response in the popup
3. **Copy text** with the copy button
4. **Open web app** to see all saved responses

### Multiple Response Saving

- **Save multiple responses** from the same conversation
- **Each response is saved independently** with context
- **Navigate through conversation history** to save older responses
- **All responses are timestamped** and organized by date

## Technical Details

### Content Script (`content.js`)
- **MutationObserver** for detecting new responses
- **Smart button placement** in response content
- **Context extraction** from conversation
- **Error handling** and retry logic

### Popup Interface (`popup.js`)
- **Async data loading** from Chrome storage
- **Real-time updates** when new responses are saved
- **Copy to clipboard** functionality
- **Navigation to web app**

### Background Service (`background.js`)
- **Extension lifecycle management**
- **Data import/export** functionality
- **Statistics tracking**
- **Tab monitoring** for ChatGPT pages

## Browser Compatibility

- **Chrome** 88+ (Manifest V3)
- **Edge** 88+ (Chromium-based)
- **Opera** 74+ (Chromium-based)
- **Brave** (Chromium-based)

## Development

### Prerequisites
- Modern web browser with extension support
- Basic knowledge of JavaScript and Chrome Extensions API

### Local Development
1. **Make changes** to the extension files
2. **Reload the extension** in `chrome://extensions/`
3. **Test on ChatGPT** to see changes
4. **Use Chrome DevTools** for debugging

### Building for Production
1. **Create icons** in the required sizes
2. **Update manifest.json** with production details
3. **Test thoroughly** on different ChatGPT pages
4. **Package for Chrome Web Store**

## Troubleshooting

### Common Issues

**Save buttons not appearing:**
- Refresh the ChatGPT page
- Check if the extension is enabled
- Look for console errors in DevTools

**Responses not saving:**
- Check Chrome storage permissions
- Verify the response has text content
- Look for JavaScript errors

**Popup not loading:**
- Reload the extension
- Check if Chrome storage is working
- Verify popup files are present

### Debug Mode

Enable debug logging by:
1. Opening `chrome://extensions/`
2. Finding SaveChat extension
3. Clicking "Details"
4. Enabling "Allow access to file URLs"

## Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the Chrome Extensions documentation

---

**SaveChat** - Never lose a valuable ChatGPT response again! 💾✨ 