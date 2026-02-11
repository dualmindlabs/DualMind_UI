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
    this._threadActionsClickHandler = null;
    this._refreshTimer = null;

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.handleResize();

    // Load threads if user is authenticated
    this.loadThreads();
  }

  scheduleLoadThreads(delayMs = 250) {
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
    }
    this._refreshTimer = setTimeout(() => {
      this.loadThreads();
    }, delayMs);
  }

  async loadThreads() {
    // Only load threads if user is logged in
    if (!window.DualMindAuth || !window.DualMindAuth.isLoggedIn()) {
      console.log('User not logged in, skipping thread load');
      return;
    }

    try {
      // Get API client from window (set by app-final.js)
      const api = window._DUALMIND_API;
      if (!api) {
        console.warn('API client not available');
        return;
      }

      const result = await api.threads.getThreads(20);
      const threads = Array.isArray(result)
        ? result
        : (result?.items || []);

      // Map to expected format
      this.recentChats = threads.map(thread => ({
        id: thread.threadId || thread.thread_id,
        title: thread.title || 'Untitled Thread'
      }));

      this.updateRecentChats();
      console.log(`✅ Loaded ${this.recentChats.length} threads`);
    } catch (error) {
      console.warn('Failed to load threads:', error);
    }
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
      <aside id="sidebar" class="sidebar ${this.isCollapsed ? 'collapsed' : 'open'}" aria-label="Sidebar" role="navigation">
        <!-- Header Section -->
        <div class="sidebar-header">
          <!-- Logo -->
          <button id="logo-btn" class="logo-btn" aria-label="DualMind Home">
            <span class="logo-icon">${Icons.logo(21)}</span>
            <span class="logo-text">DualMind</span>
          </button>
          
          <!-- Toggle Button (Desktop) -->
          <button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle Sidebar" title="Toggle sidebar">
            ${Icons.menu('white')}
          </button>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav" aria-label="Primary navigation">
          <button class="nav-item active" data-action="new-chat" title="Start new conversation">
            <span class="nav-icon">${Icons.newChat('white', 18)}</span>
            <span class="nav-text">New Chat</span>
          </button>
          <button class="nav-item" data-action="leaderboard" title="View model leaderboard">
            <span class="nav-icon">${Icons.leaderboard('white', 0.5)}</span>
            <span class="nav-text">Leaderboard</span>
          </button>
        </nav>

        <!-- Recent Chats Section -->
        <div class="recent-chats-section">
          <div class="section-header">
            <h3 class="section-title">Recent Chats</h3>
          </div>
          <div id="recent-chats-list" class="recent-chats-list">
            ${this.renderRecentChats()}
          </div>
        </div>

        <!-- Footer -->
        <footer class="sidebar-footer">
          <div class="footer-links">
            <a href="./terms/" class="footer-link" title="Terms of Service">Terms</a>
            <span class="footer-separator">•</span>
            <a href="./privacy/" class="footer-link" title="Privacy Policy">Privacy</a>
          </div>
          <button class="footer-logout" id="logout-btn" title="Log out">
            <span class="logout-icon">${Icons.logout('white', 16)}</span>
            <span class="logout-text">Log Out</span>
          </button>
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
      <div class="chat-item-wrapper animate-fade-in stagger-${Math.min(index + 1, 5)}">
        <a href="#" class="chat-item" data-chat-id="${chat.id}">
          <span class="chat-icon">${Icons.chat('white', 16)}</span>
          <span class="chat-title">${this.escapeHtml(chat.title)}</span>
        </a>
        <div class="chat-actions">
          <button class="chat-action-btn" data-action="rename" data-chat-id="${chat.id}" title="Rename">
            ✏️
          </button>
          <button class="chat-action-btn" data-action="delete" data-chat-id="${chat.id}" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  updateRecentChats() {
    const listContainer = this.container.querySelector('#recent-chats-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderRecentChats();
      // Re-attach thread click handlers after updating
      this.attachThreadClickHandlers();
      // Re-attach action handlers
      this.attachActionHandlers();
    }
  }

  attachThreadClickHandlers() {
    const chatItems = this.container.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const threadId = item.getAttribute('data-chat-id');
        if (threadId) {
          document.dispatchEvent(new CustomEvent('thread-clicked', {
            detail: { threadId }
          }));
          if (this.isMobile) {
            this.close();
          }
        }
      });
    });
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
      item.addEventListener('click', () => {
        this.handleNavClick(item.dataset.action);
      });
    });

    // Thread click handlers are attached by attachThreadClickHandlers() called from updateRecentChats()

    // Initial attachment of action handlers (delegated)
    this.attachActionHandlers();

    // Logout button
    const logoutBtn = this.container.querySelector('#logout-btn');
    logoutBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('user-logout'));
    });

    // Resize handler
    window.addEventListener('resize', () => this.handleResize());

    // Re-fetch threads when backend/auth state changes
    document.addEventListener('backend-available', (e) => {
      if (e?.detail?.available) {
        this.scheduleLoadThreads(0);
      }
    });

    document.addEventListener('threads-changed', () => {
      this.scheduleLoadThreads(100);
    });
  }

  attachActionHandlers() {
    // Thread action handlers (rename, delete)
    // Use event delegation so we only ever have ONE listener, even after re-renders.
    const listContainer = this.container.querySelector('#recent-chats-list');
    if (!listContainer) return;

    if (this._threadActionsClickHandler) {
      listContainer.removeEventListener('click', this._threadActionsClickHandler);
    }

    this._threadActionsClickHandler = async (e) => {
      const btn = e.target.closest?.('.chat-action-btn');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation(); // Prevent thread click

      const action = btn.getAttribute('data-action');
      const chatId = btn.getAttribute('data-chat-id');

      console.log(`Action button clicked: ${action} on ${chatId}`);

      if (action === 'rename') {
        await this.handleRenameThread(chatId);
      } else if (action === 'delete') {
        await this.handleDeleteThread(chatId);
      }
    };

    listContainer.addEventListener('click', this._threadActionsClickHandler);
  }

  async handleRenameThread(threadId) {
    const thread = this.recentChats.find(t => t.id === threadId);
    if (!thread) return;

    const newTitle = prompt('Enter new thread name:', thread.title);
    if (!newTitle || newTitle.trim() === '' || newTitle === thread.title) return;

    try {
      const api = window._DUALMIND_API;
      if (!api) {
        alert('API not available');
        return;
      }

      await api.threads.updateThread(threadId, newTitle.trim());

      // Update local state
      thread.title = newTitle.trim();
      this.updateRecentChats();

      console.log('✅ Thread renamed successfully');
    } catch (error) {
      console.error('Failed to rename thread:', error);
      alert('Failed to rename thread: ' + error.message);
    }
  }

  async handleDeleteThread(threadId) {
    const thread = this.recentChats.find(t => t.id === threadId);
    if (!thread) return;

    if (!confirm(`Delete "${thread.title}"?\n\nThis cannot be undone.`)) return;

    try {
      const api = window._DUALMIND_API;
      if (!api) {
        alert('API not available');
        return;
      }

      await api.threads.deleteThread(threadId);

      // Remove from local state
      this.recentChats = this.recentChats.filter(t => t.id !== threadId);
      this.updateRecentChats();

      // If this was the active thread, clear it
      if (window._APP && window._APP.state.currentThreadId === threadId) {
        window._APP.state.currentThreadId = null;
        window._APP.state.turns = [];
        window._APP.hideFloatingVoting(); // Hide voting panel when thread deleted
        window._APP.renderChat();
      }

      console.log('✅ Thread deleted successfully');
    } catch (error) {
      console.error('Failed to delete thread:', error);
      alert('Failed to delete thread: ' + error.message);
    }
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
