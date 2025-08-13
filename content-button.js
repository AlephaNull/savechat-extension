// SaveChat Button Module
// Handles creating and managing save buttons

class SaveChatButton {
  constructor() {
    this.savedResponses = new Set();
  }

  createSaveButton(responseElement) {
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
      opacity: 0.8;
    `;
    
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

    saveButton.addEventListener('mouseenter', () => {
      saveButton.style.background = '#f3f4f6';
      saveButton.style.color = '#374151';
      saveButton.style.opacity = '1';
    });

    saveButton.addEventListener('mouseleave', () => {
      saveButton.style.background = 'transparent';
      saveButton.style.color = '#6b7280';
      saveButton.style.opacity = '0.8';
    });

    return saveButton;
  }

  addSaveButtonToResponse(responseElement, detectionModule, storageModule) {
    if (responseElement.querySelector('.savechat-button') || 
        responseElement.closest('.savechat-button')) {
      return;
    }

    const parentWithButton = responseElement.closest('[data-message-author-role="assistant"], .group, .flex.flex-col');
    if (parentWithButton && parentWithButton !== responseElement && 
        parentWithButton.querySelector('.savechat-button')) {
      return;
    }

    if (!detectionModule.isResponseReady(responseElement)) {
      setTimeout(() => {
        if (!responseElement.querySelector('.savechat-button') && 
            !responseElement.closest('.savechat-button')) {
          this.addSaveButtonToResponse(responseElement, detectionModule, storageModule);
        }
      }, 500);
      return;
    }

    detectionModule.waitForActionTray(responseElement).then((actionTray) => {
      if (actionTray && !actionTray.querySelector('.savechat-button')) {
        this.createAndInsertSaveButton(actionTray, responseElement, storageModule);
      }
    });
  }

  addSaveButtonToExistingResponse(responseElement, detectionModule, storageModule) {
    const existingActionTray = detectionModule.findInsertTarget(responseElement);
    if (existingActionTray && detectionModule.looksLikeActionTray(existingActionTray) && 
        !existingActionTray.querySelector('.savechat-button')) {
      this.createAndInsertSaveButton(existingActionTray, responseElement, storageModule);
    } else {
      detectionModule.waitForActionTray(responseElement).then((actionTray) => {
        if (actionTray && !actionTray.querySelector('.savechat-button')) {
          this.createAndInsertSaveButton(actionTray, responseElement, storageModule);
        }
      });
    }
  }

  createAndInsertSaveButton(actionTray, responseElement, storageModule) {
    const saveButton = this.createSaveButton(responseElement);
    
    saveButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await storageModule.saveResponse(responseElement, saveButton);
    });

    actionTray.appendChild(saveButton);
  }

  cleanupDuplicateButtons() {
    const saveButtons = document.querySelectorAll('.savechat-button');
    
    saveButtons.forEach(button => {
      const responseElement = button.closest('[data-message-author-role="assistant"], .group, .flex.flex-col');
      
      if (responseElement) {
        const buttonsInResponse = responseElement.querySelectorAll('.savechat-button');
        
        if (buttonsInResponse.length > 1) {
          for (let i = 1; i < buttonsInResponse.length; i++) {
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