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
    this.isCollapsed = false;
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
      
      <!-- Floating Toggle Button (appears when sidebar is collapsed) -->
      <button id="floating-toggle" class="floating-toggle" aria-label="Open sidebar" style="display: ${this.isCollapsed && !this.isMobile ? 'flex' : 'none'}">
        ${Icons.menu('white', 24)}
      </button>
      
      <!-- Sidebar -->
      <aside id="sidebar" class="sidebar ${this.isCollapsed ? 'collapsed' : 'open'}" aria-label="Sidebar">
        <!-- Header Section -->
        <div class="sidebar-header">
          <!-- Logo -->
          <button id="logo-btn" class="logo-btn" aria-label="DualMind">
            <span class="logo-icon">${Icons.logo(21)}</span>
            <span class="logo-text">DualMind</span>
          </button>
          
          <!-- Toggle Button (Desktop) -->
          <button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle Sidebar">
            ${Icons.menu('white')}
          </button>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav" aria-label="Primary navigation">
          <a href="#" class="nav-item active" data-action="new-chat" title="New Chat">
            <span class="nav-icon">${Icons.newChat('white', 18)}</span>
            <span class="nav-text">New Chat</span>
          </a>
          <a href="#" class="nav-item" data-action="leaderboard" title="Leaderboard">
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
        <div class="chat-meta">
            <span class="chat-title">${chat.title}</span>
            <span class="chat-date">${new Date(chat.id).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
        </div>
      </a>
    `).join('');
  }

  attachEventListeners() {
    // Toggle sidebar
    const toggleBtn = this.container.querySelector('#sidebar-toggle');
    toggleBtn?.addEventListener('click', () => {
      if (this.isMobile) {
        // Mobile: open/close drawer
        this.toggle();
        return;
      }

      // Desktop: collapse to icon rail
      this.isCollapsed = !this.isCollapsed;
      // Desktop sidebar should remain visible
      this.isOpen = true;
      this.updateClasses();
    });

    // Logo click: expand/collapse on desktop
    const logoBtn = this.container.querySelector('#logo-btn');
    logoBtn?.addEventListener('click', () => {
      if (this.isMobile) return;
      this.isCollapsed = !this.isCollapsed;
      this.isOpen = true;
      this.updateClasses();
    });

    // Floating toggle button
    const floatingToggle = this.container.querySelector('#floating-toggle');
    floatingToggle?.addEventListener('click', () => {
      if (this.isCollapsed) {
        this.isCollapsed = false;
        this.updateClasses();
      } else {
        this.open();
      }
    });

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

    // Resize handler
    window.addEventListener('resize', () => this.handleResize());

    // Listen for mode changes
    document.addEventListener('mode-change', (e) => {
        this.updateLogo(e.detail.mode);
    });
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
    const mainContent = document.querySelector('.main-content');

    if (!this.isMobile) {
      this.container.style.width = this.isCollapsed
        ? 'var(--sidebar-collapsed-width)'
        : 'var(--sidebar-width)';
    } else {
      this.container.style.width = '';
    }
    
    if (sidebar) {
      // Mobile drawer behavior: use open/closed
      // Desktop collapse behavior: use collapsed/open
      if (this.isMobile) {
        sidebar.classList.toggle('open', this.isOpen);
        sidebar.classList.toggle('collapsed', false);
      } else {
        sidebar.classList.toggle('open', !this.isCollapsed);
        sidebar.classList.toggle('collapsed', this.isCollapsed);
      }
    }
    
    if (overlay) {
      overlay.classList.toggle('active', this.isOpen && this.isMobile);
    }
    
    if (floatingToggle) {
      floatingToggle.style.display = 'none';
    }

    if (mainContent) {
      mainContent.classList.toggle('collapsed', !!this.isCollapsed && !this.isMobile);
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
      detail: { isOpen: this.isOpen, isCollapsed: this.isCollapsed, isMobile: this.isMobile } 
    }));
  }

  updateLogo(mode) {
    const logoContainer = this.container.querySelector('#logo-btn .logo-icon');
    const logoText = this.container.querySelector('#logo-btn .logo-text');
    if (!logoContainer) return;

    if (mode === 'battle') {
        logoContainer.innerHTML = Icons.logo(21);
        if (logoText) logoText.textContent = 'DualMind';
    } else if (mode === 'arena') {
        logoContainer.innerHTML = Icons.splitRectangle(null, 21); // Using split icon for arena
        if (logoText) logoText.textContent = 'Side by Side';
    } else if (mode === 'direct') {
        logoContainer.innerHTML = Icons.chat(null, 21); // Using chat icon for direct
        if (logoText) logoText.textContent = 'Direct Chat';
    }
  }

  toggle() {
    if (this.isMobile) {
      // Mobile: open/close drawer
      this.isOpen ? this.close() : this.open();
    } else {
      // Desktop: collapse to icon rail
      this.isCollapsed = !this.isCollapsed;
      this.isOpen = true;
      this.updateClasses();
    }
  }

  updateSidebarState() {
    const sidebar = this.container.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    const headerContainer = document.querySelector('#header-container');
    
    if (sidebar) {
      sidebar.classList.toggle('collapsed', this.isCollapsed);
      sidebar.classList.toggle('open', !this.isCollapsed);
    }
    
    if (mainContent) {
      mainContent.classList.toggle('collapsed', this.isCollapsed);
    }
    
    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('sidebar-toggle', { 
      detail: { isCollapsed: this.isCollapsed, isMobile: this.isMobile } 
    }));
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

  // Public method to get current state
  getState() {
    return {
      isOpen: this.isOpen,
      isCollapsed: this.isCollapsed,
      isMobile: this.isMobile
    };
  }
}

export default Sidebar;
