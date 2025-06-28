// SaveChat Content Script
// Handles injecting save buttons into ChatGPT responses

class SaveChatContent {
  constructor() {
    this.observer = null;
    this.savedResponses = new Set();
    this.init();
  }

  init() {
    // Start observing for new responses
    this.startObserver();
    
    // Add save buttons to existing responses
    this.addSaveButtonsToExistingResponses();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getRecentSaved') {
        this.getRecentSavedResponse().then(sendResponse);
        return true; // Keep message channel open for async response
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
      this.observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  findChatContainer() {
    // Try different selectors for ChatGPT's main container
    const selectors = [
      '[data-testid="conversation-turn-2"]',
      '.flex.flex-col.items-center',
      '[role="main"]',
      '.flex-1.overflow-hidden'
    ];
    
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) return container;
    }
    
    return document.body;
  }

  checkForNewResponses(node) {
    // Check if the added node is a response or contains responses
    if (this.isResponseNode(node)) {
      this.addSaveButton(node);
    } else if (node.querySelectorAll) {
      const responses = node.querySelectorAll('div[data-message-author-role="assistant"]');
      responses.forEach(response => this.addSaveButton(response));
    }
  }

  isResponseNode(node) {
    return node.matches && node.matches('div[data-message-author-role="assistant"]');
  }

  addSaveButtonsToExistingResponses() {
    const responses = document.querySelectorAll('div[data-message-author-role="assistant"]');
    responses.forEach(response => this.addSaveButton(response));
  }

  addSaveButton(responseElement) {
    // Avoid adding multiple buttons
    if (responseElement.querySelector('.savechat-button')) return;

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
      insertTarget.appendChild(buttonContainer);
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
      if (target) return target;
    }
    
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
    new SaveChatContent();
  });
} else {
  new SaveChatContent();
} 