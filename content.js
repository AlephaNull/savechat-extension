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

    // Wait for ChatGPT's DOM to be ready before starting
    this.waitForChatGPTReady().then(() => {
      console.log('SaveChat: ChatGPT DOM is ready, starting initialization...');
      
      // Debug: Log current page structure
      this.debugPageStructure();

      // Start observing for new responses
      this.startObserver();

      // Add save buttons to existing responses
      this.addSaveButtonsToExistingResponses();

      // More aggressive retry strategy for first response
      setTimeout(() => {
        console.log('SaveChat: First retry to find responses...');
        this.addSaveButtonsToExistingResponses();
      }, 1000);

      setTimeout(() => {
        console.log('SaveChat: Second retry to find responses...');
        this.addSaveButtonsToExistingResponses();
      }, 2000);

      setTimeout(() => {
        console.log('SaveChat: Third retry to find responses...');
        this.addSaveButtonsToExistingResponses();
      }, 3000);

      // Keep trying for a while to catch the first response
      let retryCount = 0;
      const maxRetries = 15;
      const retryInterval = setInterval(() => {
        retryCount++;
        console.log(`SaveChat: Retry ${retryCount}/${maxRetries} for first response...`);
        this.addSaveButtonsToExistingResponses();

        if (retryCount >= maxRetries) {
          clearInterval(retryInterval);
          console.log('SaveChat: Stopped retrying for first response');
        }
      }, 2000);
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        // Check if extension context is valid
        if (!this.isExtensionContextValid()) {
          console.log('SaveChat: Extension context invalid in message listener');
          sendResponse(null);
          return;
        }

        if (request.action === 'getRecentSaved') {
          this.getRecentSavedResponse().then(sendResponse);
          return true; // Keep message channel open for async response
        }
      } catch (error) {
        console.error('SaveChat: Error in message listener:', error);
        sendResponse(null);
      }
    });

    // Monitor for navigation changes (ChatGPT is a SPA)
    this.monitorNavigation();

    // Periodically check if extension context is still valid
    this.startContextMonitoring();
  }

  startContextMonitoring() {
    // Check extension context every 30 seconds
    setInterval(() => {
      if (!this.isExtensionContextValid()) {
        console.log('SaveChat: Extension context became invalid, handling...');
        this.handleContextInvalidation();
      }
    }, 30000);
  }

  async waitForChatGPTReady() {
    // Wait for ChatGPT's main elements to be present
    const maxWaitTime = 10000; // 10 seconds max
    const checkInterval = 100; // Check every 100ms
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      // Check for ChatGPT's main container
      const mainContainer = this.findChatContainer();
      if (mainContainer && mainContainer !== document.body) {
        console.log('SaveChat: ChatGPT container found after', elapsed, 'ms');
        return;
      }

      // Also check for any response elements
      const hasResponses = document.querySelector('[data-message-author-role="assistant"], .markdown, .prose');
      if (hasResponses) {
        console.log('SaveChat: Response elements found after', elapsed, 'ms');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    console.log('SaveChat: Timeout waiting for ChatGPT to be ready, proceeding anyway...');
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

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      console.log('SaveChat: PushState detected');
      setTimeout(() => this.handleNavigation(), 100);
    }.bind(this);

    history.replaceState = function (...args) {
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

    // Wait for ChatGPT to be ready, then re-initialize
    this.waitForChatGPTReady().then(() => {
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
    });
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
        // Log the data-message-author-role attribute for the first element
        const role = found[0].getAttribute('data-message-author-role');
        if (role) {
          console.log(`SaveChat: First ${name} role: ${role}`);
        }
      }
    });

    // Specifically check for user vs assistant messages
    const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
    const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
    
    console.log(`SaveChat: User messages: ${userMessages.length}`);
    console.log(`SaveChat: Assistant messages: ${assistantMessages.length}`);
    
    // Log a few examples of each
    if (userMessages.length > 0) {
      console.log('SaveChat: Example user message:', userMessages[0]);
    }
    if (assistantMessages.length > 0) {
      console.log('SaveChat: Example assistant message:', assistantMessages[0]);
    }
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
      // Main chat area selectors
      '[data-testid="conversation-turn-2"]',
      '[data-testid="conversation-turn-3"]',
      '[data-testid="conversation-turn-4"]',
      '.flex.flex-col.items-center',
      '[role="main"]',
      '.flex-1.overflow-hidden',
      'main',
      '#__next',
      '.min-h-screen',
      // New ChatGPT selectors
      '[data-testid="chat-messages"]',
      '.flex.flex-col.items-center.text-base',
      '.flex.flex-col.items-center.text-base.md\\:max-w-2xl.lg\\:max-w-[38rem].xl\\:max-w-3xl',
      // Fallback to body if nothing else works
      'body'
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
      // Try multiple selectors for ChatGPT responses - be more specific about assistant responses
      const selectors = [
        'div[data-message-author-role="assistant"]',
        '[data-message-author-role="assistant"]',
        // More specific selectors for assistant responses
        '.group.w-full.text-gray-800.dark\\:text-gray-100[data-message-author-role="assistant"]',
        '.flex.flex-col.items-center.text-base[data-message-author-role="assistant"]',
        // Only look for markdown/prose within assistant messages
        '[data-message-author-role="assistant"] .markdown',
        '[data-message-author-role="assistant"] .prose',
        '[data-message-author-role="assistant"] .whitespace-pre-wrap'
      ];

      selectors.forEach(selector => {
        const responses = node.querySelectorAll(selector);
        if (responses.length > 0) {
          console.log(`SaveChat: Found ${responses.length} response(s) in added node with selector: ${selector}`);
          responses.forEach(response => {
            // Check if this looks like an assistant response
            if (this.looksLikeAssistantResponse(response)) {
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
      // More specific selectors for assistant responses
      '.group.w-full.text-gray-800.dark\\:text-gray-100[data-message-author-role="assistant"]',
      '.flex.flex-col.items-center.text-base[data-message-author-role="assistant"]',
      // Only look for markdown/prose within assistant messages
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"] .prose',
      '[data-message-author-role="assistant"] .whitespace-pre-wrap'
    ];

    return node.matches && responseSelectors.some(selector => node.matches(selector));
  }

  looksLikeAssistantResponse(element) {
    // Check if this element looks like an assistant response
    const isAssistant = element.getAttribute('data-message-author-role') === 'assistant';
    const isUser = element.getAttribute('data-message-author-role') === 'user';
    
    // If it's explicitly marked as user, it's not an assistant response
    if (isUser) {
      return false;
    }
    
    // If it's not explicitly marked as assistant, we need to be more careful
    if (!isAssistant) {
      // Check if this element is actually part of a user message
      const parentUser = element.closest('[data-message-author-role="user"]');
      if (parentUser) {
        return false;
      }
      
      // Check if this element contains user input elements
      const hasUserInput = element.querySelector('textarea, input, [contenteditable="true"], [role="textbox"]');
      if (hasUserInput) {
        return false;
      }
      
      // Check if this element is in a user message container
      const userContainer = element.closest('.group[data-message-author-role="user"], .flex[data-message-author-role="user"]');
      if (userContainer) {
        return false;
      }
    }
    
    const hasMarkdown = element.querySelector('.markdown, .prose, .whitespace-pre-wrap');
    const hasTextContent = element.textContent && element.textContent.trim().length > 10;
    
    // Check for common ChatGPT response patterns
    const hasResponseClasses = element.className.includes('group') || 
                              element.className.includes('flex') ||
                              element.className.includes('text-gray');
    
    // Check if it's not a user input area
    const isNotInput = !element.querySelector('textarea, input, [contenteditable="true"]');
    
    // Check if it's not a button or UI element
    const isNotUI = !element.matches('button, .button, [role="button"]') && 
                   !element.closest('button, .button, [role="button"]');
    
    // Check if it's not already a save button
    const isNotSaveButton = !element.classList.contains('savechat-button') && 
                           !element.classList.contains('savechat-button-container');
    
    // Must be either explicitly marked as assistant OR have the right characteristics
    return (isAssistant || (hasMarkdown && hasTextContent && hasResponseClasses && isNotInput && isNotUI && isNotSaveButton));
  }

  addSaveButtonsToExistingResponses() {
    console.log('SaveChat: Looking for existing responses...');

    // First, clean up any duplicate buttons
    this.cleanupDuplicateButtons();

    // Try multiple selectors for ChatGPT responses - be more specific about assistant responses
    const selectors = [
      'div[data-message-author-role="assistant"]',
      '[data-message-author-role="assistant"]',
      // More specific selectors for assistant responses
      '.group.w-full.text-gray-800.dark\\:text-gray-100[data-message-author-role="assistant"]',
      '.flex.flex-col.items-center.text-base[data-message-author-role="assistant"]',
      // Only look for markdown/prose within assistant messages
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"] .prose',
      '[data-message-author-role="assistant"] .whitespace-pre-wrap'
    ];

    let totalResponses = 0;
    selectors.forEach(selector => {
      const responses = document.querySelectorAll(selector);
      console.log(`SaveChat: Found ${responses.length} responses with selector: ${selector}`);
      responses.forEach(response => {
        // Use the same logic as checkForNewResponses
        if (this.looksLikeAssistantResponse(response)) {
          this.addSaveButton(response);
          totalResponses++;
        }
      });
    });

    console.log(`SaveChat: Total responses processed: ${totalResponses}`);
  }

  cleanupDuplicateButtons() {
    // Find all save buttons
    const saveButtons = document.querySelectorAll('.savechat-button');
    
    saveButtons.forEach(button => {
      const responseElement = button.closest('[data-message-author-role="assistant"], .group, .flex.flex-col');
      
      if (responseElement) {
        // Check if this response has multiple save buttons
        const buttonsInResponse = responseElement.querySelectorAll('.savechat-button');
        
        if (buttonsInResponse.length > 1) {
          console.log('SaveChat: Found duplicate buttons, removing extras...');
          // Keep only the first button, remove the rest
          for (let i = 1; i < buttonsInResponse.length; i++) {
            buttonsInResponse[i].remove();
          }
        }
      }
    });
  }

  addSaveButton(responseElement) {
    // Avoid adding multiple buttons - check more thoroughly
    if (responseElement.querySelector('.savechat-button') || 
        responseElement.closest('.savechat-button')) {
      console.log('SaveChat: Button already exists for this response');
      return;
    }

    // Also check if this response element is already part of a response that has a button
    const parentWithButton = responseElement.closest('[data-message-author-role="assistant"], .group, .flex.flex-col');
    if (parentWithButton && parentWithButton !== responseElement && 
        parentWithButton.querySelector('.savechat-button')) {
      console.log('SaveChat: Parent response already has a button');
      return;
    }

    console.log('SaveChat: Adding save button to response element:', responseElement);

    // Check if the response is ready for button insertion
    if (!this.isResponseReady(responseElement)) {
      console.log('SaveChat: Response not ready yet, will retry...');
      // Retry after a short delay
      setTimeout(() => {
        if (!responseElement.querySelector('.savechat-button') && 
            !responseElement.closest('.savechat-button')) {
          this.addSaveButton(responseElement);
        }
      }, 500);
      return;
    }

    // Create save button that matches ChatGPT's toolbar style
    const saveButton = document.createElement('button');
    saveButton.className = 'savechat-button';
    saveButton.setAttribute('data-testid', 'savechat-save-button');
    saveButton.setAttribute('aria-label', 'Save response');
    saveButton.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 8px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #6b7280;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      margin: 0;
      line-height: 1;
      min-width: 32px;
      height: 32px;
      position: relative;
    `;
    
    // Create SVG icon similar to ChatGPT's style
    const svgIcon = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
        <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9L11 6H19C20.1046 6 21 6.89543 21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 21V13H7V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 3V6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    saveButton.innerHTML = `
      ${svgIcon}
      <span style="font-size: 14px; font-weight: 500;">Save</span>
    `;

    // Add hover effects that match ChatGPT's style
    saveButton.addEventListener('mouseenter', () => {
      saveButton.style.background = '#f3f4f6';
      saveButton.style.color = '#374151';
    });

    saveButton.addEventListener('mouseleave', () => {
      saveButton.style.background = 'transparent';
      saveButton.style.color = '#6b7280';
    });

    // Add click handler
    saveButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      await this.saveResponse(responseElement, saveButton);
    });

    // Find the best place to insert the button
    const insertTarget = this.findInsertTarget(responseElement);
    if (insertTarget) {
      console.log('SaveChat: Inserting button into target:', insertTarget);
      insertTarget.appendChild(saveButton);
    } else {
      console.log('SaveChat: Could not find insert target for button, will retry...');
      // Retry after a short delay in case the toolbar appears later
      setTimeout(() => {
        if (!responseElement.querySelector('.savechat-button')) {
          const retryTarget = this.findInsertTarget(responseElement);
          if (retryTarget) {
            console.log('SaveChat: Found insert target on retry');
            retryTarget.appendChild(saveButton);
          } else {
            console.log('SaveChat: Still no insert target found, using fallback');
            // Fallback: insert at the end of the response
            responseElement.appendChild(saveButton);
          }
        }
      }, 1000);
    }
  }

  isResponseReady(responseElement) {
    // Check if the response has enough content to be considered ready
    const hasTextContent = responseElement.textContent && responseElement.textContent.trim().length > 10;
    const hasMarkdown = responseElement.querySelector('.markdown, .prose, .whitespace-pre-wrap');
    const hasStructure = responseElement.children.length > 0;
    
    // Response is ready if it has text content and some structure
    return hasTextContent && (hasMarkdown || hasStructure);
  }

  findInsertTarget(responseElement) {
    // Debug: Log what we're looking for
    console.log('SaveChat: Looking for toolbar in response element:', responseElement);
    
    // First, try to find the ChatGPT toolbar (where copy and edit buttons are)
    const toolbarSelectors = [
      // ChatGPT's current toolbar selectors (updated for latest version)
      '[data-testid="message-actions"]',
      '.flex.items-center.justify-between',
      '.flex.items-center.gap-2',
      '.flex.items-center.space-x-2',
      // Look for the specific toolbar container that appears after responses
      '.flex.items-center.gap-1',
      '.flex.items-center.gap-3',
      // More specific patterns for ChatGPT's toolbar
      'div[class*="flex"][class*="items-center"][class*="gap"]',
      // Look for containers with copy/edit buttons
      'div:has(button[data-testid*="copy"])',
      'div:has(button[aria-label*="copy"])',
      'div:has(button[aria-label*="Copy"])',
      // Fallback selectors
      '.flex.items-center',
      '.flex.gap-2',
      '.flex.space-x-2'
    ];

    // First, try to find toolbar within the response element
    for (const selector of toolbarSelectors) {
      const toolbar = responseElement.querySelector(selector);
      if (toolbar) {
        console.log('SaveChat: Found potential toolbar with selector:', selector, toolbar);
        if (this.looksLikeToolbar(toolbar)) {
          console.log('SaveChat: Confirmed as toolbar with selector:', selector);
          return toolbar;
        } else {
          console.log('SaveChat: Not a toolbar:', toolbar);
        }
      }
    }

    // If no toolbar found in response element, look in the parent response container
    const parentResponse = responseElement.closest('[data-message-author-role="assistant"], .group, .flex.flex-col');
    if (parentResponse) {
      console.log('SaveChat: Looking in parent response:', parentResponse);
      for (const selector of toolbarSelectors) {
        const toolbar = parentResponse.querySelector(selector);
        if (toolbar) {
          console.log('SaveChat: Found potential toolbar in parent with selector:', selector, toolbar);
          if (this.looksLikeToolbar(toolbar)) {
            console.log('SaveChat: Confirmed as toolbar in parent with selector:', selector);
            return toolbar;
          } else {
            console.log('SaveChat: Not a toolbar in parent:', toolbar);
          }
        }
      }
    }

    // If still no toolbar, look for it in the broader context
    // ChatGPT sometimes places the toolbar outside the immediate response container
    const responseContainer = responseElement.closest('[data-message-author-role="assistant"]');
    if (responseContainer) {
      // Look for toolbar in the same container or adjacent elements
      const container = responseContainer.parentElement;
      if (container) {
        for (const selector of toolbarSelectors) {
          const toolbar = container.querySelector(selector);
          if (toolbar && this.looksLikeToolbar(toolbar)) {
            console.log('SaveChat: Found toolbar in container with selector:', selector);
            return toolbar;
          }
        }
      }
    }

    // If no toolbar found, try to create one or find a suitable place to insert
    const messageContainer = responseElement.closest('[data-message-author-role="assistant"]');
    if (messageContainer) {
      // Look for existing button containers or create a new one
      const existingButtonContainer = messageContainer.querySelector('.flex.items-center, .flex.gap-2');
      if (existingButtonContainer) {
        console.log('SaveChat: Found existing button container');
        return existingButtonContainer;
      }
    }

    // Fallback: try to find the message content area
    const contentSelectors = [
      '.markdown',
      '.prose',
      '.whitespace-pre-wrap',
      '[data-message-author-role="assistant"] > div:last-child'
    ];

    for (const selector of contentSelectors) {
      const target = responseElement.querySelector(selector);
      if (target) {
        console.log('SaveChat: Found content target with selector:', selector);
        return target;
      }
    }

    console.log('SaveChat: No specific target found, using response element itself');
    // Fallback to the response element itself
    return responseElement;
  }

  looksLikeToolbar(element) {
    // Check if this element looks like a toolbar
    const hasButtons = element.querySelectorAll('button, [role="button"], [data-testid*="button"]').length > 0;
    
    // Check for ChatGPT's specific toolbar buttons
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
    
    // Check for common ChatGPT toolbar patterns
    const hasToolbarClasses = element.className.includes('flex') && 
                             element.className.includes('items-center') &&
                             (element.className.includes('gap') || element.className.includes('space'));
    
    // It's likely a toolbar if it has buttons and contains ChatGPT's specific functionality
    const hasChatGPTButtons = hasCopyButton || hasEditButton || hasCanvasButton || hasRegenerateButton || hasContinueButton;
    
    // Additional check: look for SVG icons that are common in ChatGPT's toolbar
    const hasSVGIcons = element.querySelectorAll('svg').length > 0;
    
    return hasButtons && (hasChatGPTButtons || (hasToolbarClasses && hasSVGIcons));
  }

  async saveResponse(responseElement, button) {
    try {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.log('SaveChat: Extension context invalid, reloading content script...');
        this.handleContextInvalidation();
        return;
      }

      // Disable button during save
      button.disabled = true;

      // Extract response text
      const responseText = this.extractResponseText(responseElement);
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('No response text found');
      }

      // Get conversation context
      const context = this.getConversationContext(responseElement);

      // Create save data
      const saveData = {
        id: Date.now().toString(),
        text: responseText,
        context: context,
        url: window.location.href,
        timestamp: Date.now()
      };

      // Save to storage
      await this.saveToStorage(saveData);

      // Update button state
      this.updateButtonState(button, true);

      console.log('SaveChat: Response saved successfully');

    } catch (error) {
      console.error('SaveChat: Error saving response:', error);
      
      // Handle specific error types
      if (error.message.includes('Extension context invalidated')) {
        console.log('SaveChat: Extension context invalidated, reloading...');
        this.handleContextInvalidation();
      } else {
        // Update button state to show error
        this.updateButtonState(button, false, error.message);
      }
    }
  }

  extractResponseText(responseElement) {
    // Clone the element to avoid modifying the original
    const clone = responseElement.cloneNode(true);
    
    // Remove all save button containers from the clone
    const buttonContainers = clone.querySelectorAll('.savechat-button-container, .savechat-button');
    buttonContainers.forEach(button => button.remove());
    
    // Remove other UI elements that shouldn't be part of the response
    const uiElements = clone.querySelectorAll('button, .button, [role="button"], .ui-element, .controls');
    uiElements.forEach(element => element.remove());
    
    // Get the text content from the cleaned clone
    const text = clone.textContent || '';
    
    // Clean up the text
    return text
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/^\s+|\s+$/g, '')  // Trim whitespace
      .replace(/Save Response/g, '')  // Remove any remaining "Save Response" text
      .replace(/💾/g, '')  // Remove save icon
      .trim();
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
      try {
        // Check if extension context is valid before accessing storage
        if (!this.isExtensionContextValid()) {
          reject(new Error('Extension context invalidated'));
          return;
        }

        chrome.storage.local.get({ savedResponses: [] }, (data) => {
          try {
            // Check context again inside callback
            if (!this.isExtensionContextValid()) {
              reject(new Error('Extension context invalidated'));
              return;
            }

            const updated = [saveData, ...data.savedResponses];
            chrome.storage.local.set({ savedResponses: updated }, () => {
              try {
                // Final context check
                if (!this.isExtensionContextValid()) {
                  reject(new Error('Extension context invalidated'));
                  return;
                }

                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve();
                }
              } catch (error) {
                reject(error);
              }
            });
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  updateButtonState(button, saved, errorText = null) {
    if (saved) {
      // Success state - use checkmark SVG
      const checkmarkSVG = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      
      button.innerHTML = `
        ${checkmarkSVG}
        <span style="font-size: 14px; font-weight: 500;">Saved</span>
      `;
      button.style.background = '#10b981';
      button.style.color = 'white';
      button.disabled = true;

      // Reset after 3 seconds
      setTimeout(() => {
        if (button.parentNode) {
          const originalSVG = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
              <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9L11 6H19C20.1046 6 21 6.89543 21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M17 21V13H7V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 3V6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;
          
          button.innerHTML = `
            ${originalSVG}
            <span style="font-size: 14px; font-weight: 500;">Save</span>
          `;
          button.style.background = 'transparent';
          button.style.color = '#6b7280';
          button.disabled = false;
        }
      }, 3000);
    } else {
      // Error state - use X SVG
      const errorSVG = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      
      button.innerHTML = `
        ${errorSVG}
        <span style="font-size: 14px; font-weight: 500;">Error</span>
      `;
      button.style.background = '#ef4444';
      button.style.color = 'white';
      button.disabled = true;

      // Reset after 3 seconds
      setTimeout(() => {
        if (button.parentNode) {
          const originalSVG = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
              <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9L11 6H19C20.1046 6 21 6.89543 21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M17 21V13H7V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 3V6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;
          
          button.innerHTML = `
            ${originalSVG}
            <span style="font-size: 14px; font-weight: 500;">Save</span>
          `;
          button.style.background = 'transparent';
          button.style.color = '#6b7280';
          button.style.borderColor = 'transparent';
          button.disabled = false;
        }
      }, 3000);
    }
  }

  async getRecentSavedResponse() {
    return new Promise((resolve) => {
      try {
        // Check if extension context is valid
        if (!this.isExtensionContextValid()) {
          console.log('SaveChat: Extension context invalid in getRecentSavedResponse');
          resolve(null);
          return;
        }

        chrome.storage.local.get({ savedResponses: [] }, (data) => {
          try {
            // Check context again inside callback
            if (!this.isExtensionContextValid()) {
              console.log('SaveChat: Extension context invalid in storage callback');
              resolve(null);
              return;
            }

            const responses = data.savedResponses || [];
            const recentResponse = responses.length > 0 ? responses[0] : null;
            resolve(recentResponse);
          } catch (error) {
            console.error('SaveChat: Error in getRecentSavedResponse callback:', error);
            resolve(null);
          }
        });
      } catch (error) {
        console.error('SaveChat: Error in getRecentSavedResponse:', error);
        resolve(null);
      }
    });
  }

  isExtensionContextValid() {
    try {
      // Try to access a Chrome API to check if context is valid
      return typeof chrome !== 'undefined' && 
             chrome.runtime && 
             chrome.runtime.id;
    } catch (error) {
      return false;
    }
  }

  handleContextInvalidation() {
    // Remove all existing buttons
    const existingButtons = document.querySelectorAll('.savechat-button');
    existingButtons.forEach(button => button.remove());

    // Try to reinitialize after a short delay
    setTimeout(() => {
      if (this.isExtensionContextValid()) {
        console.log('SaveChat: Reinitializing after context invalidation...');
        this.init();
      } else {
        console.log('SaveChat: Extension context still invalid, user may need to reload page');
        // Show a message to the user
        this.showContextError();
      }
    }, 1000);
  }

  showContextError() {
    // Create a notification to inform the user
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">SaveChat Extension Error</div>
      <div style="font-size: 12px;">Please refresh the page to restore functionality.</div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
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
