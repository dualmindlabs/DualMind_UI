/**
 * DualMind - Main Application
 * Component orchestration and event handling with authentication
 */

import { Sidebar } from '../../components/Sidebar.js';
import { Header } from '../../components/Header.js';
import { ChatInput } from '../../components/ChatInput.js';
import { ChatView } from '../../components/chat/ChatView.js';
import { pickModelPair, buildMockReply, streamText } from '../mockArena.js';
import { api } from '../apiInstance.js';
import { LeaderboardModal } from './leaderboardModal.js';
import { shareModal } from '../../components/ShareModal.js';

class App {
  constructor() {
    this.components = {};
    this.state = {
      currentMode: 'battle',
      webSearchEnabled: false,
      codeModeEnabled: false,
      turns: [],
      direct: [],
      streaming: false,
      apiEnabled: true,
      user: null,
      backendAvailable: false, // Track if backend is available
      currentThreadId: null, // Track current conversation thread
      currentThreadVisibility: 'private', // Track current thread's visibility for sharing
      chatSettings: {
        codeMode: false,
        webSearch: false
      }
    };

    // Listen for Toggle Events
    document.addEventListener('toggle-code-mode', (e) => {
      this.state.chatSettings.codeMode = e.detail.active;
      // If Code Mode on, turn off Web Search
      if (e.detail.active && this.state.chatSettings.webSearch) {
        this.state.chatSettings.webSearch = false;
        document.dispatchEvent(new CustomEvent('toggle-web-search', { detail: { active: false } }));
      }
    });

    document.addEventListener('toggle-web-search', (e) => {
      this.state.chatSettings.webSearch = e.detail.active;
      // If Web Search on, turn off Code Mode
      if (e.detail.active && this.state.chatSettings.codeMode) {
        this.state.chatSettings.codeMode = false;
        document.dispatchEvent(new CustomEvent('toggle-code-mode', { detail: { active: false } }));
      }
    });

    // Listen for Logout
    document.addEventListener('user-logout', () => this.handleLogout());

    this._backendHealthFailures = 0;
    this._activeStreams = [];
    this._tts = {
      audio: null,
      utterance: null,
      button: null,
      url: null,
      requestId: 0
    };
    this.api = api;
    // Expose API globally for Sidebar to fetch threads
    window._DUALMIND_API = this.api;
    this.leaderboard = null;

    this.init();
  }

