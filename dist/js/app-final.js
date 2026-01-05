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
      currentThreadId: null // Track current conversation thread
    };
    this._activeStreams = [];
    this.api = new DualMindApiClient({ 
      baseUrl: getApiBaseUrl(),
      getAuthToken: () => this.getAuthToken()
    });
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
    // Wait for DualMindAuth to be ready
    await this.waitForAuth();
    
    // Check authentication with Supabase
    const isLoggedIn = window.DualMindAuth ? window.DualMindAuth.isLoggedIn() : false;
    
    if (!isLoggedIn) {
      // Check if guest mode
      const isGuest = localStorage.getItem('dualmind.guest') === 'true';
      if (!isGuest) {
        // Redirect to login with current page as redirect target
        const currentPath = window.location.pathname;
        window.location.href = `login/index.html?redirect=${encodeURIComponent(currentPath)}`;
        return;
      }
    }

    // Set user info
    this.state.user = window.DualMindAuth ? window.DualMindAuth.getUser() : null;
    
    console.log('✅ User authenticated:', this.state.user ? this.state.user.email : 'Guest');
    
    // Check if backend is available
    await this.checkBackendAvailability();
    
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
        // First check basic health endpoint
        const healthResponse = await fetch('/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (healthResponse.ok) {
          // Health check passed, now test a real API endpoint for APP_SECRET issues
          try {
            const testResponse = await fetch('/api/arena/dualchat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: 'test',
                selectionMode: 'random'
              }),
              signal: AbortSignal.timeout(3000) // 3 second timeout for test
            });
            
            // If the API call succeeds or fails with a normal error (not APP_SECRET), backend is available
            const responseText = await testResponse.text();
            if (!responseText.includes('APP_SECRET') && !responseText.includes('EncryptionService')) {
              this.state.backendAvailable = true;
              console.log('✅ Backend available and fully functional');
              return;
            }
          } catch (apiError) {
            // If API call fails with APP_SECRET error, backend has config issues
            const errorMsg = apiError?.message || '';
            if (errorMsg.includes('APP_SECRET') || errorMsg.includes('EncryptionService')) {
              console.log('📱 Backend has configuration issues, running in offline mode');
              this.state.backendAvailable = false;
              this.state.apiEnabled = true; // Enable mock responses
              return;
            }
            
            // Other API errors mean backend is available but endpoint failed normally
            this.state.backendAvailable = true;
            console.log('✅ Backend available (API test failed but not APP_SECRET related)');
            return;
          }
        }
        
        // Health check failed
        this.state.backendAvailable = false;
        console.log('⚠️ Backend health check failed, running in offline mode');
      } catch (error) {
        this.state.backendAvailable = false;
        console.log('⚠️ Backend not available, running in offline mode');
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

  setup() {
    // Initialize components
    this.components.sidebar = new Sidebar('sidebar-container');
    this.components.header = new Header('header-container');
    this.components.chatInput = new ChatInput('chat-input-container');
    this.components.chatView = new ChatView('main-content');
    
    // Update sidebar with user info after initialization
    if (this.components.sidebar && this.components.sidebar.updateUserInfo) {
      this.components.sidebar.updateUserInfo();
    }

    // Leaderboard modal (only if backend is available)
    if (this.state.backendAvailable) {
      this.leaderboard = new LeaderboardModal({
        api: this.api,
        isApiEnabled: () => !!this.state.apiEnabled,
      });
    } else {
      console.log('📱 Leaderboard disabled - backend not available');
    }
    
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

    // Chat submission
    document.addEventListener('chat-submit', (e) => {
      this.handleChatSubmit(e.detail);
    });

    // Battle vote submission
    document.addEventListener('vote-submit', (e) => {
      this.handleVoteSubmit(e.detail);
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

    // Add to recent chats
    this.components.sidebar.addRecentChat({
      id: Date.now(),
      title: data.message.substring(0, 30) + (data.message.length > 30 ? '...' : '')
    });

    // Cancel any in-flight streams
    this.cancelStreams();

    const mode = this.state.currentMode;

    if (mode === 'direct') {
      this.runDirectDemo(data.message);
      return;
    }

    // Battle/Arena: 1 prompt -> 2 replies
    this.runArenaDemo(data.message);
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

  async runArenaDemo(prompt) {
    // Use mock responses if backend is not available OR API is disabled
    if (!this.state.backendAvailable || !this.state.apiEnabled) {
      // Use mock responses
    } else {
      // Backend is available and API is enabled - use real API
      return this.runArenaApi(prompt);
    }

    const turnId = Date.now();
    const { left, right } = pickModelPair();

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

    // Mark streaming false in state
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
    this.renderChat();
  }

  async runArenaApi(prompt) {
    // If backend is not available, fall back to mock responses
    if (!this.state.backendAvailable) {
      console.log('📱 Backend not available, using mock responses');
      return this.runArenaDemo(prompt);
    }

    // Auto-create thread on first message
    if (!this.state.currentThreadId && this.state.backendAvailable) {
      await this.createThread(prompt);
    }

    const turnId = Date.now();
    const turn = {
      id: turnId,
      prompt,
      comparisonId: null,
      left: { modelId: 'agent1', modelName: 'Agent 1', voteModelName: null, text: '…', streaming: true },
      right: { modelId: 'agent2', modelName: 'Agent 2', voteModelName: null, text: '…', streaming: true },
      voteStatus: 'idle', // idle | submitting | submitted | error
      voteChoice: null, // left | right | tie
      voteMessage: '',
    };

    this.state.turns = [...this.state.turns, turn];
    this.state.streaming = true;
    this.components.chatInput.setLoading(true);
    this.renderChat();

    try {
      const userId = this.state.user?.id || null;
      const resp = await this.api.dualChat(prompt, { 
        selectionMode: 'random',
        threadId: this.state.currentThreadId,
        userId: userId
      });

      const a1 = resp?.agent1;
      const a2 = resp?.agent2;

      turn.comparisonId = resp?.comparisonId || null;

      // Prefer displayName in UI, keep internal model name for the vote payload.
      turn.left.modelName = a1?.model?.displayName || a1?.model?.name || 'Agent 1';
      turn.left.voteModelName = a1?.model?.name || a1?.model?.displayName || null;
      turn.left.text = a1?.message || a1?.text || '';
      turn.left.streaming = false;

      turn.right.modelName = a2?.model?.displayName || a2?.model?.name || 'Agent 2';
      turn.right.voteModelName = a2?.model?.name || a2?.model?.displayName || null;
      turn.right.text = a2?.message || a2?.text || '';
      turn.right.streaming = false;

      this.state.streaming = false;
      this.components.chatInput.setLoading(false);
      this.renderChat();
    } catch (err) {
      const msg = err?.message || 'API request failed';
      console.warn('API request failed, falling back to mock responses:', msg);
      
      // Fall back to mock responses
      this.state.turns = this.state.turns.filter(t => t.id !== turnId); // Remove failed turn
      return this.runArenaDemo(prompt);
    }
  }

  async runDirectDemo(prompt) {
    if (this.state.apiEnabled) {
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
      return this.runDirectDemo(prompt);
    }

    // Auto-create thread on first message
    if (!this.state.currentThreadId && this.state.backendAvailable) {
      await this.createThread(prompt);
    }

    const userId = Date.now();
    this.state.direct = [
      ...this.state.direct,
      { id: userId, role: 'user', text: prompt },
      { id: userId + 1, role: 'assistant', modelName: 'Assistant', text: '…' },
    ];

    this.state.streaming = true;
    this.components.chatInput.setLoading(true);
    this.renderChat();

    try {
      const authUserId = this.state.user?.id || null;
      const resp = await this.api.chat(prompt, { 
        model: 'auto',
        threadId: this.state.currentThreadId,
        userId: authUserId
      });
      const last = this.state.direct[this.state.direct.length - 1];
      last.modelName = resp?.model?.displayName || resp?.model?.name || last.modelName;
      last.text = resp?.message || resp?.text || '';
    } catch (err) {
      const msg = err?.message || 'API request failed';
      console.warn('API request failed, falling back to mock responses:', msg);
      
      // Fall back to mock responses
      this.state.direct = this.state.direct.slice(0, -2); // Remove the failed messages
      return this.runDirectDemo(prompt);
    } finally {
      this.state.streaming = false;
      this.components.chatInput.setLoading(false);
      this.renderChat();
    }
  }

  async handleVoteSubmit({ turnId, choice } = {}) {
    const id = Number(turnId);
    if (!id || !choice) return;

    const turn = (this.state.turns || []).find((t) => t.id === id);
    if (!turn) return;
    if (turn.voteStatus === 'submitting' || turn.voteStatus === 'submitted') return;

    // Must have finished responses
    if (turn.left?.streaming || turn.right?.streaming) return;

    // Tie vote is local-only (backend requires WinnerModelName)
    if (choice === 'tie') {
      turn.voteChoice = 'tie';
      turn.voteStatus = 'submitted';
      turn.voteMessage = 'Tie recorded (not sent to leaderboard).';
      this.renderChat();
      return;
    }

    if (!this.state.apiEnabled) {
      turn.voteStatus = 'error';
      turn.voteMessage = 'Enable API to submit a vote.';
      this.renderChat();
      return;
    }

    const comparisonId = turn.comparisonId;
    if (!comparisonId) {
      turn.voteStatus = 'error';
      turn.voteMessage = 'Voting unavailable (missing comparisonId). Use API battle mode.';
      this.renderChat();
      return;
    }

    const winnerModelName =
      choice === 'left' ? (turn.left?.voteModelName || turn.left?.modelName) :
      choice === 'right' ? (turn.right?.voteModelName || turn.right?.modelName) :
      null;

    if (!winnerModelName) {
      turn.voteStatus = 'error';
      turn.voteMessage = 'Vote failed (missing winner model name).';
      this.renderChat();
      return;
    }

    try {
      turn.voteStatus = 'submitting';
      turn.voteChoice = choice;
      turn.voteMessage = 'Submitting vote…';
      this.renderChat();

      await this.api.submitVote(comparisonId, winnerModelName);

      turn.voteStatus = 'submitted';
      turn.voteMessage = 'Vote recorded. Thanks!';
      this.renderChat();

      // If leaderboard is open, refresh it so the UI reflects new totals.
      if (this.leaderboard?.isOpen?.()) {
        this.leaderboard.load({ force: true });
      }
    } catch (err) {
      turn.voteStatus = 'error';
      turn.voteMessage = `Vote failed: ${err?.message || 'Unknown error'}`;
      this.renderChat();
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
    } catch (error) {
      console.warn('Failed to create thread:', error);
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
      const offset = state.isOpen ? 'var(--sidebar-width)' : '0';
      
      if (headerContainer) {
        headerContainer.style.left = offset;
      }
      
      if (chatContainer) {
        const wrapper = chatContainer.querySelector('.chat-input-wrapper');
        if (wrapper) {
          wrapper.style.marginLeft = state.isOpen ? 'calc(var(--sidebar-width) / 2)' : '0';
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
      this.components.sidebar.toggle();
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

// Expose to window for debugging
window.LMArena = app;

export default app;

