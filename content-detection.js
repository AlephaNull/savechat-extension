// SaveChat Content Detection Module
// Handles detecting ChatGPT responses and action trays

class SaveChatDetection {
  constructor() {
    this.observer = null;
  }

  startObserver(callback) {
    console.log('SaveChat: Starting mutation observer...');
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            callback(node);
          }
        });
      });
    });

    const chatContainer = this.findChatContainer();
    console.log('SaveChat: Found chat container:', chatContainer);
    if (chatContainer) {
      this.observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
      console.log('SaveChat: Observer started successfully');
    } else {
      console.log('SaveChat: No chat container found!');
    }
  }

  stopObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  findChatContainer() {
    const selectors = [
      'main',
      '[role="main"]',
      '.flex.flex-col.items-center',
      '.flex.flex-col',
      '#__next',
      '[data-testid="conversation-turn"]'
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector);
      console.log(`SaveChat: Checking selector "${selector}":`, container);
      if (container) {
        console.log(`SaveChat: Using container:`, container);
        return container;
      }
    }
    console.log('SaveChat: No container found, using document.body');
    return document.body;
  }

  isResponseNode(node) {
    const responseSelectors = [
      'div[data-message-author-role="assistant"]',
      '[data-message-author-role="assistant"]',
      '.group.w-full.text-gray-800.dark\\:text-gray-100[data-message-author-role="assistant"]',
      '.flex.flex-col.items-center.text-base[data-message-author-role="assistant"]',
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"] .prose',
      '[data-message-author-role="assistant"] .whitespace-pre-wrap'
    ];

    return node.matches && responseSelectors.some(selector => node.matches(selector));
  }

  looksLikeAssistantResponse(element) {
    const isAssistant = element.getAttribute('data-message-author-role') === 'assistant';
    const isUser = element.getAttribute('data-message-author-role') === 'user';
    
    if (isUser) return false;
    
    if (!isAssistant) {
      const parentUser = element.closest('[data-message-author-role="user"]');
      if (parentUser) return false;
      
      const hasUserInput = element.querySelector('textarea, input, [contenteditable="true"], [role="textbox"]');
      if (hasUserInput) return false;
      
      const userContainer = element.closest('.group[data-message-author-role="user"], .flex[data-message-author-role="user"]');
      if (userContainer) return false;
    }
    
    const hasMarkdown = element.querySelector('.markdown, .prose, .whitespace-pre-wrap');
    const hasTextContent = element.textContent && element.textContent.trim().length > 10;
    const hasResponseClasses = element.className.includes('group') || 
                              element.className.includes('flex') ||
                              element.className.includes('text-gray');
    const isNotInput = !element.querySelector('textarea, input, [contenteditable="true"]');
    const isNotUI = !element.matches('button, .button, [role="button"]') && 
                   !element.closest('button, .button, [role="button"]');
    const isNotSaveButton = !element.classList.contains('savechat-button') && 
                           !element.classList.contains('savechat-button-container');
    
    return (isAssistant || (hasMarkdown && hasTextContent && hasResponseClasses && isNotInput && isNotUI && isNotSaveButton));
  }

  findInsertTarget(responseElement) {
    console.log('SaveChat: Finding insert target for:', responseElement);
    
    const actionTraySelectors = [
      '[data-testid="message-actions"]',
      '[data-testid="message-actions-toolbar"]',
      '.flex.items-center.justify-end.gap-1',
      '.flex.items-center.justify-end.gap-2',
      '.flex.items-center.gap-1',
      '.flex.items-center.gap-2',
      'div[class*="flex"][class*="items-center"][class*="gap"]:has(button[data-testid*="copy"])',
      'div[class*="flex"][class*="items-center"][class*="gap"]:has(button[aria-label*="copy"])',
      'div[class*="flex"][class*="items-center"][class*="gap"]:has(button[aria-label*="Copy"])',
      'div:has(button[data-testid*="copy"])',
      'div:has(button[aria-label*="copy"])',
      'div:has(button[aria-label*="Copy"])',
      '[data-message-author-role="assistant"] > div:last-child',
      '.group > div:last-child',
      '.flex.items-center.justify-end',
      '.flex.items-center.gap-1',
      '.flex.items-center.gap-2'
    ];

    for (const selector of actionTraySelectors) {
      const actionTray = responseElement.querySelector(selector);
      console.log(`SaveChat: Checking selector "${selector}":`, actionTray);
      if (actionTray && this.looksLikeActionTray(actionTray)) {
        console.log('SaveChat: Found valid action tray:', actionTray);
        return actionTray;
      }
    }

    const parentResponse = responseElement.closest('[data-message-author-role="assistant"], .group, .flex.flex-col');
    if (parentResponse) {
      for (const selector of actionTraySelectors) {
        const actionTray = parentResponse.querySelector(selector);
        if (actionTray && this.looksLikeActionTray(actionTray)) {
          return actionTray;
        }
      }
    }

    const responseContainer = responseElement.closest('[data-message-author-role="assistant"]');
    if (responseContainer) {
      const container = responseContainer.parentElement;
      if (container) {
        for (const selector of actionTraySelectors) {
          const actionTray = container.querySelector(selector);
          if (actionTray && this.looksLikeActionTray(actionTray)) {
            return actionTray;
          }
        }
      }
    }

    const messageContainer = responseElement.closest('[data-message-author-role="assistant"]');
    if (messageContainer) {
      const existingButtonContainer = messageContainer.querySelector('.flex.items-center, .flex.gap-2');
      if (existingButtonContainer) {
        return existingButtonContainer;
      }
    }

    const contentSelectors = [
      '.markdown',
      '.prose',
      '.whitespace-pre-wrap',
      '[data-message-author-role="assistant"] > div:last-child'
    ];

    for (const selector of contentSelectors) {
      const target = responseElement.querySelector(selector);
      if (target) {
        return target;
      }
    }

    return responseElement;
  }

  looksLikeActionTray(element) {
    console.log('SaveChat: Checking if element looks like action tray:', element);
    
    const hasButtons = element.querySelectorAll('button, [role="button"], [data-testid*="button"]').length > 0;
    console.log('SaveChat: Has buttons:', hasButtons);
    
    const hasCopyButton = element.textContent.includes('Copy') || 
                         element.querySelector('[data-testid*="copy"]') ||
                         element.querySelector('[aria-label*="copy"]') ||
                         element.querySelector('[aria-label*="Copy"]') ||
                         element.querySelector('button[title*="copy"]') ||
                         element.querySelector('button[title*="Copy"]');
    
    const hasEditButton = element.textContent.includes('Edit') || 
                         element.querySelector('[data-testid*="edit"]') ||
                         element.querySelector('[aria-label*="edit"]') ||
                         element.querySelector('[aria-label*="Edit"]') ||
                         element.querySelector('button[title*="edit"]') ||
                         element.querySelector('button[title*="Edit"]');
    
    const hasCanvasButton = element.textContent.includes('Canvas') || 
                           element.querySelector('[data-testid*="canvas"]') ||
                           element.querySelector('[aria-label*="canvas"]') ||
                           element.querySelector('[aria-label*="Canvas"]');
    
    const hasRegenerateButton = element.textContent.includes('Regenerate') ||
                               element.querySelector('[data-testid*="regenerate"]') ||
                               element.querySelector('[aria-label*="regenerate"]');
    
    const hasContinueButton = element.textContent.includes('Continue') ||
                             element.querySelector('[data-testid*="continue"]') ||
                             element.querySelector('[aria-label*="continue"]');
    
    const hasReadAloudButton = element.textContent.includes('Read aloud') ||
                              element.querySelector('[data-testid*="read"]') ||
                              element.querySelector('[aria-label*="read"]');
    
    const hasActionTrayClasses = element.className.includes('flex') && 
                                element.className.includes('items-center') &&
                                (element.className.includes('gap') || element.className.includes('space'));
    
    const hasChatGPTButtons = hasCopyButton || hasEditButton || hasCanvasButton || hasRegenerateButton || hasContinueButton || hasReadAloudButton;
    const hasSVGIcons = element.querySelectorAll('svg').length > 0;
    const isAtEnd = element === element.parentElement?.lastElementChild || 
                   element.nextElementSibling === null;
    
    // More lenient check - if it has buttons and looks like an action area, consider it valid
    const isActionTray = hasButtons && (hasChatGPTButtons || hasActionTrayClasses || hasSVGIcons);
    
    console.log('SaveChat: Action tray check results:', {
      hasButtons,
      hasChatGPTButtons,
      hasActionTrayClasses,
      hasSVGIcons,
      isAtEnd,
      isActionTray,
      className: element.className,
      textContent: element.textContent.substring(0, 100)
    });
    
    return isActionTray;
  }

  isResponseReady(responseElement) {
    const hasTextContent = responseElement.textContent && responseElement.textContent.trim().length > 10;
    const hasMarkdown = responseElement.querySelector('.markdown, .prose, .whitespace-pre-wrap');
    const hasStructure = responseElement.children.length > 0;
    
    // More lenient check - if it has any content, consider it ready
    const isReady = hasTextContent || hasMarkdown || hasStructure;
    console.log('SaveChat: Response ready check:', { hasTextContent, hasMarkdown, hasStructure, isReady });
    
    return isReady;
  }

  async waitForActionTray(responseElement) {
    const maxWaitTime = 3000; // Reduced from 10000ms to 3000ms
    const checkInterval = 100; // Reduced from 200ms to 100ms
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      // Check if element is still in DOM
      if (!responseElement.isConnected) {
        return null;
      }
      
      const actionTray = this.findInsertTarget(responseElement);
      if (actionTray && this.looksLikeActionTray(actionTray)) {
        return actionTray;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    return null;
  }

  findExistingResponses() {
    const selectors = [
      'div[data-message-author-role="assistant"]',
      '[data-message-author-role="assistant"]',
      '.group.w-full.text-gray-800.dark\\:text-gray-100[data-message-author-role="assistant"]',
      '.flex.flex-col.items-center.text-base[data-message-author-role="assistant"]',
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"] .prose',
      '[data-message-author-role="assistant"] .whitespace-pre-wrap'
    ];

    const responses = [];
    selectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      found.forEach(response => {
        if (this.looksLikeAssistantResponse(response)) {
          responses.push(response);
        }
      });
    });

    return responses;
  }
}

// Export for use in other modules
window.SaveChatDetection = SaveChatDetection; 