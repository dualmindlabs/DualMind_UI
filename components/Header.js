/**
 * Header Component
 * Top navigation bar with mode selector and controls
 */

import { Icons } from '../js/icons.js';

export class Header {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentMode = 'battle';
    this.modes = [
      { id: 'battle', name: 'Battle', subtitle: 'Battle with 2 anonymous models', icon: Icons.battle },
      { id: 'arena', name: 'Side by Side', subtitle: 'Compare 2 models of your choice', icon: Icons.splitRectangle },
      { id: 'direct', name: 'Direct Chat', subtitle: 'Chat with one model at a time', icon: Icons.chat }
    ];
    this.isDropdownOpen = false;
    this.isUserMenuOpen = false;
    this._onDocumentClick = null;
    this._onDocumentKeyDown = null;

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    const currentModeData = this.modes.find(m => m.id === this.currentMode);

    this.container.innerHTML = `
      <header id="main-header" class="main-header" role="banner">
        <!-- Mobile Menu Toggle -->
        <button id="mobile-menu-btn" class="mobile-menu-btn lg:hidden" aria-label="Open sidebar" title="Open menu">
          ${Icons.hamburger('white', 24)}
        </button>

        <!-- Mode Selector Dropdown -->
        <div class="mode-selector">
          <button
            id="mode-btn"
            class="mode-btn ${this.isDropdownOpen ? 'open' : ''}"
            aria-haspopup="menu"
            aria-expanded="${this.isDropdownOpen ? 'true' : 'false'}"
            aria-controls="mode-dropdown"
            aria-label="Select chat mode"
            title="Select chat mode (current: ${currentModeData.name})"
          >
            <span class="mode-icon">${currentModeData.icon('white')}</span>
            <span class="mode-text">${currentModeData.name}</span>
            <span class="mode-chevron ${this.isDropdownOpen ? 'rotated' : ''}">${Icons.chevronDown('white', 12)}</span>
          </button>
          
          <!-- Dropdown Menu -->
          <div
            id="mode-dropdown"
            class="mode-dropdown ${this.isDropdownOpen ? 'open' : ''}"
            role="menu"
            aria-label="Mode selector"
          >
            ${this.modes.map((mode, index) => `
              <button
                class="mode-option ${mode.id === this.currentMode ? 'active' : ''}"
                data-mode="${mode.id}"
                role="menuitemradio"
                aria-checked="${mode.id === this.currentMode ? 'true' : 'false'}"
                title="${mode.subtitle}"
              >
                <div class="mode-option-content">
                  <div class="mode-option-text">
                    <span class="mode-option-title">${mode.name}</span>
                    <span class="mode-option-subtitle">${mode.subtitle}</span>
                  </div>
                  <span class="mode-option-icon">${mode.icon('white')}</span>
                </div>
              </button>
              ${index < this.modes.length - 1 ? '<div class="mode-option-divider"></div>' : ''}
            `).join('')}
          </div>
        </div>

        <!-- Right Controls -->
        <div class="header-controls">
          <!-- Share Button (hidden initially, shown when thread exists) -->
          <button id="share-thread-btn" class="header-icon-btn" aria-label="Share thread" title="Share this conversation" style="display:none">
            ${Icons.share('white', 18)}
          </button>

          <!-- Export Button (hidden initially, shown when turns exist) -->
          <button id="export-btn" class="header-icon-btn" aria-label="Export conversation" title="Export conversation" style="display:none">
            ${Icons.download('white', 18)}
          </button>
        </div>
      </header>
    `;
  }

  attachEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = this.container.querySelector('#mobile-menu-btn');
    mobileMenuBtn?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('toggle-mobile-menu'));
    });

    // Mode dropdown toggle
    const modeBtn = this.container.querySelector('#mode-btn');
    modeBtn?.addEventListener('click', () => this.toggleDropdown());

    // Mode options
    const modeOptions = this.container.querySelectorAll('.mode-option');
    modeOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.selectMode(option.dataset.mode);
      });
    });

    // Share button
    const shareBtn = this.container.querySelector('#share-thread-btn');
    shareBtn?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('open-share-modal'));
    });

    // Export button
    const exportBtn = this.container.querySelector('#export-btn');
    exportBtn?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('open-export-menu'));
    });

    // Close dropdown on outside click
    if (this._onDocumentClick) document.removeEventListener('click', this._onDocumentClick);
    this._onDocumentClick = (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
      }
    };
    document.addEventListener('click', this._onDocumentClick);

    // Close dropdown on Escape
    if (this._onDocumentKeyDown) document.removeEventListener('keydown', this._onDocumentKeyDown);
    this._onDocumentKeyDown = (e) => {
      if (e.key === 'Escape') {
        // only close if open; don't steal Escape from other flows
        if (this.isDropdownOpen) {
          e.preventDefault();
          this.closeDropdown(true);
        }
      }
    };
    document.addEventListener('keydown', this._onDocumentKeyDown);

    // Listen for sidebar toggle to adjust layout
    document.addEventListener('sidebar-toggle', (e) => {
      this.handleSidebarToggle(e.detail);
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.updateDropdownState();
  }

  closeDropdown(restoreFocus = false) {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false;
      this.updateDropdownState();
      if (restoreFocus) this.container.querySelector('#mode-btn')?.focus();
    }
  }

  updateDropdownState() {
    const btn = this.container.querySelector('#mode-btn');
    const dropdown = this.container.querySelector('#mode-dropdown');
    const chevron = this.container.querySelector('.mode-chevron');

    btn?.classList.toggle('open', this.isDropdownOpen);
    dropdown?.classList.toggle('open', this.isDropdownOpen);
    chevron?.classList.toggle('rotated', this.isDropdownOpen);
    btn?.setAttribute('aria-expanded', this.isDropdownOpen ? 'true' : 'false');
  }

  selectMode(modeId) {
    this.currentMode = modeId;
    this.closeDropdown();

    // Surgical DOM update — no full re-render to avoid listener accumulation and repaint
    const modeData = this.modes.find(m => m.id === modeId);
    if (modeData) {
      const modeIcon = this.container.querySelector('.mode-icon');
      const modeText = this.container.querySelector('.mode-text');
      if (modeIcon) modeIcon.innerHTML = modeData.icon('white');
      if (modeText) modeText.textContent = modeData.name;

      // Update trigger button title
      const modeBtn = this.container.querySelector('#mode-btn');
      if (modeBtn) modeBtn.title = `Select chat mode (current: ${modeData.name})`;

      // Update active state + aria-checked on each option
      this.container.querySelectorAll('.mode-option').forEach(opt => {
        const isActive = opt.dataset.mode === modeId;
        opt.classList.toggle('active', isActive);
        opt.setAttribute('aria-checked', isActive ? 'true' : 'false');
      });
    }

    // Dispatch mode change event
    document.dispatchEvent(new CustomEvent('mode-change', {
      detail: { mode: modeId }
    }));
  }

  toggleUserMenu() {
    // Removed logic
  }

  closeUserMenu(restoreFocus = false) {
    // Removed logic
  }

  updateUserMenuState() {
    // Removed logic
  }

  handleLogout() {
    // Removed logic
  }

  getUserInitials() {
    // Removed logic
  }

  getUserName() {
    // Removed logic
  }

  getUserEmail() {
    // Removed logic
  }

  handleSidebarToggle({ isOpen, isCollapsed, isMobile }) {
    const header = this.container.querySelector('#main-header');
    if (!header) return;

    if (isMobile) {
      header.style.left = '0';
      return;
    }

    // Read sidebar width from CSS variable so it stays in sync with tokens.css
    const sidebarWidth = getComputedStyle(document.documentElement)
      .getPropertyValue('--sidebar-width').trim() || '260px';
    const collapsedWidth = getComputedStyle(document.documentElement)
      .getPropertyValue('--sidebar-collapsed-width').trim() || '80px';

    header.style.left = isCollapsed ? collapsedWidth : sidebarWidth;
  }

  // Public method to get current mode
  getCurrentMode() {
    return this.currentMode;
  }

  setShareVisible(visible) {
    const btn = this.container.querySelector('#share-thread-btn');
    if (btn) btn.style.display = visible ? '' : 'none';
  }

  setExportVisible(visible) {
    const btn = this.container.querySelector('#export-btn');
    if (btn) btn.style.display = visible ? '' : 'none';
  }
}

export default Header;
