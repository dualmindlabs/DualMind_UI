/**
 * ChatView
 * Renders:
 * - Battle/Arena: 1 prompt -> 2 model replies (side-by-side)
 * - Direct: linear chat
 */

import { Icons } from '../../js/icons.js';
import { sanitizeHTML } from '../../js/ui/utils.js';

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
  return sanitizeHTML(str);
}

export class ChatView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this._onClick = null;
    this._shouldAutoScroll = true; // Always auto-scroll by default
    this._isUserScrolling = false;
    this._responseModalState = {
      open: false,
      turnId: null,
      side: null
    };
    this._responseModalBound = false;
    this.state = {
      mode: 'battle',
      turns: [],
      direct: [],
      apiEnabled: true,
    };

    this.setupMarkdown();
    this.render();
    this.attach();
    this.attachScrollListener();
  }

  setupMarkdown() {
    if (window.marked && window.hljs) {
      window.marked.setOptions({
        highlight: function (code, lang) {
          if (lang && window.hljs.getLanguage(lang)) {
            return window.hljs.highlight(code, { language: lang }).value;
          }
          return window.hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
      });
    }
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
    // Fallback if marked not loaded
    return sanitizeHTML(text).replace(/\n/g, '<br>');
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

    // CRITICAL: Force auto-scroll to bottom for new message (instant, not smooth)
    requestAnimationFrame(() => {
      this.scrollToBottom(true); // Force scroll to bottom
      this.attachResponseBodyScrollListeners();
    });
  }

  clear() {
    this.state.turns = [];
    this.state.direct = [];
    this.render();
  }

  render(preserveScroll = false) {
    if (!this.container) return;
    const { mode } = this.state;

    // Save scroll position if requested
    let scrollPosition = 0;
    const scrollContainer = this.container.parentElement;
    if (preserveScroll && scrollContainer) {
      scrollPosition = scrollContainer.scrollTop;
    }

    this.container.innerHTML = `
      <div class="chat-area">
        ${mode === 'direct' ? this.renderDirect() : this.renderArena()}
      </div>
    `;

    // Restore scroll position if requested
    if (preserveScroll && scrollContainer && scrollPosition > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollPosition;
      });
    } else if (!preserveScroll) {
      // If not preserving scroll, auto-scroll to bottom for new content
      requestAnimationFrame(() => {
        this.scrollToBottom(true); // Force scroll to bottom
      });
    }

    // Reattach model selector listeners if rendering empty state
    requestAnimationFrame(() => {
      this.attachModelSelectorListeners();
      this.attachResponseBodyScrollListeners();
    });
  }

  renderEmptyArena() {
    const models = window._DUALMIND_MODELS || [];
    const savedLeft = localStorage.getItem('battle.model.left') || '';
    const savedRight = localStorage.getItem('battle.model.right') || '';
    const mode = this.state.mode;

    // ── BATTLE MODE ──────────────────────────────────────────────────────────
    if (mode === 'battle') {
      return `
        <div class="dm-battle-empty">
          <div class="dm-battle-empty-top">
            <div class="dm-battle-empty-eyebrow">
              ${Icons.battle ? Icons.battle('rgba(74,171,194,0.9)', 18) : ''}
              <span>Battle Mode</span>
            </div>
            <h2 class="dm-battle-empty-heading">Two AI models enter.<br>One winner emerges.</h2>
            <p class="dm-battle-empty-sub">Models are anonymous until you vote — no bias, just performance.</p>
          </div>

          <div class="dm-battle-arena">
            <div class="dm-mystery-card dm-mystery-card--left">
              <div class="dm-mystery-card-glow dm-mystery-card-glow--cyan"></div>
              <div class="dm-mystery-label dm-mystery-label--cyan">A</div>
              <div class="dm-mystery-dots">
                <span class="dm-mystery-dot"></span>
                <span class="dm-mystery-dot"></span>
                <span class="dm-mystery-dot"></span>
              </div>
              <div class="dm-mystery-name">Mystery AI</div>
              <div class="dm-mystery-lines">
                <div class="dm-mystery-line" style="width:80%"></div>
                <div class="dm-mystery-line" style="width:60%"></div>
                <div class="dm-mystery-line" style="width:70%"></div>
              </div>
            </div>

            <div class="dm-battle-vs-center">
              <div class="dm-battle-vs-line dm-battle-vs-line--top"></div>
              <div class="dm-battle-vs-badge">VS</div>
              <div class="dm-battle-vs-line dm-battle-vs-line--bottom"></div>
            </div>

            <div class="dm-mystery-card dm-mystery-card--right">
              <div class="dm-mystery-card-glow dm-mystery-card-glow--terra"></div>
              <div class="dm-mystery-label dm-mystery-label--terra">B</div>
              <div class="dm-mystery-dots">
                <span class="dm-mystery-dot dm-mystery-dot--terra"></span>
                <span class="dm-mystery-dot dm-mystery-dot--terra"></span>
                <span class="dm-mystery-dot dm-mystery-dot--terra"></span>
              </div>
              <div class="dm-mystery-name">Mystery AI</div>
              <div class="dm-mystery-lines">
                <div class="dm-mystery-line dm-mystery-line--terra" style="width:65%"></div>
                <div class="dm-mystery-line dm-mystery-line--terra" style="width:85%"></div>
                <div class="dm-mystery-line dm-mystery-line--terra" style="width:50%"></div>
              </div>
            </div>
          </div>

          <div class="dm-prompt-chips" data-mode="battle">
            <span class="dm-chips-label">Try asking:</span>
            <button class="dm-prompt-chip" data-prompt="Explain quantum entanglement like I'm 15">Explain quantum entanglement simply</button>
            <button class="dm-prompt-chip" data-prompt="Write a Python function to find duplicates in a list">Write a Python deduplication function</button>
            <button class="dm-prompt-chip" data-prompt="What are the pros and cons of React vs Vue in 2025?">React vs Vue in 2025?</button>
          </div>
        </div>
      `;
    }

    // ── ARENA / SIDE-BY-SIDE MODE ─────────────────────────────────────────────
    return `
      <div class="dm-arena-empty" style="pointer-events: auto;">
        <div class="dm-arena-empty-top">
          <div class="dm-battle-empty-eyebrow">
            ${Icons.splitRectangle ? Icons.splitRectangle('rgba(74,171,194,0.9)', 18) : ''}
            <span>Side-by-Side</span>
          </div>
          <h2 class="dm-battle-empty-heading">Pick your models.<br>Compare their answers.</h2>
          <p class="dm-battle-empty-sub">Choose any two AI models and see how they respond to the same prompt.</p>
        </div>

        <div class="dm-arena-selector-wrap" style="pointer-events: auto;">
          <div class="dm-arena-model-card dm-arena-model-card--left" style="pointer-events: auto;">
            <div class="dm-arena-card-label">
              <span class="dm-arena-card-dot dm-arena-card-dot--cyan"></span>
              Model A — Left
            </div>
            <select id="model-select-left" class="dm-model-select" style="pointer-events: auto;" color-scheme="dark">
              <option value="">🎲 Random</option>
              ${models.map(m => `
                <option value="${m.modelName}" ${savedLeft === m.modelName ? 'selected' : ''}>
                  ${window._APP ? window._APP.prettifyModelName(m.modelName) : m.modelName}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="dm-arena-center-col">
            <button id="swap-models-btn" class="dm-swap-btn" title="Swap models" aria-label="Swap models">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
              </svg>
            </button>
            <button id="random-pair-btn" class="dm-random-btn">🎲 Random Pair</button>
          </div>

          <div class="dm-arena-model-card dm-arena-model-card--right" style="pointer-events: auto;">
            <div class="dm-arena-card-label">
              <span class="dm-arena-card-dot dm-arena-card-dot--terra"></span>
              Model B — Right
            </div>
            <select id="model-select-right" class="dm-model-select" style="pointer-events: auto;" color-scheme="dark">
              <option value="">🎲 Random</option>
              ${models.map(m => `
                <option value="${m.modelName}" ${savedRight === m.modelName ? 'selected' : ''}>
                  ${window._APP ? window._APP.prettifyModelName(m.modelName) : m.modelName}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="dm-prompt-chips" data-mode="arena">
          <span class="dm-chips-label">Try asking:</span>
          <button class="dm-prompt-chip" data-prompt="Write a cover letter for a software engineer role">Write a software engineer cover letter</button>
          <button class="dm-prompt-chip" data-prompt="Explain the difference between async/await and promises">async/await vs Promises</button>
          <button class="dm-prompt-chip" data-prompt="Give me a 7-day workout plan for beginners">Beginner 7-day workout plan</button>
        </div>
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
    const voteChoice = turn.voteChoice || null;
    const voteStatus = turn.voteStatus || 'idle';
    const voted = voteStatus === 'submitted';
    const voteDelay = voteStatus === 'vote-delay';

    // During vote-delay (10s after voting), show both responses
    // After that, show only voted response unless tie/both-bad
    // Allow manual toggle via _showHidden flag
    const showBothByDefault = !voted || voteChoice === 'tie' || voteChoice === 'both-bad';
    const showLeft = showBothByDefault || voteChoice === 'left' || turn._showHidden;
    const showRight = showBothByDefault || voteChoice === 'right' || turn._showHidden;

    // Track if we need a toggle button (voted but not showing one side)
    const needsToggle = voted && voteChoice && voteChoice !== 'tie' && voteChoice !== 'both-bad';
    const hiddenSide = needsToggle ? (voteChoice === 'left' ? 'right' : 'left') : null;

    return `
      <section class="chat-turn" data-turn-id="${turn.id}">
        <!-- Turn counter badge -->
        <div class="dm-turn-header" aria-hidden="true">
          <div class="dm-turn-badge">Turn ${(this.state.turns || []).indexOf(turn) + 1}</div>
          <div class="dm-turn-rule"></div>
        </div>

        <!-- User message on right side -->
        <div class="user-message-container">
          <div class="user-message">
            <div class="user-avatar">You</div>
            <div class="user-bubble">
              <div class="user-text">${prompt}</div>
            </div>
          </div>
        </div>

        <!-- AI responses -->
        <div class="responses-grid ${!showLeft || !showRight ? 'single-response' : ''}">
          ${showLeft ? this.renderResponseCard(turn, 'left', left) : ''}
          ${showLeft && showRight ? '<div class="battle-vs-divider" aria-hidden="true"><div class="battle-vs-line"></div></div>' : ''}
          ${showRight ? this.renderResponseCard(turn, 'right', right) : ''}
        </div>

        ${needsToggle ? this.renderToggleButton(turn.id, hiddenSide, this.state.mode === 'battle' && !voted) : ''}
        ${this.renderVoteBar(turn)}
      </section>
    `;
  }

  renderResponseCard(turn, side, data) {
    const turnId = turn.id;
    const bodyId = `resp-${turnId}-${side}`;
    // Use renderMarkdown instead of escapeHtml to properly render markdown
    const text = data.text || '';
    const streaming = !!data.streaming;
    const assistantLabel = side === 'left' ? 'A' : 'B';

    // Model anonymization: Show real name only AFTER voting
    const voteStatus = turn.voteStatus || 'idle';
    const voteChoice = turn.voteChoice || null;
    const voted = voteStatus === 'submitted';

    // Pre-vote: Anonymous labels. Post-vote: Reveal real model name (just the name string)
    const anonymousLabel = side === 'left' ? 'Model A' : 'Model B';
    const realModelName = data.modelName;

    // Safety check: sometimes modelName might be "undefined" string or null
    let safeModelName = realModelName;
    if (!safeModelName || safeModelName === 'undefined' || safeModelName === 'null') {
      safeModelName = anonymousLabel;
    }

    // CRITICAL: Strip description from model name AND provider prefix
    let cleanModelName = safeModelName;
    if (safeModelName && safeModelName !== anonymousLabel) {
      // Strip everything after em-dash (–) or hyphen with space ( - )
      cleanModelName = safeModelName.split('–')[0].split(' - ')[0].trim();
      // Strip provider prefix (e.g., "groq/", "openai/", etc.)
      cleanModelName = cleanModelName.replace(/^[^/]+\//, '');
    }

    // VISIBILITY LOGIC:
    // - Battle Mode: Hidden until voted
    // - Side-by-Side / Direct: Always visible
    const isBattle = this.state.mode === 'battle';
    const showRealName = !isBattle || voted;

    const displayName = showRealName ? escapeHtml(cleanModelName) : anonymousLabel;

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
            <span class="assistant-tag ${side}">${assistantLabel}</span>
            <span class="model-dot ${side}"></span>
            <span class="model-name">${displayName}</span>
          </div>

          <div class="message-actions">
            <button class="icon-btn" type="button" data-action="refresh" data-turn-id="${turnId}" data-side="${side}" aria-label="Regenerate reply" title="Regenerate">
              ${renderRefreshIcon('white', 16)}
            </button>
            <button class="icon-btn copy-btn" type="button" data-action="copy" data-target="${bodyId}" aria-label="Copy reply" title="Copy">
              ${Icons.code('white', 16)}
            </button>
            <button class="icon-btn tts-btn" type="button" data-action="speak" data-target="${bodyId}" aria-label="Read aloud" title="Read aloud">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
            <button class="icon-btn" type="button" data-action="expand" data-turn-id="${turnId}" data-side="${side}" aria-label="Expand reply" title="Full screen">
              ${renderExpandIcon('white', 16)}
            </button>
          </div>
        </div>

        <div class="response-body markdown-body" id="${bodyId}" aria-live="${streaming ? 'polite' : 'off'}">
          ${streaming && !text ? `
            <div class="battle-skeleton-body">
              <div class="battle-skeleton-line skeleton-shimmer" style="width: 92%;"></div>
              <div class="battle-skeleton-line skeleton-shimmer" style="width: 78%;"></div>
              <div class="battle-skeleton-line skeleton-shimmer" style="width: 86%;"></div>
              <div class="battle-skeleton-line skeleton-shimmer" style="width: 65%;"></div>
            </div>
          ` : this.renderMarkdown(text) + (streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : '')}
        </div>
      </article>
    `;
  }

  ensureResponseModal() {
    let modal = document.getElementById('response-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'response-modal';
      modal.className = 'response-modal';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="response-modal-scrim" data-action="close-response-modal"></div>
        <div class="response-modal-card" role="dialog" aria-modal="true" aria-labelledby="response-modal-title">
          <div class="response-modal-header">
            <div class="response-modal-heading">
              <span class="response-modal-tag" id="response-modal-tag">A</span>
              <div class="response-modal-meta">
                <div class="response-modal-title" id="response-modal-title">Model A</div>
                <div class="response-modal-subtitle" id="response-modal-subtitle">Full response</div>
              </div>
            </div>
            <button class="response-modal-close icon-btn" type="button" data-action="close-response-modal" aria-label="Close">
              ${Icons.close('white', 18)}
            </button>
          </div>
          <div class="response-modal-body markdown-body" id="response-modal-body"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    if (!this._responseModalBound) {
      this._responseModalBound = true;
      modal.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="close-response-modal"]')) {
          this.closeResponseModal();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this._responseModalState.open) {
          this.closeResponseModal();
        }
      });
    }

    return modal;
  }

  openResponseModal(turnId, side) {
    if (!turnId || !side) return;
    const turn = (this.state.turns || []).find((t) => String(t.id) === String(turnId));
    if (!turn) return;

    const data = turn[side] || {};
    const isBattle = this.state.mode === 'battle';
    const voteStatus = turn.voteStatus || 'idle';
    const voted = voteStatus === 'submitted';
    const anonymousLabel = side === 'left' ? 'Model A' : 'Model B';
    const realModelName = data.modelName;

    let safeModelName = realModelName;
    if (!safeModelName || safeModelName === 'undefined' || safeModelName === 'null') {
      safeModelName = anonymousLabel;
    }

    let cleanModelName = safeModelName;
    if (safeModelName && safeModelName !== anonymousLabel) {
      cleanModelName = safeModelName.split('–')[0].split(' - ')[0].trim();
    }

    const displayName = (!isBattle || voted) ? cleanModelName : anonymousLabel;

    const modal = this.ensureResponseModal();
    modal.setAttribute('data-side', side);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    const tag = modal.querySelector('#response-modal-tag');
    const title = modal.querySelector('#response-modal-title');
    const subtitle = modal.querySelector('#response-modal-subtitle');
    const body = modal.querySelector('#response-modal-body');

    if (tag) tag.textContent = side === 'left' ? 'A' : 'B';
    if (title) title.textContent = displayName;
    if (subtitle) subtitle.textContent = data.streaming ? 'Streaming response' : 'Full response';

    if (body) {
      if (data.streaming && !data.text) {
        body.innerHTML = `
          <div class="battle-skeleton-body">
            <div class="battle-skeleton-line skeleton-shimmer" style="width: 92%;"></div>
            <div class="battle-skeleton-line skeleton-shimmer" style="width: 78%;"></div>
            <div class="battle-skeleton-line skeleton-shimmer" style="width: 86%;"></div>
            <div class="battle-skeleton-line skeleton-shimmer" style="width: 65%;"></div>
          </div>
        `;
      } else {
        body.innerHTML = this.renderMarkdown(data.text || '') + (data.streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : '');
      }
      body.scrollTop = 0;
      if (window.hljs) {
        body.querySelectorAll('pre code').forEach((block) => {
          window.hljs.highlightElement(block);
        });
      }
    }

    this._responseModalState = { open: true, turnId, side };
    document.body.style.overflow = 'hidden';
  }

  closeResponseModal() {
    const modal = document.getElementById('response-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this._responseModalState = { open: false, turnId: null, side: null };
  }

  renderToggleButton(turnId, hiddenSide, isAnonymous) {
    const sideLabel = hiddenSide === 'left' ? (isAnonymous ? 'Model A' : 'Left') : (isAnonymous ? 'Model B' : 'Right');
    return `
      <div class="toggle-response-container">
        <button
          class="toggle-response-btn"
          data-action="toggle-response"
          data-turn-id="${turnId}"
          data-side="${hiddenSide}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          See other response (${sideLabel})
        </button>
      </div>
    `;
  }

  renderVoteBar(turn) {
    if (turn.voteStatus === 'submitted') {
      return '';
    }
    return '';
  }

  renderDirect() {
    const msgs = this.state.direct || [];
    if (msgs.length === 0) {
      const models = window._DUALMIND_MODELS || [];
      const savedModel = localStorage.getItem('direct.model') || '';

      return `
        <div class="dm-direct-empty" style="pointer-events: auto;">
          <div class="dm-battle-empty-top">
            <div class="dm-battle-empty-eyebrow">
              ${Icons.chat ? Icons.chat('rgba(74,171,194,0.9)', 18) : ''}
              <span>Direct Chat</span>
            </div>
            <h2 class="dm-battle-empty-heading">Choose your AI.<br>Start the conversation.</h2>
            <p class="dm-battle-empty-sub">Pick one model and chat with it directly — no comparison, just pure conversation.</p>
          </div>

          <div class="dm-direct-selector-wrap" style="pointer-events: auto;">
            <div class="dm-direct-model-card" style="pointer-events: auto;">
              <div class="dm-arena-card-label">
                <span class="dm-arena-card-dot dm-arena-card-dot--cyan"></span>
                Select Model
              </div>
              <select id="model-select-direct" class="dm-model-select dm-model-select--wide" style="pointer-events: auto;" color-scheme="dark">
                <option value="">🎲 Random Model</option>
                ${models.map(m => {
          const name = String(m.modelName ?? m.model_name ?? '');
          return `
                  <option value="${name}" ${name && savedModel === name ? 'selected' : ''}>
                    ${window._APP ? window._APP.prettifyModelName(name) : name}
                  </option>
                `;
        }).join('')}
              </select>
            </div>
          </div>

          <div class="dm-prompt-chips" data-mode="direct">
            <span class="dm-chips-label">Try asking:</span>
            <button class="dm-prompt-chip" data-prompt="Write a short story about a robot learning to feel emotions">A story about a robot learning emotions</button>
            <button class="dm-prompt-chip" data-prompt="Explain how neural networks work in simple terms">How do neural networks work?</button>
            <button class="dm-prompt-chip" data-prompt="Help me write a professional email declining a meeting">Decline a meeting professionally</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="direct-thread">
        ${msgs.map((m, i) => {
      const role = m.role === 'user' ? 'user' : 'assistant';
      const messageId = m.id ?? `msg-${i}`;
      const directTextAttrs = role === 'assistant'
        ? ` id="direct-resp-${messageId}" data-message-id="${messageId}"`
        : '';

      return `
            <div class="direct-msg ${role}" data-message-id="${messageId}">
              <div class="direct-bubble glass-panel">
                <div class="direct-meta">${role === 'user' ? 'You' : escapeHtml(m.modelName || 'Assistant')}</div>
                <div class="direct-text markdown-body"${directTextAttrs}>${role === 'user' ? escapeHtml(m.text || '') : this.renderMarkdown(m.text || '')}</div>
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
      const refreshBtn = e.target.closest?.('button[data-action="refresh"]');
      if (refreshBtn) {
        const turnId = refreshBtn.getAttribute('data-turn-id');
        const turn = (this.state.turns || []).find((t) => String(t.id) === String(turnId));
        const prompt = turn?.prompt || '';
        if (prompt.trim()) {
          document.dispatchEvent(new CustomEvent('chat-submit', { detail: { message: prompt.trim(), attachments: [] } }));
        }
        return;
      }

      const expandBtn = e.target.closest?.('button[data-action="expand"]');
      if (expandBtn) {
        const turnId = expandBtn.getAttribute('data-turn-id');
        const side = expandBtn.getAttribute('data-side');
        this.openResponseModal(turnId, side);
        return;
      }

      const toggleBtn = e.target.closest?.('button[data-action="toggle-response"]');
      if (toggleBtn) {
        const turnId = toggleBtn.getAttribute('data-turn-id');
        const hiddenSide = toggleBtn.getAttribute('data-side');
        const turn = (this.state.turns || []).find((t) => String(t.id) === String(turnId));
        if (turn) {
          // Toggle the hidden response visibility
          turn._showHidden = !turn._showHidden;
          this.render();
        }
        return;
      }

      const voteBtn = e.target.closest?.('button[data-action="vote"]');
      if (voteBtn) {
        const turnId = voteBtn.getAttribute('data-turn-id');
        const choice = voteBtn.getAttribute('data-vote');
        if (!voteBtn.disabled && turnId && choice) {
          document.dispatchEvent(new CustomEvent('vote-submit', { detail: { turnId, choice } }));
        }
        return;
      }

      const btn = e.target.closest?.('button[data-action="copy"]');
      if (!btn) return;

      const targetId = btn.getAttribute('data-target');
      const el = document.getElementById(targetId);
      if (!el) return;

      const text = el.innerText || el.textContent || '';
      try {
        await navigator.clipboard.writeText(text.replace(/\u200B/g, ''));
        btn.classList.add('copied');
        window.setTimeout(() => btn.classList.remove('copied'), 900);
      } catch {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    };

    // Event delegation for clicks
    this.container.addEventListener('click', this._onClick);

    // Initial attachment for model selectors (since they are rendered immediately in empty state)
    this.attachModelSelectorListeners();
  }

  attachModelSelectorListeners() {
    if (!this.container) return;

    // Model Selectors
    const leftSelect = this.container.querySelector('#model-select-left');
    const rightSelect = this.container.querySelector('#model-select-right');
    const directSelect = this.container.querySelector('#model-select-direct');

    // Force dropdown to open on click - critical fix
    [leftSelect, rightSelect, directSelect].forEach(select => {
      if (!select) return;
      
      // Remove any existing handlers first
      const newSelect = select.cloneNode(true);
      select.parentNode.replaceChild(newSelect, select);
      
      // Add fresh click handler to force open
      newSelect.addEventListener('click', (e) => {
        if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('Select clicked:', e.target.id);
        // Ensure the select is focused
        e.target.focus();
      });
      
      // Ensure mousedown doesn't get prevented
      newSelect.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
    });

    // Re-query after replacement
    const freshLeftSelect = this.container.querySelector('#model-select-left');
    const freshRightSelect = this.container.querySelector('#model-select-right');
    const freshDirectSelect = this.container.querySelector('#model-select-direct');

    const handleModelChange = (e) => {
      const isLeft = e.target.id === 'model-select-left';
      let leftVal = freshLeftSelect?.value || '';
      let rightVal = freshRightSelect?.value || '';

      // Validate same model selection
      if (leftVal && rightVal && leftVal === rightVal) {
        alert('Please select different models for left and right');
        if (isLeft) {
          freshLeftSelect.value = '';
          leftVal = '';
        } else {
          freshRightSelect.value = '';
          rightVal = '';
        }
      }

      if (leftVal) localStorage.setItem('battle.model.left', leftVal);
      else localStorage.removeItem('battle.model.left');

      if (rightVal) localStorage.setItem('battle.model.right', rightVal);
      else localStorage.removeItem('battle.model.right');

      if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('Saved model selection:', { left: leftVal, right: rightVal });
    };

    freshLeftSelect?.addEventListener('change', handleModelChange);
    freshRightSelect?.addEventListener('change', handleModelChange);
    freshDirectSelect?.addEventListener('change', (e) => {
      localStorage.setItem('direct.model', e.target.value);
      if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('Saved direct model:', e.target.value);
    });

    // Swap Button
    const swapBtn = this.container.querySelector('#swap-models-btn');
    swapBtn?.addEventListener('click', () => {
      if (freshLeftSelect && freshRightSelect) {
        const temp = freshLeftSelect.value;
        freshLeftSelect.value = freshRightSelect.value;
        freshRightSelect.value = temp;
        handleModelChange();
      }
    });

    // Random Pair Button
    const randomBtn = this.container.querySelector('#random-pair-btn');
    randomBtn?.addEventListener('click', () => {
      if (freshLeftSelect && freshRightSelect) {
        const optionsLeft = Array.from(freshLeftSelect.options).filter(o => o.value);
        const optionsRight = Array.from(freshRightSelect.options).filter(o => o.value);

        if (optionsLeft.length > 0 && optionsRight.length > 0) {
          const randLeft = optionsLeft[Math.floor(Math.random() * optionsLeft.length)].value;
          const randRight = optionsRight[Math.floor(Math.random() * optionsRight.length)].value;

          freshLeftSelect.value = randLeft;
          freshRightSelect.value = randRight;
          handleModelChange();
        }
      }
    });

    // Prompt chips — populate chat input and focus
    this.container.querySelectorAll('.dm-prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (!prompt) return;
        // Try to set the chat input value
        const chatInput = document.getElementById('chat-input') || document.querySelector('textarea[data-id="chat-input"]') || document.querySelector('.chat-input-textarea');
        if (chatInput) {
          chatInput.value = prompt;
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
          chatInput.focus();
        }
      });
    });
  }

  updateDirectResponse(messageId, fullText, streaming = true) {
    const el = document.getElementById(`direct-resp-${messageId}`);
    if (!el) return;

    el.innerHTML = this.renderMarkdown(fullText) + (streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : '');
    this.scrollToBottom();
  }

  finishDirectResponse(messageId) {
    const el = document.getElementById(`direct-resp-${messageId}`);
    if (!el) return;

    const caret = el.querySelector('.stream-caret');
    caret?.remove();

    if (window.hljs) {
      el.querySelectorAll('pre code').forEach((block) => {
        window.hljs.highlightElement(block);
      });
    }
  }

  /**
   * Updates the response content with full text (re-renders Markdown).
   * Used for streaming updates.
   */
  updateResponse(turnId, side, fullText, streaming = true) {
    const el = document.getElementById(`resp-${turnId}-${side}`);
    if (!el) return;

    // Re-render Markdown
    el.innerHTML = this.renderMarkdown(fullText) + (streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : '');

    // Auto-scroll
    this.scrollToBottom();

    if (this._responseModalState.open &&
      String(this._responseModalState.turnId) === String(turnId) &&
      this._responseModalState.side === side) {
      const modal = document.getElementById('response-modal');
      const modalBody = modal?.querySelector('#response-modal-body');
      if (modalBody) {
        modalBody.innerHTML = this.renderMarkdown(fullText) + (streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : '');
        if (window.hljs) {
          modalBody.querySelectorAll('pre code').forEach((block) => {
            window.hljs.highlightElement(block);
          });
        }
      }
    }
  }

  finishResponse(turnId, side) {
    const el = document.getElementById(`resp-${turnId}-${side}`);
    if (!el) return;

    // Remove caret
    const caret = el.querySelector('.stream-caret');
    caret?.remove();

    // Remove is-streaming class from response card
    const card = document.querySelector(`.response-card[data-turn-id="${turnId}"][data-side="${side}"]`);
    card?.classList.remove('is-streaming');

    if (this._responseModalState.open &&
      String(this._responseModalState.turnId) === String(turnId) &&
      this._responseModalState.side === side) {
      const modal = document.getElementById('response-modal');
      const modalBody = modal?.querySelector('#response-modal-body');
      const modalSubtitle = modal?.querySelector('#response-modal-subtitle');
      if (modalBody) {
        const caret = modalBody.querySelector('.stream-caret');
        caret?.remove();
      }
      if (modalSubtitle) {
        modalSubtitle.textContent = 'Full response';
      }
    }

    // Syntax highlight specifically if needed (though marked already handles it via callback)
    if (window.hljs) {
      el.querySelectorAll('pre code').forEach((block) => {
        window.hljs.highlightElement(block);
      });
    }
  }

  attachScrollListener() {
    // The scroll container is #main-content (parent of this.container)
    const scrollContainer = this.container.parentElement;
    if (!scrollContainer) return;

    let scrollTimeout;
    let lastScrollTop = scrollContainer.scrollTop;

    scrollContainer.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;

      // Calculate scroll direction and delta
      const scrollDelta = scrollTop - lastScrollTop;
      lastScrollTop = scrollTop;

      // Ignore tiny scroll changes that might be from layout shifts or smooth scrolling
      if (Math.abs(scrollDelta) < 2) return;

      // If we are scrolling down, it might be auto-scroll, so we shouldn't immediately assume user is scrolling
      // Only assume user scrolling if they explicitly scroll UP
      if (scrollDelta < 0) {
        clearTimeout(scrollTimeout);
        this._isUserScrolling = true;
      }

      scrollTimeout = setTimeout(() => {
        this._isUserScrolling = false;
        // Check if user is near bottom - if yes, resume auto-scroll
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        // If within 150px of bottom, enable auto-scroll
        this._shouldAutoScroll = distanceFromBottom < 150;
      }, 150);
    });
  }

  /**
   * Attach scroll listeners to each .response-body so the parent .response-card
   * receives the `.at-bottom` class when scrolled to the bottom.
   * This controls the CSS overflow-fade indicator defined in ui-improvements.css.
   * Call this after every render that produces response cards.
   */
  attachResponseBodyScrollListeners() {
    const bodies = this.container.querySelectorAll('.response-body');
    bodies.forEach((body) => {
      if (body._overflowListenerAttached) return;
      body._overflowListenerAttached = true;

      const card = body.closest('.response-card');
      if (!card) return;

      const updateAtBottom = () => {
        const { scrollTop, scrollHeight, clientHeight } = body;
        const atBottom = scrollHeight - scrollTop - clientHeight < 8;
        card.classList.toggle('at-bottom', atBottom);
      };

      // Initial check
      updateAtBottom();
      body.addEventListener('scroll', updateAtBottom, { passive: true });

      // Also check on resize (content may reflow)
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(updateAtBottom);
        ro.observe(body);
      }
    });
  }

  scrollToBottom(force = false) {
    const scrollContainer = this.container.parentElement;
    if (!scrollContainer) return;

    // Force scroll if explicitly requested (new message)
    if (force) {
      // Use instant scroll for new messages to prevent jump
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
      return;
    }

    // ChatGPT-style scroll behavior: respect user scroll position
    if (!this._shouldAutoScroll) return;
    if (this._isUserScrolling) return;

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


