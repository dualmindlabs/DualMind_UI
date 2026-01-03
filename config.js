window.DUALMIND_CONFIG = window.DUALMIND_CONFIG || {};

// ========== BACKEND URL CONFIGURATION ==========
// 👇 CHANGE THIS TO SWITCH BETWEEN LOCALHOST AND PRODUCTION 👇

// Set to 'localhost' for local testing, 'production' for hosted version
const BACKEND_MODE = 'production'; // Options: 'localhost' | 'production'

// Backend URLs - Configure your URLs here
const BACKEND_URLS = {
  localhost: 'http://localhost:65476',        // Local development
  production: 'https://api.dualmindlab.tech'  // Production server
};

// Get the backend URL based on mode
const getBackendUrl = () => {
  // Priority 1: Explicit override (if set before config loads)
  if (window.DUALMIND_API_URL) {
    return window.DUALMIND_API_URL;
  }
  
  // Priority 2: Meta tag (if set in HTML)
  const metaApiUrl = document.querySelector('meta[name="api-url"]')?.content;
  if (metaApiUrl) {
    return metaApiUrl;
  }
  
  // Priority 3: Use BACKEND_MODE setting
  const mode = BACKEND_MODE.toLowerCase();
  if (BACKEND_URLS[mode]) {
    return BACKEND_URLS[mode];
  }
  
  // Priority 4: Auto-detect based on hostname
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return BACKEND_URLS.localhost;
  } else {
    return BACKEND_URLS.production;
  }
};

// Set the server URL
window.DUALMIND_CONFIG.serverUrl = window.DUALMIND_CONFIG.serverUrl || getBackendUrl();
window.DUALMIND_CONFIG.siteUrl = window.DUALMIND_CONFIG.siteUrl || window.location.origin;

// ========== Speed & Performance Settings ==========

// Streaming Configuration
window.DUALMIND_CONFIG.streaming = window.DUALMIND_CONFIG.streaming || {};
window.DUALMIND_CONFIG.streaming.enabled = true; // Streaming always enabled
window.DUALMIND_CONFIG.streaming.chunkDelay = window.DUALMIND_CONFIG.streaming.chunkDelay || 50; // Optimized for smooth streaming
window.DUALMIND_CONFIG.streaming.maxChunkSize = window.DUALMIND_CONFIG.streaming.maxChunkSize || 10; // Characters per chunk
window.DUALMIND_CONFIG.streaming.smoothScrolling = window.DUALMIND_CONFIG.streaming.smoothScrolling !== false; // Default: true

// API Timeouts & Performance
window.DUALMIND_CONFIG.api = window.DUALMIND_CONFIG.api || {};
window.DUALMIND_CONFIG.api.timeout = window.DUALMIND_CONFIG.api.timeout || 30000; // 30 seconds default
window.DUALMIND_CONFIG.api.retryAttempts = window.DUALMIND_CONFIG.api.retryAttempts || 2;
window.DUALMIND_CONFIG.api.retryDelay = window.DUALMIND_CONFIG.api.retryDelay || 1000; // 1 second base delay
window.DUALMIND_CONFIG.api.healthCheckInterval = window.DUALMIND_CONFIG.api.healthCheckInterval || 30000; // 30 seconds

// Model Performance Settings
window.DUALMIND_CONFIG.models = window.DUALMIND_CONFIG.models || {};
window.DUALMIND_CONFIG.models.defaultModel = window.DUALMIND_CONFIG.models.defaultModel || 'llama-3.1-8b-instant';
window.DUALMIND_CONFIG.models.preferredProvider = window.DUALMIND_CONFIG.models.preferredProvider || 'auto'; // 'auto', 'groq', 'openai', etc.
window.DUALMIND_CONFIG.models.maxTokens = window.DUALMIND_CONFIG.models.maxTokens || 4096;
window.DUALMIND_CONFIG.models.temperature = window.DUALMIND_CONFIG.models.temperature || 0.7;
window.DUALMIND_CONFIG.models.speedPriority = window.DUALMIND_CONFIG.models.speedPriority || 'balanced'; // 'speed', 'balanced', 'quality'

