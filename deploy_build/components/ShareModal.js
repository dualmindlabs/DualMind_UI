/**
 * ShareModal Component
 * Modal dialog for sharing thread with public/unlisted access
 */

import { Icons } from '../js/icons.js';

export class ShareModal {
  constructor() {
    this.isOpen = false;
    this.threadId = null;
    this.currentVisibility = 'private';
    this.isLoading = false;
    this.onClose = null;

    this.init();
  }

  init() {
    // Create modal container if it doesn't exist
    if (!document.getElementById('share-modal-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'share-modal-overlay';
      overlay.className = 'share-modal-overlay';
      overlay.innerHTML = this.render();
      document.body.appendChild(overlay);
    }

    this.attach();
  }

  render() {
    const shareUrl = this.threadId
      ? `${window.location.origin}/share/${this.threadId}`
      : '';

    const isPublicOrUnlisted = this.currentVisibility === 'public' || this.currentVisibility === 'unlisted';

    return `
      <div class="share-modal glass-panel">
        <div class="share-modal-header">
          <div class="share-modal-title-row">
            <div class="share-modal-icon">${this.renderShareIcon()}</div>
            <h2 class="share-modal-title">Share Conversation</h2>
          </div>
          <button class="share-modal-close" aria-label="Close modal" title="Close">
            ${Icons.close('white', 20)}
          </button>
        </div>

        <div class="share-modal-body">
          ${!isPublicOrUnlisted ? `
            <div class="share-info-card">
              <div class="info-icon">🔒</div>
              <div class="info-content">
                <div class="info-title">Private Conversation</div>
                <div class="info-text">Only you can see this conversation. Enable sharing to create a shareable link.</div>
              </div>
            </div>
          ` : ''}

          <div class="share-link-section ${isPublicOrUnlisted ? 'active' : 'inactive'}">
            <label class="share-link-label">Shareable Link</label>
            <div class="share-link-container">
              <input 
                type="text" 
                class="share-link-input" 
                value="${shareUrl}" 
                readonly 
                id="share-link-input"
                ${!isPublicOrUnlisted ? 'disabled' : ''}
              />
              <button 
                class="share-copy-btn" 
                id="share-copy-btn"
                ${!isPublicOrUnlisted ? 'disabled' : ''}
                aria-label="Copy link"
                title="Copy to clipboard"
              >
                ${this.renderCopyIcon()}
                <span class="copy-text">Copy Link</span>
              </button>
            </div>
          </div>

          <div class="share-visibility-section">
            <label class="share-visibility-label">Visibility Options</label>
            <div class="share-visibility-options">
              <button 
                class="visibility-option ${this.currentVisibility === 'private' ? 'active' : ''}"
                data-visibility="private"
                ${this.isLoading ? 'disabled' : ''}
                title="Only you can access"
              >
                <span class="visibility-icon">🔒</span>
                <div class="visibility-content">
                  <span class="visibility-name">Private</span>
                  <span class="visibility-desc">Only you</span>
                </div>
              </button>
              <button 
                class="visibility-option ${this.currentVisibility === 'unlisted' ? 'active' : ''}"
                data-visibility="unlisted"
                ${this.isLoading ? 'disabled' : ''}
                title="Anyone with the link"
              >
                <span class="visibility-icon">🔗</span>
                <div class="visibility-content">
                  <span class="visibility-name">Unlisted</span>
                  <span class="visibility-desc">Anyone with link</span>
                </div>
              </button>
              <button 
                class="visibility-option ${this.currentVisibility === 'public' ? 'active' : ''}"
                data-visibility="public"
                ${this.isLoading ? 'disabled' : ''}
                title="Public and discoverable"
              >
                <span class="visibility-icon">🌐</span>
                <div class="visibility-content">
                  <span class="visibility-name">Public</span>
                  <span class="visibility-desc">Everyone</span>
                </div>
              </button>
            </div>
            <p class="visibility-hint">${this.getVisibilityHint()}</p>
          </div>
        </div>

        ${this.isLoading ? '<div class="share-modal-loading"><div class="spinner"></div><span>Updating...</span></div>' : ''}
      </div>
    `;
  }

  renderShareIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  renderCopyIcon() {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
  }

  getVisibilityHint() {
    switch (this.currentVisibility) {
      case 'private':
        return 'This conversation is private and cannot be shared';
      case 'unlisted':
        return 'Anyone with the link can view this conversation, but it won\'t appear in search results';
      case 'public':
        return 'This conversation is publicly visible and may appear in search results';
      default:
        return '';
    }
  }

  attach() {
    const overlay = document.getElementById('share-modal-overlay');
    if (!overlay) return;

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // Close button
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('.share-modal-close')) {
        this.close();
      }
    });

    // Done button
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('#share-done-btn')) {
        this.close();
      }
    });

    // Toggle switch
    overlay.addEventListener('change', async (e) => {
      if (e.target.id === 'share-toggle-input') {
        const newVisibility = e.target.checked ? 'unlisted' : 'private';
        await this.updateVisibility(newVisibility);
      }
    });

    // Visibility options
    overlay.addEventListener('click', async (e) => {
      const option = e.target.closest('.visibility-option');
      if (option) {
        const visibility = option.dataset.visibility;
        await this.updateVisibility(visibility);
      }
    });

    // Copy button
    overlay.addEventListener('click', async (e) => {
      if (e.target.closest('#share-copy-btn')) {
        await this.copyLink();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  async open(threadId, currentVisibility = 'private') {
    this.threadId = threadId;
    this.currentVisibility = currentVisibility;
    this.isOpen = true;
    this.isLoading = false;

    const overlay = document.getElementById('share-modal-overlay');
    if (overlay) {
      overlay.innerHTML = this.render();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  close() {
    this.isOpen = false;
    const overlay = document.getElementById('share-modal-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    if (this.onClose) {
      this.onClose();
    }
  }

  async updateVisibility(visibility) {
    if (this.isLoading) return;

    this.isLoading = true;
    this.rerender();

    try {
      // Try different API references
      const api = window._DUALMIND_API || window._API;

      if (api && typeof api.updateThreadVisibility === 'function') {
        await api.updateThreadVisibility(this.threadId, visibility);
        this.currentVisibility = visibility;
      } else {
        // Fallback: Direct fetch to backend
        const baseUrl = window.DUALMIND_CONFIG?.apiBaseUrl || window.DUALMIND_CONFIG?.serverUrl || 'http://localhost:5079';
        const token = await window.DualMindAuth?.getAccessToken?.();

        const response = await fetch(`${baseUrl}/api/threads/${this.threadId}/visibility`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ visibility })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to update visibility: ${response.status}`);
        }

        this.currentVisibility = visibility;
        console.log('✅ Visibility updated to:', visibility);
      }
    } catch (error) {
      console.error('Failed to update visibility:', error);
      // Show error toast if available
      if (window.showToast) {
        window.showToast('Failed to update visibility', 'error');
      }
    } finally {
      this.isLoading = false;
      this.rerender();
    }
  }

  async copyLink() {
    const input = document.getElementById('share-link-input');
    if (!input) return;

    try {
      await navigator.clipboard.writeText(input.value);

      // Visual feedback
      const btn = document.getElementById('share-copy-btn');
      if (btn) {
        const textSpan = btn.querySelector('.copy-text');
        if (textSpan) {
          textSpan.textContent = 'Copied!';
          btn.classList.add('copied');

          setTimeout(() => {
            textSpan.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        }
      }
    } catch (error) {
      // Fallback for older browsers
      input.select();
      document.execCommand('copy');
    }
  }

  rerender() {
    const overlay = document.getElementById('share-modal-overlay');
    if (overlay && this.isOpen) {
      overlay.innerHTML = this.render();
    }
  }
}

// Export as singleton
export const shareModal = new ShareModal();
export default ShareModal;
