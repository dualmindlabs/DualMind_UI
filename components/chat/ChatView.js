/**
 * ChatView
 * Renders:
 * - Battle/Arena: 1 prompt -> 2 model replies (side-by-side)
 * - Direct: linear chat
 */

import { Icons } from '../../js/icons.js';

function renderRefreshIcon(color = 'white', size = 18) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 12a8 8 0 1 1-2.343-5.657" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 4v6h-6" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function renderExpandIcon(color = 'white', size = 18) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3H3v6" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 21h6v-6" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 3l7 7" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21 21l-7-7" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class ChatView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this._onClick = null;
    this._onChange = null;
    this._shouldAutoScroll = true;
    this._isUserScrolling = false;
    this.state = {
      mode: 'battle',
      turns: [],
      direct: [],
      apiEnabled: true,
      selectedModels: {
        left: 'alpha',
        right: 'beta',
        direct: 'alpha'
      }
    };

    // Fullscreen Modal Container
    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'response-modal';
    this.modalContainer.className = 'response-modal';
    this.modalContainer.hidden = true;
    this.modalContainer.innerHTML = `
      <div class="response-modal-content glass-panel">
        <div class="response-modal-header">
          <h3 class="response-modal-title">Response</h3>
          <div class="response-modal-actions">
            <button class="icon-btn copy-btn" data-action="modal-copy" title="Copy">
              ${Icons.code('white', 20)}
            </button>
            <button class="icon-btn close-btn" data-action="modal-close" title="Close">
              ${Icons.close('white', 20)}
            </button>
          </div>
        </div>
        <div class="response-modal-body"></div>
      </div>
    `;
    document.body.appendChild(this.modalContainer);

    this.render();
    this.attach();
    this.attachScrollListener();
    this.attachModalListeners();
  }

  setState(next) {
    const prevTurnsLength = this.state.turns?.length || 0;
    this.state = { ...this.state, ...next };
    const newTurnsLength = this.state.turns?.length || 0;

    // If a new turn was added, append it without full re-render
    if (newTurnsLength > prevTurnsLength) {
      const newTurn = this.state.turns[newTurnsLength - 1];
      this.appendTurn(newTurn);
      return;
    }

    // Otherwise, full render (e.g., mode change, clear)
    this.render();
  }

  appendTurn(turn) {
    const turnsContainer = this.container.querySelector('.chat-turns');
    if (!turnsContainer) {
      this.render();
      return;
    }
    const turnHtml = this.renderTurn(turn);
    const temp = document.createElement('div');
    temp.innerHTML = turnHtml;
    const newSection = temp.firstElementChild;
    
    // Insert before sentinel
    const sentinel = turnsContainer.querySelector('#chat-scroll-sentinel');
    if (sentinel) {
      turnsContainer.insertBefore(newSection, sentinel);
    } else {
      turnsContainer.appendChild(newSection);
    }
    
    // Re-attach listeners for the new section only
    this.attachListenersTo(newSection);
    
    // Auto-scroll to new message
    this.scrollToBottom();
  }

  attachListenersTo(root = this.container) {
    if (!root) return;
    const refreshBtn = root.querySelector('button[data-action="refresh"]');
    const expandBtn = root.querySelector('button[data-action="expand"]');
    const copyBtn = root.querySelector('button[data-action="copy"]');
    refreshBtn?.addEventListener('click', this._onClick);
    expandBtn?.addEventListener('click', this._onClick);
    copyBtn?.addEventListener('click', this._onClick);
  }

  clear() {
    this.state.turns = [];
    this.state.direct = [];
    this.render();
  }

  render() {
    if (!this.container) return;
    const { mode } = this.state;

    this.container.innerHTML = `
      <div class="chat-area">
        ${this.renderModelSelectors()}
        ${mode === 'direct' ? this.renderDirect() : this.renderArena()}
      </div>
    `;

    // Re-attach listeners for selectors
    this.attachSelectorListeners();
  }

  renderModelSelectors() {
    const { mode } = this.state;
    if (mode === 'battle') return ''; // No selectors in Battle mode (random)

    const modelOptions = [
      { id: 'alpha', name: 'DualMind Alpha' },
      { id: 'beta', name: 'DualMind Beta' },
      { id: 'sigma', name: 'DualMind Sigma' },
      { id: 'nova', name: 'DualMind Nova' }
    ];

    const renderSelect = (side, selectedId) => `
      <div class="model-selector-wrapper">
        <select class="model-selector" data-side="${side}">
          ${modelOptions.map(m => `
            <option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${m.name}</option>
          `).join('')}
        </select>
        <span class="selector-chevron">${Icons.chevronDown('white', 12)}</span>
      </div>
    `;

    if (mode === 'direct') {
      return `
        <div class="chat-controls-bar single">
          ${renderSelect('direct', this.state.selectedModels.direct)}
        </div>
      `;
    }

    if (mode === 'arena') {
      return `
        <div class="chat-controls-bar dual">
          ${renderSelect('left', this.state.selectedModels.left)}
          <div class="vs-badge">VS</div>
          ${renderSelect('right', this.state.selectedModels.right)}
        </div>
      `;
    }

    return '';
  }

  renderEmptyArena() {
    return `
      <div class="chat-empty glass-panel">
        <div class="chat-empty-icon">${Icons.chat('white', 28)}</div>
        <div class="chat-empty-title">Start a battle</div>
        <div class="chat-empty-subtitle">Type a prompt — you’ll get two model replies side-by-side.</div>
      </div>
    `;
  }

  renderArena() {
    const turns = this.state.turns || [];
    if (turns.length === 0) return this.renderEmptyArena();

    return `
      <div class="chat-turns">
        ${turns.map((t) => this.renderTurn(t)).join('')}
        <!-- Scroll anchor: positioned to create gap above vote buttons -->
        <div id="chat-scroll-sentinel" class="scroll-sentinel" aria-hidden="true"></div>
      </div>
    `;
  }

  renderTurn(turn) {
    const prompt = escapeHtml(turn.prompt || '');
    const left = turn.left ?? {};
    const right = turn.right ?? {};

    return `
      <section class="chat-turn" data-turn-id="${turn.id}">
        <div class="user-message">
          <div class="user-bubble">
            <div class="user-text">${prompt}</div>
          </div>
        </div>

        <div class="responses-grid">
          ${this.renderResponseCard(turn, 'left', left)}
          ${this.renderResponseCard(turn, 'right', right)}
        </div>

        ${this.renderVoteBar(turn)}
      </section>
    `;
  }

  renderResponseCard(turn, side, data) {
    const turnId = turn.id;
    const modelName = escapeHtml(data.modelName || (side === 'left' ? 'Model A' : 'Model B'));
    const bodyId = `resp-${turnId}-${side}`;
    const text = escapeHtml(data.text || '');
    const streaming = !!data.streaming;
    const assistantLabel = side === 'left' ? 'A' : 'B';

    const voteStatus = turn.voteStatus || 'idle';
    const voteChoice = turn.voteChoice || null;
    const voted = voteStatus === 'submitted';
    const isWinner = voted && (voteChoice === 'tie' || voteChoice === side);
    const isLoser = voted && voteChoice && voteChoice !== 'tie' && voteChoice !== side;
    const voteClass = `${isWinner ? ' is-winner' : ''}${isLoser ? ' is-loser' : ''}`;

    const hasGreenSelection =
      voteChoice === 'tie' ||
      voteChoice === side;

    const hasRedSelection =
      voteChoice === 'both-bad';

    const persistentSelectionClass =
      hasRedSelection ? ' vote-selected-red' :
      (voteChoice && hasGreenSelection ? ' vote-selected-green' : '');

    return `
      <article class="response-card glass-panel ${streaming ? 'is-streaming' : ''}${voteClass}${persistentSelectionClass}" data-turn-id="${turnId}" data-side="${side}">
        <div class="response-header">
          <div class="model-badge">
            <span class="assistant-tag">${assistantLabel}</span>
            <span class="model-dot ${side}"></span>
            <span class="model-name">${modelName}</span>
          </div>

          <div class="message-actions">
            <button class="icon-btn" type="button" data-action="refresh" data-turn-id="${turnId}" data-side="${side}" aria-label="Regenerate reply">
              ${renderRefreshIcon('white', 18)}
            </button>
            <button class="icon-btn copy-btn" type="button" data-action="copy" data-target="${bodyId}" aria-label="Copy reply" title="Copy">
              ${Icons.code('white', 18)}
            </button>
            <button class="icon-btn" type="button" data-action="expand" data-turn-id="${turnId}" data-side="${side}" aria-label="Expand reply" title="Fullscreen">
              ${renderExpandIcon('white', 18)}
            </button>
          </div>
        </div>

        <div class="response-body" id="${bodyId}" aria-live="${streaming ? 'polite' : 'off'}">${text}${streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : ''}</div>
      </article>
    `;
  }

  renderVoteBar(turn) {
    // Voting disabled - return empty
    return '';
  }

  renderDirect() {
    const msgs = this.state.direct || [];
    if (msgs.length === 0) {
      return `
        <div class="chat-empty glass-panel">
          <div class="chat-empty-icon">${Icons.chat('white', 28)}</div>
          <div class="chat-empty-title">Start chatting</div>
          <div class="chat-empty-subtitle">Type a message — you’ll get a demo reply instantly.</div>
        </div>
      `;
    }

    return `
      <div class="direct-thread">
        ${msgs.map((m) => {
          const role = m.role === 'user' ? 'user' : 'assistant';
          return `
            <div class="direct-msg ${role}">
              <div class="direct-bubble glass-panel">
                <div class="direct-meta">${role === 'user' ? 'You' : escapeHtml(m.modelName || 'Assistant')}</div>
                <div class="direct-text">${escapeHtml(m.text || '')}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  attach() {
    if (!this.container) return;
    if (this._onClick) this.container.removeEventListener('click', this._onClick);

    this._onClick = async (e) => {
      // Find the closest button
      const btn = e.target.closest('button');
      if (!btn) return;

      const action = btn.getAttribute('data-action');

      if (action === 'refresh') {
        const turnId = Number(btn.getAttribute('data-turn-id'));
        const turn = (this.state.turns || []).find((t) => Number(t.id) === turnId);
        const prompt = turn?.prompt || '';
        if (prompt.trim()) {
          // Force scroll to bottom on regenerate
          this.scrollToBottom(true);
          document.dispatchEvent(new CustomEvent('chat-submit', { detail: { message: prompt.trim(), attachments: [] } }));
        }
        return;
      }

      if (action === 'expand') {
        const turnId = btn.getAttribute('data-turn-id');
        const side = btn.getAttribute('data-side');
        this.openFullscreen(turnId, side);
        return;
      }

      if (action === 'vote') {
        const turnId = btn.getAttribute('data-turn-id');
        const choice = btn.getAttribute('data-vote');
        if (!btn.disabled && turnId && choice) {
          document.dispatchEvent(new CustomEvent('vote-submit', { detail: { turnId, choice } }));
        }
        return;
      }

      if (action === 'copy') {
        const targetId = btn.getAttribute('data-target');
        const el = document.getElementById(targetId);
        if (!el) return;

        const text = el.innerText || el.textContent || '';
        await this.copyToClipboard(text, btn);
      }
    };

    this.container.addEventListener('click', this._onClick);
  }

  attachSelectorListeners() {
    if (this._onChange) {
        const selectors = this.container.querySelectorAll('.model-selector');
        selectors.forEach(sel => sel.removeEventListener('change', this._onChange));
    }

    this._onChange = (e) => {
        const side = e.target.dataset.side;
        const value = e.target.value;
        this.state.selectedModels[side] = value;
        // Optionally trigger callback to parent to update app state if needed
    };

    const selectors = this.container.querySelectorAll('.model-selector');
    selectors.forEach(sel => sel.addEventListener('change', this._onChange));
  }

  async copyToClipboard(text, btn) {
    try {
      await navigator.clipboard.writeText(text.replace(/\u200B/g, ''));
      btn.classList.add('copied');

      // Update tooltip if present
      const originalTitle = btn.getAttribute('title');
      btn.setAttribute('title', 'Copied!');

      window.setTimeout(() => {
        btn.classList.remove('copied');
        if (originalTitle) btn.setAttribute('title', originalTitle);
      }, 1500);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  openFullscreen(turnId, side) {
    const el = document.getElementById(`resp-${turnId}-${side}`);
    if (!el) return;

    // Get model name
    const turn = this.state.turns.find(t => String(t.id) === String(turnId));
    let modelName = 'Response';
    if (turn) {
        modelName = side === 'left' ? (turn.left.modelName || 'Model A') : (turn.right.modelName || 'Model B');
    }

    const modalBody = this.modalContainer.querySelector('.response-modal-body');
    const modalTitle = this.modalContainer.querySelector('.response-modal-title');

    modalTitle.textContent = modelName;
    modalBody.innerHTML = el.innerHTML; // Copy content including HTML

    this.modalContainer.hidden = false;
    document.body.style.overflow = 'hidden'; // Lock scroll
  }

  attachModalListeners() {
    this.modalContainer.addEventListener('click', (e) => {
        if (e.target === this.modalContainer) {
            this.closeModal();
            return;
        }

        const btn = e.target.closest('button');
        if (!btn) return;

        const action = btn.getAttribute('data-action');

        if (action === 'modal-close') {
            this.closeModal();
        } else if (action === 'modal-copy') {
            const text = this.modalContainer.querySelector('.response-modal-body').textContent;
            this.copyToClipboard(text, btn);
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.modalContainer.hidden) {
            this.closeModal();
        }
    });
  }

  closeModal() {
    this.modalContainer.hidden = true;
    document.body.style.overflow = ''; // Unlock scroll
  }

  /** Directly patch a specific response text without full re-render (for streaming). */
  appendToResponse(turnId, side, chunk, streaming = true) {
    const el = document.getElementById(`resp-${turnId}-${side}`);
    if (!el) return;

    // Keep caret at end
    const caret = el.querySelector?.('.stream-caret');
    if (caret) caret.remove();

    el.insertAdjacentText('beforeend', chunk);
    if (streaming) {
      el.insertAdjacentHTML('beforeend', '<span class="stream-caret" aria-hidden="true"></span>');
    }

    // Auto-scroll during streaming if user hasn't scrolled up
    this.scrollToBottom();
  }

  finishResponse(turnId, side) {
    const el = document.getElementById(`resp-${turnId}-${side}`);
    el?.querySelector?.('.stream-caret')?.remove();
    
    // Remove is-streaming class from response card
    const card = document.querySelector(`.response-card[data-turn-id="${turnId}"][data-side="${side}"]`);
    card?.classList.remove('is-streaming');
  }

  attachScrollListener() {
    // The scroll container is #main-content (parent of this.container)
    const scrollContainer = this.container.parentElement;
    if (!scrollContainer) return;

    let scrollTimeout;
    scrollContainer.addEventListener('scroll', () => {
      // Detect if user manually scrolled up (ChatGPT-style)
      clearTimeout(scrollTimeout);
      this._isUserScrolling = true;

      scrollTimeout = setTimeout(() => {
        this._isUserScrolling = false;
        // Check if user is near bottom - if yes, resume auto-scroll
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        // More generous threshold (150px) for better UX
        this._shouldAutoScroll = distanceFromBottom < 150;
      }, 150);
    });
  }

  scrollToBottom(force = false) {
    // ChatGPT-style scroll behavior: respect user scroll position
    if (!force && !this._shouldAutoScroll) return;
    if (this._isUserScrolling && !force) return;

    const scrollContainer = this.container.parentElement;
    if (!scrollContainer) return;

    // Use scroll sentinel as anchor point (positioned above vote buttons)
    const sentinel = document.getElementById('chat-scroll-sentinel');
    if (!sentinel) {
      // Fallback: scroll to bottom if sentinel not found
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
      return;
    }

    // ChatGPT-style: scroll sentinel into view with 'end' alignment
    // This positions the sentinel at the bottom of the viewport,
    // keeping content visible above the vote buttons
    try {
      sentinel.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    } catch (e) {
      // Fallback for older browsers
      const sentinelTop = sentinel.offsetTop;
      const containerHeight = scrollContainer.clientHeight;
      const targetScroll = sentinelTop - containerHeight + sentinel.offsetHeight;
      
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }
}

export default ChatView;
