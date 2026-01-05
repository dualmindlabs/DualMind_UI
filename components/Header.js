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
      { id: 'battle', name: 'Battle', icon: Icons.battle },
      { id: 'arena', name: 'Arena', icon: Icons.battle },
      { id: 'direct', name: 'Direct Chat', icon: Icons.chat }
    ];
    this.isDropdownOpen = false;
    this.isUserMenuOpen = false;
    this.isApiActive = true;
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
      <header id="main-header" class="main-header">
        <!-- Mobile Menu Toggle -->
        <button id="mobile-menu-btn" class="mobile-menu-btn lg:hidden" aria-label="Open sidebar">
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
            aria-label="Select mode (current: ${currentModeData.name})"
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
            ${this.modes.map(mode => `
              <button
                class="mode-option ${mode.id === this.currentMode ? 'active' : ''}"
                data-mode="${mode.id}"
                role="menuitemradio"
                aria-checked="${mode.id === this.currentMode ? 'true' : 'false'}"
              >
                <span class="mode-option-icon">${mode.icon('white')}</span>
                <span class="mode-option-text">${mode.name}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Right Controls -->
        <div class="header-controls">
          <!-- API Status -->
          <button id="api-btn" class="api-btn ${this.isApiActive ? 'active' : ''}" aria-pressed="${this.isApiActive ? 'true' : 'false'}">
            <span class="api-indicator ${this.isApiActive ? 'active' : ''}"></span>
            <span class="api-text">API</span>
          </button>

          <!-- User Menu -->
          <div class="user-menu">
            <button id="user-btn" class="user-btn" aria-label="User menu">
              <span class="user-avatar">${this.getUserInitials()}</span>
            </button>
            
            <!-- User Dropdown -->
            <div id="user-dropdown" class="user-dropdown ${this.isUserMenuOpen ? 'open' : ''}">
              <div class="user-info">
                <div class="user-name">${this.getUserName()}</div>
                <div class="user-email">${this.getUserEmail()}</div>
              </div>
              <div class="user-actions">
                <button id="logout-btn" class="user-action-btn">
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

    // API button
    const apiBtn = this.container.querySelector('#api-btn');
    apiBtn?.addEventListener('click', () => this.toggleApi());

    // More button
    const moreBtn = this.container.querySelector('#more-btn');
    moreBtn?.addEventListener('click', () => this.openMoreMenu());

    // User menu toggle
    const userBtn = this.container.querySelector('#user-btn');
    userBtn?.addEventListener('click', () => this.toggleUserMenu());

    // Logout button
    const logoutBtn = this.container.querySelector('#logout-btn');
    logoutBtn?.addEventListener('click', () => this.handleLogout());

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

  toggleApi() {
    this.isApiActive = !this.isApiActive;
    const btn = this.container.querySelector('#api-btn');
    const indicator = this.container.querySelector('.api-indicator');
    
    btn?.classList.toggle('active', this.isApiActive);
    btn?.setAttribute('aria-pressed', this.isApiActive ? 'true' : 'false');
    indicator?.classList.toggle('active', this.isApiActive);

    // Dispatch API toggle event
    document.dispatchEvent(new CustomEvent('api-toggle', { 
      detail: { active: this.isApiActive } 
    }));
  }

  openMoreMenu() {
    // Dispatch more menu event
    document.dispatchEvent(new CustomEvent('open-more-menu'));
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
    if (window.DualMindAuth && window.DualMindAuth.getUser) {
      const user = window.DualMindAuth.getUser();
      if (user && user.user_metadata && user.user_metadata.full_name) {
        const name = user.user_metadata.full_name;
        const parts = name.split(' ');
        if (parts.length >= 2) {
          return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
      }
      if (user && user.email) {
        return user.email.substring(0, 2).toUpperCase();
      }
    }
    return 'U';
  }

  getUserName() {
    if (window.DualMindAuth && window.DualMindAuth.getUserName) {
      return window.DualMindAuth.getUserName();
    }
    if (window.DualMindAuth && window.DualMindAuth.getUser) {
      const user = window.DualMindAuth.getUser();
      if (user && user.user_metadata && user.user_metadata.full_name) {
        return user.user_metadata.full_name;
      }
      if (user && user.email) {
        return user.email.split('@')[0];
      }
    }
    return 'Guest';
  }

  getUserEmail() {
    if (window.DualMindAuth && window.DualMindAuth.getUserEmail) {
      return window.DualMindAuth.getUserEmail();
    }
    if (window.DualMindAuth && window.DualMindAuth.getUser) {
      const user = window.DualMindAuth.getUser();
      if (user && user.email) {
        return user.email;
      }
    }
    return 'guest@dualmind.ai';
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
