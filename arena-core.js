/**
 * Arena Mode Core Functionality
 * Supports 1-N model comparisons with parallel streaming
 * Backend-agnostic: adapts to output.content[].text format
 */

class ArenaMode {
  constructor(arenaGrid, arenaResults, arenaVoting, arenaFeedback) {
    this.arenaGrid = arenaGrid;
    this.arenaResults = arenaResults;
    this.arenaVoting = arenaVoting;
    this.arenaFeedback = arenaFeedback;
    this.models = [];
    this.streamingStates = new Map();
    this.responses = new Map();
  }

  /**
   * Initialize Arena with N models
   * @param {Array} models - Array of model configurations
   * Each model should have: { id, label, name, displayName, hidden }
   */
  initialize(models) {
    this.models = models.map(m => ({
      id: m.id,
      label: m.label || `Agent ${m.id}`,
      name: m.name || '',
      displayName: m.displayName || m.name || '',
      hidden: m.hidden !== false ? true : false, // Default hidden for battle mode
      ...m
    }));
    
    this.streamingStates.clear();
    this.responses.clear();
    
    // Set model count attribute for CSS grid
    if (this.arenaGrid) {
      this.arenaGrid.setAttribute('data-model-count', this.models.length);
    }
  }

  /**
   * Render loading skeleton for N models
   */
  renderSkeleton() {
    if (!this.arenaGrid) return;
    
    const modelCount = this.models.length || 2;
    this.arenaGrid.setAttribute('data-model-count', modelCount);
    
    const cards = this.models.map((model, index) => {
      const agentLabel = model.label || `Agent ${index + 1}`;
      const modelName = model.hidden ? 'Thinking…' : (model.displayName || model.name || 'Loading…');
      
      return `
        <div class="arena-card" data-model-id="${model.id || index}">
          <div class="arena-card-head">
            <div class="arena-card-title">
              <div class="label">${this.escapeHtml(agentLabel)}</div>
              <div class="model">${this.escapeHtml(modelName)}</div>
            </div>
            <div class="arena-card-meta">
              <i class="ri-loader-4-line"></i>
            </div>
          </div>
          <div class="arena-card-body">
            <div class="arena-skeleton">
              <div class="arena-skel-line w-100"></div>
              <div class="arena-skel-line w-90"></div>
              <div class="arena-skel-line w-70"></div>
              <div class="arena-skel-line w-80"></div>
              <div class="arena-skel-line w-60"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    this.arenaGrid.innerHTML = cards;
    
    if (this.arenaResults) {
      this.arenaResults.hidden = false;
    }
    if (this.arenaVoting) {
      this.arenaVoting.hidden = true;
    }
  }

  /**
   * Update a specific model's card with streaming text
   * @param {string|number} modelId - Model identifier
   * @param {string} text - Current accumulated text
   * @param {boolean} isComplete - Whether streaming is complete
   */
  updateModelCard(modelId, text, isComplete = false) {
    const card = this.arenaGrid?.querySelector(`[data-model-id="${modelId}"]`);
    if (!card) return;
    
    const body = card.querySelector('.arena-card-body');
    if (!body) return;
    
    // Replace skeleton with actual message
    body.innerHTML = `
      <div class="arena-message ${!isComplete ? 'streaming' : ''}">${this.escapeHtml(text || 'No response')}</div>
    `;
    
    // Update meta indicator
    const meta = card.querySelector('.arena-card-meta');
    if (meta) {
      if (isComplete) {
        meta.innerHTML = '<i class="ri-check-line"></i>';
        meta.style.borderColor = 'rgba(34, 197, 94, 0.3)';
        meta.style.background = 'rgba(34, 197, 94, 0.1)';
        meta.style.color = 'var(--success)';
      } else {
        meta.innerHTML = '<i class="ri-loader-4-line"></i>';
      }
    }
  }

  /**
   * Reveal model names after voting (for battle mode)
   */
  revealModels() {
    this.models.forEach((model, index) => {
      const card = this.arenaGrid?.querySelector(`[data-model-id="${model.id || index}"]`);
      if (!card) return;
      
      const modelNameEl = card.querySelector('.arena-card-title .model');
      if (modelNameEl && model.displayName) {
        modelNameEl.textContent = model.displayName;
      }
    });
  }

  /**
   * Highlight winner card(s)
   * @param {Array|string|number} winnerIds - Winner model ID(s)
   */
  highlightWinner(winnerIds) {
    const winners = Array.isArray(winnerIds) ? winnerIds : [winnerIds];
    
    winners.forEach(winnerId => {
      const card = this.arenaGrid?.querySelector(`[data-model-id="${winnerId}"]`);
      if (card) {
        card.classList.add('winner');
        
        // Add winner badge
        const headerRight = card.querySelector('.arena-head-right') || 
                           card.querySelector('.arena-card-head');
        if (headerRight) {
          const badge = document.createElement('span');
          badge.className = 'winner-badge';
          badge.innerHTML = '<i class="ri-award-line"></i> Winner';
          headerRight.appendChild(badge);
        }
      }
    });
  }

  /**
   * Show voting UI for battle mode
   * @param {Array} options - Voting options (model IDs and labels)
   */
  showVoting(options) {
    // Voting disabled - do nothing
    return;
  }

  /**
   * Show feedback message
   * @param {string} message - Feedback text
   * @param {string} type - Feedback type: success, warn, danger, info
   */
  showFeedback(message, type = 'info') {
    if (!this.arenaFeedback) return;
    
    this.arenaFeedback.textContent = message;
    this.arenaFeedback.className = `arena-feedback is-${type}`;
    this.arenaFeedback.hidden = false;
  }

  /**
   * Hide feedback
   */
  hideFeedback() {
    if (this.arenaFeedback) {
      this.arenaFeedback.hidden = true;
    }
  }

  /**
   * Render error state
   * @param {string} message - Error message
   * @param {boolean} canRetry - Whether retry is available
   */
  renderError(message, canRetry = false) {
    if (!this.arenaGrid) return;
    
    this.arenaGrid.setAttribute('data-model-count', '1');
    this.arenaGrid.innerHTML = `
      <div class="arena-card arena-error" style="grid-column: 1 / -1;">
        <div class="arena-card-head">
          <div class="arena-card-title">
            <div class="label">Error</div>
            <div class="model">Request Failed</div>
          </div>
          <div class="arena-card-meta" style="border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); color: var(--danger);">
            <i class="ri-error-warning-line"></i>
          </div>
        </div>
        <div class="arena-card-body">
          <div class="arena-message" style="color: var(--danger);">${this.escapeHtml(message)}</div>
          ${canRetry ? `
            <div style="margin-top: 16px;">
              <button type="button" class="arena-cta" id="arenaRetryBtn">
                <i class="ri-refresh-line"></i>
                <span>Retry</span>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    if (this.arenaResults) {
      this.arenaResults.hidden = false;
    }
    if (this.arenaVoting) {
      this.arenaVoting.hidden = true;
    }
  }

  /**
   * Extract response text from backend format
   * Always reads from output.content[].text (canonical rule)
   */
  extractResponseText(responseData) {
    if (!responseData) return '';
    
    // Canonical rule: output.content[].text
    if (responseData.output?.content && Array.isArray(responseData.output.content)) {
      const textContent = responseData.output.content.find(c => c.type === 'output_text');
      if (textContent?.text) return textContent.text;
    }
    
    // Fallback to message field
    if (responseData.message) return responseData.message;
    
    // Fallback to text field
    if (responseData.text) return responseData.text;
    
    return '';
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  /**
   * Clean up arena state
   */
  reset() {
    this.models = [];
    this.streamingStates.clear();
    this.responses.clear();
    
    if (this.arenaGrid) {
      this.arenaGrid.innerHTML = '';
      this.arenaGrid.removeAttribute('data-model-count');
    }
    if (this.arenaVoting) {
      this.arenaVoting.hidden = true;
    }
    if (this.arenaFeedback) {
      this.arenaFeedback.hidden = true;
    }
  }
}

// Export for use in main script
if (typeof window !== 'undefined') {
  window.ArenaMode = ArenaMode;
}
