/**
 * SharedThreadView
 * Read-only view for publicly shared threads
 * Accessible without authentication
 */

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

      if (window._API && window._API.fetchThread) {
        this.thread = await window._API.fetchThread(this.threadId);
        if (window._API.getThreadMessages) {
          this.messages = await window._API.getThreadMessages(this.threadId);
        }
      } else {
        const response = await fetch(`${this.getBaseUrl()}/api/threads/${this.threadId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to load thread: ${response.status}`);
        }
        this.thread = await response.json();

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
    const isProd = window.location.hostname.includes('dualmindlab.tech') ||
      window.location.hostname.includes('workers.dev');

    if (isProd) {
      return 'https://dualmind-arena-cgh0cvdfhkbgatba.uaenorth-01.azurewebsites.net';
    }

    return window.DUALMIND_CONFIG?.backendUrl ||
      window.DUALMIND_CONFIG?.apiBaseUrl ||
      window.DUALMIND_CONFIG?.api?.baseUrl ||
      'http://localhost:5079';
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
      <div class="st-page">
        ${this.renderHeader()}
        <main class="st-main">
          <div class="st-feed">
            ${this.renderMeta()}
            ${this.renderMessages()}
          </div>
        </main>
        ${this.renderFooter()}
      </div>
    `;
  }

  renderLoading() {
    return `
      <div class="st-loading">
        <div class="st-loading-spinner"></div>
        <p class="st-loading-text">Loading conversation…</p>
      </div>
    `;
  }

  renderError() {
    return `
      <div class="st-error-page">
        <div class="st-error-card">
          <div class="st-error-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 class="st-error-title">Unable to Load</h2>
          <p class="st-error-msg">${escapeHtml(this.error)}</p>
          <div class="st-error-actions">
            <button class="st-btn-primary" onclick="location.reload()">Try Again</button>
            <a href="/" class="st-btn-ghost">Go to DualMind</a>
          </div>
        </div>
      </div>
    `;
  }

  renderHeader() {
    const mode = this.thread?.mode || this.thread?.conversationMode || '';
    const modeBadge = mode
      ? `<span class="st-header-mode">${this._modeLabel(mode)}</span>`
      : '';

    return `
      <header class="st-header">
        <a href="/" class="st-logo" aria-label="DualMind Arena">
          <span class="st-logo-icon">⚡</span>
          <span class="st-logo-name">DualMind</span>
        </a>
        <div class="st-header-center">
          ${modeBadge}
        </div>
        <a href="/" class="st-header-cta">
          Try DualMind Free
        </a>
      </header>
    `;
  }

  _modeLabel(mode) {
    const map = { battle: '⚔ Battle Mode', arena: '🏟 Arena Mode', direct: '💬 Direct Chat' };
    return map[mode?.toLowerCase()] || escapeHtml(mode);
  }

  renderMeta() {
    const title = this.thread?.title || 'Shared Conversation';
    const count = this.messages?.length || 0;
    const mode = this.thread?.mode || this.thread?.conversationMode || '';

    return `
      <div class="st-meta">
        <h1 class="st-meta-title">${escapeHtml(title)}</h1>
        <div class="st-meta-info">
          <span class="st-meta-pill">🔗 Shared</span>
          ${mode ? `<span class="st-meta-pill st-meta-pill--terra">${this._modeLabel(mode)}</span>` : ''}
          <span class="st-meta-pill">${count} turn${count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }

  renderMessages() {
    if (!this.messages || this.messages.length === 0) {
      return `
        <div class="st-empty">
          <div class="st-empty-icon">💬</div>
          <p class="st-empty-text">This conversation is empty.</p>
        </div>
      `;
    }

    return `
      <div class="st-turns">
        ${this.messages.map((msg, i) => this.renderTurn(msg, i + 1)).join('')}
      </div>
    `;
  }

  renderTurn(msg, turnNum) {
    const prompt = escapeHtml(msg.promptText || msg.prompt_text || '');
    const model1Response = msg.model1Response || msg.model1_response || '';
    const model2Response = msg.model2Response || msg.model2_response || '';
    const model1Name = msg.model1Name || msg.model1_name || 'Model A';
    const model2Name = msg.model2Name || msg.model2_name || 'Model B';

    const getProvider = (name) => {
      const n = name.toLowerCase();
      if (n.includes('gpt') || n.includes('o1') || n.includes('o3')) return 'OpenAI';
      if (n.includes('claude')) return 'Anthropic';
      if (n.includes('gemini')) return 'Google';
      if (n.includes('llama')) return 'Meta';
      if (n.includes('mixtral') || n.includes('mistral')) return 'Mistral';
      if (n.includes('grok')) return 'xAI';
      if (n.includes('command')) return 'Cohere';
      return 'AI Model';
    };

    const getProviderInitial = (name) => getProvider(name)[0];

    if (model2Response) {
      // Battle / side-by-side
      return `
        <div class="st-turn" data-turn="${turnNum}">
          <div class="st-turn-num">Turn ${turnNum}</div>

          <div class="st-prompt-row">
            <div class="st-prompt-avatar">You</div>
            <div class="st-prompt-bubble">
              <p>${prompt}</p>
            </div>
          </div>

          <div class="st-battle-grid">
            <article class="st-response-card st-response-card--left">
              <div class="st-card-header">
                <div class="st-card-model-dot st-card-model-dot--cyan"></div>
                <div class="st-card-model-info">
                  <span class="st-card-model-label">A</span>
                  <div class="st-card-model-text">
                    <span class="st-card-model-name" title="${escapeHtml(model1Name)}">${escapeHtml(this.prettifyModelName(model1Name))}</span>
                    <span class="st-card-model-provider">${getProvider(model1Name)}</span>
                  </div>
                </div>
                <div class="st-card-verified" title="Verified response">✓</div>
              </div>
              <div class="st-card-body markdown-body">${this.renderMarkdown(model1Response)}</div>
            </article>

            <div class="st-vs-divider" aria-hidden="true">
              <div class="st-vs-line"></div>
              <span class="st-vs-label">VS</span>
              <div class="st-vs-line"></div>
            </div>

            <article class="st-response-card st-response-card--right">
              <div class="st-card-header">
                <div class="st-card-model-dot st-card-model-dot--terra"></div>
                <div class="st-card-model-info">
                  <span class="st-card-model-label st-card-model-label--terra">B</span>
                  <div class="st-card-model-text">
                    <span class="st-card-model-name" title="${escapeHtml(model2Name)}">${escapeHtml(this.prettifyModelName(model2Name))}</span>
                    <span class="st-card-model-provider">${getProvider(model2Name)}</span>
                  </div>
                </div>
                <div class="st-card-verified st-card-verified--terra" title="Verified response">✓</div>
              </div>
              <div class="st-card-body markdown-body">${this.renderMarkdown(model2Response)}</div>
            </article>
          </div>
        </div>
      `;
    }

    // Single model response
    return `
      <div class="st-turn" data-turn="${turnNum}">
        <div class="st-turn-num">Turn ${turnNum}</div>

        <div class="st-prompt-row">
          <div class="st-prompt-avatar">You</div>
          <div class="st-prompt-bubble">
            <p>${prompt}</p>
          </div>
        </div>

        <div class="st-single-grid">
          <article class="st-response-card st-response-card--left">
            <div class="st-card-header">
              <div class="st-card-model-dot st-card-model-dot--cyan"></div>
              <div class="st-card-model-info">
                <div class="st-card-model-text">
                  <span class="st-card-model-name" title="${escapeHtml(model1Name)}">${escapeHtml(this.prettifyModelName(model1Name))}</span>
                  <span class="st-card-model-provider">${getProvider(model1Name)}</span>
                </div>
              </div>
              <div class="st-card-verified" title="Verified response">✓</div>
            </div>
            <div class="st-card-body markdown-body">${this.renderMarkdown(model1Response)}</div>
          </article>
        </div>
      </div>
    `;
  }

  renderFooter() {
    return `
      <footer class="st-footer">
        <span class="st-footer-text">Powered by</span>
        <a href="/" class="st-footer-brand">
          <span>⚡</span>
          <span>DualMind</span>
        </a>
        <span class="st-footer-sep">·</span>
        <span class="st-footer-text">Compare AI models side-by-side</span>
      </footer>
    `;
  }

  prettifyModelName(name) {
    if (!name) return 'Model';
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
        return escapeHtml(text).replace(/\n/g, '<br>');
      } catch (e) {
        console.error('Markdown parse error:', e);
        return escapeHtml(text).replace(/\n/g, '<br>');
      }
    }
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  attach() {
    // No fork button — nothing to attach
  }
}

export default SharedThreadView;