  /**
   * Get auth token from Supabase auth
   */
  /**
   * Wait for DualMindAuth to be initialized
   */
  async waitForAuth(maxWait = 3000) {
    const startTime = Date.now();
    while (!window.DualMindAuth && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return !!window.DualMindAuth;
  }



  async init() {
    // 🚨 CRITICAL: Wait for Supabase auth to fully initialize
    if (window.DualMindAuthReady) {
      await window.DualMindAuthReady;
    }

    // 🚨 CRITICAL: Add small delay to ensure session is fully restored
    // This prevents race condition where API calls happen before token is available
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check authentication with Supabase
    let isLoggedIn = window.DualMindAuth ? window.DualMindAuth.isLoggedIn() : false;

    // Verify token is available before proceeding
    if (isLoggedIn && window._DUALMIND_AUTH) {
      try {
        await window._DUALMIND_AUTH.getAccessToken();
      } catch (tokenError) {
        console.warn('Failed to restore auth token. Clearing stale session.', tokenError);
        try {
          await window._DUALMIND_AUTH.logout();
        } catch (logoutError) {
          console.warn('Failed to clear stale session:', logoutError);
        }
        isLoggedIn = false;
      }
    }

    // Check if we're already on the login page to prevent redirect loop
    const isOnLoginPage = window.location.pathname.includes('/login');

    if (!isLoggedIn && !isOnLoginPage) {
      // No guest mode - require authentication
      const currentPath = window.location.pathname;
      // Prevent infinite redirect loop
      if (sessionStorage.getItem('auth_redirect_attempted')) {
        sessionStorage.removeItem('auth_redirect_attempted');
        return;
      }

      sessionStorage.setItem('auth_redirect_attempted', 'true');
      window.location.href = `login-modern.html?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }

    // Clear redirect flag if we're logged in
    sessionStorage.removeItem('auth_redirect_attempted');

    // Set user info
    this.state.user = window.DualMindAuth ? window.DualMindAuth.getUser() : null;

    // Sync user with backend database
    if (this.state.user) {
      await this.syncUserWithBackend();
    }

    // 🚨 Hide loading overlay, show app
    const overlay = document.getElementById('auth-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    const app = document.getElementById('app');
    if (app) {
      app.style.display = 'block';
    } else {
      console.error('App element not found — check index.html for #app');
    }

    // Wait for DOM and initialize components immediately
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }

    // Check if backend is available (non-blocking) - but we will wait for it in setup() for final logs
    this._backendCheckPromise = this.checkBackendAvailability();
    this._backendCheckPromise.then(() => {
      // console.log('Backend check completed');
    }).catch(err => {
      console.warn('Backend check failed:', err);
    });

    // 🚨 NEW: Fetch models on startup
    await this.fetchModels();
  }

  /**
   * Check if backend server is available
   */
  async checkBackendAvailability() {
    // Skip backend check if offline mode is preferred
    if (window.DUALMIND_CONFIG?.offline?.enabled === false) {
      try {
        const ok = await this.api.healthCheck();

        if (ok) {
          this._backendHealthFailures = 0;
          const wasAvailable = this.state.backendAvailable;
          this.state.backendAvailable = true;
          this.hideBackendUnavailableBanner();

          if (!wasAvailable && this.state.user) {
            this.flushPendingUserSync().catch((flushErr) => {
              console.warn('[UserSync] Flush after backend recovery failed:', flushErr);
            });
            this.flushPendingVotes().catch((flushErr) => {
              console.warn('[VoteQueue] Flush after backend recovery failed:', flushErr);
            });
          }

          // Notify listeners (Sidebar, etc.) that backend is ready
          if (!wasAvailable) {
            document.dispatchEvent(new CustomEvent('backend-available', { detail: { available: true } }));
          }
          return;
        }

        this._backendHealthFailures += 1;
        if (this._backendHealthFailures >= 2) {
          const wasAvailable = this.state.backendAvailable;
          this.state.backendAvailable = false;
          this.showBackendUnavailableBanner();

          if (wasAvailable) {
            document.dispatchEvent(new CustomEvent('backend-available', { detail: { available: false } }));
          }
        }
      } catch (error) {
        this._backendHealthFailures += 1;
        if (this._backendHealthFailures >= 2) {
          const wasAvailable = this.state.backendAvailable;
          this.state.backendAvailable = false;
          this.showBackendUnavailableBanner();

          if (wasAvailable) {
            document.dispatchEvent(new CustomEvent('backend-available', { detail: { available: false } }));
          }
        }
      }
    } else {
      // Offline mode preferred - don't check backend
      this.state.backendAvailable = false;
    }

    // Always enable API for mock responses in offline mode
    if (!this.state.backendAvailable) {
      this.state.apiEnabled = true; // Enable for mock responses
    }
  }

  showBackendUnavailableBanner() {
    if (document.getElementById('backend-unavailable-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'backend-unavailable-banner';
    banner.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:16px',
      'transform:translateX(-50%)',
      'background:#111827',
      'color:#fff',
      'padding:10px 12px',
      'border-radius:10px',
      'z-index:10000',
      'box-shadow:0 8px 24px rgba(0,0,0,0.35)',
      'font-size:12px',
      'display:flex',
      'gap:10px',
      'align-items:center'
    ].join(';');

    const msg = document.createElement('div');
    msg.textContent = 'Backend unavailable. Some features may be disabled.';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Retry';
    btn.style.cssText = 'background:#2563eb;color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;font-weight:600;';
    btn.addEventListener('click', async () => {
      this._backendHealthFailures = 0;
      await this.checkBackendAvailability();
      this.renderChat();
    });

    banner.appendChild(msg);
    banner.appendChild(btn);
    document.body.appendChild(banner);
  }

  hideBackendUnavailableBanner() {
    const el = document.getElementById('backend-unavailable-banner');
    if (el) el.remove();
  }

  /**
   * Fetch all models from backend for model selection UI
   */
  async fetchModels() {
    try {
      const response = await this.api.models.getModels();
      window._DUALMIND_MODELS = response.items || response || [];
    } catch (error) {
      console.warn('Failed to load models:', error);
      window._DUALMIND_MODELS = [];
    }
  }

  /**
   * Prettify model name for display
   * First tries to use displayName from DB if available
   */
  prettifyModelName(modelName) {
    if (!modelName) return modelName;

    // Use displayName if we have it in our cached models
    const models = window._DUALMIND_MODELS || [];
    const model = models.find(m => m.modelName === modelName);
    if (model && model.displayName) {
      return model.displayName;
    }

    // Fallback for mock/offline
    return modelName
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\d+b\b/gi, m => m.toUpperCase());
  }

  /**
   * Get model ID by model_name from cached list
   * Used when backend returns model_name instead of model_id
   */
  getModelIdByName(modelName) {
    const models = window._DUALMIND_MODELS || [];
    const model = models.find(m => m.modelName === modelName);
    return model?.modelId || null;
  }

  async setup() {
    // Expose app globally for components
    window._APP = this;

    // WAIT for backend check to complete if it's still running
    if (this._backendCheckPromise) {
      await this._backendCheckPromise;
    }

    // Initialize components
    this.components.sidebar = new Sidebar('sidebar-container');
    this.components.header = new Header('header-container');
    this.components.chatInput = new ChatInput('chat-input-container');
    this.components.chatView = new ChatView('main-content');

    // Update sidebar with user info after initialization
    if (this.components.sidebar && this.components.sidebar.updateUserInfo) {
      this.components.sidebar.updateUserInfo();
    }

    // Leaderboard modal
    this.leaderboard = new LeaderboardModal({
      api: this.api,
      isApiEnabled: () => !!this.state.apiEnabled,
    });

    // Set up global event listeners
    this.attachGlobalListeners();

    // Initial layout adjustment
    this.adjustLayout();

    // Show offline indicator if needed
    if (!this.state.backendAvailable && window.DUALMIND_CONFIG?.offline?.showOfflineIndicator) {
      this.showOfflineIndicator();
    }

    // Initial render
    this.renderChat();

    // Hide loading indicator and mark app as ready
    const loadingEl = document.getElementById('auth-loading-overlay');
    if (loadingEl) {
      loadingEl.style.opacity = '0';
      loadingEl.style.transition = 'opacity 0.3s ease';
      setTimeout(() => loadingEl.remove(), 300);
    }
    window._DUALMIND_APP_READY = true;
  }

  /**
   * Show offline mode indicator
   */
  showOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ff9800;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        cursor: pointer;
      " onclick="this.remove()">
        ⚠️ OFFLINE MODE - Using demo responses
      </div>
    `;
    document.body.appendChild(indicator);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 10000);
  }

  attachGlobalListeners() {
    // Mobile menu toggle from header
    document.addEventListener('toggle-mobile-menu', () => {
      this.components.sidebar.toggle();
    });

    // Navigation actions
    document.addEventListener('nav-action', (e) => {
      this.handleNavigation(e.detail.action);
    });

    // Mode change
    document.addEventListener('mode-change', (e) => {
      this.state.currentMode = e.detail.mode;
      this.renderChat();
    });

    // API toggle
    document.addEventListener('api-toggle', (e) => {
      this.state.apiEnabled = !!e.detail.active;
    });

    // Action buttons that are part of ChatView but need global access
    document.addEventListener('click', (e) => {
      // Text-to-Speech
      const speakBtn = e.target.closest('[data-action="speak"]');
      if (speakBtn) {
        const targetId = speakBtn.getAttribute('data-target');
        const textEl = document.getElementById(targetId);
        if (textEl) {
          this.handleTextToSpeech(textEl.textContent, speakBtn);
        }
        return;
      }

      // Voting buttons
      const voteBtn = e.target.closest('[data-action="vote"]');
      if (voteBtn) {
        const turnId = voteBtn.getAttribute('data-turn-id');
        const voteChoice = voteBtn.getAttribute('data-vote');
        if (turnId && voteChoice) {
          // Apply visual selection immediately for feedback
          this.applyVoteSelection(voteChoice, turnId);
          // Submit the vote
          this.handleVoteSubmit(turnId, voteChoice);
        }
        return;
      }
    });

    // Chat submission
    document.addEventListener('chat-submit', (e) => {
      this.handleChatSubmit(e.detail);
    });

    // Battle vote submission
    document.addEventListener('vote-submit', (e) => {
      const detail = e.detail || {};
      this.handleVoteSubmit(detail.turnId, detail.choice);
    });
    // Floating voting buttons - hover handlers
    document.addEventListener('mouseover', (e) => {
      const voteBtn = e.target.closest('.vote-btn-light');
      if (voteBtn) {
        const vote = voteBtn.getAttribute('data-vote');
        const turnId = voteBtn.closest('#floating-voting')?.getAttribute('data-turn-id');
        if (vote && turnId) {
          this.highlightResponseCards(vote, turnId, true);
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const voteBtn = e.target.closest('.vote-btn-light');
      if (voteBtn) {
        const vote = voteBtn.getAttribute('data-vote');
        const turnId = voteBtn.closest('#floating-voting')?.getAttribute('data-turn-id');
        if (vote && turnId) {
          this.highlightResponseCards(vote, turnId, false);
        }
      }
    });

    // Sidebar toggle - adjust main content
    document.addEventListener('sidebar-toggle', (e) => {
      this.adjustLayout(e.detail);
    });

    // Thread clicked - load thread messages
    document.addEventListener('thread-clicked', (e) => {
      this.loadThread(e.detail.threadId);
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboard(e);
    });

    // Share modal - open when share button is clicked in header
    document.addEventListener('open-share-modal', () => {
      const threadId = this.state.currentThreadId;

      if (!threadId) {
        console.warn('No active thread to share. Start a conversation first.');
        // Could show a toast here
        return;
      }

      // Get current thread visibility (default to private if unknown)
      // The visibility might be stored in the thread data or fetched from API
      const visibility = this.state.currentThreadVisibility || 'private';

      shareModal.open(threadId, visibility);
    });

    // Export menu — lazy load ChatExport and show dropdown
    document.addEventListener('open-export-menu', async () => {
      const turns = this.state.turns?.length || 0;
      const direct = this.state.direct?.length || 0;
      if (turns === 0 && direct === 0) {
        if (window.showToast) window.showToast('Start a conversation first', 'info');
        return;
      }

      this._openExportDropdown();
    });
  }

  async _openExportDropdown() {
    // Remove any existing dropdown
    const existing = document.getElementById('dm-export-dropdown');
    if (existing) { existing.remove(); return; }

    const exportBtn = document.getElementById('export-btn');
    if (!exportBtn) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'dm-export-dropdown';
    dropdown.setAttribute('role', 'menu');
    dropdown.style.cssText = `
      position: fixed;
      background: rgba(16,18,28,0.98);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 12px;
      padding: 6px;
      z-index: 40000;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      min-width: 160px;
      backdrop-filter: blur(20px);
      animation: dm-empty-enter 0.15s ease both;
    `;

    const formats = [
      { id: 'md',   label: 'Markdown (.md)' },
      { id: 'json', label: 'JSON (.json)' },
      { id: 'csv',  label: 'CSV (.csv)' },
      { id: 'html', label: 'HTML (.html)' },
      { id: 'pdf',  label: 'PDF (print)' },
    ];

    formats.forEach((fmt, i) => {
      const btn = document.createElement('button');
      btn.setAttribute('role', 'menuitem');
      btn.textContent = fmt.label;
      btn.style.cssText = `
        display: block;
        width: 100%;
        padding: 10px 14px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: rgba(255,255,255,0.88);
        font-size: 13px;
        font-weight: 500;
        text-align: left;
        cursor: pointer;
        min-height: 44px;
        transition: background 0.15s;
        font-family: inherit;
      `;
      btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(74,171,194,0.12)'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
      btn.addEventListener('click', async () => {
        dropdown.remove();
        const { ChatExport } = await import('../chatExport.js');
        const exporter = new ChatExport(this.state);
        exporter.download(fmt.id);
      });

      // Arrow key navigation
      btn.setAttribute('tabindex', i === 0 ? '0' : '-1');
      btn.addEventListener('keydown', (e) => {
        const items = [...dropdown.querySelectorAll('[role="menuitem"]')];
        const idx = items.indexOf(e.currentTarget);
        if (e.key === 'ArrowDown') { items[(idx + 1) % items.length].focus(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { items[(idx - 1 + items.length) % items.length].focus(); e.preventDefault(); }
        else if (e.key === 'Escape') { dropdown.remove(); exportBtn.focus(); }
        else if (e.key === 'Enter') { btn.click(); }
      });

      dropdown.appendChild(btn);
    });

    document.body.appendChild(dropdown);

    // Position below export button
    const rect = exportBtn.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 8}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;

    // Focus first item
    dropdown.querySelector('[role="menuitem"]')?.focus();

    const closeOnClick = (e) => {
      if (!document.body.contains(dropdown)) {
        // Already removed by a button click
        document.removeEventListener('click', closeOnClick, true);
        return;
      }
      if (!dropdown.contains(e.target) && e.target !== exportBtn) {
        dropdown.remove();
        document.removeEventListener('click', closeOnClick, true);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnClick, true), 0);
  }

  handleNavigation(action) {
    switch (action) {
      case 'new-chat':
        this.startNewChat();
        break;
      case 'leaderboard':
        this.showLeaderboard();
        break;
      default:
        break;
    }
  }

  handleChatSubmit(data) {
    if (!data?.message?.trim()) return;
    if (this.state.streaming) return;

    // ✅ RESET VOTE STATE - New prompt = new comparison session
    this.resetVoteState();

    // Add to recent chats ONLY if backend offline (online handled in createThread)
    if (!this.state.backendAvailable) {
      this.components.sidebar.addRecentChat({
        id: Date.now(),
        title: data.message.substring(0, 30) + (data.message.length > 30 ? '...' : '')
      });
    }

    // Cancel any in-flight streams
    this.cancelStreams();

    const mode = this.state.currentMode;

    if (mode === 'direct') {
      this.runDirectDemo(data.message);
      return;
    }

    // Determine Temperature Scheme
    let temp = 0.7; // Default balanced
    if (this.state.chatSettings?.codeMode) temp = 0.5; // Precise for code
    if (this.state.chatSettings?.webSearch) temp = 1.0; // Creative for search/beast mode

    // Battle/Arena: 1 prompt -> 2 replies
    this.runArenaDemo(data.message, false, temp);
  }

  renderChat(preserveScroll = false) {
    const mode = this.state.currentMode;

    if (preserveScroll) {
      // Direct render call to preserve scroll position
      this.components.chatView.state = {
        ...this.components.chatView.state,
        mode,
        turns: this.state.turns,
        direct: this.state.direct,
        apiEnabled: this.state.apiEnabled,
      };
      this.components.chatView.render(true);
    } else {
      // Normal setState which may trigger full re-render
      this.components.chatView.setState({
        mode,
        turns: this.state.turns,
        direct: this.state.direct,
        apiEnabled: this.state.apiEnabled,
      });
    }

    // Show/hide export button based on whether there's content
    const hasTurns = (this.state.turns?.length || 0) + (this.state.direct?.length || 0) > 0;
    this.components.header?.setExportVisible?.(hasTurns);
  }

  cancelStreams() {
    this._activeStreams.forEach((s) => s?.cancel?.());
    this._activeStreams = [];
    this.state.streaming = false;
    this.components.chatInput.setLoading(false);
  }

  async runArenaDemo(prompt, forceMock = false, temperature = 0.7) {
    // Use mock responses if backend is not available OR API is disabled OR forced
    if ((!this.state.backendAvailable || !this.state.apiEnabled) || forceMock) {
      // Use mock responses
    } else {
      // Backend is available and API is enabled - use real API
      return this.runArenaApi(prompt, temperature);
    }

    const turnId = Date.now();
    const { left, right } = pickModelPair();

    const payload = {
      prompt: prompt,
      model1: left.id,
      model2: right.id,
      selectionMode: 'random', // For mock, we always pick random
      temperature: temperature
    };

    const turn = {
      id: turnId,
      prompt,
      left: { modelId: left.id, modelName: left.name, text: '', streaming: true },
      right: { modelId: right.id, modelName: right.name, text: '', streaming: true },
    };

    this.state.turns = [...this.state.turns, turn];
    this.state.streaming = true;
    this.components.chatInput.setLoading(true);
    this.renderChat();

    // Build demo replies (slightly different variants)
    const leftText = buildMockReply(prompt, left.name, 'precise');
    const rightText = buildMockReply(prompt, right.name, 'balanced');

    const leftStream = streamText(leftText, (chunk) => {
      // Persist into state so re-renders don't wipe streamed content
      turn.left.text += chunk;
      this.components.chatView.updateResponse(turnId, 'left', turn.left.text, true);
    }, { minDelay: 10, maxDelay: 22, minChunk: 1, maxChunk: 4 });

    const rightStream = streamText(rightText, (chunk) => {
      // Persist into state so re-renders don't wipe streamed content
      turn.right.text += chunk;
      this.components.chatView.updateResponse(turnId, 'right', turn.right.text, true);
    }, { minDelay: 12, maxDelay: 26, minChunk: 1, maxChunk: 4 });

    this._activeStreams = [leftStream, rightStream];

    await Promise.all([leftStream.promise, rightStream.promise]);

    this.components.chatView.finishResponse(turnId, 'left');
    this.components.chatView.finishResponse(turnId, 'right');

    // Mark streaming false in state (no need to re-render, finishResponse already updated DOM)
    this.state.turns = this.state.turns.map((t) => {
      if (t.id !== turnId) return t;
      return {
        ...t,
        left: { ...t.left, streaming: false },
        right: { ...t.right, streaming: false },
      };
    });

    this.state.streaming = false;
    this._activeStreams = [];
    this.components.chatInput.setLoading(false);
    // ✅ NO renderChat() - turn already exists, streaming updates done via DOM patches

    // ChatInput re-renders when loading changes; ensure voting stays visible until user clicks
    this.showFloatingVoting(turnId);
  }

  async runArenaApi(prompt, temperature = 0.7) {
    // If backend is not available, fall back to mock responses
    if (!this.state.backendAvailable) {
      return this.runArenaDemo(prompt, true);
    }

    // Auto-create thread on first message
    if (!this.state.currentThreadId && this.state.backendAvailable) {
      await this.createThread(prompt);
    }

    // 🚨 CRITICAL: Use UUID for turn ID (same as comparison_id and message_id)
    const battleId = crypto.randomUUID();

    // Get selected models from localStorage
    let model1 = localStorage.getItem('battle.model.left') || null;
    let model2 = localStorage.getItem('battle.model.right') || null;

    // IF IN BATTLE MODE (BLIND): FORCE RANDOM
    const currentMode = this.components.header?.getCurrentMode?.() || 'battle';
    if (currentMode === 'battle') {
      model1 = null;
      model2 = null;
    }

    // Logic to handle Mixed Selection (One Specific vs Random) in Side-by-Side Mode
    // The backend requires BOTH models if selectionMode is manual (i.e. if ANY model is specified).
    // So if user picks "Llama 3" vs "Random", we must pick a random model for the empty slot here.
    if (this.state.backendAvailable && window._DUALMIND_MODELS?.length > 0) {
      if ((model1 && !model2) || (!model1 && model2)) {
        const models = window._DUALMIND_MODELS;

        if (!model1) {
          const randomM = models[Math.floor(Math.random() * models.length)];
          model1 = randomM.modelName;
        }

        if (!model2) {
          const randomM = models[Math.floor(Math.random() * models.length)];
          model2 = randomM.modelName;
        }
      }
    }

    // For Side-by-Side, look up real names
    let leftName = 'Model A';
    let rightName = 'Model B';

    if (model1 && window._DUALMIND_MODELS) {
      const m1 = window._DUALMIND_MODELS.find(m => m.modelName === model1);
      if (m1) leftName = m1.modelName;
      else leftName = model1; // already a name
    }

    if (model2 && window._DUALMIND_MODELS) {
      const m2 = window._DUALMIND_MODELS.find(m => m.modelName === model2);
      if (m2) rightName = m2.modelName;
      else rightName = model2; // already a name
    }

    const turn = {
      id: battleId, // UUID string
      prompt,
      comparisonId: battleId, // Same UUID
      left: {
        modelId: model1, // UUID or null for random
        modelName: leftName,
        text: '…',
        streaming: true
      },
      right: {
        modelId: model2, // UUID or null for random
        modelName: rightName,
        text: '…',
        streaming: true
      },
      voteStatus: 'idle',
      voteChoice: null,
    };

    this.state.turns = [...this.state.turns, turn];
    this.state.streaming = true;
    this.components.chatInput.setLoading(true);
    this.renderChat();

    try {
      const userId = this.state.user?.id || null;
      const resp = await this.api.arena.dualChat(prompt, {
        model1: model1, // Send UUID or null
        model2: model2, // Send UUID or null
        threadId: this.state.currentThreadId,
        battleId: battleId, // Send battleId for linking
        userId: userId,
        temperature: temperature
      });

      const a1 = resp?.agent1;
      const a2 = resp?.agent2;

      // ✅ CRITICAL FIX: Use the backend-generated comparisonId for voting
      // The backend ignores our battleId and creates its own comparisonId
      if (resp?.comparisonId) {
        turn.comparisonId = resp.comparisonId;
      }

      // ✅ CRITICAL FIX: Update model names from backend response so they can be revealed after voting
      if (a1?.model) {
        turn.left.modelName = a1.model.displayName || a1.model.name || 'Model A';
      }
      if (a2?.model) {
        turn.right.modelName = a2.model.displayName || a2.model.name || 'Model B';
      }

      // Reset text for streaming
      turn.left.text = '';
      turn.right.text = '';

      // FORCE CLEAR DOM to remove '...'
      const leftEl = document.getElementById(`resp-${turn.id}-left`);
      const rightEl = document.getElementById(`resp-${turn.id}-right`);
      if (leftEl) leftEl.innerHTML = '';
      if (rightEl) rightEl.innerHTML = '';

      // Initialize response cards with empty text to prepare for streaming
      this.components.chatView.updateResponse(turn.id, 'left', '', true);
      this.components.chatView.updateResponse(turn.id, 'right', '', true);

      // Pseudo-stream the response
      const leftStream = streamText(a1?.message || '', (chunk) => {
        turn.left.text += chunk;
        this.components.chatView.updateResponse(turn.id, 'left', turn.left.text, true);
      }, { minDelay: 5, maxDelay: 15, minChunk: 2, maxChunk: 8 }); // Faster than generic

      const rightStream = streamText(a2?.message || '', (chunk) => {
        turn.right.text += chunk;
        this.components.chatView.updateResponse(turn.id, 'right', turn.right.text, true);
      }, { minDelay: 5, maxDelay: 15, minChunk: 2, maxChunk: 8 });

      this._activeStreams = [leftStream, rightStream];
      await Promise.all([leftStream.promise, rightStream.promise]);

      this.components.chatView.finishResponse(turn.id, 'left');
      this.components.chatView.finishResponse(turn.id, 'right');

      // ✅ CRITICAL FIX: Mark individual model streams as finished to unblock voting
      turn.left.streaming = false;
      turn.right.streaming = false;

      // Track when responses finished streaming to calculate vote duration
      turn.streamingFinishedAt = Date.now();

      this.state.streaming = false;
      this.components.chatInput.setLoading(false);

      // ChatInput re-renders when loading changes; ensure voting stays visible until user clicks
      this.showFloatingVoting(turn.id);

    } catch (err) {
      const msg = err?.message || 'API request failed';
      console.warn('API request failed, falling back to mock responses:', msg);

      // Fall back to mock responses
      this.state.turns = this.state.turns.filter(t => t.id !== turn.id); // Remove failed turn
      return this.runArenaDemo(prompt, true);
    }
  }

  async runDirectDemo(prompt, forceMock = false) {
    if (this.state.apiEnabled && !forceMock) {
      return this.runDirectApi(prompt);
    }

    const userId = Date.now();
    const assistantId = userId + 1;
    const model = pickModelPair().left;

    this.state.direct = [
      ...this.state.direct,
      { id: userId, role: 'user', text: prompt },
      { id: assistantId, role: 'assistant', modelName: model.name, text: '', streaming: true },
    ];

    this.state.streaming = true;
    this.components.chatInput.setLoading(true);
    this.renderChat();

    const reply = buildMockReply(prompt, model.name, 'balanced');
    const stream = streamText(reply, (chunk) => {
      const assistantMessage = this.state.direct.find((m) => String(m.id) === String(assistantId));
      if (!assistantMessage) return;

      assistantMessage.text += chunk;
      this.components.chatView.updateDirectResponse(assistantId, assistantMessage.text, true);
    }, { minDelay: 10, maxDelay: 22, minChunk: 1, maxChunk: 4 });

    this._activeStreams = [stream];
    const result = await stream.promise;
    this._activeStreams = [];

    if (result?.cancelled) {
      return;
    }

    const assistantMessage = this.state.direct.find((m) => String(m.id) === String(assistantId));
    if (assistantMessage) {
      assistantMessage.streaming = false;
      this.components.chatView.finishDirectResponse(assistantId);
    }

    this.state.streaming = false;
    this.components.chatInput.setLoading(false);
    this.renderChat();
  }

  async runDirectApi(prompt) {
    // If backend is not available, fall back to mock responses
    if (!this.state.backendAvailable) {
      return this.runDirectDemo(prompt, true);
    }

    // Auto-create thread on first message
    if (!this.state.currentThreadId && this.state.backendAvailable) {
      await this.createThread(prompt);
    }

    // Get selected model from localStorage
    const selectedModelId = localStorage.getItem('direct.model') || 'auto';
    let displayModelName = 'Assistant';

    // Optimistic lookup
    if (selectedModelId !== 'auto' && window._DUALMIND_MODELS) {
      const m = window._DUALMIND_MODELS.find(x => x.modelId === selectedModelId);
      if (m) displayModelName = m.modelName;
    }

    const userId = Date.now();
    const assistantId = userId + 1;
    this.state.direct = [
      ...this.state.direct,
      { id: userId, role: 'user', text: prompt },
      { id: assistantId, role: 'assistant', modelName: displayModelName, text: '', streaming: true },
    ];

    this.state.streaming = true;
    this.components.chatInput.setLoading(true);
    this.renderChat();
    this.components.chatView.updateDirectResponse(assistantId, '', true);

    try {
      const authUserId = this.state.user?.id || null;
      const resp = await this.api.arena.chat(prompt, {
        model: selectedModelId,
        threadId: this.state.currentThreadId,
        userId: authUserId
      });
      const last = this.state.direct.find((m) => String(m.id) === String(assistantId));
      if (last) {
        // Update model name if backend provides it, otherwise keep optimistic
        if (resp?.model) {
          last.modelName = resp.model.displayName || resp.model.name || last.modelName;
        } else if (resp?.modelId) {
          // If backend returns only ID, lookup name again
          const m = window._DUALMIND_MODELS?.find(x => x.modelId === resp.modelId);
          if (m) last.modelName = m.modelName;
        }

        last.text = resp?.message || resp?.text || '';
        last.streaming = false;
        this.components.chatView.updateDirectResponse(assistantId, last.text, false);
        this.components.chatView.finishDirectResponse(assistantId);
      }
    } catch (err) {
      const msg = err?.message || 'API request failed';
      console.warn('API request failed, falling back to mock responses:', msg);

      // Fall back to mock responses
      this.state.direct = this.state.direct.slice(0, -2); // Remove the failed messages
      // If backend is not available, fall back to mock responses
      if (!this.state.backendAvailable) {
        return this.runDirectDemo(prompt, true);
      }
    } finally {
      this.state.streaming = false;
      this.components.chatInput.setLoading(false);
      this.renderChat();
    }
  }

  /**
   * Show floating voting UI above input
   */
  showFloatingVoting(turnId) {
    const container = document.getElementById('floating-voting');
    if (!container) {
      console.warn('❌ Floating voting container not found!');
      return;
    }

    const turn = this.state.turns.find(t => String(t.id) === String(turnId));
    if (this.state.streaming || !turn || turn.voteStatus === 'submitted' || turn.left?.streaming || turn.right?.streaming) {
      return;
    }

    // Position the voting UI above the chat input to avoid overlap
    try {
      const chatInput = document.getElementById('chat-input-container');
      if (chatInput) {
        const rect = chatInput.getBoundingClientRect();
        const bottomOffset = Math.max(24, Math.round(window.innerHeight - rect.top + 12));
        container.style.bottom = `${bottomOffset}px`;
      }
    } catch {
      // If positioning fails, keep CSS default
    }

    container.setAttribute('data-turn-id', turnId);
    container.innerHTML = `
      <div class="floating-voting-container" role="group" aria-label="Vote which response is better">
        <div class="vote-prompt">Which response was better?</div>
        <div class="vote-buttons">
          <button class="vote-btn-light" type="button" data-action="vote" data-turn-id="${turnId}" data-vote="left">
            👈 Left is Better
          </button>
          <button class="vote-btn-light" type="button" data-action="vote" data-turn-id="${turnId}" data-vote="tie">
            🤝 It's a Tie
          </button>
          <button class="vote-btn-light" type="button" data-action="vote" data-turn-id="${turnId}" data-vote="both-bad">
            👎 Both are Bad
          </button>
          <button class="vote-btn-light" type="button" data-action="vote" data-turn-id="${turnId}" data-vote="right">
            👉 Right is Better
          </button>
        </div>
      </div>
    `;

    container.hidden = false;
  }

  /**
   * Hide floating voting UI
   */
  hideFloatingVoting() {
    const container = document.getElementById('floating-voting');
    if (container) {
      container.hidden = true;
      container.innerHTML = '';
      container.style.bottom = '';
    }
  }

  /**
   * Handle vote submission with corrected API contract
   * @param {string} turnId - UUID of the turn
   * @param {string} voteChoice - 'left' | 'right' | 'tie' | 'both-bad'
   */
  async handleVoteSubmit(turnId, voteChoice) {
    if (!turnId || !voteChoice) return;
    const turn = this.state.turns.find(t => String(t.id) === String(turnId));
    if (!turn || (turn.voteStatus && turn.voteStatus !== 'idle')) {
      console.warn('Turn not found or already voted');
      return;
    }

    if (turn.left?.streaming || turn.right?.streaming) {
      console.warn('⏳ Cannot vote while responses are streaming');
      return;
    }

    // Disable all vote buttons immediately
    document.querySelectorAll(`[data-turn-id="${turnId}"][data-action="vote"]`).forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });

    try {
      turn.voteStatus = 'submitting';
      turn.voteChoice = voteChoice;

      // Calculate vote duration
      let durationMs = null;
      if (turn.streamingFinishedAt) {
        durationMs = Date.now() - turn.streamingFinishedAt;
      }

      // Don't render here - applyVoteSelection already handled visual feedback

      const votePayload = {
        comparisonId: turn.comparisonId,
        voteChoice: voteChoice, // 'left' | 'right' | 'tie' | 'both-bad'
        userId: this.state.user?.id,
        voteDurationMs: durationMs
      };

      if (this.state.backendAvailable && turn.comparisonId) {
        // 🚨 CORRECTED: Send voteChoice enum, NOT model names
        await this.api.arena.submitVote(votePayload);
      } else if (turn.comparisonId) {
        this.enqueuePendingVote(votePayload, 'backend-unavailable');
        console.info('[VoteQueue] Vote queued while backend unavailable.', {
          comparisonId: turn.comparisonId,
          voteChoice
        });
      } else {
        console.warn('Skipping vote submit (missing comparisonId)');
      }

      // Keep both responses visible for 2 seconds after voting
      turn.voteStatus = 'vote-delay';
      this.hideFloatingVoting();
      // Don't render here - next render happens after 2s timeout


      // After 2 seconds, transition to showing only voted response
      this._voteTransitionTimeout = setTimeout(() => {
        // Check if turn still exists (user might have navigated away)
        const currentTurn = this.state.turns.find(t => String(t.id) === String(turnId));
        if (!currentTurn) return;

        currentTurn.voteStatus = 'submitted';
        // Update only this turn's DOM instead of full re-render to avoid duplication flicker
        this.updateTurnVisibilityAfterVote(turnId);
      }, 2000);

      // Refresh leaderboard if open
      if (this.state.backendAvailable && this.leaderboard?.isOpen?.()) {
        this.leaderboard.load({ force: true });
      }
    } catch (error) {
      console.error('❌ Vote submission failed:', error);
      alert('Failed to submit vote: ' + error.message);

      // Re-enable buttons
      document.querySelectorAll(`[data-turn-id="${turnId}"][data-action="vote"]`).forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
      });

      turn.voteStatus = 'idle';
      turn.voteChoice = null;
    }
  }

