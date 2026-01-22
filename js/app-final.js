/**
 * DualMind - Main Application
 * Component orchestration and event handling with authentication
 */

import { Sidebar } from '../components/Sidebar.js';
import { Header } from '../components/Header.js';
import { ChatInput } from '../components/ChatInput.js';
import { ChatView } from '../components/chat/ChatView.js';
import { pickModelPair, buildMockReply, streamText } from './mockArena.js';
import { api } from './apiInstance.js';
import { LeaderboardModal } from './leaderboardModal.js';
import { shareModal } from '../components/ShareModal.js';

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
      console.log('Chat Settings:', this.state.chatSettings);
    });

    document.addEventListener('toggle-web-search', (e) => {
      this.state.chatSettings.webSearch = e.detail.active;
      // If Web Search on, turn off Code Mode
      if (e.detail.active && this.state.chatSettings.codeMode) {
        this.state.chatSettings.codeMode = false;
        document.dispatchEvent(new CustomEvent('toggle-code-mode', { detail: { active: false } }));
      }
      console.log('Chat Settings:', this.state.chatSettings);
    });

    // Listen for Logout
    document.addEventListener('user-logout', () => this.handleLogout());

    this._backendHealthFailures = 0;
    this._activeStreams = [];
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
      console.log('✅ Auth initialization complete');
    }

    // 🚨 CRITICAL: Add small delay to ensure session is fully restored
    // This prevents race condition where API calls happen before token is available
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check authentication with Supabase
    const isLoggedIn = window.DualMindAuth ? window.DualMindAuth.isLoggedIn() : false;
    console.log('🔍 Auth check - isLoggedIn:', isLoggedIn);
    console.log('🔍 Auth object available:', !!window.DualMindAuth);
    console.log('🔍 Supabase auth available:', !!window._DUALMIND_AUTH);
    console.log('🔍 Current user:', window.DualMindAuth ? window.DualMindAuth.getUser() : null);

    // 🚨 CRITICAL: Verify token is available before proceeding
    if (isLoggedIn && window._DUALMIND_AUTH) {
      const token = await window._DUALMIND_AUTH.getAccessToken();
      console.log('🔍 Token available:', !!token);
      if (token) {
        console.log('🔍 Token length:', token.length);
      }
    }

    // Check if we're already on the login page to prevent redirect loop
    const isOnLoginPage = window.location.pathname.includes('/login');

    if (!isLoggedIn && !isOnLoginPage) {
      // No guest mode - require authentication
      const currentPath = window.location.pathname;
      console.log('🔄 User not authenticated. Redirecting to login:', currentPath);

      // Prevent infinite redirect loop
      if (sessionStorage.getItem('auth_redirect_attempted')) {
        console.error('❌ Auth redirect loop detected. Stopping.');
        sessionStorage.removeItem('auth_redirect_attempted');
        return;
      }

      sessionStorage.setItem('auth_redirect_attempted', 'true');
      window.location.href = `login/index.html?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }

    // Clear redirect flag if we're logged in
    sessionStorage.removeItem('auth_redirect_attempted');

    // Set user info
    this.state.user = window.DualMindAuth ? window.DualMindAuth.getUser() : null;
    console.log('✅ User authenticated:', this.state.user ? this.state.user.email : 'Unknown');

    // Sync user with backend database
    if (this.state.user) {
      await this.syncUserWithBackend();
    }

    // 🚨 Hide loading overlay, show app
    const overlay = document.getElementById('auth-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      console.log('✅ Loading overlay hidden');
    }
    const app = document.getElementById('app');
    if (app) {
      app.style.display = 'block';
      console.log('✅ App displayed - display set to block');
    } else {
      console.error('❌ App element not found!');
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
          console.log('✅ Backend available');
          this.hideBackendUnavailableBanner();

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
          console.log('⚠️ Backend health check failed (consecutive), some features may be unavailable');
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
          console.log('⚠️ Backend not available (consecutive), some features may be unavailable');
          this.showBackendUnavailableBanner();

          if (wasAvailable) {
            document.dispatchEvent(new CustomEvent('backend-available', { detail: { available: false } }));
          }
        }
      }
    } else {
      // Offline mode preferred - don't check backend
      this.state.backendAvailable = false;
      console.log('📱 Running in offline mode (no backend check)');
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
      console.log('✅ Loaded models:', window._DUALMIND_MODELS.length);
    } catch (error) {
      console.warn('Failed to load models:', error);
      window._DUALMIND_MODELS = [];
    }
  }

  /**
   * Prettify model name for display (NO display_name in DB)
   * Converts "llama-3.3-70b-versatile" -> "Llama 3.3 70B Versatile"
   */
  prettifyModelName(modelName) {
    if (!modelName) return modelName;
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

    console.log('🚀 DualMind App Initialized');
    console.log('📊 Backend available:', this.state.backendAvailable ? '✅' : '❌ (Offline mode)');

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
      console.log('Mode changed to:', e.detail.mode);
      this.renderChat();
    });

    // API toggle
    document.addEventListener('api-toggle', (e) => {
      this.state.apiEnabled = !!e.detail.active;
      console.log('API status:', this.state.apiEnabled ? 'Active' : 'Inactive');
    });

    // Model selection change handlers
    document.addEventListener('change', (e) => {
      if (e.target.id === 'model-select-left') {
        const value = e.target.value;
        localStorage.setItem('battle.model.left', value);
        // Prevent same model selection
        const right = localStorage.getItem('battle.model.right');
        if (value && right && value === right) {
          alert('Please select different models for left and right');
          e.target.value = '';
          localStorage.removeItem('battle.model.left');
        }
      }

      if (e.target.id === 'model-select-right') {
        const value = e.target.value;
        localStorage.setItem('battle.model.right', value);
        // Prevent same model selection
        const left = localStorage.getItem('battle.model.left');
        if (value && left && value === left) {
          alert('Please select different models for left and right');
          e.target.value = '';
          localStorage.removeItem('battle.model.right');
        }
      }

      // Direct Chat model selection
      if (e.target.id === 'model-select-direct') {
        const value = e.target.value;
        localStorage.setItem('direct.model', value);
        console.log('✅ Direct chat model selected:', value);
      }
    });

    // Voting handler (Global delegation for #floating-voting)
    document.addEventListener('click', (e) => {
      const voteBtn = e.target.closest('#floating-voting button');
      if (voteBtn) {
        const vote = voteBtn.getAttribute('data-vote');
        const container = document.getElementById('floating-voting');
        const turnId = container?.getAttribute('data-turn-id');

        if (vote && turnId) {
          this.handleFloatingVote(vote, turnId);
        }
      }
    });

    // Model selector action buttons
    document.addEventListener('click', (e) => {
      // Swap models
      if (e.target.closest('#swap-models-btn')) {
        const left = localStorage.getItem('battle.model.left') || '';
        const right = localStorage.getItem('battle.model.right') || '';
        localStorage.setItem('battle.model.left', right);
        localStorage.setItem('battle.model.right', left);
        this.components.chatView.render();
        return;
      }

      // Random pair
      if (e.target.closest('#random-pair-btn')) {
        const models = window._DUALMIND_MODELS || [];
        if (models.length >= 2) {
          const shuffled = [...models].sort(() => Math.random() - 0.5);
          localStorage.setItem('battle.model.left', shuffled[0].model_id);
          localStorage.setItem('battle.model.right', shuffled[1].model_id);
          this.components.chatView.render();
        }
        return;
      }

      // Vote submission
      const voteBtn = e.target.closest('[data-action="vote"]');
      if (voteBtn) {
        const turnId = voteBtn.getAttribute('data-turn-id');
        const choice = voteBtn.getAttribute('data-vote');
        this.handleVoteSubmit(turnId, choice);
        return;
      }

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
    });

    // Chat submission
    document.addEventListener('chat-submit', (e) => {
      this.handleChatSubmit(e.detail);
    });

    // Battle vote submission
    document.addEventListener('vote-submit', (e) => {
      this.handleVoteSubmit(e.detail);
    });

    // Floating voting buttons - click handler
    document.addEventListener('click', (e) => {
      const voteBtn = e.target.closest('.vote-btn-light');
      if (voteBtn) {
        const vote = voteBtn.getAttribute('data-vote');
        const turnId = voteBtn.closest('#floating-voting')?.getAttribute('data-turn-id');
        if (vote && turnId) {
          this.handleFloatingVote(vote, turnId);
          this.applyVoteSelection(vote, turnId);
        }
      }
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

    // Web search toggle
    document.addEventListener('toggle-web-search', (e) => {
      this.state.webSearchEnabled = e.detail.active;
      console.log('Web search:', e.detail.active ? 'Enabled' : 'Disabled');
    });

    // Code mode toggle
    document.addEventListener('toggle-code-mode', (e) => {
      this.state.codeModeEnabled = e.detail.active;
      console.log('Code mode:', e.detail.active ? 'Enabled' : 'Disabled');
    });

    // Sidebar toggle - adjust main content
    document.addEventListener('sidebar-toggle', (e) => {
      this.adjustLayout(e.detail);
    });

    // Thread clicked - load thread messages
    document.addEventListener('thread-clicked', (e) => {
      this.loadThread(e.detail.threadId);
    });

    // User logout
    document.addEventListener('user-logout', () => {
      this.handleLogout();
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
  }

  handleNavigation(action) {
    console.log('Navigation:', action);

    switch (action) {
      case 'new-chat':
        this.startNewChat();
        break;
      case 'leaderboard':
        this.showLeaderboard();
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  handleChatSubmit(data) {
    if (!data?.message?.trim()) return;
    if (this.state.streaming) return; // no double-send

    console.log('Chat submitted:', data);

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

    // Show voting buttons immediately after prompt is submitted
    this.showFloatingVoting(turnId);

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
      console.log('📱 Backend not available, using mock responses');
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
      console.log('⚔️ Battle Mode: Forcing Random Models');
      model1 = null;
      model2 = null;
    }

    // Logic to handle Mixed Selection (One Specific vs Random) in Side-by-Side Mode
    // The backend requires BOTH models if selectionMode is manual (i.e. if ANY model is specified).
    // So if user picks "Llama 3" vs "Random", we must pick a random model for the empty slot here.
    if (this.state.backendAvailable && window._DUALMIND_MODELS?.length > 0) {
      if ((model1 && !model2) || (!model1 && model2)) {
        console.log('🎲 Mixed Selection: Auto-filling random model for empty slot');
        const models = window._DUALMIND_MODELS;

        if (!model1) {
          const randomM = models[Math.floor(Math.random() * models.length)];
          model1 = randomM.modelId;
        }

        if (!model2) {
          const randomM = models[Math.floor(Math.random() * models.length)];
          model2 = randomM.modelId;
        }
      }
    }

    // For Side-by-Side, look up real names
    let leftName = 'Model A';
    let rightName = 'Model B';

    if (model1 && window._DUALMIND_MODELS) {
      const m1 = window._DUALMIND_MODELS.find(m => m.modelId === model1);
      if (m1) leftName = m1.modelName;
    }

    if (model2 && window._DUALMIND_MODELS) {
      const m2 = window._DUALMIND_MODELS.find(m => m.modelId === model2);
      if (m2) rightName = m2.modelName;
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
        console.log('🔗 Updated comparisonId from backend:', resp.comparisonId);
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
    const model = pickModelPair().left;

    this.state.direct = [
      ...this.state.direct,
      { id: userId, role: 'user', text: prompt },
      { id: userId + 1, role: 'assistant', modelName: model.name, text: '' },
    ];

    this.state.streaming = true;
    this.components.chatInput.setLoading(true);
    this.renderChat();

    const reply = buildMockReply(prompt, model.name, 'balanced');
    const stream = streamText(reply, (chunk) => {
      // Update last assistant message text incrementally by re-rendering minimal
      const last = this.state.direct[this.state.direct.length - 1];
      last.text += chunk;
      // cheap render: only direct thread (small)
      this.renderChat();
    }, { minDelay: 10, maxDelay: 22, minChunk: 1, maxChunk: 4 });

    this._activeStreams = [stream];
    await stream.promise;
    this._activeStreams = [];
    this.state.streaming = false;
    this.components.chatInput.setLoading(false);
    this.renderChat();
  }

  async runDirectApi(prompt) {
    // If backend is not available, fall back to mock responses
    if (!this.state.backendAvailable) {
      console.log('📱 Backend not available, using mock responses');
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
    this.state.direct = [
      ...this.state.direct,
      { id: userId, role: 'user', text: prompt },
      { id: userId + 1, role: 'assistant', modelName: displayModelName, text: '…' },
    ];

    this.state.streaming = true;
    this.components.chatInput.setLoading(true);
    this.renderChat();

    try {
      const authUserId = this.state.user?.id || null;
      const resp = await this.api.arena.chat(prompt, {
        model: selectedModelId,
        threadId: this.state.currentThreadId,
        userId: authUserId
      });
      const last = this.state.direct[this.state.direct.length - 1];

      // Update model name if backend provides it, otherwise keep optimistic
      if (resp?.model) {
        last.modelName = resp.model.displayName || resp.model.name || last.modelName;
      } else if (resp?.modelId) {
        // If backend returns only ID, lookup name again
        const m = window._DUALMIND_MODELS?.find(x => x.modelId === resp.modelId);
        if (m) last.modelName = m.modelName;
      }

      last.text = resp?.message || resp?.text || '';
    } catch (err) {
      const msg = err?.message || 'API request failed';
      console.warn('API request failed, falling back to mock responses:', msg);

      // Fall back to mock responses
      this.state.direct = this.state.direct.slice(0, -2); // Remove the failed messages
      // If backend is not available, fall back to mock responses
      if (!this.state.backendAvailable) {
        console.log('📱 Backend not available, using mock responses');
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
    console.log('✅ Voting UI shown for turn:', turnId);
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
    const turn = this.state.turns.find(t => t.id === turnId);
    if (!turn || turn.voteStatus === 'submitted') {
      console.warn('Turn not found or already voted');
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
      this.renderChat(true);

      // 🚨 CORRECTED: Send voteChoice enum, NOT model names
      await this.api.arena.submitVote({
        comparisonId: turn.comparisonId,
        voteChoice: voteChoice, // 'left' | 'right' | 'tie' | 'both-bad'
        userId: this.state.user?.id
      });

      // Keep both responses visible for 10 seconds after voting
      turn.voteStatus = 'vote-delay';
      this.hideFloatingVoting();
      this.renderChat(true);

      console.log('✅ Vote submitted:', voteChoice, '- keeping both visible for 2s');

      // After 10 seconds, transition to showing only voted response
      setTimeout(() => {
        turn.voteStatus = 'submitted';
        this.renderChat(true);
        console.log('✅ Vote transition complete - showing voted response only');
      }, 2000);

      // Refresh leaderboard if open
      if (this.leaderboard?.isOpen?.()) {
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
   * Handle text-to-speech for AI responses
   */
  async handleTextToSpeech(text, buttonElement) {
    if (!text || !text.trim()) return;

    // Show loading state
    const originalContent = buttonElement.innerHTML;
    buttonElement.innerHTML = '⏳';
    buttonElement.disabled = true;

    try {
      // Get audio blob from TTS API
      const audioBlob = await this.api.arena.textToSpeech(text.trim());

      // Create audio URL and play
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Update button while playing
      buttonElement.innerHTML = '🔇';

      audio.onended = () => {
        buttonElement.innerHTML = originalContent;
        buttonElement.disabled = false;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        buttonElement.innerHTML = originalContent;
        buttonElement.disabled = false;
        URL.revokeObjectURL(audioUrl);
        alert('Failed to play audio');
      };

      await audio.play();
    } catch (error) {
      // Reset button state
      buttonElement.innerHTML = originalContent;
      buttonElement.disabled = false;
      console.warn('Backend TTS failed, falling back to browser API:', error);

      // Fallback to Browser Speech API
      try {
        const utterance = new SpeechSynthesisUtterance(text.trim());
        // Optional: Try to pick a decent voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Samantha')));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => { buttonElement.innerHTML = '🔇'; };
        utterance.onend = () => { buttonElement.innerHTML = originalContent; buttonElement.disabled = false; };
        utterance.onerror = () => { buttonElement.innerHTML = originalContent; buttonElement.disabled = false; };

        window.speechSynthesis.speak(utterance);
      } catch (browserError) {
        console.error('Browser TTS also failed:', browserError);
        buttonElement.innerHTML = originalContent;
        buttonElement.disabled = false;
        alert('Text-to-speech failed completely.');
      }
    }
  }

  async syncUserWithBackend() {
    if (!this.state.backendAvailable || !this.state.user) return;

    try {
      console.log('🔄 Syncing user with backend...');

      // Prepare user data for backend
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

      // Call backend to sync/create user
      await this.api.users.syncUser(userData);
      console.log('✅ User synced with backend:', userData.email);
    } catch (error) {
      console.warn('⚠️ Failed to sync user with backend:', error);
      // Don't block the app, just continue
    }
  }

  async createThread(firstMessage) {
    if (!this.state.backendAvailable) return;

    const title = firstMessage.length > 40
      ? firstMessage.substring(0, 40) + '...'
      : firstMessage;

    try {
      const userId = this.state.user?.id || null;
      const result = await this.api.threads.createThread(title, userId);
      this.state.currentThreadId = result?.threadId || result?.id || null;
      console.log('✅ Thread created:', this.state.currentThreadId);

      // Add to sidebar with real UUID
      if (this.state.currentThreadId) {
        this.components.sidebar.addRecentChat({
          id: this.state.currentThreadId,
          title: title
        });

        // Let Sidebar (and others) refresh from source-of-truth
        document.dispatchEvent(new CustomEvent('threads-changed', {
          detail: { reason: 'thread-created', threadId: this.state.currentThreadId }
        }));
      }
    } catch (error) {
      // If user doesn't exist in database, try to sync and retry once
      if (error.message?.includes('user_id') && error.message?.includes('not present in table')) {
        console.log('🔄 User not in database, syncing and retrying...');
        await this.syncUserWithBackend();

        // Retry thread creation
        try {
          const userId = this.state.user?.id || null;
          const result = await this.api.threads.createThread(title, userId);
          this.state.currentThreadId = result?.threadId || result?.id || null;
          console.log('✅ Thread created on retry:', this.state.currentThreadId);

          if (this.state.currentThreadId) {
            this.components.sidebar.addRecentChat({
              id: this.state.currentThreadId,
              title: title
            });

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
      console.log(`✅ Loaded ${messages.length} messages from thread`);
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      this.components.chatInput.setLoading(false);
    }
  }

  startNewChat() {
    this.cancelStreams();
    this.state.turns = [];
    this.state.direct = [];
    this.state.currentThreadId = null; // Clear thread for new chat
    this.components.chatInput.clear();
    this.components.chatInput.focus();
    this.renderChat();
    console.log('Started new chat');
  }

  showLeaderboard() {
    console.log('Showing leaderboard...');
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
          wrapper.style.marginLeft = state.isCollapsed
            ? 'calc(var(--sidebar-collapsed-width) / 2)'
            : (state.isOpen ? 'calc(var(--sidebar-width) / 2)' : '0');
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
    console.log('🔄 Resetting vote state for new comparison');

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

    console.log('✅ Vote state reset complete');
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

  async handleFloatingVote(vote, turnId) {
    console.log(`📝 handleFloatingVote called: vote=${vote}, turnId=${turnId}`);
    const turn = this.state.turns.find(t => String(t.id) === String(turnId));
    if (!turn) {
      console.warn('❌ Turn not found:', turnId);
      return;
    }

    // Don't allow voting until both responses have finished
    if (turn.left?.streaming || turn.right?.streaming) {
      console.warn('⏳ Cannot vote while responses are streaming');
      return;
    }

    // Hide voting buttons immediately
    this.hideFloatingVoting();
    console.log('🗳️ Voting UI hidden');

    // Update turn state
    turn.voteStatus = 'submitting';
    turn.voteChoice = vote;
    console.log('📊 Turn state updated:', { voteStatus: turn.voteStatus, voteChoice: turn.voteChoice });

    try {
      // Ensure we have a comparisonId
      if (!turn.comparisonId) {
        throw new Error('No comparison ID available for this turn');
      }

      // ✅ CORRECTED API CALL: Use object with voteChoice enum
      await this.api.submitVote({
        comparisonId: turn.comparisonId,
        voteChoice: vote, // 'left' | 'right' | 'tie' | 'both-bad'
        userId: this.state.user?.id
      });

      turn.voteStatus = 'submitted';
      turn.voteMessage = 'Vote recorded. Thanks!';
      console.log('✅ Vote submitted successfully');

      // Refresh leaderboard if open
      if (this.leaderboard?.isOpen?.()) {
        this.leaderboard.load({ force: true });
      }
    } catch (err) {
      console.error('❌ Vote submission failed:', err);
      turn.voteStatus = 'error';
      turn.voteMessage = 'Failed to submit vote: ' + (err.message || 'Unknown error');
    }

    // CRITICAL: Re-render to reveal model names
    // After voting, voteStatus = 'submitted' which triggers ChatView to show real names
    console.log('🔄 Re-rendering chat to reveal model names...');
    this.renderChat(true);
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
window.LMArena = app;
window._APP = app;

export default app;

