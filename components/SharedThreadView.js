/**
 * SharedThreadView
 * Read-only view for publicly shared threads
 * Accessible without authentication
 */

import { Icons } from '../js/icons.js';

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export class SharedThreadView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.threadId = null;
        this.thread = null;
        this.messages = [];
        this.isLoading = true;
        this.error = null;

        this.init();
    }

    async init() {
        // Extract threadId from URL: /share/:threadId
        const path = window.location.pathname;
        const match = path.match(/^\/share\/([a-f0-9-]+)/i);
        const params = new URLSearchParams(window.location.search);
        const paramId = params.get('threadId') || params.get('thread') || params.get('id');
        const parts = path.split('/').filter(Boolean);
        let resolvedId = null;

        if (match) {
            resolvedId = match[1];
        } else if (parts[0] === 'share' && parts[1] && parts[1] !== 'index.html') {
            resolvedId = parts[1];
        } else if (paramId) {
            resolvedId = paramId;
        }

        if (resolvedId) {
            this.threadId = resolvedId;
            await this.loadThread();
        } else {
            this.error = 'Invalid share link';
            this.isLoading = false;
        }

        this.render();
        this.attach();
    }

    async loadThread() {
        try {
            this.isLoading = true;
            this.render();

            // Use the API service to fetch the thread (no auth required for public threads)
            if (window._API && window._API.fetchThread) {
                this.thread = await window._API.fetchThread(this.threadId);

                // Fetch messages
                if (window._API.getThreadMessages) {
                    this.messages = await window._API.getThreadMessages(this.threadId);
                }
            } else {
                // Fallback: direct fetch without auth
                const response = await fetch(`${this.getBaseUrl()}/api/threads/${this.threadId}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Failed to load thread: ${response.status}`);
                }
                this.thread = await response.json();

                // Fetch messages
                const messagesResponse = await fetch(`${this.getBaseUrl()}/api/threads/${this.threadId}/messages`);
                if (messagesResponse.ok) {
                    const messagesData = await messagesResponse.json();
                    this.messages = messagesData.items || messagesData || [];
                }
            }

            this.error = null;
        } catch (err) {
            console.error('Error loading thread:', err);
            this.error = err.message || 'Failed to load thread';
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    getBaseUrl() {
        return window.DUALMIND_CONFIG?.backendUrl ||
            window.DUALMIND_CONFIG?.apiBaseUrl ||
            window.DUALMIND_CONFIG?.api?.baseUrl ||
            'https://api.dualmind.ai';
    }

    render() {
        if (!this.container) return;

        if (this.isLoading) {
            this.container.innerHTML = this.renderLoading();
            return;
        }

        if (this.error) {
            this.container.innerHTML = this.renderError();
            return;
        }

        this.container.innerHTML = `
      <div class="shared-thread-view">
        ${this.renderHeader()}
        <div class="shared-thread-content scrollable">
          ${this.renderMessages()}
        </div>
        ${this.renderForkButton()}
      </div>
    `;
    }

    renderLoading() {
        return `
      <div class="shared-thread-loading">
        <div class="spinner"></div>
        <p>Loading shared thread...</p>
      </div>
    `;
    }

    renderError() {
        return `
      <div class="shared-thread-error">
        <div class="error-icon">⚠️</div>
        <h2>Unable to Load Thread</h2>
        <p>${escapeHtml(this.error)}</p>
        <button class="retry-btn" onclick="location.reload()">Retry</button>
        <a href="/" class="home-link">Go to Home</a>
      </div>
    `;
    }

    renderHeader() {
        const title = this.thread?.title || 'Shared Thread';

        return `
      <header class="shared-thread-header glass-panel">
        <a href="/" class="back-link" aria-label="Go home">
          ${Icons.arrowLeft('white', 20)}
        </a>
        <div class="shared-thread-title-section">
          <h1 class="shared-thread-title">${escapeHtml(title)}</h1>
          <span class="shared-thread-badge">🔗 Shared</span>
        </div>
        <div class="shared-thread-header-spacer"></div>
      </header>
    `;
    }

    renderMessages() {
        if (!this.messages || this.messages.length === 0) {
            return `
        <div class="shared-thread-empty">
          <p>This conversation is empty.</p>
        </div>
      `;
        }

        return `
      <div class="shared-messages-list">
        ${this.messages.map(msg => this.renderMessage(msg)).join('')}
      </div>
    `;
    }

    renderMessage(msg) {
        const prompt = escapeHtml(msg.promptText || msg.prompt_text || '');
        const model1Response = msg.model1Response || msg.model1_response || '';
        const model2Response = msg.model2Response || msg.model2_response || '';
        const model1Name = msg.model1Name || msg.model1_name || 'Model A';
        const model2Name = msg.model2Name || msg.model2_name || 'Model B';
        
        // Mock providers based on names for visual effect
        const getProvider = (name) => {
            name = name.toLowerCase();
            if (name.includes('gpt')) return 'OpenAI';
            if (name.includes('claude')) return 'Anthropic';
            if (name.includes('gemini')) return 'Google';
            if (name.includes('llama')) return 'Meta';
            if (name.includes('mixtral') || name.includes('mistral')) return 'Mistral';
            return 'AI Model';
        };

        // Render a battle/side-by-side message
        if (model2Response) {
            return `
        <div class="shared-message-turn">
          <!-- User Prompt -->
          <div class="shared-user-message">
            <div class="shared-user-avatar">You</div>
            <div class="shared-user-bubble glass-panel">
              <p>${prompt}</p>
            </div>
          </div>

          <!-- AI Responses -->
          <div class="shared-responses-grid">
            <article class="shared-response-card glass-panel">
              <div class="shared-response-header">
                <span class="shared-model-tag">A</span>
                <div class="shared-model-info">
                  <span class="shared-model-name">${escapeHtml(this.prettifyModelName(model1Name))}</span>
                  <span class="shared-model-provider">${getProvider(model1Name)}</span>
                </div>
                <div class="shared-model-badge-verified">✓</div>
              </div>
              <div class="shared-response-body markdown-body">${this.renderMarkdown(model1Response)}</div>
            </article>

            <article class="shared-response-card glass-panel">
              <div class="shared-response-header">
                <span class="shared-model-tag">B</span>
                <div class="shared-model-info">
                  <span class="shared-model-name">${escapeHtml(this.prettifyModelName(model2Name))}</span>
                  <span class="shared-model-provider">${getProvider(model2Name)}</span>
                </div>
                <div class="shared-model-badge-verified">✓</div>
              </div>
              <div class="shared-response-body markdown-body">${this.renderMarkdown(model2Response)}</div>
            </article>
          </div>
        </div>
      `;
        }

        // Single model response
        return `
      <div class="shared-message-turn">
        <div class="shared-user-message">
          <div class="shared-user-avatar">You</div>
          <div class="shared-user-bubble glass-panel">
            <p>${prompt}</p>
          </div>
        </div>

        <div class="shared-single-response">
          <article class="shared-response-card glass-panel">
            <div class="shared-response-header">
              <div class="shared-model-info">
                <span class="shared-model-name">${escapeHtml(this.prettifyModelName(model1Name))}</span>
                <span class="shared-model-provider">${getProvider(model1Name)}</span>
              </div>
              <div class="shared-model-badge-verified">✓</div>
            </div>
            <div class="shared-response-body markdown-body">${this.renderMarkdown(model1Response)}</div>
          </article>
        </div>
      </div>
    `;
    }

    renderForkButton() {
        return `
      <div class="shared-fork-container">
        <button class="shared-fork-btn" id="fork-thread-btn">
          <span class="fork-icon">⚡</span>
          <span class="fork-text">Continue this Battle</span>
          <span class="fork-sub">Create your own version</span>
        </button>
      </div>
    `;
    }

    prettifyModelName(name) {
        if (!name) return 'Model';
        // Strip everything after em-dash or hyphen with space
        return name.split('–')[0].split(' - ')[0].trim();
    }

    renderMarkdown(text) {
        if (!text) return '';
        if (window.marked) {
            try {
                const html = window.marked.parse(text);
                if (window.DOMPurify) {
                    return window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
                }
                return html;
            } catch (e) {
                console.error('Markdown parse error:', e);
                return escapeHtml(text);
            }
        }
        // Fallback
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    attach() {
        if (!this.container) return;

        this.container.addEventListener('click', (e) => {
            if (e.target.closest('#fork-thread-btn')) {
                this.handleFork();
            }
        });
    }

    handleFork() {
        // Check if user is logged in
        const isLoggedIn = window.DualMindAuth?.getUser?.();

        if (isLoggedIn) {
            // Logged in: redirect to home to start a new battle
            window.location.href = '/';
        } else {
            // Not logged in: redirect to login
            window.location.href = '/login/';
        }
    }
}

export default SharedThreadView;