  /**
   * Update turn visibility after vote without full re-render (prevents flicker)
   * @param {string} turnId - The turn ID
   */
  updateTurnVisibilityAfterVote(turnId) {
    const turn = this.state.turns.find(t => String(t.id) === String(turnId));
    if (!turn || !turn.voteChoice) return;

    const voteChoice = turn.voteChoice;
    const responsesGrid = document.querySelector(`.chat-turn[data-turn-id="${turnId}"] .responses-grid`);
    if (!responsesGrid) return;

    const leftCard = responsesGrid.querySelector('[data-side="left"]');
    const rightCard = responsesGrid.querySelector('[data-side="right"]');
    if (!leftCard || !rightCard) return;

    // Show/hide based on vote choice (same logic as renderTurn)
    const showBoth = voteChoice === 'tie' || voteChoice === 'both-bad';
    const showLeft = showBoth || voteChoice === 'left';
    const showRight = showBoth || voteChoice === 'right';

    // Update visibility with CSS classes
    leftCard.style.display = showLeft ? '' : 'none';
    rightCard.style.display = showRight ? '' : 'none';
    responsesGrid.classList.toggle('single-response', !showLeft || !showRight);

    // Update model names to reveal actual names (not Model A/B)
    const leftModelName = leftCard.querySelector('.model-name');
    const rightModelName = rightCard.querySelector('.model-name');

    if (leftModelName && turn.left?.modelName) {
      let cleanName = this.cleanModelName(turn.left.modelName);
      leftModelName.textContent = cleanName;
    }
    if (rightModelName && turn.right?.modelName) {
      let cleanName = this.cleanModelName(turn.right.modelName);
      rightModelName.textContent = cleanName;
    }

    // Add winner/loser classes
    if (voteChoice === 'left') {
      leftCard.classList.add('is-winner');
      rightCard.classList.add('is-loser');
    } else if (voteChoice === 'right') {
      rightCard.classList.add('is-winner');
      leftCard.classList.add('is-loser');
    } else if (voteChoice === 'tie') {
      leftCard.classList.add('is-winner');
      rightCard.classList.add('is-winner');
    } else if (voteChoice === 'both-bad') {
      leftCard.classList.add('is-loser');
      rightCard.classList.add('is-loser');
    }

    // Add toggle button if needed (voted but not showing one side)
    if (!showBoth && voteChoice !== 'tie' && voteChoice !== 'both-bad') {
      const hiddenSide = voteChoice === 'left' ? 'right' : 'left';
      const existingToggle = responsesGrid.parentElement.querySelector('.toggle-response-container');
      if (!existingToggle) {
        const turnSection = responsesGrid.closest('.chat-turn');
        if (turnSection) {
          const hiddenModel = hiddenSide === 'left' ? turn.left?.modelName : turn.right?.modelName;
          const cleanHiddenName = hiddenModel ? this.cleanModelName(hiddenModel) : (hiddenSide === 'left' ? 'Left' : 'Right');
          const toggleHtml = `
            <div class="toggle-response-container" style="text-align: center; margin: 16px 0;">
              <button 
                class="toggle-response-btn secondary-btn" 
                data-action="toggle-response" 
                data-turn-id="${turnId}" 
                data-side="${hiddenSide}"
                style="padding: 12px 24px; border-radius: 12px; background: rgba(74, 171, 194, 0.15); border: 1px solid rgba(74, 171, 194, 0.3); color: #4AABC2; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                👁️ See Other Response (${cleanHiddenName})
              </button>
            </div>
          `;
          turnSection.insertAdjacentHTML('beforeend', toggleHtml);
        }
      }
    }
  }

