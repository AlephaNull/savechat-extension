// SaveChat Storage Module
// Handles saving responses and storage operations

class SaveChatStorage {
  constructor() {
    this.savedResponses = new Set();
  }

  async saveResponse(responseElement, button) {
    try {
      if (!this.isExtensionContextValid()) {
        this.handleContextInvalidation();
        return;
      }

      button.disabled = true;

      const responseText = this.extractResponseText(responseElement);
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('No response text found');
      }

      const context = this.getConversationContext(responseElement);

      const saveData = {
        id: Date.now().toString(),
        text: responseText,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        context: context
      };

      await this.saveToStorage(saveData);
      this.savedResponses.add(saveData.id);
      this.showSaveSuccess(button);

    } catch (error) {
      console.error('SaveChat: Error saving response:', error);
      this.showSaveError(button);
    } finally {
      button.disabled = false;
    }
  }

  extractResponseText(responseElement) {
    const markdownSelectors = [
      '.markdown',
      '.prose',
      '.whitespace-pre-wrap',
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"] .prose'
    ];

    for (const selector of markdownSelectors) {
      const markdownElement = responseElement.querySelector(selector);
      if (markdownElement) {
        return markdownElement.textContent.trim();
      }
    }

    return responseElement.textContent.trim();
  }

  getConversationContext(responseElement) {
    const context = {
      title: this.getConversationTitle(),
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    const responseContainer = responseElement.closest('[data-message-author-role="assistant"]');
    if (responseContainer) {
      const messageIndex = this.getMessageIndex(responseContainer);
      if (messageIndex !== -1) {
        context.messageIndex = messageIndex;
      }
    }

    return context;
  }

  getConversationTitle() {
    const titleSelectors = [
      'h1',
      '.text-2xl',
      '.text-xl',
      '[data-testid="conversation-title"]',
      'title'
    ];

    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();
      }
    }

    return 'ChatGPT Conversation';
  }

  getMessageIndex(responseContainer) {
    const allMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
    for (let i = 0; i < allMessages.length; i++) {
      if (allMessages[i] === responseContainer) {
        return i + 1;
      }
    }
    return -1;
  }

  async saveToStorage(saveData) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get({ savedResponses: [] }, (data) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        const responses = data.savedResponses || [];
        responses.unshift(saveData);

        chrome.storage.local.set({ savedResponses: responses }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    });
  }

  showSaveSuccess(button) {
    const originalHTML = button.innerHTML;
    const originalBackground = button.style.background;
    const originalColor = button.style.color;
    const originalBorderColor = button.style.borderColor;
    const originalOpacity = button.style.opacity;

    button.innerHTML = '<span class="icon">✅</span> Saved!';
    button.style.background = '#10b981';
    button.style.color = 'white';
    button.style.borderColor = '#10b981';
    button.style.opacity = '1';

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = originalBackground;
      button.style.color = originalColor;
      button.style.borderColor = originalBorderColor;
      button.style.opacity = originalOpacity;
    }, 2000);
  }

  showSaveError(button) {
    const originalHTML = button.innerHTML;
    const originalBackground = button.style.background;
    const originalColor = button.style.color;
    const originalBorderColor = button.style.borderColor;
    const originalOpacity = button.style.opacity;

    button.innerHTML = '<span class="icon">❌</span> Error';
    button.style.background = '#ef4444';
    button.style.color = 'white';
    button.style.borderColor = '#ef4444';
    button.style.opacity = '1';

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = originalBackground;
      button.style.color = originalColor;
      button.style.borderColor = originalBorderColor;
      button.style.opacity = originalOpacity;
    }, 2000);
  }

  isExtensionContextValid() {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.id;
  }

  handleContextInvalidation() {
    console.log('SaveChat: Extension context invalid, reloading content script...');
    window.location.reload();
  }

  async getRecentSavedResponse() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get({ savedResponses: [] }, (data) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          const responses = data.savedResponses || [];
          resolve(responses.length > 0 ? responses[0] : null);
        }
      });
    });
  }
}

// Export for use in other modules
window.SaveChatStorage = SaveChatStorage; 