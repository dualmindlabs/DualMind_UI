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
    this._shouldAutoScroll = true;
    this._isUserScrolling = false;
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
        return window.marked.parse(text);
      } catch (e) {
        console.error('Markdown parse error:', e);
        return text;
      }
    }
    // Fallback if marked not loaded
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
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
    }
  }

  renderEmptyArena() {
    const models = window._DUALMIND_MODELS || [];
    const savedLeft = localStorage.getItem('battle.model.left') || '';
    const savedRight = localStorage.getItem('battle.model.right') || '';
    const mode = this.state.mode; // 'battle' (blind) or 'arena' (side-by-side)

    // BATTLE MODE: Pure Random, No Selection
    if (mode === 'battle') {
      return `
        <div class="chat-empty glass-panel">
          <div class="chat-empty-icon">${Icons.battle ? Icons.battle('white', 32) : '⚔️'}</div>
          <div class="chat-empty-title">Battle Mode</div>
          <p class="chat-empty-subtitle">Two anonymous models. One winner. Your vote.</p>
          
          <div class="random-battle-card">
            <div class="random-model">
              <span class="random-icon">❓</span>
              <span class="random-label">Random Model</span>
            </div>
            <div class="vs-badge">VS</div>
            <div class="random-model">
              <span class="random-icon">❓</span>
              <span class="random-label">Random Model</span>
            </div>
          </div>
          
          <p class="model-selector-hint">Enter your prompt below to start the battle!</p>
        </div>
      `;
    }

    // ARENA/SIDE-BY-SIDE MODE: Model Selection
    return `
      <div class="chat-empty glass-panel">
        <div class="chat-empty-icon">${Icons.splitRectangle ? Icons.splitRectangle('white', 32) : '◫'}</div>
        <div class="chat-empty-title">Side-by-Side Comparison</div>
        
        <div class="model-selector-grid">
          <div class="model-selector-column">
            <label class="model-label">Left Model</label>
            <select id="model-select-left" class="model-select">
              <option value="">🎲 Random</option>
              ${models.map(m => `
                <option value="${m.modelId}" ${savedLeft === m.modelId ? 'selected' : ''}>
                  ${window._APP ? window._APP.prettifyModelName(m.modelName) : m.modelName}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="model-selector-actions">
            <button id="swap-models-btn" class="icon-btn" title="Swap models">⇄</button>
            <button id="random-pair-btn" class="secondary-btn">🎲 Random Pair</button>
          </div>
          
          <div class="model-selector-column">
            <label class="model-label">Right Model</label>
            <select id="model-select-right" class="model-select">
              <option value="">🎲 Random</option>
              ${models.map(m => `
                <option value="${m.modelId}" ${savedRight === m.modelId ? 'selected' : ''}>
                  ${window._APP ? window._APP.prettifyModelName(m.modelName) : m.modelName}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
        
        <p class="model-selector-hint">Select models above, then type your prompt below</p>
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
          ${showRight ? this.renderResponseCard(turn, 'right', right) : ''}
        </div>

        ${needsToggle ? this.renderToggleButton(turn.id, hiddenSide) : ''}
        ${this.renderVoteBar(turn)}
      </section>
    `;
  }

  renderResponseCard(turn, side, data) {
    const turnId = turn.id;
    const bodyId = `resp-${turnId}-${side}`;
    const text = escapeHtml(data.text || '');
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

    // CRITICAL: Strip description from model name 
    let cleanModelName = safeModelName;
    if (safeModelName && safeModelName !== anonymousLabel) {
      // Strip everything after em-dash (–) or hyphen with space ( - )
      cleanModelName = safeModelName.split('–')[0].split(' - ')[0].trim();
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
            <span class="assistant-tag">${assistantLabel}</span>
            <span class="model-dot ${side}"></span>
            <span class="model-name">${displayName}</span>
          </div>

          <div class="message-actions">
            <button class="icon-btn" type="button" data-action="refresh" data-turn-id="${turnId}" data-side="${side}" aria-label="Regenerate reply">
              ${renderRefreshIcon('white', 18)}
            </button>
            <button class="icon-btn copy-btn" type="button" data-action="copy" data-target="${bodyId}" aria-label="Copy reply">
              ${Icons.code('white', 18)}
            </button>
            <button class="icon-btn tts-btn" type="button" data-action="speak" data-target="${bodyId}" aria-label="Read aloud">
              🔊
            </button>
            <button class="icon-btn" type="button" data-action="expand" data-turn-id="${turnId}" data-side="${side}" aria-label="Expand reply">
              ${renderExpandIcon('white', 18)}
            </button>
          </div>
        </div>

        <div class="response-body" id="${bodyId}" aria-live="${streaming ? 'polite' : 'off'}">${text}${streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : ''}</div>
      </article>
    `;
  }

  renderToggleButton(turnId, hiddenSide) {
    const sideLabel = hiddenSide === 'left' ? 'Left (Model A)' : 'Right (Model B)';
    return `
      <div class="toggle-response-container" style="text-align: center; margin: 16px 0;">
        <button 
          class="toggle-response-btn secondary-btn" 
          data-action="toggle-response" 
          data-turn-id="${turnId}" 
          data-side="${hiddenSide}"
          style="padding: 12px 24px; border-radius: 12px; background: rgba(74, 171, 194, 0.15); border: 1px solid rgba(74, 171, 194, 0.3); color: #4AABC2; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          👁️ See Other Response (${sideLabel})
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
        <div class="chat-empty glass-panel">
          <div class="chat-empty-icon">${Icons.chat('white', 32)}</div>
          <div class="chat-empty-title">Direct Chat Mode</div>
          
          <div class="direct-model-selector">
            <label class="model-label">Choose Your Model</label>
            <select id="model-select-direct" class="model-select">
              <option value="">🎲 Random Model</option>
              ${models.map(m => {
                const id = String(m.modelId ?? m.model_id ?? '');
                const name = m.modelName ?? m.model_name ?? '';
                return `
                <option value="${id}" ${id && savedModel === id ? 'selected' : ''}>
                  ${window._APP ? window._APP.prettifyModelName(name) : name}
                </option>
              `;
              }).join('')}
            </select>
          </div>
          
          <p class="model-selector-hint">Select a model above, then start chatting</p>
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
                <div class="direct-text markdown-body">${role === 'user' ? escapeHtml(m.text || '') : this.renderMarkdown(m.text || '')}</div>
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
        const turnId = Number(refreshBtn.getAttribute('data-turn-id'));
        const turn = (this.state.turns || []).find((t) => Number(t.id) === turnId);
        const prompt = turn?.prompt || '';
        if (prompt.trim()) {
          document.dispatchEvent(new CustomEvent('chat-submit', { detail: { message: prompt.trim(), attachments: [] } }));
        }
        return;
      }

      const expandBtn = e.target.closest?.('button[data-action="expand"]');
      if (expandBtn) {
        const card = expandBtn.closest?.('.response-card');
        card?.classList.toggle('is-expanded');
        return;
      }

      const toggleBtn = e.target.closest?.('button[data-action="toggle-response"]');
      if (toggleBtn) {
        const turnId = toggleBtn.getAttribute('data-turn-id');
        const hiddenSide = toggleBtn.getAttribute('data-side');
        const turn = (this.state.turns || []).find((t) => t.id === turnId);
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

    const handleModelChange = () => {
      const leftVal = leftSelect?.value || '';
      const rightVal = rightSelect?.value || '';

      localStorage.setItem('battle.model.left', leftVal);
      localStorage.setItem('battle.model.right', rightVal);
      console.log('Saved model selection:', { left: leftVal, right: rightVal });
    };

    leftSelect?.addEventListener('change', handleModelChange);
    rightSelect?.addEventListener('change', handleModelChange);

    // Swap Button
    const swapBtn = this.container.querySelector('#swap-models-btn');
    swapBtn?.addEventListener('click', () => {
      if (leftSelect && rightSelect) {
        const temp = leftSelect.value;
        leftSelect.value = rightSelect.value;
        rightSelect.value = temp;
        handleModelChange();
      }
    });

    // Random Pair Button
    const randomBtn = this.container.querySelector('#random-pair-btn');
    randomBtn?.addEventListener('click', () => {
      if (leftSelect && rightSelect) {
        const optionsLeft = Array.from(leftSelect.options).filter(o => o.value);
        const optionsRight = Array.from(rightSelect.options).filter(o => o.value);

        if (optionsLeft.length > 0 && optionsRight.length > 0) {
          const randLeft = optionsLeft[Math.floor(Math.random() * optionsLeft.length)].value;
          const randRight = optionsRight[Math.floor(Math.random() * optionsRight.length)].value;

          leftSelect.value = randLeft;
          rightSelect.value = randRight;
          handleModelChange();
        }
      }
    });
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


