// SaveChat Button Module
// Handles creating and managing save buttons

class SaveChatButton {
  constructor() {
    this.savedResponses = new Set();
    this.responseObservers = new WeakMap();
  }

  createSaveButton(responseElement) {
    const saveButton = document.createElement('button');
    saveButton.className = 'savechat-button';
    saveButton.setAttribute('data-testid', 'savechat-save-button');
    saveButton.setAttribute('aria-label', 'Save response');
    
    // Detect if we're in dark mode
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                      document.body.classList.contains('dark') ||
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const baseStyles = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      margin: 0;
      line-height: 1;
      min-width: 32px;
      height: 32px;
      position: relative;
      z-index: 1000;
    `;
    
    if (isDarkMode) {
      saveButton.style.cssText = baseStyles + `
        border: 1px solid #4b5563;
        background: transparent;
        color: #9ca3af;
        opacity: 0.8;
      `;
    } else {
      saveButton.style.cssText = baseStyles + `
        border: 1px solid #e5e7eb;
        background: transparent;
        color: #6b7280;
        opacity: 0.8;
      `;
    }
    
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

    // Set up hover effects based on theme
    if (isDarkMode) {
      saveButton.addEventListener('mouseenter', () => {
        saveButton.style.background = '#374151';
        saveButton.style.color = '#f9fafb';
        saveButton.style.borderColor = '#6b7280';
        saveButton.style.opacity = '1';
      });

      saveButton.addEventListener('mouseleave', () => {
        saveButton.style.background = 'transparent';
        saveButton.style.color = '#9ca3af';
        saveButton.style.borderColor = '#4b5563';
        saveButton.style.opacity = '0.8';
      });
    } else {
      saveButton.addEventListener('mouseenter', () => {
        saveButton.style.background = '#f3f4f6';
        saveButton.style.color = '#374151';
        saveButton.style.borderColor = '#d1d5db';
        saveButton.style.opacity = '1';
      });

      saveButton.addEventListener('mouseleave', () => {
        saveButton.style.background = 'transparent';
        saveButton.style.color = '#6b7280';
        saveButton.style.borderColor = '#e5e7eb';
        saveButton.style.opacity = '0.8';
      });
    }

    return saveButton;
  }

  addSaveButtonToResponse(responseElement, detectionModule, storageModule) {
    console.log('SaveChat: Attempting to add save button to:', responseElement);
    
    // Check if this specific response already has a save button
    if (responseElement.querySelector('.savechat-button')) {
      console.log('SaveChat: This response already has a save button, skipping');
      return;
    }

    // Check if any parent element has a save button
    const parentWithButton = responseElement.closest('[data-message-author-role="assistant"], .group, .flex.flex-col');
    if (parentWithButton && parentWithButton.querySelector('.savechat-button')) {
      console.log('SaveChat: Parent already has save button, skipping');
      return;
    }

    // Check if we're already processing this element
    if (responseElement.dataset.savechatProcessing === 'true') {
      console.log('SaveChat: Already processing this element, skipping');
      return;
    }

    // Mark this element as being processed
    responseElement.dataset.savechatProcessing = 'true';

    if (!detectionModule.isResponseReady(responseElement)) {
      console.log('SaveChat: Response not ready, retrying in 200ms');
      setTimeout(() => {
        // Remove processing flag before retry
        delete responseElement.dataset.savechatProcessing;
        if (!responseElement.querySelector('.savechat-button') && 
            !responseElement.closest('.savechat-button')) {
          this.addSaveButtonToResponse(responseElement, detectionModule, storageModule);
        }
      }, 200); // Reduced from 500ms to 200ms
      return;
    }

    console.log('SaveChat: Response ready, waiting for action tray...');
    detectionModule.waitForActionTray(responseElement).then((actionTray) => {
      console.log('SaveChat: Action tray found:', actionTray);
      if (actionTray && !actionTray.querySelector('.savechat-button')) {
        console.log('SaveChat: Creating and inserting save button');
        this.createAndInsertSaveButton(actionTray, responseElement, storageModule, detectionModule);
      } else if (!actionTray) {
        console.log('SaveChat: No action tray found, creating one...');
        const newActionTray = this.createActionTrayIfNeeded(responseElement);
        responseElement.appendChild(newActionTray);
        this.createAndInsertSaveButton(newActionTray, responseElement, storageModule, detectionModule);
      } else {
        console.log('SaveChat: Save button already exists');
      }
      // Remove processing flag
      delete responseElement.dataset.savechatProcessing;
    }).catch(() => {
      // Remove processing flag on error
      delete responseElement.dataset.savechatProcessing;
    });
  }

  addSaveButtonToExistingResponse(responseElement, detectionModule, storageModule) {
    const existingActionTray = detectionModule.findInsertTarget(responseElement);
    if (existingActionTray && detectionModule.looksLikeActionTray(existingActionTray) && 
        !existingActionTray.querySelector('.savechat-button')) {
      this.createAndInsertSaveButton(existingActionTray, responseElement, storageModule, detectionModule);
    } else {
      detectionModule.waitForActionTray(responseElement).then((actionTray) => {
        if (actionTray && !actionTray.querySelector('.savechat-button')) {
          this.createAndInsertSaveButton(actionTray, responseElement, storageModule, detectionModule);
        }
      });
    }
  }

  createAndInsertSaveButton(actionTray, responseElement, storageModule, detectionModule) {
    console.log('SaveChat: Creating and inserting save button into:', actionTray);
    let targetTray = actionTray;

    // Ensure the tray we use is at the end of the response
    const container = responseElement.closest('[data-message-author-role="assistant"]') || responseElement;
    const isDirectChild = targetTray.parentElement === container;
    const isLastChild = isDirectChild && targetTray === container.lastElementChild;
    if (!isDirectChild || !isLastChild) {
      // Create our own tray at the end to satisfy positioning requirement
      targetTray = this.createActionTrayIfNeeded(container);
      if (!targetTray.isConnected) container.appendChild(targetTray);
    }

    const saveButton = this.createSaveButton(responseElement);
    
    saveButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await storageModule.saveResponse(responseElement, saveButton);
    });

    targetTray.appendChild(saveButton);
    console.log('SaveChat: Save button inserted successfully');

    // Keep the button persistent even if ChatGPT re-renders this message
    this.setupPersistenceObserver(responseElement, detectionModule, storageModule);
  }

  createActionTrayIfNeeded(responseElement) {
    console.log('SaveChat: Creating action tray if needed for:', responseElement);
    
    // Check if there's already an action tray
    const existingTray = responseElement.querySelector('[data-testid="message-actions"], .flex.items-center.gap-1, .flex.items-center.gap-2');
    if (existingTray) {
      console.log('SaveChat: Action tray already exists:', existingTray);
      return existingTray;
    }

    // Create a new action tray as the last child of the response
    const actionTray = document.createElement('div');
    actionTray.className = 'flex items-center gap-2 justify-end mt-2 savechat-button-container';
    actionTray.setAttribute('data-testid', 'message-actions');
    actionTray.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 8px;
      padding: 4px 0;
    `;

    console.log('SaveChat: Created new action tray:', actionTray);
    return actionTray;
  }

