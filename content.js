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
    console.log('SaveChat: Initializing...');
    
    // Immediate check for existing responses
    setTimeout(() => {
      console.log('SaveChat: Immediate check for existing responses...');
      this.button.addSaveButtonsToAllResponses(this.detection, this.storage);
    }, 100);
    
    this.waitForChatGPTReady().then(() => {
      console.log('SaveChat: ChatGPT ready, starting observer...');
      this.detection.startObserver((node) => this.checkForNewResponses(node));
      this.button.addSaveButtonsToAllResponses(this.detection, this.storage);
      
      // Retry for responses that might still be loading - more aggressive
      setTimeout(() => {
        console.log('SaveChat: First retry...');
        this.button.addSaveButtonsToAllResponses(this.detection, this.storage);
      }, 500); // Reduced from 1000ms to 500ms
      
      setTimeout(() => {
        console.log('SaveChat: Second retry...');
        this.button.addSaveButtonsToAllResponses(this.detection, this.storage);
      }, 1000);
      
      // Periodic check for any missed responses - more frequent
      setInterval(() => {
        console.log('SaveChat: Periodic check for missed responses...');
        this.button.addSaveButtonsToAllResponses(this.detection, this.storage);
      }, 2000); // Reduced from 5000ms to 2000ms
      
      // Periodic cleanup of duplicate buttons
      setInterval(() => {
        console.log('SaveChat: Periodic cleanup of duplicate buttons...');
        this.button.cleanupDuplicateButtons();
      }, 3000);
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getRecentSaved') {
        this.storage.getRecentSavedResponse().then(sendResponse);
        return true;
      }
    });

    this.monitorNavigation();
    this.monitorThemeChanges();
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
    const containers = [];
    if (node && node.nodeType === Node.ELEMENT_NODE) {
      if (node.matches && node.matches('[data-message-author-role="assistant"]')) {
        containers.push(node);
      }
      if (node.querySelectorAll) {
        containers.push(...node.querySelectorAll('[data-message-author-role="assistant"]'));
      }
    }

    containers.forEach((response) => {
      if (this.detection.looksLikeAssistantResponse(response)) {
        this.button.addSaveButtonToResponse(response, this.detection, this.storage);
        setTimeout(() => {
          if (!response.querySelector('.savechat-button')) {
            this.button.addSaveButtonToResponse(response, this.detection, this.storage);
          }
        }, 100);
      }
    });
  }

  monitorNavigation() {
    let lastUrl = window.location.href;
    let navigationInterval = null;
    
    const checkNavigation = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        this.handleNavigation();
      }
    };

    navigationInterval = setInterval(checkNavigation, 1000);
    
    // Clean up interval when page unloads
    window.addEventListener('beforeunload', () => {
      if (navigationInterval) {
        clearInterval(navigationInterval);
      }
    });
  }

  handleNavigation() {
    this.detection.stopObserver();
    this.button.savedResponses.clear();

    this.waitForChatGPTReady().then(() => {
      this.detection.startObserver((node) => this.checkForNewResponses(node));
      this.button.addSaveButtonsToAllResponses(this.detection, this.storage);
    });
  }

  monitorThemeChanges() {
    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
          // Theme changed, update existing buttons
          setTimeout(() => {
            this.button.updateButtonThemes();
          }, 100);
        }
      });
    });

    // Observe document and body for theme changes
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
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

// Add visual indicator that extension is loaded
const indicator = document.createElement('div');
indicator.id = 'savechat-indicator';
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #10b981;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10000;
  opacity: 0.8;
`;
indicator.textContent = 'SaveChat Loaded';
document.body.appendChild(indicator);

// Remove indicator after 3 seconds
setTimeout(() => {
  if (indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
}, 3000);

// Manual trigger function for testing
window.triggerSaveChat = () => {
  console.log('SaveChat: Manual trigger called');
  if (window.saveChatInstance) {
    console.log('SaveChat: Using existing instance');
    window.saveChatInstance.button.addSaveButtonsToAllResponses(
      window.saveChatInstance.detection, 
      window.saveChatInstance.storage
    );
  } else {
    console.log('SaveChat: Creating new instance');
    window.saveChatInstance = new SaveChatContent();
  }
};

// Debug function to check current state
window.debugSaveChat = () => {
  console.log('SaveChat: Debug info:');
  console.log('- Instance exists:', !!window.saveChatInstance);
  if (window.saveChatInstance) {
    console.log('- Detection module:', window.saveChatInstance.detection);
    console.log('- Button module:', window.saveChatInstance.button);
    console.log('- Storage module:', window.saveChatInstance.storage);
    
    const responses = window.saveChatInstance.detection.findExistingResponses();
    console.log('- Found responses:', responses.length);
    responses.forEach((r, i) => {
      console.log(`  Response ${i}:`, r);
    });
  }
}; 
