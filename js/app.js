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
// import authService from './auth.js'; // OLD - Remove this

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
      backendAvailable: false // Track if backend is available
    };
    this._activeStreams = [];
    // this.auth = authService; // OLD - Remove this
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
    const isLoggedIn = window.DualMindAuth?.isLoggedIn() ?? false;
    
    if (!isLoggedIn) {
      const isGuest = localStorage.getItem('dualmind.guest') === 'true';
      if (!isGuest) {
        window.location.href = 'login.html';
        return;
      }
    }

    this.state.user = window.DualMindAuth?.getUser() ?? null;
    await this.checkBackendAvailability();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  async checkBackendAvailability() {
    if (window.DUALMIND_CONFIG?.offline?.enabled === false) {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        this.state.backendAvailable = response.ok;
        console.log('Backend available:', this.state.backendAvailable);
      } catch (error) {
        this.state.backendAvailable = false;
        console.log('Backend not available, running in offline mode');
      }
    } else {
      this.state.backendAvailable = false;
      console.log('Running in offline mode (no backend check)');
    }
    
    if (!this.state.backendAvailable) {
      this.state.apiEnabled = true;
    }
  }

  setup() {
    this.components.sidebar = new Sidebar('sidebar-container');
    this.components.header = new Header('header-container');
    this.components.chatInput = new ChatInput('chat-input-container');
    this.components.chatView = new ChatView('main-content');

    if (this.state.backendAvailable) {
      this.leaderboard = new LeaderboardModal({
        api: this.api,
        isApiEnabled: () => !!this.state.apiEnabled,
      });
    } else {
      console.log('Leaderboard disabled - backend not available');
    }
    
    this.attachGlobalListeners();
    this.adjustLayout();
    
    console.log('DualMind App Initialized');
    console.log('Backend available:', this.state.backendAvailable ? 'Yes' : 'No (Offline mode)');

    if (!this.state.backendAvailable && window.DUALMIND_CONFIG?.offline?.showOfflineIndicator) {
      this.showOfflineIndicator();
    }

    this.renderChat();
  }

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
        OFFLINE MODE - Using demo responses
      </div>
    `;
    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.parentNode?.removeChild?.(indicator);
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
    // Prefer real backend when API is enabled (gives comparisonId needed for voting).
    if (this.state.apiEnabled) {
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
      const resp = await this.api.dualChat(prompt, { selectionMode: 'random' });

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
      const resp = await this.api.chat(prompt, { model: 'auto' });
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

  startNewChat() {
    this.cancelStreams();
    this.state.turns = [];
    this.state.direct = [];
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

  handleLogout() {
    this.auth.logout();
    window.location.href = 'login.html';
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