  /**
   * Clean model name - strip provider prefix and description
   * @param {string} modelName - Raw model name
   * @returns {string} Clean model name
   */
  cleanModelName(modelName) {
    if (!modelName || modelName === 'undefined' || modelName === 'null') {
      return 'Unknown';
    }
    // Strip everything after em-dash (–) or hyphen with space ( - )
    let clean = modelName.split('–')[0].split(' - ')[0].trim();
    // Strip provider prefix (e.g., "groq/", "openai/", etc.)
    clean = clean.replace(/^[^/]+\//, '');
    return clean;
  }

  /**
   * Handle text-to-speech for AI responses
   */
  resetTtsButton(buttonElement) {
    if (!buttonElement) return;
    const originalContent = buttonElement.dataset.ttsOriginal;
    if (originalContent) {
      buttonElement.innerHTML = originalContent;
    }
    buttonElement.removeAttribute('data-tts-state');
    buttonElement.disabled = false;
  }

  stopTextToSpeech(buttonOverride = null) {
    this._tts.requestId += 1;

    if (this._tts.audio) {
      try {
        this._tts.audio.pause();
        this._tts.audio.currentTime = 0;
        this._tts.audio.src = '';
      } catch {
        // Ignore cleanup errors
      }
    }

    if (this._tts.url) {
      try {
        URL.revokeObjectURL(this._tts.url);
      } catch {
        // Ignore cleanup errors
      }
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    this._tts.audio = null;
    this._tts.utterance = null;
    this._tts.url = null;

    if (this._tts.button) {
      this.resetTtsButton(this._tts.button);
    }

    if (buttonOverride && buttonOverride !== this._tts.button) {
      this.resetTtsButton(buttonOverride);
    }

    this._tts.button = null;
  }

  async handleTextToSpeech(text, buttonElement) {
    if (!text || !text.trim() || !buttonElement) return;

    const currentState = buttonElement.getAttribute('data-tts-state');
    if (currentState === 'loading' || currentState === 'playing') {
      this.stopTextToSpeech(buttonElement);
      return;
    }

    this.stopTextToSpeech();

    const requestId = ++this._tts.requestId;
    this._tts.button = buttonElement;

    if (!buttonElement.dataset.ttsOriginal) {
      buttonElement.dataset.ttsOriginal = buttonElement.innerHTML;
    }

    buttonElement.setAttribute('data-tts-state', 'loading');
    buttonElement.innerHTML = '⏳';
    buttonElement.disabled = false;

    try {
      const audioBlob = await this.api.arena.textToSpeech(text.trim());
      if (requestId !== this._tts.requestId) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this._tts.audio = audio;
      this._tts.url = audioUrl;

      buttonElement.setAttribute('data-tts-state', 'playing');
      buttonElement.innerHTML = '⏹';

      audio.onended = () => {
        if (requestId !== this._tts.requestId) return;
        this.stopTextToSpeech(buttonElement);
      };

      audio.onerror = () => {
        if (requestId !== this._tts.requestId) return;
        this.stopTextToSpeech(buttonElement);
        alert('Failed to play audio');
      };

      await audio.play();
      return;
    } catch (error) {
      if (requestId !== this._tts.requestId) return;
      console.warn('Backend TTS failed, falling back to browser API:', error);
    }

    try {
      if (!window.speechSynthesis) {
        throw new Error('SpeechSynthesis not supported');
      }

      const utterance = new SpeechSynthesisUtterance(text.trim());
      this._tts.utterance = utterance;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Samantha')));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => {
        if (requestId !== this._tts.requestId) return;
        buttonElement.setAttribute('data-tts-state', 'playing');
        buttonElement.innerHTML = '⏹';
      };

      utterance.onend = () => {
        if (requestId !== this._tts.requestId) return;
        this.stopTextToSpeech(buttonElement);
      };

      utterance.onerror = () => {
        if (requestId !== this._tts.requestId) return;
        this.stopTextToSpeech(buttonElement);
      };

      window.speechSynthesis.speak(utterance);
    } catch (browserError) {
      console.error('Browser TTS also failed:', browserError);
      this.stopTextToSpeech(buttonElement);
      alert('Text-to-speech failed completely.');
    }
  }

  async syncUserWithBackend() {
    if (!this.state.user) return;

    const userData = {
      id: this.state.user.id,
      email: this.state.user.email,
      phone: this.state.user.phone || null,
      name: this.state.user.user_metadata?.name ||
        this.state.user.user_metadata?.full_name ||
        this.state.user.email?.split('@')[0] || 'User',
      avatar_url: this.state.user.user_metadata?.avatar_url || null,
      provider: this.state.user.app_metadata?.provider || 'email'
    };

    if (!this.state.backendAvailable) {
      this.enqueuePendingUserSync(userData, 'backend-unavailable');
      console.info('[UserSync] Backend unavailable. Sync queued.', {
        userId: userData.id,
        email: userData.email
      });
      return;
    }

    try {
      // Call backend to sync/create user
      await this.api.users.syncUser(userData);
      this.removePendingUserSync(userData.id);
      console.info('[UserSync] Sync success.', {
        userId: userData.id,
        email: userData.email
      });
      await this.flushPendingUserSync();
    } catch (error) {
      this.enqueuePendingUserSync(userData, 'sync-error', error?.message || String(error));

      // 🚨 Robust handling: If sync fails (e.g. race condition or DB error), 
      // check if it's just a duplicate or non-critical DB error.
      const msg = error?.message || error?.toString() || '';

      if (msg.includes('Database error') || msg.includes('duplicate')) {
        console.warn('[UserSync] Backend sync warning (likely harmless):', msg);
      } else {
        console.warn('[UserSync] Failed to sync user with backend:', error);
      }
      // Don't block the app, just continue
    }
  }

  getPendingUserSyncQueue() {
    const key = 'dualmind.userSync.queue.v1';
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  setPendingUserSyncQueue(queue) {
    const key = 'dualmind.userSync.queue.v1';
    try {
      localStorage.setItem(key, JSON.stringify(Array.isArray(queue) ? queue : []));
    } catch (e) {
      console.warn('[UserSync] Failed to persist sync queue:', e);
    }
  }

  enqueuePendingUserSync(userData, reason = 'unknown', errorMessage = null) {
    if (!userData?.id) return;

    const queue = this.getPendingUserSyncQueue();
    const existingIndex = queue.findIndex((item) => item.userData?.id === userData.id);
    const existingAttempts = existingIndex >= 0 ? (queue[existingIndex].attempts || 0) : 0;

    const nextEntry = {
      userData,
      reason,
      attempts: existingAttempts + 1,
      updatedAt: new Date().toISOString(),
      lastError: errorMessage || null,
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = nextEntry;
    } else {
      queue.push(nextEntry);
    }

    this.setPendingUserSyncQueue(queue);
  }

  removePendingUserSync(userId) {
    if (!userId) return;
    const queue = this.getPendingUserSyncQueue().filter((item) => item.userData?.id !== userId);
    this.setPendingUserSyncQueue(queue);
  }

  async flushPendingUserSync() {
    if (!this.state.backendAvailable) return;

    const queue = this.getPendingUserSyncQueue();
    if (!queue.length) return;

    const remaining = [];
    for (const entry of queue) {
      try {
        await this.api.users.syncUser(entry.userData);
        console.info('[UserSync] Flushed queued user sync.', {
          userId: entry.userData?.id,
          email: entry.userData?.email,
          attempts: entry.attempts
        });
      } catch (err) {
        remaining.push({
          ...entry,
          attempts: (entry.attempts || 0) + 1,
          updatedAt: new Date().toISOString(),
          lastError: err?.message || String(err)
        });
        console.warn('[UserSync] Queued sync still failing.', {
          userId: entry.userData?.id,
          email: entry.userData?.email,
          error: err?.message || String(err)
        });
      }
    }

    this.setPendingUserSyncQueue(remaining);
  }

  getPendingVoteQueue() {
    const key = 'dualmind.vote.queue.v1';
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  setPendingVoteQueue(queue) {
    const key = 'dualmind.vote.queue.v1';
    try {
      localStorage.setItem(key, JSON.stringify(Array.isArray(queue) ? queue : []));
    } catch (e) {
      console.warn('[VoteQueue] Failed to persist queue:', e);
    }
  }

  enqueuePendingVote(voteData, reason = 'unknown', errorMessage = null) {
    if (!voteData?.comparisonId || !voteData?.voteChoice) return;

    const queue = this.getPendingVoteQueue();
    queue.push({
      voteData,
      reason,
      attempts: 1,
      updatedAt: new Date().toISOString(),
      lastError: errorMessage || null
    });
    this.setPendingVoteQueue(queue);
  }

  async flushPendingVotes() {
    if (!this.state.backendAvailable) return;

    const queue = this.getPendingVoteQueue();
    if (!queue.length) return;

    const remaining = [];
    for (const entry of queue) {
      try {
        await this.api.arena.submitVote(entry.voteData);
        console.info('[VoteQueue] Flushed queued vote.', {
          comparisonId: entry.voteData?.comparisonId,
          voteChoice: entry.voteData?.voteChoice,
          attempts: entry.attempts
        });
      } catch (err) {
        remaining.push({
          ...entry,
          attempts: (entry.attempts || 0) + 1,
          updatedAt: new Date().toISOString(),
          lastError: err?.message || String(err)
        });
        console.warn('[VoteQueue] Queued vote still failing.', {
          comparisonId: entry.voteData?.comparisonId,
          voteChoice: entry.voteData?.voteChoice,
          error: err?.message || String(err)
        });
      }
    }

    this.setPendingVoteQueue(remaining);
  }

  async createThread(firstMessage) {
    if (!this.state.backendAvailable) return;

    const title = firstMessage.length > 40
      ? firstMessage.substring(0, 40) + '...'
      : firstMessage;

    try {
      const userId = this.state.user?.id || null;
      const mode = this.state.currentMode || 'battle';
      const result = await this.api.threads.createThread(title, userId, mode);
      this.state.currentThreadId = result?.threadId || result?.id || null;

      // Add to sidebar with real UUID
      if (this.state.currentThreadId) {
        this.components.sidebar.addRecentChat({
          id: this.state.currentThreadId,
          title: title
        });

        // Show share button now that a thread exists
        this.components.header?.setShareVisible?.(true);

        // Let Sidebar (and others) refresh from source-of-truth
        document.dispatchEvent(new CustomEvent('threads-changed', {
          detail: { reason: 'thread-created', threadId: this.state.currentThreadId }
        }));
      }
    } catch (error) {
      // If user doesn't exist in database, try to sync and retry once
      if (error.message?.includes('user_id') && error.message?.includes('not present in table')) {
        await this.syncUserWithBackend();

        // Retry thread creation
        try {
          const userId = this.state.user?.id || null;
          const mode = this.state.currentMode || 'battle';
          const result = await this.api.threads.createThread(title, userId, mode);
          this.state.currentThreadId = result?.threadId || result?.id || null;

          if (this.state.currentThreadId) {
            this.components.sidebar.addRecentChat({
              id: this.state.currentThreadId,
              title: title
            });

            this.components.header?.setShareVisible?.(true);

            document.dispatchEvent(new CustomEvent('threads-changed', {
              detail: { reason: 'thread-created', threadId: this.state.currentThreadId }
            }));
          }
        } catch (retryError) {
          console.warn('❌ Thread creation failed even after retry:', retryError);
        }
      } else {
        console.warn('Failed to create thread:', error);
      }
    }
  }

  async loadThread(threadId) {
    if (!this.state.backendAvailable) {
      this.state.currentThreadId = threadId;
      return;
    }

    try {
      this.components.chatInput.setLoading(true);

      // Hide voting panel FIRST when switching threads
      this.hideFloatingVoting();

      const result = await this.api.threads.getThreadMessages(threadId);
      const messages = result?.items || result || [];

      // Clear current chat
      this.cancelStreams();
      this.state.turns = [];
      this.state.direct = [];
      this.state.currentThreadId = threadId;

      // Try to fetch thread visibility for sharing
      try {
        const threadData = await this.api.fetchThread(threadId);
        this.state.currentThreadVisibility = threadData?.visibility || 'private';
      } catch (e) {
        // If fetchThread doesn't exist or fails, default to private
        this.state.currentThreadVisibility = 'private';
      }

      if (messages.length === 0) {
        this.renderChat();
        this.components.chatInput.setLoading(false);
        return;
      }

      // Reconstruct turns from thread messages
      // This is a simplified reconstruction. 
      // Real implementation depends on how backend stores turns vs messages.
      // Assuming flat list of "turns" for now based on previous code structure
      messages.forEach((msg, idx) => {
        // Restore vote status if available
        const voteChoice = msg.voteChoice || msg.vote_choice || msg.userVote || null;
        // If voteChoice exists, status is 'submitted', otherwise 'idle'
        const voteStatus = voteChoice ? 'submitted' : 'idle';

        // Restore model names if available (from backend DTO)
        const leftModelName = msg.model1Name || msg.model1_name || 'Model A';
        const rightModelName = msg.model2Name || msg.model2_name || 'Model B';

        const turn = {
          id: msg.messageId || msg.message_id || Date.now() + idx,
          comparisonId: msg.comparisonId || msg.comparison_id || null, // Restore comparisonId for voting
          prompt: msg.promptText || msg.prompt_text || '',
          left: {
            modelId: msg.model1Id || msg.model1_id,
            modelName: leftModelName,
            text: msg.model1Response || msg.model1_response || '',
            streaming: false
          },
          right: {
            modelId: msg.model2Id || msg.model2_id,
            modelName: rightModelName,
            text: msg.model2Response || msg.model2_response || '',
            streaming: false
          },
          voteStatus: voteStatus,
          voteChoice: voteChoice,
          userVote: voteChoice // Keep sync
        };

        this.state.turns.push(turn);
      });

      this.renderChat();

      // Show share and export buttons for existing loaded thread
      this.components.header?.setShareVisible?.(true);
      this.components.header?.setExportVisible?.(this.state.turns.length > 0);

      // After rendering, show voting panel for the last turn if vote is pending
      const lastTurn = this.state.turns[this.state.turns.length - 1];
      if (lastTurn && lastTurn.comparisonId && !lastTurn.voteChoice) {
        this.showFloatingVoting(lastTurn.id);
      }
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      this.components.chatInput.setLoading(false);
    }
  }

  startNewChat() {
    this.cancelStreams();
    this.hideFloatingVoting(); // Hide voting panel when switching away
    this.state.turns = [];
    this.state.direct = [];
    this.state.currentThreadId = null; // Clear thread for new chat
    this.components.header?.setShareVisible?.(false);
    this.components.header?.setExportVisible?.(false);
    this.components.chatInput.clear();
    this.components.chatInput.focus();
    this.renderChat();
  }

  showLeaderboard() {
    // Dedicated leaderboard page (static route)
    // Use relative URL so it works on localhost and deployed subpaths.
    window.location.assign('./leaderboard/');
  }

  adjustLayout(sidebarState = null) {
    const state = sidebarState || this.components.sidebar?.getState() || { isOpen: true, isMobile: false };

    const headerContainer = document.getElementById('header-container');
    const chatContainer = document.getElementById('chat-input-container');
    const votingContainer = document.getElementById('floating-voting');
    const mainContent = document.getElementById('main-content');

    if (!state.isMobile) {
      const offset = state.isCollapsed
        ? 'var(--sidebar-collapsed-width)'
        : (state.isOpen ? 'var(--sidebar-width)' : '0');

      if (headerContainer) {
        headerContainer.style.left = offset;
      }

      if (chatContainer) {
        const wrapper = chatContainer.querySelector('.chat-input-wrapper');
        if (wrapper) {
          wrapper.style.marginLeft = '0';
        }
      }

      // Update main content class for CSS selectors
      if (mainContent) {
        if (state.isCollapsed) {
          mainContent.classList.add('collapsed');
        } else {
          mainContent.classList.remove('collapsed');
        }
      }
    } else {
      if (headerContainer) {
        headerContainer.style.left = '0';
      }

      if (chatContainer) {
        const wrapper = chatContainer.querySelector('.chat-input-wrapper');
        if (wrapper) {
          wrapper.style.marginLeft = '0';
        }
      }

      if (mainContent) {
        mainContent.classList.remove('collapsed');
      }
    }
  }

  handleResize() {
    this.adjustLayout();
  }

  handleKeyboard(e) {
    // Ctrl/Cmd + K - Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      this.components.chatInput.focus();
    }

    // Ctrl/Cmd + B - Toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      const state = this.components.sidebar.getState();
      if (state.isMobile) this.components.sidebar.toggle();
    }

    // Escape - Close sidebar on mobile
    if (e.key === 'Escape') {
      const state = this.components.sidebar.getState();
      if (state.isMobile && state.isOpen) {
        this.components.sidebar.close();
      }
    }
  }

  async handleLogout() {
    if (window.DualMindAuth && window.DualMindAuth.logout) {
      await window.DualMindAuth.logout();
    } else {
      // Fallback: clear local storage and redirect
      localStorage.removeItem('dualmind.auth.supabase');
      localStorage.removeItem('dualmind.auth.token');
      window.location.href = './login/';
    }
  }

  /**
   * Reset all vote state and UI when new prompt is submitted
   * Each prompt/response pair is a new comparison session
   */
  resetVoteState() {

    // Hide voting buttons
    this.hideFloatingVoting();

    // Remove all vote button active states
    const votingContainer = document.getElementById('floating-voting');
    if (votingContainer) {
      const allButtons = votingContainer.querySelectorAll('.vote-btn-light');
      allButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.disabled = false; // Re-enable if disabled
      });
    }

