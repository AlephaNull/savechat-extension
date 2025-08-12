class SaveChatViewer {
    constructor() {
        this.responses = [];
        this.filteredResponses = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        console.log('DOM loaded, initializing SaveChat viewer...');
        await this.loadResponses();
        this.setupEventListeners();
        this.render();
    }

    async loadResponses() {
        try {
            console.log('Starting to load responses...');
            
            // Check if chrome API is available
            if (typeof chrome === 'undefined' || !chrome.storage) {
                throw new Error('Chrome storage API not available');
            }
            
            console.log('Chrome storage API is available');
            
            // Get saved responses from Chrome storage
            const data = await new Promise((resolve) => {
                chrome.storage.local.get({ savedResponses: [] }, (result) => {
                    console.log('Storage result:', result);
                    resolve(result);
                });
            });
            
            console.log('Loaded data:', data);
            
            this.responses = data.savedResponses || [];
            this.filteredResponses = [...this.responses];
            
            console.log('Processed responses:', this.responses.length);
            
        } catch (error) {
            console.error('Error loading responses:', error);
            this.showError(`Failed to load saved responses: ${error.message}`);
        }
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('search-box').addEventListener('input', (e) => {
            this.filterResponses(e.target.value);
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
    }

    filterResponses(searchTerm) {
        const filtered = this.responses.filter(response => {
            const matchesSearch = !searchTerm || 
                response.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (response.context && response.context.title && 
                 response.context.title.toLowerCase().includes(searchTerm.toLowerCase()));
            
            return matchesSearch;
        });

        this.applyCurrentFilter(filtered);
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.applyCurrentFilter(this.responses);
    }

    applyCurrentFilter(responses) {
        switch (this.currentFilter) {
            case 'recent':
                this.filteredResponses = responses.sort((a, b) => b.timestamp - a.timestamp);
                break;
            case 'oldest':
                this.filteredResponses = responses.sort((a, b) => a.timestamp - b.timestamp);
                break;
            default:
                this.filteredResponses = responses;
        }
        
        this.render();
    }

    render() {
        const content = document.getElementById('content');
        
        if (this.responses.length === 0) {
            content.innerHTML = '';
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            const icon = document.createElement('div');
            icon.className = 'empty-state-icon';
            icon.textContent = '📝';
            
            const title = document.createElement('h3');
            title.textContent = 'No saved responses yet';
            
            const description = document.createElement('p');
            description.textContent = 'Start saving ChatGPT responses to see them here!';
            
            emptyState.appendChild(icon);
            emptyState.appendChild(title);
            emptyState.appendChild(description);
            content.appendChild(emptyState);
            return;
        }

        if (this.filteredResponses.length === 0) {
            content.innerHTML = '';
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            const icon = document.createElement('div');
            icon.className = 'empty-state-icon';
            icon.textContent = '🔍';
            
            const title = document.createElement('h3');
            title.textContent = 'No responses found';
            
            const description = document.createElement('p');
            description.textContent = 'Try adjusting your search or filter criteria.';
            
            emptyState.appendChild(icon);
            emptyState.appendChild(title);
            emptyState.appendChild(description);
            content.appendChild(emptyState);
            return;
        }

        // Update stats
        document.getElementById('total-responses').textContent = this.responses.length;
        const totalChars = this.responses.reduce((sum, r) => sum + r.text.length, 0);
        document.getElementById('total-characters').textContent = totalChars.toLocaleString();

        // Clear and render responses
        content.innerHTML = '';
        const responsesGrid = document.createElement('div');
        responsesGrid.className = 'responses-grid';
        
        this.filteredResponses.forEach(response => {
            const responseElement = this.createResponseElement(response);
            responsesGrid.appendChild(responseElement);
        });
        
        content.appendChild(responsesGrid);
        
        // Add event listeners to rendered elements
        this.setupResponseEventListeners();
    }

    createResponseElement(response) {
        const timestamp = this.formatTimestamp(response.timestamp);
        const context = response.context?.title || 'ChatGPT Response';
        const truncatedText = response.text.length > 300 ? 
            response.text.substring(0, 300) + '...' : response.text;
        const needsExpansion = response.text.length > 300;
        const responseId = response.id || Date.now();

        const card = document.createElement('div');
        card.className = 'response-card';
        card.dataset.id = responseId;

        // Create header
        const header = document.createElement('div');
        header.className = 'response-header';
        
        const headerLeft = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'response-title';
        title.textContent = context;
        const contextDiv = document.createElement('div');
        contextDiv.className = 'response-context';
        contextDiv.textContent = response.url || 'chat.openai.com';
        headerLeft.appendChild(title);
        headerLeft.appendChild(contextDiv);
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'response-timestamp';
        timestampDiv.textContent = timestamp;
        
        header.appendChild(headerLeft);
        header.appendChild(timestampDiv);

        // Create text content
        const textDiv = document.createElement('div');
        textDiv.className = `response-text ${needsExpansion ? '' : 'expanded'}`;
        textDiv.textContent = needsExpansion ? truncatedText : response.text;
        
        if (needsExpansion) {
            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-btn';
            expandBtn.dataset.responseId = responseId;
            expandBtn.textContent = 'Show more';
            textDiv.appendChild(expandBtn);
        }

        // Create actions
        const actions = document.createElement('div');
        actions.className = 'response-actions';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn copy-btn';
        copyBtn.dataset.responseId = responseId;
        copyBtn.textContent = '📋 Copy';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.dataset.responseId = responseId;
        deleteBtn.textContent = '🗑️ Delete';
        deleteBtn.style.color = '#f20733';
        
        actions.appendChild(copyBtn);
        actions.appendChild(deleteBtn);

        // Assemble card
        card.appendChild(header);
        card.appendChild(textDiv);
        card.appendChild(actions);

        return card;
    }

    setupResponseEventListeners() {
        // Expand buttons
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const responseId = e.target.dataset.responseId;
                this.expandResponse(responseId);
            });
        });

        // Copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const responseId = e.target.dataset.responseId;
                this.copyResponse(responseId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const responseId = e.target.dataset.responseId;
                this.deleteResponse(responseId);
            });
        });
    }

    expandResponse(responseId) {
        const response = this.responses.find(r => (r.id || Date.now()) == responseId);
        if (!response) return;

        const card = document.querySelector(`[data-id="${responseId}"]`);
        const textElement = card.querySelector('.response-text');
        const expandBtn = card.querySelector('.expand-btn');

        textElement.textContent = response.text;
        textElement.classList.add('expanded');
        expandBtn.remove();
    }

    async copyResponse(responseId) {
        const response = this.responses.find(r => (r.id || Date.now()) == responseId);
        if (!response) return;

        try {
            await navigator.clipboard.writeText(response.text);
            this.showCopySuccess();
        } catch (error) {
            console.error('Error copying text:', error);
            this.showError('Failed to copy text');
        }
    }

    async deleteResponse(responseId) {
        const response = this.responses.find(r => (r.id || Date.now()) == responseId);
        if (!response) return;

        try {
            // Remove from responses array
            this.responses = this.responses.filter(r => (r.id || Date.now()) != responseId);
            
            // Update filtered responses
            this.filteredResponses = this.responses;
            
            // Save to storage
            await new Promise((resolve) => {
                chrome.storage.local.set({ savedResponses: this.responses }, () => {
                    resolve();
                });
            });
            
            // Re-render
            this.render();
            
            // Show success message
            this.showError('Response deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting response:', error);
            this.showError('Failed to delete response');
        }
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
        } else if (diffInHours < 168) { // 7 days
            return `${Math.floor(diffInHours / 24)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }



    showCopySuccess() {
        const notification = document.createElement('div');
        notification.className = 'copy-success';
        notification.textContent = '✅ Copied to clipboard!';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'copy-success';
        notification.style.background = '#ef4444';
        notification.textContent = `❌ ${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the viewer when the page loads
let viewer;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing SaveChat viewer...');
    viewer = new SaveChatViewer();
}); 