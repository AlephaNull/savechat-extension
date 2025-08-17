// SaveChat Popup Script
// Handles popup functionality and UI interactions

class SaveChatPopup {
  constructor() {
    this.init();
  }

  async init() {
    // Load data when popup opens
    await this.loadData();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  async loadData() {
    try {
      // Get all saved responses
      const responses = await this.getSavedResponses();
      const totalSaved = responses.length;
      
      // Update total count
      document.getElementById('total-saved').textContent = totalSaved;
      
      if (totalSaved === 0) {
        this.showEmptyState();
      } else {
        // Get the most recent response
        const recentResponse = responses[0];
        this.showRecentResponse(recentResponse);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Failed to load saved responses');
    }
  }

  async getSavedResponses() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get({ savedResponses: [] }, (data) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(data.savedResponses || []);
        }
      });
    });
  }

  showEmptyState() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('recent-response').style.display = 'none';
    document.getElementById('no-responses').style.display = 'flex';
  }

  showRecentResponse(response) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('no-responses').style.display = 'none';
    document.getElementById('recent-response').style.display = 'flex';

    // Format timestamp
    const timestamp = this.formatTimestamp(response.timestamp);
    document.getElementById('response-timestamp').textContent = timestamp;

    // Show context if available
    const contextElement = document.getElementById('response-context');
    if (response.context && response.context.title) {
      contextElement.innerHTML = `<strong>From:</strong> ${response.context.title}`;
      contextElement.style.display = 'block';
    } else {
      contextElement.style.display = 'none';
    }

    // Show response text (truncated if too long)
    const textElement = document.getElementById('response-text');
    const maxLength = 300;
    let displayText = response.text;
    
    if (displayText.length > maxLength) {
      displayText = displayText.substring(0, maxLength) + '...';
    }
    
    textElement.textContent = displayText;
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  setupEventListeners() {
    // Copy button
    document.getElementById('copy-btn').addEventListener('click', async () => {
      await this.copyRecentResponse();
    });

    // View all button
    document.getElementById('view-all-btn').addEventListener('click', () => {
      this.openWebApp();
    });

    // Open web app button
    document.getElementById('open-webapp').addEventListener('click', () => {
      this.openWebApp();
    });
  }

  async copyRecentResponse() {
    try {
      const responses = await this.getSavedResponses();
      if (responses.length === 0) return;

      const recentResponse = responses[0];
      await navigator.clipboard.writeText(recentResponse.text);
      
      // Show success feedback
      this.showCopySuccess();
      
    } catch (error) {
      console.error('Error copying text:', error);
      this.showError('Failed to copy text');
    }
  }

  showCopySuccess() {
    const copyBtn = document.getElementById('copy-btn');
    const originalText = copyBtn.innerHTML;
    
    copyBtn.innerHTML = '<span class="icon">✅</span> Copied!';
    copyBtn.style.background = '#10b981';
    copyBtn.style.color = 'white';
    copyBtn.style.borderColor = '#10b981';
    
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
      copyBtn.style.background = '';
      copyBtn.style.color = '';
      copyBtn.style.borderColor = '';
    }, 2000);
  }

  openWebApp() {
    // Open the local HTML file that displays all saved responses
    const webAppUrl = chrome.runtime.getURL('saved-responses.html');
    chrome.tabs.create({ url: webAppUrl });
  }

  showError(message) {
    // Simple error display
    const content = document.querySelector('.content');
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 14px;
    `;
    errorDiv.textContent = message;
    
    content.insertBefore(errorDiv, content.firstChild);
    
    // Remove error after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SaveChatPopup();
}); 