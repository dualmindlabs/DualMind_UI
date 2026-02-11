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
      { id: 'direct', name: 'Direct Chat', subtitle: 'Chat with one model at a time', icon: Icons.arrowUp }
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
          <!-- Share Button -->
          <button id="share-thread-btn" class="header-icon-btn" aria-label="Share thread" title="Share this conversation">
            ${Icons.share('white', 18)}
          </button>

          <!-- User Menu -->
          <div class="user-menu">
            <button id="user-btn" class="user-btn" aria-label="User menu" aria-haspopup="true" aria-expanded="${this.isUserMenuOpen ? 'true' : 'false'}" title="Account settings">
              <span class="user-avatar">${this.getUserInitials()}</span>
            </button>
            
            <!-- User Dropdown -->
            <div id="user-dropdown" class="user-dropdown ${this.isUserMenuOpen ? 'open' : ''}" role="menu">
              <div class="user-info">
                <div class="user-avatar-large">${this.getUserInitials()}</div>
                <div class="user-details">
                  <div class="user-name">${this.getUserName()}</div>
                  <div class="user-email">${this.getUserEmail()}</div>
                </div>
              </div>
              <div class="user-actions">
                <button id="logout-btn" class="user-action-btn" role="menuitem">
                  <span class="user-action-icon">${Icons.logout('white')}</span>
                  <span class="user-action-text">Logout</span>
                </button>
              </div>
            </div>
          </div>
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

    // User menu toggle
    const userBtn = this.container.querySelector('#user-btn');
    userBtn?.addEventListener('click', () => this.toggleUserMenu());

    // Logout button
    const logoutBtn = this.container.querySelector('#logout-btn');
    logoutBtn?.addEventListener('click', () => this.handleLogout());

    // Share button
    const shareBtn = this.container.querySelector('#share-thread-btn');
    shareBtn?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('open-share-modal'));
    });

    // Close dropdown on outside click
    if (this._onDocumentClick) document.removeEventListener('click', this._onDocumentClick);
    this._onDocumentClick = (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
        this.closeUserMenu();
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
        if (this.isUserMenuOpen) {
          e.preventDefault();
          this.closeUserMenu(true);
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
    this.render();
    this.attachEventListeners();

    // Dispatch mode change event
    document.dispatchEvent(new CustomEvent('mode-change', {
      detail: { mode: modeId }
    }));
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.updateUserMenuState();
  }

  closeUserMenu(restoreFocus = false) {
    if (this.isUserMenuOpen) {
      this.isUserMenuOpen = false;
      this.updateUserMenuState();
      if (restoreFocus) this.container.querySelector('#user-btn')?.focus();
    }
  }

  updateUserMenuState() {
    const dropdown = this.container.querySelector('#user-dropdown');
    dropdown?.classList.toggle('open', this.isUserMenuOpen);
  }

  handleLogout() {
    this.closeUserMenu();
    // Use the global auth system
    if (window.DualMindAuth && window.DualMindAuth.logout) {
      window.DualMindAuth.logout();
    }
  }

  getUserInitials() {
    if (!window.DualMindAuth) return '...';

    const user = window.DualMindAuth.getUser();
    if (!user) return 'G';

    const name = user.user_metadata?.full_name || user.email;
    if (!name) return 'U';

    const parts = name.split(/[\s@]/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getUserName() {
    if (!window.DualMindAuth) return 'Loading...';

    const user = window.DualMindAuth.getUser();
    if (!user) return 'Guest';

    // Try user_metadata.full_name first
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }

    // Fallback to email username
    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'User';
  }

  getUserEmail() {
    if (!window.DualMindAuth) return 'Loading...';

    const user = window.DualMindAuth.getUser();
    return user?.email || 'guest@dualmind.ai';
  }

  handleSidebarToggle({ isOpen, isMobile }) {
    const header = this.container.querySelector('#main-header');
    if (header) {
      if (!isMobile) {
        header.style.left = isOpen ? '257px' : '0';
      } else {
        header.style.left = '0';
      }
    }
  }

  // Public method to get current mode
  getCurrentMode() {
    return this.currentMode;
  }
}

export default Header;
