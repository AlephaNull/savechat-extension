# SaveChat Troubleshooting Guide

## Save Button Not Appearing on ChatGPT

If the save button is not visible on ChatGPT, follow these steps to debug:

### 1. Check if Extension is Loaded

1. Open ChatGPT in your browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Look for "SaveChat Loaded" message or any SaveChat-related logs
5. If you see a green "SaveChat Loaded" indicator in the top-right corner, the extension is loaded

### 2. Manual Debug

Run this in the browser console on ChatGPT:

```javascript
// Copy and paste this into the console
console.log('=== SaveChat Debug ===');
console.log('URL:', window.location.href);
console.log('SaveChat modules loaded:', typeof window.SaveChatDetection !== 'undefined');
console.log('SaveChat instance exists:', !!window.saveChatInstance);

// Check for response elements
const responses = document.querySelectorAll('[data-message-author-role="assistant"]');
console.log('Found responses:', responses.length);

// Check for action trays
const actionTrays = document.querySelectorAll('[data-testid="message-actions"]');
console.log('Found action trays:', actionTrays.length);

// Check for existing save buttons
const saveButtons = document.querySelectorAll('.savechat-button');
console.log('Existing save buttons:', saveButtons.length);

// Try manual trigger
if (window.triggerSaveChat) {
  window.triggerSaveChat();
  console.log('Manual trigger executed');
}
```

### 3. Common Issues and Solutions

#### Issue: Extension not loading
**Symptoms:** No "SaveChat Loaded" message, no green indicator
**Solutions:**
- Reload the extension in `chrome://extensions/`
- Check if the extension is enabled
- Verify you're on `https://chatgpt.com/*`

#### Issue: No response elements found
**Symptoms:** Debug shows 0 responses found
**Solutions:**
- Make sure you have a conversation with ChatGPT responses
- Try refreshing the page
- Check if ChatGPT UI has changed

#### Issue: No action trays found
**Symptoms:** Debug shows 0 action trays
**Solutions:**
- The extension will create action trays automatically
- Check if ChatGPT has updated their UI structure

#### Issue: Save buttons appear but don't work
**Symptoms:** Buttons visible but clicking does nothing
**Solutions:**
- Check console for error messages
- Verify Chrome storage permissions
- Try refreshing the page

### 4. Manual Testing

If automatic detection isn't working, you can manually test:

```javascript
// Force add save buttons to all responses
if (window.saveChatInstance) {
  window.saveChatInstance.button.addSaveButtonsToAllResponses(
    window.saveChatInstance.detection,
    window.saveChatInstance.storage
  );
}

// Check debug info
if (window.debugSaveChat) {
  window.debugSaveChat();
}
```

### 5. Extension Reload

If nothing works:

1. Go to `chrome://extensions/`
2. Find SaveChat extension
3. Click the refresh/reload button
4. Refresh ChatGPT page
5. Try again

### 6. Browser Compatibility

The extension works with:
- Chrome 88+
- Edge 88+
- Opera 74+
- Brave (Chromium-based)

### 7. Report Issues

If the problem persists:
1. Check the browser console for error messages
2. Note the ChatGPT URL you're testing on
3. Check if ChatGPT has updated their UI recently
4. Report the issue with console logs and URL

### 8. ChatGPT UI Changes

ChatGPT frequently updates their UI. If the extension stops working:
1. Check if ChatGPT has changed their HTML structure
2. Update the selectors in `content-detection.js`
3. Test with the debug script above 