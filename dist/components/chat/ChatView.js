/**
 * ChatView
 * Renders:
 * - Battle/Arena: 1 prompt -> 2 model replies (side-by-side)
 * - Direct: linear chat
 */

import { Icons } from '../../js/icons.js';

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
    this.state = {
      mode: 'battle',
      turns: [],
      direct: [],
      apiEnabled: true,
    };

    this.render();
    this.attach();
  }

  setState(next) {
    this.state = { ...this.state, ...next };
    this.render();
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
        ${mode === 'direct' ? this.renderDirect() : this.renderArena()}
      </div>
    `;
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
        ${turns.map((t, idx) => this.renderTurn(t, idx)).join('')}
      </div>
    `;
  }

  renderTurn(turn) {
    const prompt = escapeHtml(turn.prompt || '');
    const left = turn.left ?? {};
    const right = turn.right ?? {};

    return `
      <section class="chat-turn" data-turn-id="${turn.id}">
        <div class="prompt-row">
          <div class="prompt-bubble glass-panel">
            <div class="prompt-label">Prompt</div>
            <div class="prompt-text">${prompt}</div>
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

    const voteStatus = turn.voteStatus || 'idle';
    const voteChoice = turn.voteChoice || null;
    const voted = voteStatus === 'submitted';
    const isWinner = voted && (voteChoice === 'tie' || voteChoice === side);
    const isLoser = voted && voteChoice && voteChoice !== 'tie' && voteChoice !== side;
    const voteClass = `${isWinner ? ' is-winner' : ''}${isLoser ? ' is-loser' : ''}`;

    return `
      <article class="response-card glass-panel ${streaming ? 'is-streaming' : ''}${voteClass}" data-turn-id="${turnId}" data-side="${side}">
        <div class="response-header">
          <div class="model-badge">
            <span class="model-dot ${side}"></span>
            <span class="model-name">${modelName}</span>
          </div>

          <div class="message-actions">
            <button class="icon-btn copy-btn" type="button" data-action="copy" data-target="${bodyId}" aria-label="Copy reply">
              ${Icons.code('white', 18)}
            </button>
          </div>
        </div>

        <div class="response-body" id="${bodyId}" aria-live="${streaming ? 'polite' : 'off'}">${text}${streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : ''}</div>
      </article>
    `;
  }

  renderVoteBar(turn) {
    const leftDone = !turn.left?.streaming;
    const rightDone = !turn.right?.streaming;
    const ready = leftDone && rightDone;

    const status = turn.voteStatus || 'idle';
    const choice = turn.voteChoice || null;
    const submitted = status === 'submitted';
    const submitting = status === 'submitting';

    const apiEnabled = !!this.state.apiEnabled;
    const hasComparison = !!turn.comparisonId;

    const leftLabel = escapeHtml(turn.left?.modelName || 'Left');
    const rightLabel = escapeHtml(turn.right?.modelName || 'Right');

    const disableCommon = !ready || submitting || submitted;
    const leftDisabled = disableCommon || !apiEnabled || !hasComparison;
    const rightDisabled = disableCommon || !apiEnabled || !hasComparison;
    const tieDisabled = disableCommon; // tie is local-only

    const hint =
      turn.voteMessage ||
      (!ready ? 'Vote after both replies finish.' :
      (!apiEnabled ? 'API is off — enable API to submit votes.' :
      (!hasComparison ? 'Vote needs a comparisonId — use API battle mode.' : '')));

    return `
      <div class="vote-row">
        <div class="vote-panel glass-panel">
          <div class="vote-title">Which response was better?</div>
          <div class="vote-actions">
            <button
              class="vote-btn ${choice === 'left' ? 'active' : ''}"
              type="button"
              data-action="vote"
              data-vote="left"
              data-turn-id="${turn.id}"
              ${leftDisabled ? 'disabled' : ''}
              aria-pressed="${choice === 'left' ? 'true' : 'false'}"
            >${leftLabel}</button>

            <button
              class="vote-btn vote-tie ${choice === 'tie' ? 'active' : ''}"
              type="button"
              data-action="vote"
              data-vote="tie"
              data-turn-id="${turn.id}"
              ${tieDisabled ? 'disabled' : ''}
              aria-pressed="${choice === 'tie' ? 'true' : 'false'}"
            >Tie</button>

            <button
              class="vote-btn ${choice === 'right' ? 'active' : ''}"
              type="button"
              data-action="vote"
              data-vote="right"
              data-turn-id="${turn.id}"
              ${rightDisabled ? 'disabled' : ''}
              aria-pressed="${choice === 'right' ? 'true' : 'false'}"
            >${rightLabel}</button>
          </div>
          ${hint ? `<div class="vote-hint ${status === 'error' ? 'is-error' : ''}">${escapeHtml(hint)}</div>` : ''}
        </div>
      </div>
    `;
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

    this.container.addEventListener('click', this._onClick);
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
  }

  finishResponse(turnId, side) {
    const el = document.getElementById(`resp-${turnId}-${side}`);
    el?.querySelector?.('.stream-caret')?.remove();
  }
}

export default ChatView;


