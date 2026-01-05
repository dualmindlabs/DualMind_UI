/**
 * ChatInput Component
 * Multi-functional chat input with action buttons
 */

import { Icons } from '../js/icons.js';

export class ChatInput {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.value = '';
    this.isLoading = false;
    this.attachments = [];
    
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    // Ensure initial height is correct (auto-resize textarea)
    this.autoResize(this.container.querySelector('#chat-input'));
  }

  render() {
    this.container.innerHTML = `
      <div id="chat-input-wrapper" class="chat-input-wrapper">
        <div class="chat-input-container">
          <!-- Attachments Preview -->
          <div id="attachments-preview" class="attachments-preview ${this.attachments.length ? 'has-items' : ''}">
            ${this.renderAttachments()}
          </div>
          
          <!-- Input Field -->
          <div class="input-field-wrapper">
            <textarea
              id="chat-input"
              class="chat-input"
              placeholder="Ask anything.."
              rows="1"
              aria-label="Chat message"
              ${this.isLoading ? 'disabled' : ''}
            >${this.escapeHtml(this.value)}</textarea>
          </div>

          <!-- Action Buttons Row -->
          <div class="action-buttons">
            <div class="left-actions">
              <!-- Add Attachment -->
              <button class="action-btn" id="add-btn" title="Add attachment">
                ${Icons.add('white', 16)}
              </button>

              <!-- Web Search -->
              <button class="action-btn" id="web-btn" title="Search the web">
                ${Icons.globe('white', 18)}
              </button>

              <!-- Add Image -->
              <button class="action-btn" id="image-btn" title="Add image">
                ${Icons.image('white', 18)}
              </button>

              <!-- Code Mode -->
              <button class="action-btn" id="code-btn" title="Code mode">
                ${Icons.code('white', 20)}
              </button>
            </div>

            <!-- Submit Button -->
            <button class="submit-btn ${this.isLoading ? 'loading' : ''}" id="submit-btn" ${this.isLoading ? 'disabled' : ''}>
              ${this.isLoading ? this.renderLoader() : Icons.arrowUp('white', 15)}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  renderLoader() {
    return `
      <div class="loader">
        <div class="loader-spinner"></div>
      </div>
    `;
  }

  renderAttachments() {
    if (!this.attachments.length) return '';
    
    return this.attachments.map((att, index) => `
      <div class="attachment-item" data-index="${index}">
        ${att.type === 'image' ? `
          <img src="${att.preview}" alt="${att.name}" class="attachment-preview" />
        ` : `
          <div class="attachment-file">
            <span class="attachment-icon">📎</span>
            <span class="attachment-name">${att.name}</span>
          </div>
        `}
        <button class="attachment-remove" data-index="${index}">
          ${Icons.close('white', 14)}
        </button>
      </div>
    `).join('');
  }

  attachEventListeners() {
    // Input handling
    const input = this.container.querySelector('#chat-input');
    input?.addEventListener('input', (e) => {
      this.value = e.target.value;
      this.autoResize(input);
    });

    input?.addEventListener('keydown', (e) => {
      // Enter sends, Shift+Enter inserts newline
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submit();
      }
    });

    // Submit button
    const submitBtn = this.container.querySelector('#submit-btn');
    submitBtn?.addEventListener('click', () => this.submit());

    // Action buttons
    this.container.querySelector('#add-btn')?.addEventListener('click', () => this.handleAdd());
    this.container.querySelector('#web-btn')?.addEventListener('click', () => this.handleWebSearch());
    this.container.querySelector('#image-btn')?.addEventListener('click', () => this.handleImageUpload());
    this.container.querySelector('#code-btn')?.addEventListener('click', () => this.handleCodeMode());

    // Attachment remove buttons
    this.container.querySelectorAll('.attachment-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeAttachment(parseInt(btn.dataset.index));
      });
    });

    // Focus input on container click
    this.container.querySelector('.chat-input-container')?.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      input?.focus();
    });

    // Listen for sidebar toggle to adjust position
    document.addEventListener('sidebar-toggle', (e) => {
      this.handleSidebarToggle(e.detail);
    });
  }

  submit() {
    if (!this.value.trim() && !this.attachments.length) return;
    if (this.isLoading) return;

    const data = {
      message: this.value.trim(),
      attachments: [...this.attachments]
    };

    // Dispatch submit event
    document.dispatchEvent(new CustomEvent('chat-submit', { detail: data }));

    // Clear input
    this.clear();
  }

  clear() {
    this.value = '';
    this.attachments = [];
    const input = this.container.querySelector('#chat-input');
    if (input) {
      input.value = '';
      this.autoResize(input);
    }
    this.updateAttachments();
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.render();
    this.attachEventListeners();
  }

  handleAdd() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '*/*';
    
    fileInput.addEventListener('change', (e) => {
      this.processFiles(e.target.files);
    });
    
    fileInput.click();
  }

  handleImageUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', (e) => {
      this.processFiles(e.target.files);
    });
    
    fileInput.click();
  }

  processFiles(files) {
    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.addAttachment({
            type: 'image',
            name: file.name,
            file: file,
            preview: e.target.result
          });
        };
        reader.readAsDataURL(file);
      } else {
        this.addAttachment({
          type: 'file',
          name: file.name,
          file: file
        });
      }
    });
  }

  addAttachment(attachment) {
    this.attachments.push(attachment);
    this.updateAttachments();
  }

  removeAttachment(index) {
    this.attachments.splice(index, 1);
    this.updateAttachments();
  }

  updateAttachments() {
    const preview = this.container.querySelector('#attachments-preview');
    if (preview) {
      preview.innerHTML = this.renderAttachments();
      preview.classList.toggle('has-items', this.attachments.length > 0);
      
      // Re-attach remove listeners
      this.container.querySelectorAll('.attachment-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeAttachment(parseInt(btn.dataset.index));
        });
      });
    }
  }

  handleWebSearch() {
    const btn = this.container.querySelector('#web-btn');
    btn?.classList.toggle('active');
    
    document.dispatchEvent(new CustomEvent('toggle-web-search', {
      detail: { active: btn?.classList.contains('active') }
    }));
  }

  handleCodeMode() {
    const btn = this.container.querySelector('#code-btn');
    btn?.classList.toggle('active');
    
    document.dispatchEvent(new CustomEvent('toggle-code-mode', {
      detail: { active: btn?.classList.contains('active') }
    }));
  }

  handleSidebarToggle({ isOpen, isMobile }) {
    const wrapper = this.container.querySelector('#chat-input-wrapper');
    if (wrapper) {
      if (!isMobile) {
        // Adjust centering based on sidebar state
        wrapper.style.marginLeft = isOpen ? '257px' : '0';
      } else {
        wrapper.style.marginLeft = '0';
      }
    }
  }

  // Public method to focus input
  focus() {
    this.container.querySelector('#chat-input')?.focus();
  }

  // Public method to set value
  setValue(value) {
    this.value = value;
    const input = this.container.querySelector('#chat-input');
    if (input) {
      input.value = value;
      this.autoResize(input);
    }
  }

  autoResize(textareaEl) {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    textareaEl.style.height = `${textareaEl.scrollHeight}px`;
  }
}

export default ChatInput;

