/**
 * DualMind - Main Application
 * Component orchestration and event handling with authentication
 */

import { Sidebar } from '../components/Sidebar.js';
import { Header } from '../components/Header.js';
import { ChatInput } from '../components/ChatInput.js';
import { ChatView } from '../components/chat/ChatView.js';
import { pickModelPair, buildMockReply, streamText } from './mockArena.js';
import { DualMindApiClient, getApiBaseUrl } from './apiClient.js';
import { LeaderboardModal } from './leaderboardModal.js';

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
    this._backendHealthFailures = 0;
    this._activeStreams = [];
    this.api = new DualMindApiClient({
      baseUrl: getApiBaseUrl(),
      getAuthToken: () => this.getAuthToken()
    });
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

  /**
   * Get auth token from Supabase auth
   */
  async getAuthToken() {
    try {
      // Try to get from Supabase auth first
      if (window.DualMindAuth && window.DualMindAuth.isLoggedIn()) {
        return await window.DualMindAuth.getAccessToken();
      }

      // Fallback to stored token
      const storedToken = localStorage.getItem('dualmind.auth.token');
      return storedToken;
    } catch (error) {
      console.warn('Could not get auth token:', error);
      return null;
    }
  }

  async init() {
    // 🚨 CRITICAL: Wait for Supabase auth to fully initialize
    if (window.DualMindAuthReady) {
      await window.DualMindAuthReady;
      console.log('✅ Auth initialization complete');
    }

    // Check authentication with Supabase
    const isLoggedIn = window.DualMindAuth ? window.DualMindAuth.isLoggedIn() : false;
    console.log('🔍 Auth check - isLoggedIn:', isLoggedIn);
    console.log('🔍 Auth object available:', !!window.DualMindAuth);
    console.log('🔍 Supabase auth available:', !!window._DUALMIND_AUTH);

    if (!isLoggedIn) {
      // Check if guest mode is enabled
      const guestMode = localStorage.getItem('dualmind.guest');

      // Only redirect to login if guest mode is explicitly disabled
      if (guestMode !== 'true') {
        const currentPath = window.location.pathname;
        console.log('🔄 Redirecting to login:', currentPath);
        window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
        return;
      }

      console.log('🔍 Running in guest mode');
    }

    // Set user info
    this.state.user = window.DualMindAuth ? window.DualMindAuth.getUser() : null;
    console.log('✅ User authenticated:', this.state.user ? this.state.user.email : 'Guest');

    // 🚨 Hide loading overlay, show app
    const overlay = document.getElementById('auth-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    const app = document.getElementById('app');
    if (app) {
      app.style.display = 'block';
    }

    // Check if backend is available
    await this.checkBackendAvailability();

    // 🚨 NEW: Fetch models on startup
    await this.fetchModels();

    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * Check if backend server is available
   */
  async checkBackendAvailability() {
    // Skip backend check if offline mode is preferred
    if (window.DUALMIND_CONFIG?.offline?.enabled === false) {
      try {
        const baseUrl = getApiBaseUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        let ok = false;
        try {
          const res = await fetch(`${baseUrl}/api/health`, { method: 'GET', signal: controller.signal });
          ok = res.ok;
        } catch {
          ok = false;
        }

        if (!ok) {
          try {
            const res = await fetch(`${baseUrl}/health`, { method: 'GET', signal: controller.signal });
            ok = res.ok;
          } catch {
            ok = false;
          }
        }

        clearTimeout(timeoutId);

        if (ok) {
          this._backendHealthFailures = 0;
          this.state.backendAvailable = true;
          console.log('✅ Backend available');
          this.hideBackendUnavailableBanner();
          return;
        }

        this._backendHealthFailures += 1;
        if (this._backendHealthFailures >= 2) {
          this.state.backendAvailable = false;
          console.log('⚠️ Backend health check failed (consecutive), some features may be unavailable');
          this.showBackendUnavailableBanner();
        }
      } catch (error) {
        this._backendHealthFailures += 1;
        if (this._backendHealthFailures >= 2) {
          this.state.backendAvailable = false;
          console.log('⚠️ Backend not available (consecutive), some features may be unavailable');
          this.showBackendUnavailableBanner();
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
      const response = await this.api.getModels();
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

  setup() {
    // Expose app globally for components
    window._APP = this;

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

  renderChat() {
    const mode = this.state.currentMode;
    this.components.chatView.setState({
      mode,
      turns: this.state.turns,
      direct: this.state.direct,
      apiEnabled: this.state.apiEnabled,
    });
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
      this.components.chatView.appendToResponse(turnId, 'left', chunk, true);
    }, { minDelay: 10, maxDelay: 22, minChunk: 1, maxChunk: 4 });

    const rightStream = streamText(rightText, (chunk) => {
      // Persist into state so re-renders don't wipe streamed content
      turn.right.text += chunk;
      this.components.chatView.appendToResponse(turnId, 'right', chunk, true);
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
      const resp = await this.api.dualChat(prompt, {
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
      const resp = await this.api.chat(prompt, {
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

    container.innerHTML = `
      <button class="vote-btn-light" data-action="vote" data-turn-id="${turnId}" data-vote="left">
        👈 Left is Better
      </button>
      <button class="vote-btn-light" data-action="vote" data-turn-id="${turnId}" data-vote="tie">
        🤝 It's a Tie
      </button>
      <button class="vote-btn-light" data-action="vote" data-turn-id="${turnId}" data-vote="both-bad">
        👎 Both are Bad
      </button>
      <button class="vote-btn-light" data-action="vote" data-turn-id="${turnId}" data-vote="right">
        👉 Right is Better
      </button>
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
      this.renderChat();

      // 🚨 CORRECTED: Send voteChoice enum, NOT model names
      await this.api.submitVote({
        comparisonId: turn.comparisonId,
        voteChoice: voteChoice, // 'left' | 'right' | 'tie' | 'both-bad'
        userId: this.state.user?.id
      });

      turn.voteStatus = 'submitted';
      this.hideFloatingVoting();
      this.renderChat();

      console.log('✅ Vote submitted:', voteChoice);

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
      const audioBlob = await this.api.textToSpeech(text.trim());

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

  async createThread(firstMessage) {
    if (!this.state.backendAvailable) return;

    try {
      const title = firstMessage.length > 40
        ? firstMessage.substring(0, 40) + '...'
        : firstMessage;
      const userId = this.state.user?.id || null;
      const result = await this.api.createThread(title, userId);
      this.state.currentThreadId = result?.threadId || result?.id || null;
      console.log('✅ Thread created:', this.state.currentThreadId);

      // Add to sidebar with real UUID
      if (this.state.currentThreadId) {
        this.components.sidebar.addRecentChat({
          id: this.state.currentThreadId,
          title: title
        });
      }
    } catch (error) {
      console.warn('Failed to create thread:', error);
    }
  }

  async loadThread(threadId) {
    if (!this.state.backendAvailable) {
      this.state.currentThreadId = threadId;
      return;
    }

    try {
      this.components.chatInput.setLoading(true);
      const result = await this.api.getThreadMessages(threadId);
      const messages = result?.items || result || [];

      // Clear current chat
      this.cancelStreams();
      this.state.turns = [];
      this.state.direct = [];
      this.state.currentThreadId = threadId;

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
    this.leaderboard?.open?.();
  }

  adjustLayout(sidebarState = null) {
    const state = sidebarState || this.components.sidebar?.getState() || { isOpen: true, isMobile: false };

    const headerContainer = document.getElementById('header-container');
    const chatContainer = document.getElementById('chat-input-container');

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
      window.location.href = 'login/index.html';
    }
  }

  showFloatingVoting(turnId) {
    const votingContainer = document.getElementById('floating-voting');
    console.log('🗳️ showFloatingVoting called, turnId:', turnId);

    if (!votingContainer) {
      console.error('❌ Floating voting container not found!');
      return;
    }

    // Create voting bar with NO inline handlers (will attach after)
    votingContainer.innerHTML = `
      <div class="floating-vote-bar animate-pop-in" style="display: flex; gap: 10px; background: rgba(31, 41, 55, 0.95); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); padding: 16px 20px; border-radius: 16px; box-shadow: 0 20px 60px -15px rgba(0, 0, 0, 0.6), 0 10px 20px -10px rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.15); position: fixed; bottom: 140px; left: 50%; transform: translateX(-50%); z-index: 99999; pointer-events: auto; user-select: none;">
        <button id="vote-left-btn" class="vote-btn-light" data-vote="left" style="background: linear-gradient(135deg, #4aabc2 0%, #3a8ea0 100%); color: white; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; pointer-events: auto; box-shadow: 0 4px 12px rgba(74, 171, 194, 0.3);">
          ← 👈 Left
        </button>
        <button id="vote-tie-btn" class="vote-btn-light" data-vote="tie" style="background: linear-gradient(135deg, #fdf4cd 0%, #f0e5a0 100%); color: #1a1a2e; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; pointer-events: auto; box-shadow: 0 4px 12px rgba(253, 244, 205, 0.3);">
          🤝 Tie
        </button>
        <button id="vote-bad-btn" class="vote-btn-light" data-vote="both-bad" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; pointer-events: auto; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
          ❌ Both Bad
        </button>
        <button id="vote-right-btn" class="vote-btn-light" data-vote="right" style="background: linear-gradient(135deg, #cb9275 0%, #b87d5f 100%); color: white; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; pointer-events: auto; box-shadow: 0 4px 12px rgba(203, 146, 117, 0.3);">
          Right 👉 →
        </button>
      </div>
    `;

    votingContainer.hidden = false;
    votingContainer.setAttribute('data-turn-id', turnId);

    // CRITICAL: Attach event listeners AFTER HTML is inserted
    const attachVoteListener = (buttonId, voteChoice) => {
      const btn = document.getElementById(buttonId);
      if (btn) {
        // Remove any existing listeners first
        const clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);

        clone.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`🎯 Vote button clicked: ${voteChoice}, turnId: ${turnId}`);
          this.handleFloatingVote(voteChoice, turnId);
          this.applyVoteSelection(voteChoice, turnId);
        });

        // Hover effect
        clone.addEventListener('mouseenter', () => {
          clone.style.transform = 'scale(1.05)';
          clone.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
        });
        clone.addEventListener('mouseleave', () => {
          clone.style.transform = 'scale(1)';
          clone.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        });

        console.log(`✅ Listener attached to ${buttonId}`);
      } else {
        console.error(`❌ Button ${buttonId} not found!`);
      }
    };

    // Attach all listeners
    attachVoteListener('vote-left-btn', 'left');
    attachVoteListener('vote-tie-btn', 'tie');
    attachVoteListener('vote-bad-btn', 'both-bad');
    attachVoteListener('vote-right-btn', 'right');

    console.log('✅ Voting container shown and listeners attached');
  }

  hideFloatingVoting() {
    const votingContainer = document.getElementById('floating-voting');
    if (!votingContainer) return;

    votingContainer.hidden = true;
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
    this.renderChat();
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

