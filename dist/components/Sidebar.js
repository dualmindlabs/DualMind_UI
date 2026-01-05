/**
 * Sidebar Component
 * Collapsible sidebar with navigation and recent chats
 */

import { Icons } from '../js/icons.js';

export class Sidebar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isMobile = window.innerWidth < 1024;
    // Desktop opens by default; mobile starts closed (drawer)
    this.isOpen = !this.isMobile;
    this.recentChats = [];
    this._focusTrapHandler = null;
    this._escapeHandler = null;
    this._scrollY = 0;
    
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.handleResize();
  }

  render() {
    this.container.innerHTML = `
      <!-- Mobile Overlay -->
      <div id="sidebar-overlay" class="sidebar-overlay ${this.isOpen && this.isMobile ? 'active' : ''}"></div>
      
      <!-- Floating Toggle Button (appears when sidebar is closed) -->
      <button id="floating-toggle" class="floating-toggle" aria-label="Open sidebar" style="display: ${!this.isOpen && !this.isMobile ? 'flex' : 'none'}">
        ${Icons.menu('white', 24)}
      </button>
      
      <!-- Sidebar -->
      <aside id="sidebar" class="sidebar ${this.isOpen ? 'open' : 'closed'}" aria-label="Sidebar">
        <!-- Header Section -->
        <div class="sidebar-header">
          <!-- Logo -->
          <button id="logo-btn" class="logo-btn" aria-label="DualMind Menu">
            <span class="logo-icon">${Icons.logo(21)}</span>
            <span class="logo-text">DualMind</span>
            <span class="logo-chevron">${Icons.chevronDown('#577B87', 12)}</span>
          </button>
          
          <!-- Toggle Button (Desktop) -->
          <button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle Sidebar">
            ${Icons.menu('white')}
          </button>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav" aria-label="Primary navigation">
          <a href="#" class="nav-item active" data-action="new-chat">
            <span class="nav-icon">${Icons.newChat('white', 18)}</span>
            <span class="nav-text">New Chat</span>
          </a>
          <a href="#" class="nav-item" data-action="leaderboard">
            <span class="nav-icon">${Icons.leaderboard('white', 0.5)}</span>
            <span class="nav-text">Leaderboard</span>
          </a>
        </nav>

        <!-- Recent Chats Section -->
        <div class="recent-chats-section">
          <h3 class="section-title">Recent Chat</h3>
          <div id="recent-chats-list" class="recent-chats-list">
            ${this.renderRecentChats()}
          </div>
        </div>

        <!-- User Profile -->
        <div class="user-profile">
          <div class="user-avatar" id="user-avatar"></div>
          <div class="user-info">
            <div class="user-name" id="user-name">Guest</div>
            <button class="logout-btn" id="logout-btn">Logout</button>
          </div>
        </div>

        <!-- Footer -->
        <footer class="sidebar-footer">
          <a href="#" class="footer-link">Terms of use</a>
          <a href="#" class="footer-link">Privacy Policy</a>
          <a href="#" class="footer-link">Cookies</a>
        </footer>
      </aside>
    `;
  }

  renderRecentChats() {
    if (this.recentChats.length === 0) {
      return `
        <div class="empty-chats">
          <span class="empty-icon" style="opacity: 0.3; margin-bottom: 12px;">
            ${Icons.chat('white', 32)}
          </span>
          <p>No recent chats</p>
          <p style="font-size: 12px; opacity: 0.4; margin-top: 4px;">Start a conversation to see it here</p>
        </div>
      `;
    }

    return this.recentChats.map((chat, index) => `
      <a href="#" class="chat-item animate-fade-in stagger-${Math.min(index + 1, 5)}" data-chat-id="${chat.id}">
        <span class="chat-icon">${Icons.chat('white', 16)}</span>
        <span class="chat-title">${chat.title}</span>
      </a>
    `).join('');
  }

  attachEventListeners() {
    // Toggle sidebar
    const toggleBtn = this.container.querySelector('#sidebar-toggle');
    toggleBtn?.addEventListener('click', () => this.toggle());

    // Floating toggle button
    const floatingToggle = this.container.querySelector('#floating-toggle');
    floatingToggle?.addEventListener('click', () => this.open());

    // Close on overlay click (mobile)
    const overlay = this.container.querySelector('#sidebar-overlay');
    overlay?.addEventListener('click', () => this.close());

    // Navigation items
    const navItems = this.container.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleNavClick(item.dataset.action);
      });
    });

    // Logo dropdown
    const logoBtn = this.container.querySelector('#logo-btn');
    logoBtn?.addEventListener('click', () => this.toggleLogoDropdown());

    // Logout button
    const logoutBtn = this.container.querySelector('#logout-btn');
    logoutBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleLogout();
    });

    // Resize handler
    window.addEventListener('resize', () => this.handleResize());
    
    // Update user info
    this.updateUserInfo();
  }

  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 1024;
    
    // Auto-close on mobile, auto-open on desktop
    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        this.close();
      } else {
        this.open();
      }
    }
    
    this.updateClasses();
  }

  updateClasses() {
    const sidebar = this.container.querySelector('#sidebar');
    const overlay = this.container.querySelector('#sidebar-overlay');
    const floatingToggle = this.container.querySelector('#floating-toggle');
    
    if (sidebar) {
      sidebar.classList.toggle('open', this.isOpen);
      sidebar.classList.toggle('closed', !this.isOpen);
    }
    
    if (overlay) {
      overlay.classList.toggle('active', this.isOpen && this.isMobile);
    }
    
    if (floatingToggle) {
      floatingToggle.style.display = (!this.isOpen && !this.isMobile) ? 'flex' : 'none';
    }

    // Mobile drawer hardening: scroll lock + focus trap + Escape
    if (this.isMobile && this.isOpen) {
      this.lockScroll();
      this.enableFocusTrap();
    } else {
      this.unlockScroll();
      this.disableFocusTrap();
    }

    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('sidebar-toggle', { 
      detail: { isOpen: this.isOpen, isMobile: this.isMobile } 
    }));
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.updateClasses();
  }

  open() {
    this.isOpen = true;
    this.updateClasses();
  }

  close() {
    this.isOpen = false;
    this.updateClasses();
  }

  lockScroll() {
    // Only lock once
    if (document.body.classList.contains('drawer-open')) return;
    this._scrollY = window.scrollY || 0;
    document.body.classList.add('drawer-open');
    document.body.style.top = `-${this._scrollY}px`;
  }

  unlockScroll() {
    if (!document.body.classList.contains('drawer-open')) return;
    document.body.classList.remove('drawer-open');
    document.body.style.top = '';
    window.scrollTo(0, this._scrollY);
  }

  enableFocusTrap() {
    const sidebar = this.container.querySelector('#sidebar');
    if (!sidebar) return;

    // Focus the first focusable element when opening
    const focusables = sidebar.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    first?.focus?.();

    if (!this._focusTrapHandler) {
      this._focusTrapHandler = (e) => {
        if (e.key !== 'Tab') return;
        const items = Array.from(focusables).filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (active === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      };
      document.addEventListener('keydown', this._focusTrapHandler);
    }

    if (!this._escapeHandler) {
      this._escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isMobile && this.isOpen) {
          e.preventDefault();
          this.close();
        }
      };
      document.addEventListener('keydown', this._escapeHandler);
    }
  }

  disableFocusTrap() {
    if (this._focusTrapHandler) {
      document.removeEventListener('keydown', this._focusTrapHandler);
      this._focusTrapHandler = null;
    }
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
  }

  handleNavClick(action) {
    // Remove active from all
    const navItems = this.container.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active to clicked
    const clicked = this.container.querySelector(`[data-action="${action}"]`);
    clicked?.classList.add('active');

    // Dispatch navigation event
    document.dispatchEvent(new CustomEvent('nav-action', { detail: { action } }));

    // Close sidebar on mobile after navigation
    if (this.isMobile) {
      this.close();
    }
  }

  toggleLogoDropdown() {
    const logoBtn = this.container.querySelector('#logo-btn');
    logoBtn?.classList.toggle('dropdown-open');
  }

  addRecentChat(chat) {
    this.recentChats.unshift(chat);
    if (this.recentChats.length > 10) {
      this.recentChats.pop();
    }
    this.updateRecentChats();
  }

  updateRecentChats() {
    const list = this.container.querySelector('#recent-chats-list');
    if (list) {
      list.innerHTML = this.renderRecentChats();
    }
  }

  updateUserInfo() {
    if (window.DualMindAuth && window.DualMindAuth.isLoggedIn()) {
      const userName = window.DualMindAuth.getUserName();
      const user = window.DualMindAuth.getUser();
      
      let initials = 'U';
      if (user && user.user_metadata && user.user_metadata.full_name) {
        const name = user.user_metadata.full_name;
        const parts = name.split(' ');
        if (parts.length >= 2) {
          initials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else {
          initials = name.substring(0, 2).toUpperCase();
        }
      } else if (user && user.email) {
        initials = user.email.substring(0, 2).toUpperCase();
      }
      
      const nameEl = this.container.querySelector('#user-name');
      const avatarEl = this.container.querySelector('#user-avatar');
      
      if (nameEl) nameEl.textContent = userName;
      if (avatarEl) avatarEl.textContent = initials;
    } else {
      const nameEl = this.container.querySelector('#user-name');
      const avatarEl = this.container.querySelector('#user-avatar');
      
      if (nameEl) nameEl.textContent = 'Guest';
      if (avatarEl) avatarEl.textContent = 'G';
    }
  }

  async handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      if (window.DualMindAuth && window.DualMindAuth.logout) {
        await window.DualMindAuth.logout();
      } else {
        document.dispatchEvent(new CustomEvent('user-logout'));
      }
    }
  }

  // Public method to get current state
  getState() {
    return {
      isOpen: this.isOpen,
      isMobile: this.isMobile
    };
  }
}

export default Sidebar;