  setupPersistenceObserver(responseElement, detectionModule, storageModule) {
    if (this.responseObservers.has(responseElement)) return;

    const ensureAtEnd = () => {
      const tray = responseElement.querySelector('.savechat-button')?.parentElement;
      if (tray && tray.parentElement === responseElement && tray !== responseElement.lastElementChild) {
        responseElement.appendChild(tray);
      }
    };

    const observer = new MutationObserver(() => {
      if (!responseElement.isConnected) {
        observer.disconnect();
        this.responseObservers.delete(responseElement);
        return;
      }
      let tray = detectionModule.findInsertTarget(responseElement);
      if (!tray || !detectionModule.looksLikeActionTray(tray)) {
        tray = this.createActionTrayIfNeeded(responseElement);
        if (!tray.isConnected) responseElement.appendChild(tray);
      }
      const hasButton = !!tray.querySelector('.savechat-button');
      if (!hasButton) {
        this.createAndInsertSaveButton(tray, responseElement, storageModule, detectionModule);
      }
      ensureAtEnd();
    });

    observer.observe(responseElement, { childList: true, subtree: true });
    this.responseObservers.set(responseElement, observer);

    // Initial position correction
    ensureAtEnd();
  }

  updateButtonThemes() {
    console.log('SaveChat: Updating button themes...');
    const saveButtons = document.querySelectorAll('.savechat-button');
    
    // Detect current theme
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                      document.body.classList.contains('dark') ||
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    saveButtons.forEach(button => {
      if (isDarkMode) {
        button.style.borderColor = '#4b5563';
        button.style.background = 'transparent';
        button.style.color = '#9ca3af';
        button.style.opacity = '0.8';
      } else {
        button.style.borderColor = '#e5e7eb';
        button.style.background = 'transparent';
        button.style.color = '#6b7280';
        button.style.opacity = '0.8';
      }
    });
  }

  cleanupDuplicateButtons() {
    const saveButtons = document.querySelectorAll('.savechat-button');
    console.log(`SaveChat: Cleaning up ${saveButtons.length} save buttons`);
    
    saveButtons.forEach(button => {
      const responseElement = button.closest('[data-message-author-role="assistant"], .group, .flex.flex-col');
      
      if (responseElement) {
        const buttonsInResponse = responseElement.querySelectorAll('.savechat-button');
        
        if (buttonsInResponse.length > 1) {
          console.log(`SaveChat: Found ${buttonsInResponse.length} buttons in response, keeping first one`);
          // Keep the first button, remove the rest
          for (let i = 1; i < buttonsInResponse.length; i++) {
            console.log('SaveChat: Removing duplicate button:', buttonsInResponse[i]);
            buttonsInResponse[i].remove();
          }
        }
      }
    });
  }

  addSaveButtonsToAllResponses(detectionModule, storageModule) {
    this.cleanupDuplicateButtons();

    const responses = detectionModule.findExistingResponses();
    responses.forEach(response => {
      this.addSaveButtonToExistingResponse(response, detectionModule, storageModule);
    });
  }
}

// Export for use in other modules
window.SaveChatButton = SaveChatButton; 