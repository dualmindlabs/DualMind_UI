/**
 * Custom Modal System for DualMind
 * Provides beautiful, consistent modals for confirmations, editing, and alerts
 */

import { sanitizeHTML } from '../js/ui/utils.js';

export class CustomModal {
  constructor() {
    this.isOpen = false;
    this.currentType = null;
    this.callbacks = {};
    this.init();
  }

  init() {
    if (document.getElementById('custom-modal-root')) return;

    const root = document.createElement('div');
    root.id = 'custom-modal-root';
    root.className = 'custom-modal-root';
    root.innerHTML = `
      <div class="custom-modal-overlay" id="custom-modal-overlay"></div>
      <div class="custom-modal-container" id="custom-modal-container">
        <div class="custom-modal-content" id="custom-modal-content">
          <!-- Dynamic content -->
        </div>
      </div>
    `;
    document.body.appendChild(root);

    // Close on overlay click
    root.querySelector('.custom-modal-overlay').addEventListener('click', () => this.close());
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Show delete confirmation modal
   * @param {Object} options - { title, message, itemName, onConfirm, onCancel }
   */
  confirmDelete(options = {}) {
    const { title = 'Delete Thread?', message, itemName, onConfirm, onCancel } = options;
    
    const content = `
      <div class="custom-modal-icon delete">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 5,20 19,20 19,6 21,6"></polyline>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
        </svg>
      </div>
      <h3 class="custom-modal-title">${title}</h3>
      <p class="custom-modal-message">
        ${message || `Are you sure you want to delete "${itemName || 'this item'}"?`}
        <br><span class="custom-modal-warning">This action cannot be undone.</span>
      </p>
      <div class="custom-modal-actions">
        <button class="custom-modal-btn secondary" data-action="cancel">Cancel</button>
        <button class="custom-modal-btn danger" data-action="confirm">Delete</button>
      </div>
    `;

    this.show(content, { onConfirm, onCancel });
  }

  /**
   * Show edit modal for thread title
   * @param {Object} options - { currentTitle, onSave, onCancel }
   */
  editThread(options = {}) {
    const { currentTitle = '', onSave, onCancel } = options;
    
    const content = `
      <div class="custom-modal-icon edit">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </div>
      <h3 class="custom-modal-title">Edit Thread Title</h3>
      <div class="custom-modal-form">
        <input 
          type="text" 
          class="custom-modal-input" 
          id="edit-thread-input" 
          value="${this.escapeHtml(currentTitle)}" 
          placeholder="Enter thread title..."
          maxlength="100"
        />
        <div class="custom-modal-input-hint">Press Enter to save, Escape to cancel</div>
      </div>
      <div class="custom-modal-actions">
        <button class="custom-modal-btn secondary" data-action="cancel">Cancel</button>
        <button class="custom-modal-btn primary" data-action="save">Save</button>
      </div>
    `;

    this.show(content, { onSave, onCancel });
    
    // Focus input after showing
    setTimeout(() => {
      const input = document.getElementById('edit-thread-input');
      if (input) {
        input.focus();
        input.select();
        
        // Enter to save
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const newTitle = input.value.trim();
            if (newTitle) {
              this.close();
              onSave?.(newTitle);
            }
          }
        });
      }
    }, 100);
  }

  /**
   * Show generic confirmation modal
   * @param {Object} options - { title, message, confirmText, cancelText, onConfirm, onCancel }
   */
  confirm(options = {}) {
    const { 
      title = 'Confirm', 
      message, 
      confirmText = 'Confirm', 
      cancelText = 'Cancel',
      onConfirm, 
      onCancel 
    } = options;
    
    const content = `
      <div class="custom-modal-icon confirm">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 class="custom-modal-title">${title}</h3>
      <p class="custom-modal-message">${message || 'Are you sure?'}</p>
      <div class="custom-modal-actions">
        <button class="custom-modal-btn secondary" data-action="cancel">${cancelText}</button>
        <button class="custom-modal-btn primary" data-action="confirm">${confirmText}</button>
      </div>
    `;

    this.show(content, { onConfirm, onCancel });
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - 'success' | 'error' | 'info'
   * @param {number} duration - Duration in ms
   */
  toast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existing = document.getElementById('custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
      <span class="custom-toast-icon">
        ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </span>
      <span class="custom-toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  show(content, callbacks = {}) {
    this.callbacks = callbacks;
    this.isOpen = true;

    const container = document.getElementById('custom-modal-container');
    const overlay = document.getElementById('custom-modal-overlay');
    const contentEl = document.getElementById('custom-modal-content');

    if (contentEl) contentEl.innerHTML = content;

    // Show modal
    document.body.style.overflow = 'hidden';
    overlay?.classList.add('show');
    container?.classList.add('show');

    // Attach action handlers
    this.attachHandlers();
  }

  attachHandlers() {
    const content = document.getElementById('custom-modal-content');
    if (!content) return;

    content.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = e.target.closest('[data-action]')?.dataset.action;
        
        if (action === 'confirm') {
          this.close();
          this.callbacks.onConfirm?.();
        } else if (action === 'save') {
          const input = document.getElementById('edit-thread-input');
          const value = input?.value.trim();
          if (value) {
            this.close();
            this.callbacks.onSave?.(value);
          }
        } else if (action === 'cancel') {
          this.close();
          this.callbacks.onCancel?.();
        }
      });
    });
  }

  close() {
    this.isOpen = false;
    
    const container = document.getElementById('custom-modal-container');
    const overlay = document.getElementById('custom-modal-overlay');

    container?.classList.remove('show');
    overlay?.classList.remove('show');
    document.body.style.overflow = '';
  }

  escapeHtml(str) {
    return sanitizeHTML(str);
  }
}

// Export singleton
export const customModal = new CustomModal();
export default CustomModal;
