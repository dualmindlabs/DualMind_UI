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
    this._toastTimer = null;

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
      <div class="AI-Input">
        <input type="file" id="camera" accept="image/*" capture="environment" />
        <input type="file" id="photos" accept="image/*" />
        <input type="file" id="files" />
        <input id="voice" type="checkbox" />
        <label for="voice">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            fill="var(--neutral-color)"
            viewBox="0 0 16 16"
          >
            <path
              d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
            ></path>
          </svg>
        </label>
        <input id="mic" type="checkbox" />
        <label for="mic">
          <svg
            viewBox="0 0 16 16"
            fill="var(--neutral-color)"
            height="30"
            width="30"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"
            ></path>
            <path
              d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3"
            ></path>
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            fill="var(--neutral-color)"
            viewBox="0 0 16 16"
          >
            <path
              d="M13 8c0 .564-.094 1.107-.266 1.613l-.814-.814A4 4 0 0 0 12 8V7a.5.5 0 0 1 1 0zm-5 4c.818 0 1.578-.245 2.212-.667l.718.719a5 5 0 0 1-2.43.923V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 1 0v1a4 4 0 0 0 4 4m3-9v4.879l-1-1V3a2 2 0 0 0-3.997-.118l-.845-.845A3.001 3.001 0 0 1 11 3"
            ></path>
            <path
              d="m9.486 10.607-.748-.748A2 2 0 0 1 6 8v-.878l-1-1V8a3 3 0 0 0 4.486 2.607m-7.84-9.253 12 12 .708-.708-12-12z"
            ></path>
          </svg>
        </label>
        <div class="chat-marquee">
          <div class="chat-marquee-track">
            <button type="button" class="chat-chip" data-coming-soon="true">Create an image</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Give me ideas</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Write a text</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Create a chart</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Plan a trip</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Help me pick</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Write a Python script</button>

            <button type="button" class="chat-chip" data-coming-soon="true">Create an image</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Give me ideas</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Write a text</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Create a chart</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Plan a trip</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Help me pick</button>
            <button type="button" class="chat-chip" data-coming-soon="true">Write a Python script</button>
          </div>
        </div>
        <div class="chat-container">
          <label for="chat-input" class="chat-wrapper">
            <textarea id="chat-input" placeholder="Ask anything" ${this.isLoading ? 'disabled' : ''}>${this.escapeHtml(this.value)}</textarea>
            <div class="button-bar">
              <div class="left-buttons">
                <input id="appendix" type="checkbox" />
                <label for="appendix">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="var(--neutral-color)"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0z"
                    ></path>
                  </svg>
                </label>
                <div id="appendix-bar">
                  <label for="appendix">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="30"
                      height="30"
                      fill="var(--primary-color)"
                      viewBox="0 0 16 16"
                    >
                      <path
                        d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
                      ></path>
                    </svg>
                  </label>
                  <label for="camera">
                    <svg
                      viewBox="0 0 16 16"
                      fill="var(--primary-color)"
                      height="30"
                      width="30"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4z"
                      ></path>
                      <path
                        d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5m0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"
                      ></path>
                    </svg>
                  </label>
                  <label for="photos">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="30"
                      height="30"
                      fill="var(--primary-color)"
                      viewBox="0 0 16 16"
                    >
                      <path d="M4.502 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"></path>
                      <path
                        d="M14.002 13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V5A2 2 0 0 1 2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-1.998 2M14 2H4a1 1 0 0 0-1 1h9.002a2 2 0 0 1 2 2v7A1 1 0 0 0 15 11V3a1 1 0 0 0-1-1M2.002 4a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094l1.777 1.947V5a1 1 0 0 0-1-1z"
                      ></path>
                    </svg>
                  </label>
                  <label for="files">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="30"
                      height="30"
                      fill="var(--primary-color)"
                      viewBox="0 0 16 16"
                    >
                      <path
                        d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139q.323-.119.684-.12h5.396z"
                      ></path>
                    </svg>
                  </label>
                </div>
                <input id="search" type="checkbox" />
                <label for="search">
                  <svg
                    viewBox="0 0 16 16"
                    fill="var(--neutral-color)"
                    height="20"
                    width="20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855q-.215.403-.395.872c.705.157 1.472.257 2.282.287zM4.249 3.539q.214-.577.481-1.078a7 7 0 0 1 .597-.933A7 7 0 0 0 3.051 3.05q.544.277 1.198.49zM3.509 7.5c.036-1.07.188-2.087.436-3.008a9 9 0 0 1-1.565-.667A6.96 6.96 0 0 0 1.018 7.5zm1.4-2.741a12.3 12.3 0 0 0-.4 2.741H7.5V5.091c-.91-.03-1.783-.145-2.591-.332M8.5 5.09V7.5h2.99a12.3 12.3 0 0 0-.399-2.741c-.808.187-1.681.301-2.591.332zM4.51 8.5c.035.987.176 1.914.399 2.741A13.6 13.6 0 0 1 7.5 10.91V8.5zm3.99 0v2.409c.91.03 1.783.145 2.591.332.223-.827.364-1.754.4-2.741zm-3.282 3.696q.18.469.395.872c.552 1.035 1.218 1.65 1.887 1.855V11.91c-.81.03-1.577.13-2.282.287zm.11 2.276a7 7 0 0 1-.598-.933 9 9 0 0 1-.481-1.079 8.4 8.4 0 0 0-1.198.49 7 7 0 0 0 2.276 1.522zm-1.383-2.964A13.4 13.4 0 0 1 3.508 8.5h-2.49a6.96 6.96 0 0 0 1.362 3.675c.47-.258.995-.482 1.565-.667m6.728 2.964a7 7 0 0 0 2.275-1.521 8.4 8.4 0 0 0-1.197-.49 9 9 0 0 1-.481 1.078 7 7 0 0 1-.597.933M8.5 11.909v3.014c.67-.204 1.335-.82 1.887-1.855q.216-.403.395-.872A12.6 12.6 0 0 0 8.5 11.91zm3.555-.401c.57.185 1.095.409 1.565.667A6.96 6.96 0 0 0 14.982 8.5h-2.49a13.4 13.4 0 0 1-.437 3.008M14.982 7.5a6.96 6.96 0 0 0-1.362-3.675c-.47.258-.995.482-1.565.667.248.92.4 1.938.437 3.008zM11.27 2.461q.266.502.482 1.078a8.4 8.4 0 0 0 1.196-.49 7 7 0 0 0-2.275-1.52c.218.283.418.597.597.932m-.488 1.343a8 8 0 0 0-.395-.872C9.835 1.897 9.17 1.282 8.5 1.077V4.09c.81-.03 1.577-.13 2.282-.287z"
                    ></path>
                  </svg>
                </label>
              </div>
              <div class="right-buttons">
                <label for="voice">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="var(--neutral-color)"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"
                    ></path>
                    <path
                      d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3"
                    ></path>
                  </svg>
                </label>
                <button id="submit-btn" ${this.isLoading ? 'disabled' : ''}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="var(--neutral-color)"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M16 8A8 8 0 1 0 0 8a8 8 0 0 0 16 0m-7.5 3.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707z"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </label>
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

    // File inputs
    this.container.querySelector('#camera')?.addEventListener('change', (e) => this.handleFileSelect(e, 'camera'));
    this.container.querySelector('#photos')?.addEventListener('change', (e) => this.handleFileSelect(e, 'photos'));
    this.container.querySelector('#files')?.addEventListener('change', (e) => this.handleFileSelect(e, 'files'));

    // Voice/Mic toggles
    this.container.querySelector('#voice')?.addEventListener('change', (e) => this.handleVoiceToggle(e));
    this.container.querySelector('#mic')?.addEventListener('change', (e) => this.handleMicToggle(e));

    // Appendix toggle
    this.container.querySelector('#appendix')?.addEventListener('change', (e) => this.handleAppendixToggle(e));

    // Search toggle
    this.container.querySelector('#search')?.addEventListener('change', (e) => this.handleSearchToggle(e));

    // Coming soon feature clicks
    this.container.querySelectorAll('.chat-chip[data-coming-soon="true"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showToast('Coming soon — great idea to try that');
      });
    });

    // Attachment remove buttons
    this.container.querySelectorAll('.attachment-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeAttachment(parseInt(btn.dataset.index));
      });
    });

    // Focus input on container click
    this.container.querySelector('.chat-container')?.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('label')) return;
      input?.focus();
    });

    // Listen for sidebar toggle to adjust position
    document.addEventListener('sidebar-toggle', (e) => {
      this.handleSidebarToggle(e.detail);
    });
  }

  showToast(message) {
    const existing = document.getElementById('dm-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'dm-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;

    Object.assign(toast.style, {
      position: 'fixed',
      left: '50%',
      bottom: '110px',
      transform: 'translateX(-50%)',
      background: 'rgba(15, 17, 25, 0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: 'rgba(255,255,255,0.92)',
      padding: '10px 14px',
      borderRadius: '12px',
      fontSize: '13px',
      fontWeight: '500',
      boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
      backdropFilter: 'blur(16px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
      zIndex: '9999',
      maxWidth: 'calc(100vw - 24px)',
      textAlign: 'center'
    });

    document.body.appendChild(toast);

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.remove();
    }, 2200);
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

    // Restore toggle states after re-render
    if (this._webActive) this.container.querySelector('#web-btn')?.classList.add('active');
    if (this._codeActive) this.container.querySelector('#code-btn')?.classList.add('active');
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
    this._webActive = !this._webActive;
    const btn = this.container.querySelector('#web-btn');
    btn?.classList.toggle('active', this._webActive);

    // Provide visual feedback/toast if needed, or just rely on button state
    document.dispatchEvent(new CustomEvent('toggle-web-search', {
      detail: { active: this._webActive }
    }));
  }

  handleCodeMode() {
    this._codeActive = !this._codeActive;
    const btn = this.container.querySelector('#code-btn');
    btn?.classList.toggle('active', this._codeActive);

    document.dispatchEvent(new CustomEvent('toggle-code-mode', {
      detail: { active: this._codeActive }
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

  // New AI Input handlers
  handleFileSelect(e, type) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
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
    // Reset the input so same file can be selected again
    e.target.value = '';
  }

  handleVoiceToggle(e) {
    const isActive = e.target.checked;
    console.log('Voice toggle:', isActive);
    // TODO: Implement voice input functionality
    if (isActive) {
      // Start voice recognition
      this.startVoiceRecognition();
    } else {
      // Stop voice recognition
      this.stopVoiceRecognition();
    }
  }

  handleMicToggle(e) {
    const isActive = e.target.checked;
    console.log('Mic toggle:', isActive);
    // TODO: Implement microphone recording
    if (isActive) {
      // Start recording
      this.startRecording();
    } else {
      // Stop recording
      this.stopRecording();
    }
  }

  handleAppendixToggle(e) {
    const isOpen = e.target.checked;
    console.log('Appendix menu:', isOpen);
    // The appendix bar visibility is handled by CSS
  }

  handleSearchToggle(e) {
    const isActive = e.target.checked;
    console.log('Search toggle:', isActive);
    document.dispatchEvent(new CustomEvent('toggle-web-search', {
      detail: { active: isActive }
    }));
  }

  startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

      const input = this.container.querySelector('#chat-input');
      if (input) {
        input.value = transcript;
        this.value = transcript;
        this.autoResize(input);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stopVoiceRecognition();
    };

    this.recognition.start();
  }

  stopVoiceRecognition() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  startRecording() {
    // TODO: Implement audio recording functionality
    console.log('Starting audio recording...');
  }

  stopRecording() {
    // TODO: Implement audio recording stop
    console.log('Stopping audio recording...');
  }
}

export default ChatInput;

