// SaveChat Background Service Worker
// Handles extension lifecycle and communication between components

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('SaveChat extension installed');
    
    // Initialize storage with default values
    chrome.storage.local.set({
      savedResponses: [],
      settings: {
        autoSave: false,
        showNotifications: true,
        maxResponses: 100
      }
    });
    

  } else if (details.reason === 'update') {
    console.log('SaveChat extension updated');
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getStats':
      getStats().then(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'clearAllResponses':
      clearAllResponses().then(sendResponse);
      return true;
      
    case 'exportResponses':
      exportResponses().then(sendResponse);
      return true;
      
    case 'importResponses':
      importResponses(request.data).then(sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Get extension statistics
async function getStats() {
  try {
    const data = await chrome.storage.local.get({ savedResponses: [] });
    const responses = data.savedResponses || [];
    
    return {
      totalResponses: responses.length,
      totalCharacters: responses.reduce((sum, r) => sum + (r.text?.length || 0), 0),
      oldestResponse: responses.length > 0 ? responses[responses.length - 1].timestamp : null,
      newestResponse: responses.length > 0 ? responses[0].timestamp : null
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { error: 'Failed to get statistics' };
  }
}

// Clear all saved responses
async function clearAllResponses() {
  try {
    await chrome.storage.local.set({ savedResponses: [] });
    return { success: true };
  } catch (error) {
    console.error('Error clearing responses:', error);
    return { error: 'Failed to clear responses' };
  }
}

// Export responses as JSON
async function exportResponses() {
  try {
    const data = await chrome.storage.local.get({ savedResponses: [] });
    const responses = data.savedResponses || [];
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalResponses: responses.length,
      responses: responses
    };
    
    return {
      success: true,
      data: exportData
    };
  } catch (error) {
    console.error('Error exporting responses:', error);
    return { error: 'Failed to export responses' };
  }
}

// Import responses from JSON
async function importResponses(importData) {
  try {
    if (!importData || !importData.responses || !Array.isArray(importData.responses)) {
      throw new Error('Invalid import data format');
    }
    
    const currentData = await chrome.storage.local.get({ savedResponses: [] });
    const currentResponses = currentData.savedResponses || [];
    
    // Merge responses, avoiding duplicates by timestamp
    const existingTimestamps = new Set(currentResponses.map(r => r.timestamp));
    const newResponses = importData.responses.filter(r => !existingTimestamps.has(r.timestamp));
    
    const mergedResponses = [...newResponses, ...currentResponses];
    
    // Sort by timestamp (newest first)
    mergedResponses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    await chrome.storage.local.set({ savedResponses: mergedResponses });
    
    return {
      success: true,
      imported: newResponses.length,
      total: mergedResponses.length
    };
  } catch (error) {
    console.error('Error importing responses:', error);
    return { error: 'Failed to import responses' };
  }
}

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isChatGPT = tab.url.includes('chatgpt.com');
    
    if (isChatGPT) {
      // Content script should auto-inject, but we can add additional logic here
      console.log('ChatGPT tab detected:', tab.url);
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will only trigger if no popup is defined in manifest
  // Since we have a popup, this won't be called
  console.log('Extension icon clicked');
}); 