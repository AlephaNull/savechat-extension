// SaveChat Content Script
// Handles injecting save buttons into ChatGPT responses

class SaveChatContent {
  constructor() {
    this.observer = null;
    this.savedResponses = new Set();
    this.currentUrl = window.location.href;
    this.init();
  }

  init() {
    console.log('SaveChat: Initializing content script...');
    
    // Debug: Log current page structure
    this.debugPageStructure();
    
    // Start observing for new responses
    this.startObserver();
    
    // Add save buttons to existing responses
    this.addSaveButtonsToExistingResponses();
    
    // Retry after a delay in case content loads dynamically
    setTimeout(() => {
      console.log('SaveChat: Retrying to find responses after delay...');
      this.addSaveButtonsToExistingResponses();
    }, 2000);
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getRecentSaved') {
        this.getRecentSavedResponse().then(sendResponse);
        return true; // Keep message channel open for async response
      }
    });
    
    // Monitor for navigation changes (ChatGPT is a SPA)
    this.monitorNavigation();
  }

  monitorNavigation() {
    // Watch for URL changes (ChatGPT navigation)
    let lastUrl = window.location.href;
    let lastConversationId = this.getConversationId();
    
    // Check for URL changes periodically
    setInterval(() => {
      const currentUrl = window.location.href;
      const currentConversationId = this.getConversationId();
      
      if (currentUrl !== lastUrl || currentConversationId !== lastConversationId) {
        console.log('SaveChat: Navigation detected, URL changed from', lastUrl, 'to', currentUrl);
        console.log('SaveChat: Conversation ID changed from', lastConversationId, 'to', currentConversationId);
        lastUrl = currentUrl;
        lastConversationId = currentConversationId;
        this.handleNavigation();
      }
    }, 1000);
    
    // Also listen for popstate events (back/forward buttons)
    window.addEventListener('popstate', () => {
      console.log('SaveChat: Popstate event detected');
      setTimeout(() => this.handleNavigation(), 100);
    });
    
    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      console.log('SaveChat: PushState detected');
      setTimeout(() => this.handleNavigation(), 100);
    }.bind(this);
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      console.log('SaveChat: ReplaceState detected');
      setTimeout(() => this.handleNavigation(), 100);
    }.bind(this);
    
    // Listen for clicks on conversation items in sidebar
    this.monitorSidebarClicks();
  }

  monitorSidebarClicks() {
    // Monitor for clicks on conversation items
    document.addEventListener('click', (event) => {
      // Check if the clicked element is a conversation link or item
      const target = event.target.closest('a[href*="/c/"], [data-testid*="conversation"], .group');
      if (target) {
        console.log('SaveChat: Sidebar conversation click detected');
        // Wait a bit for the navigation to complete
        setTimeout(() => this.handleNavigation(), 300);
      }
    });
  }

  getConversationId() {
    // Try to extract conversation ID from URL or page elements
    const url = window.location.href;
    const urlMatch = url.match(/\/c\/([a-zA-Z0-9-]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Fallback: try to get from page elements
    const titleElement = document.querySelector('h1, .text-lg, [data-testid="conversation-title"]');
    if (titleElement) {
      return titleElement.textContent.trim();
    }
    
    // Last fallback: use URL as conversation identifier
    return url;
  }

  handleNavigation() {
    console.log('SaveChat: Handling navigation change...');
    
    // Stop the current observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Clear saved responses set for new conversation
    this.savedResponses.clear();
    
    // Wait a bit for the new content to load, then re-initialize
    setTimeout(() => {
      console.log('SaveChat: Re-initializing after navigation...');
      this.startObserver();
      this.addSaveButtonsToExistingResponses();
      
      // Additional retry after navigation
      setTimeout(() => {
        console.log('SaveChat: Final retry after navigation...');
        this.addSaveButtonsToExistingResponses();
      }, 2000);
      
      // Keep trying for a while in case content loads very slowly
      let retryCount = 0;
      const maxRetries = 10;
      const retryInterval = setInterval(() => {
        retryCount++;
        console.log(`SaveChat: Retry ${retryCount}/${maxRetries} after navigation...`);
        this.addSaveButtonsToExistingResponses();
        
        if (retryCount >= maxRetries) {
          clearInterval(retryInterval);
          console.log('SaveChat: Stopped retrying after navigation');
        }
      }, 3000);
    }, 500);
  }

  debugPageStructure() {
    console.log('SaveChat: Debugging page structure...');
    
    // Check for common ChatGPT elements
    const elements = [
      { selector: '[data-message-author-role="assistant"]', name: 'Assistant messages' },
      { selector: '[data-message-author-role="user"]', name: 'User messages' },
      { selector: '.markdown', name: 'Markdown content' },
      { selector: '.prose', name: 'Prose content' },
      { selector: 'main', name: 'Main element' },
      { selector: '[role="main"]', name: 'Main role element' },
      { selector: '.flex.flex-col.items-center', name: 'Flex container' }
    ];
    
    elements.forEach(({ selector, name }) => {
      const found = document.querySelectorAll(selector);
      console.log(`SaveChat: ${name}: ${found.length} found`);
      if (found.length > 0) {
        console.log(`SaveChat: First ${name} element:`, found[0]);
      }
    });
  }

  startObserver() {
    // Use MutationObserver to detect new responses
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkForNewResponses(node);
          }
        });
      });
    });

    // Start observing the main chat container
    const chatContainer = this.findChatContainer();
    if (chatContainer) {
      console.log('SaveChat: Found chat container, starting observer');
      this.observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    } else {
      console.log('SaveChat: Could not find chat container');
    }
  }

  findChatContainer() {
    // Try different selectors for ChatGPT's main container
    const selectors = [
      '[data-testid="conversation-turn-2"]',
      '.flex.flex-col.items-center',
      '[role="main"]',
      '.flex-1.overflow-hidden',
      'main',
      '#__next',
      '.min-h-screen'
    ];
    
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) {
        console.log('SaveChat: Found container with selector:', selector);
        return container;
      }
    }
    
    console.log('SaveChat: No container found, using document.body');
    return document.body;
  }

  checkForNewResponses(node) {
    // Check if the added node is a response or contains responses
    if (this.isResponseNode(node)) {
      console.log('SaveChat: Found new response node');
      this.addSaveButton(node);
    } else if (node.querySelectorAll) {
      // Try multiple selectors for ChatGPT responses
      const selectors = [
        'div[data-message-author-role="assistant"]',
        '[data-message-author-role="assistant"]',
        '.group.w-full.text-gray-800.dark\\:text-gray-100',
        '.flex.flex-col.items-center.text-base'
      ];
      
      selectors.forEach(selector => {
        const responses = node.querySelectorAll(selector);
        if (responses.length > 0) {
          console.log(`SaveChat: Found ${responses.length} response(s) in added node with selector: ${selector}`);
          responses.forEach(response => {
            // Only add to assistant responses, not user messages
            if (response.getAttribute('data-message-author-role') === 'assistant' || 
                !response.getAttribute('data-message-author-role')) {
              this.addSaveButton(response);
            }
          });
        }
      });
    }
  }

  isResponseNode(node) {
    const responseSelectors = [
      'div[data-message-author-role="assistant"]',
      '[data-message-author-role="assistant"]',
      '.group.w-full.text-gray-800.dark\\:text-gray-100',
      '.flex.flex-col.items-center.text-base'
    ];
    
    return node.matches && responseSelectors.some(selector => node.matches(selector));
  }

  addSaveButtonsToExistingResponses() {
    console.log('SaveChat: Looking for existing responses...');
    
    // Try multiple selectors for ChatGPT responses
    const selectors = [
      'div[data-message-author-role="assistant"]',
      '[data-message-author-role="assistant"]',
      '.group.w-full.text-gray-800.dark\\:text-gray-100',
      '.flex.flex-col.items-center.text-base',
      '.markdown',
      '.prose'
    ];
    
    let totalResponses = 0;
    selectors.forEach(selector => {
      const responses = document.querySelectorAll(selector);
      console.log(`SaveChat: Found ${responses.length} responses with selector: ${selector}`);
      responses.forEach(response => {
        // Only add to assistant responses, not user messages
        if (response.getAttribute('data-message-author-role') === 'assistant' || 
            !response.getAttribute('data-message-author-role')) {
          this.addSaveButton(response);
          totalResponses++;
        }
      });
    });
    
    console.log(`SaveChat: Total responses processed: ${totalResponses}`);
  }

  addSaveButton(responseElement) {
    // Avoid adding multiple buttons
    if (responseElement.querySelector('.savechat-button')) {
      console.log('SaveChat: Button already exists for this response');
      return;
    }

    console.log('SaveChat: Adding save button to response element:', responseElement);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'savechat-button-container';
    buttonContainer.style.marginTop = '8px';
    buttonContainer.style.marginBottom = '8px';

    // Create save button
    const saveButton = document.createElement('button');
    saveButton.className = 'savechat-button';
    saveButton.innerHTML = `
      <span class="icon">💾</span>
      <span class="text">Save Response</span>
    `;

    // Add click handler
    saveButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      await this.saveResponse(responseElement, saveButton);
    });

    buttonContainer.appendChild(saveButton);
    
    // Find the best place to insert the button
    const insertTarget = this.findInsertTarget(responseElement);
    if (insertTarget) {
      console.log('SaveChat: Inserting button into target:', insertTarget);
      insertTarget.appendChild(buttonContainer);
    } else {
      console.log('SaveChat: Could not find insert target for button');
    }
  }

  findInsertTarget(responseElement) {
    // Try to find the message content area
    const selectors = [
      '.markdown',
      '.prose',
      '.whitespace-pre-wrap',
      '[data-message-author-role="assistant"] > div:last-child'
    ];
    
    for (const selector of selectors) {
      const target = responseElement.querySelector(selector);
      if (target) {
        console.log('SaveChat: Found insert target with selector:', selector);
        return target;
      }
    }
    
    console.log('SaveChat: No specific target found, using response element itself');
    // Fallback to the response element itself
    return responseElement;
  }

  async saveResponse(responseElement, button) {
    try {
      // Disable button during save
      button.disabled = true;
      
      // Extract response text
      const responseText = this.extractResponseText(responseElement);
      if (!responseText.trim()) {
        throw new Error('No text content found');
      }

      // Get conversation context
      const context = this.getConversationContext(responseElement);
      
      // Create save data
      const saveData = {
        text: responseText,
        context: context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        title: document.title
      };

      // Save to storage
      await this.saveToStorage(saveData);
      
      // Update button state
      this.updateButtonState(button, true);
      
      // Add to saved set
      this.savedResponses.add(responseElement);
      
      console.log('SaveChat: Response saved successfully');
      
    } catch (error) {
      console.error('SaveChat: Error saving response:', error);
      this.updateButtonState(button, false, 'Error');
    }
  }

  extractResponseText(responseElement) {
    // Try to get the markdown content
    const markdownElement = responseElement.querySelector('.markdown, .prose');
    if (markdownElement) {
      return markdownElement.innerText || markdownElement.textContent;
    }
    
    // Fallback to the entire response text
    return responseElement.innerText || responseElement.textContent;
  }

  getConversationContext(responseElement) {
    // Get the conversation title or first few messages for context
    const titleElement = document.querySelector('h1, .text-lg, [data-testid="conversation-title"]');
    const title = titleElement ? titleElement.textContent.trim() : 'ChatGPT Conversation';
    
    // Get a few messages before this response for context
    const messages = [];
    const messageElements = document.querySelectorAll('[data-message-author-role]');
    
    for (let i = 0; i < messageElements.length; i++) {
      const element = messageElements[i];
      if (element === responseElement) break;
      
      const role = element.getAttribute('data-message-author-role');
      const text = element.innerText || element.textContent;
      if (text.trim()) {
        messages.push({ role, text: text.substring(0, 100) + '...' });
      }
    }
    
    return {
      title,
      messages: messages.slice(-3) // Last 3 messages for context
    };
  }

  async saveToStorage(saveData) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get({ savedResponses: [] }, (data) => {
        const updated = [saveData, ...data.savedResponses];
        chrome.storage.local.set({ savedResponses: updated }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    });
  }

  updateButtonState(button, saved, errorText = null) {
    const iconSpan = button.querySelector('.icon');
    const textSpan = button.querySelector('.text');
    
    if (saved) {
      button.classList.add('saved');
      iconSpan.textContent = '✅';
      textSpan.textContent = 'Saved!';
      
      // Reset after 3 seconds
      setTimeout(() => {
        button.classList.remove('saved');
        iconSpan.textContent = '💾';
        textSpan.textContent = 'Save Response';
        button.disabled = false;
      }, 3000);
    } else {
      button.classList.remove('saved');
      iconSpan.textContent = '❌';
      textSpan.textContent = errorText || 'Save Response';
      button.disabled = false;
    }
  }

  async getRecentSavedResponse() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ savedResponses: [] }, (data) => {
        const responses = data.savedResponses || [];
        resolve(responses[0] || null);
      });
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
    console.log('SaveChat: Manual trigger called');
    window.saveChatInstance.addSaveButtonsToExistingResponses();
  } else {
    console.log('SaveChat: Instance not found, creating new one');
    window.saveChatInstance = new SaveChatContent();
  }
};

// Manual navigation trigger for testing
window.triggerSaveChatNavigation = () => {
  if (window.saveChatInstance) {
    console.log('SaveChat: Manual navigation trigger called');
    window.saveChatInstance.handleNavigation();
  } else {
    console.log('SaveChat: Instance not found, creating new one');
    window.saveChatInstance = new SaveChatContent();
  }
}; 