// UI Performance Settings
window.DUALMIND_CONFIG.ui = window.DUALMIND_CONFIG.ui || {};
window.DUALMIND_CONFIG.ui.autoResizeTextarea = window.DUALMIND_CONFIG.ui.autoResizeTextarea !== false; // Default: true
window.DUALMIND_CONFIG.ui.maxTextareaHeight = window.DUALMIND_CONFIG.ui.maxTextareaHeight || 180; // pixels
window.DUALMIND_CONFIG.ui.typingIndicatorDelay = window.DUALMIND_CONFIG.ui.typingIndicatorDelay || 300; // ms
window.DUALMIND_CONFIG.ui.scrollBehavior = window.DUALMIND_CONFIG.ui.scrollBehavior || 'smooth'; // 'smooth', 'auto'

// Caching & Performance
window.DUALMIND_CONFIG.cache = window.DUALMIND_CONFIG.cache || {};
window.DUALMIND_CONFIG.cache.leaderboardExpiry = window.DUALMIND_CONFIG.cache.leaderboardExpiry || 300000; // 5 minutes
window.DUALMIND_CONFIG.cache.modelListExpiry = window.DUALMIND_CONFIG.cache.modelListExpiry || 3600000; // 1 hour
window.DUALMIND_CONFIG.cache.threadExpiry = window.DUALMIND_CONFIG.cache.threadExpiry || 1800000; // 30 minutes

// Debug & Development
window.DUALMIND_CONFIG.debug = window.DUALMIND_CONFIG.debug || {};
window.DUALMIND_CONFIG.debug.enabled = window.DUALMIND_CONFIG.debug.enabled || false;
window.DUALMIND_CONFIG.debug.logApiCalls = window.DUALMIND_CONFIG.debug.logApiCalls || false;
window.DUALMIND_CONFIG.debug.showPerformanceMetrics = window.DUALMIND_CONFIG.debug.showPerformanceMetrics || false;

// Feature Flags
window.DUALMIND_CONFIG.features = window.DUALMIND_CONFIG.features || {};
window.DUALMIND_CONFIG.features.streaming = window.DUALMIND_CONFIG.features.streaming !== false; // Default: true
window.DUALMIND_CONFIG.features.voting = window.DUALMIND_CONFIG.features.voting !== false; // Default: true
window.DUALMIND_CONFIG.features.threads = window.DUALMIND_CONFIG.features.threads !== false; // Default: true
window.DUALMIND_CONFIG.features.leaderboard = window.DUALMIND_CONFIG.features.leaderboard !== false; // Default: true

// Speed Presets (for quick configuration)
window.DUALMIND_CONFIG.presets = {
  fast: {
    streaming: { chunkDelay: 25, maxChunkSize: 5 },
    api: { timeout: 15000 },
    models: { speedPriority: 'speed' }
  },
  balanced: {
    streaming: { chunkDelay: 50, maxChunkSize: 8 },
    api: { timeout: 30000 },
    models: { speedPriority: 'balanced' }
  },
  quality: {
    streaming: { chunkDelay: 100, maxChunkSize: 15 },
    api: { timeout: 60000 },
    models: { speedPriority: 'quality' }
  }
};

// Apply preset if specified
if (window.DUALMIND_CONFIG.speedPreset) {
  const preset = window.DUALMIND_CONFIG.presets[window.DUALMIND_CONFIG.speedPreset];
  if (preset) {
    Object.assign(window.DUALMIND_CONFIG.streaming, preset.streaming);
    Object.assign(window.DUALMIND_CONFIG.api, preset.api);
    Object.assign(window.DUALMIND_CONFIG.models, preset.models);
  }
}
