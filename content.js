// SaveChat Content Script - Main Entry Point
// Coordinates between detection, button, and storage modules

class SaveChatContent {
  constructor() {
    this.detection = new SaveChatDetection();
    this.button = new SaveChatButton();
    this.storage = new SaveChatStorage();
    this.currentUrl = window.location.href;
    this.init();
  }

  init() {
    this.waitForChatGPTReady().then(() => {
      this.detection.startObserver((node) => this.checkForNewResponses(node));
      this.button.addSaveButtonsToAllResponses(this.detection, this.storage);
      
      // Retry for responses that might still be loading
      setTimeout(() => {
        this.button.addSaveButtonsToAllResponses(this.detection, this.storage);
      }, 1000);
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getRecentSaved') {
        this.storage.getRecentSavedResponse().then(sendResponse);
        return true;
      }
    });

    this.monitorNavigation();
  }

  async waitForChatGPTReady() {
    const maxWaitTime = 10000;
    const checkInterval = 100;
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      const chatContainer = this.detection.findChatContainer();
      if (chatContainer && chatContainer.children.length > 0) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }
  }

  checkForNewResponses(node) {
    const responseSelectors = [
      'div[data-message-author-role="assistant"]',
      '[data-message-author-role="assistant"]',
      '.group.w-full.text-gray-800.dark\\:text-gray-100[data-message-author-role="assistant"]',
      '.flex.flex-col.items-center.text-base[data-message-author-role="assistant"]',
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"] .prose',
      '[data-message-author-role="assistant"] .whitespace-pre-wrap'
    ];

    responseSelectors.forEach(selector => {
      const responses = node.querySelectorAll(selector);
      responses.forEach(response => {
        if (this.detection.looksLikeAssistantResponse(response)) {
          this.button.addSaveButtonToResponse(response, this.detection, this.storage);
        }
      });
    });
  }

  monitorNavigation() {
    let lastUrl = window.location.href;
    
    const checkNavigation = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        this.handleNavigation();
      }
    };

    setInterval(checkNavigation, 1000);
  }

  handleNavigation() {
    this.detection.stopObserver();
    this.button.savedResponses.clear();

    this.waitForChatGPTReady().then(() => {
      this.detection.startObserver((node) => this.checkForNewResponses(node));
      this.button.addSaveButtonsToAllResponses(this.detection, this.storage);
    });
  }
}

// Initialize SaveChat when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.saveChatInstance = new SaveChatContent();
  });
} else {
  window.saveChatInstance = new SaveChatContent();
}

// Manual trigger function for testing
window.triggerSaveChat = () => {
  if (window.saveChatInstance) {
    window.saveChatInstance.button.addSaveButtonsToAllResponses(
      window.saveChatInstance.detection, 
      window.saveChatInstance.storage
    );
  } else {
    window.saveChatInstance = new SaveChatContent();
  }
}; 