    // Remove all vote highlight classes from response cards
    const allCards = document.querySelectorAll('.response-card');
    allCards.forEach(card => {
      card.classList.remove(
        'vote-highlight-green',
        'vote-highlight-red',
        'vote-selected-green',
        'vote-selected-red'
      );
    });

    // Clear vote state from all turns in state
    this.state.turns = this.state.turns.map(turn => ({
      ...turn,
      voteStatus: undefined,
      voteChoice: undefined,
      voteMessage: undefined
    }));

  }

  /**
   * Highlight response cards on hover
   * @param {string} vote - 'left', 'right', 'tie', or 'both-bad'
   * @param {string} turnId - The turn ID
   * @param {boolean} highlight - true to add highlight, false to remove
   */
  highlightResponseCards(vote, turnId, highlight) {
    const leftCard = document.querySelector(`.response-card[data-turn-id="${turnId}"][data-side="left"]`);
    const rightCard = document.querySelector(`.response-card[data-turn-id="${turnId}"][data-side="right"]`);

    if (!leftCard || !rightCard) return;

    const hasPermanentSelection =
      leftCard.classList.contains('vote-selected-green') ||
      leftCard.classList.contains('vote-selected-red') ||
      rightCard.classList.contains('vote-selected-green') ||
      rightCard.classList.contains('vote-selected-red');

    if (hasPermanentSelection) return;

    // Remove all hover highlights first
    leftCard.classList.remove('vote-highlight-green', 'vote-highlight-red');
    rightCard.classList.remove('vote-highlight-green', 'vote-highlight-red');

    if (!highlight) return;

    // Apply hover highlights based on vote type
    if (vote === 'left') {
      leftCard.classList.add('vote-highlight-green');
    } else if (vote === 'right') {
      rightCard.classList.add('vote-highlight-green');
    } else if (vote === 'tie') {
      leftCard.classList.add('vote-highlight-green');
      rightCard.classList.add('vote-highlight-green');
    } else if (vote === 'both-bad') {
      leftCard.classList.add('vote-highlight-red');
      rightCard.classList.add('vote-highlight-red');
    }
  }

  /**
   * Apply permanent selection styling after click
   * @param {string} vote - 'left', 'right', 'tie', or 'both-bad'
   * @param {string} turnId - The turn ID
   */
  applyVoteSelection(vote, turnId) {
    const turn = this.state.turns.find(t => String(t.id) === String(turnId));
    if (!turn) return;
    if (turn.left?.streaming || turn.right?.streaming) return;

    const leftCard = document.querySelector(`.response-card[data-turn-id="${turnId}"][data-side="left"]`);
    const rightCard = document.querySelector(`.response-card[data-turn-id="${turnId}"][data-side="right"]`);
    const votingContainer = document.getElementById('floating-voting');

    if (!leftCard || !rightCard || !votingContainer) return;

    // Remove all previous selections and highlights
    leftCard.classList.remove('vote-highlight-green', 'vote-highlight-red', 'vote-selected-green', 'vote-selected-red');
    rightCard.classList.remove('vote-highlight-green', 'vote-highlight-red', 'vote-selected-green', 'vote-selected-red');

    // Remove active class from all buttons
    const allButtons = votingContainer.querySelectorAll('.vote-btn-light');
    allButtons.forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button
    const clickedButton = votingContainer.querySelector(`.vote-btn-light[data-vote="${vote}"]`);
    if (clickedButton) {
      clickedButton.classList.add('active');
    }

    // Apply permanent selection styling
    if (vote === 'left') {
      leftCard.classList.add('vote-selected-green');
    } else if (vote === 'right') {
      rightCard.classList.add('vote-selected-green');
    } else if (vote === 'tie') {
      leftCard.classList.add('vote-selected-green');
      rightCard.classList.add('vote-selected-green');
    } else if (vote === 'both-bad') {
      leftCard.classList.add('vote-selected-red');
      rightCard.classList.add('vote-selected-red');
    }
  }

  // Public API
  getState() {
    return { ...this.state };
  }

  getComponent(name) {
    return this.components[name];
  }
}

// Initialize app
const app = new App();

// Expose to window for debugging and component access
window.DualMindArena = app;
window._APP = app;

export default app;

