/* ==========================================================================
   Duel_mind Arena — Client-side interactions & API integration
   ========================================================================== */

// ========== DOM Elements ==========
const promptInput = document.getElementById('promptInput');
const promptWrap  = document.querySelector('.prompt-wrap');
const sendBtn     = document.getElementById('sendBtn');
const toast       = document.getElementById('toast');
const appRoot     = document.querySelector('.app');

// Arena (dual chat)
const arenaResults = document.getElementById('arenaResults');
const arenaGrid    = document.getElementById('arenaGrid');
const arenaVoting  = document.getElementById('arenaVoting');
const arenaFooter  = document.getElementById('arenaFooter');
const arenaFeedback = document.getElementById('arenaFeedback');

// Single chat
const chatResults  = document.getElementById('chatResults');
const chatMessages = document.getElementById('chatMessages');

// Threads
const threadList   = document.getElementById('threadList');
const newChatBtn   = document.getElementById('newChatBtn');

// Mode switcher
const viewSwitcherSpan = document.querySelector('#viewSwitcher span');
const crumbIcon = document.querySelector('.crumb > i');

const apiStatus = document.getElementById('apiStatus');

// Side-by-Side model picker
const modelPicker = document.getElementById('modelPicker');
const model1Select = document.getElementById('model1Select');
const model2Select = document.getElementById('model2Select');
const swapModelsBtn = document.getElementById('swapModelsBtn');
const modelPickerHint = document.getElementById('modelPickerHint');
const battleModeSelector = document.getElementById('battleModeSelector');
const topperModelBtn = document.getElementById('topperModelBtn');
const randomPairBtn = document.getElementById('randomPairBtn');

// ========== State ==========
let currentMode = 'battle'; // 'battle' | 'direct' | 'sidebyside'
let battleSelectionMode = 'random'; // 'random' | 'topper'
let currentThreadId = null;
let lastDualResponse = null; // Store for voting
let hasVoted = false;
let userWinner = null;
let canCreateThread = true;
let authListenerBound = false;
let isSending = false;
let isVoting = false;
const THREAD_ID_STORAGE_KEY = 'dualmind.threadId';
const LEADERBOARD_CACHE_KEY = 'dualmind.leaderboard.cache';

let lastRequest = null;

let apiIsOffline = false;
let lastApiOfflineToastAt = 0;

const MODEL1_STORAGE_KEY = 'dualmind.sidebyside.model1';
const MODEL2_STORAGE_KEY = 'dualmind.sidebyside.model2';
let availableModels = null;
let modelsLoadPromise = null;

let dualMindAPI = null;
let arena = null;

function initializeAPIService() {
  if (!window.DualMindAPIService) {
    console.error('DualMindAPIService not loaded');
    return;
  }
  const baseUrl = getApiBase();
  dualMindAPI = new window.DualMindAPIService(baseUrl, getSupabaseAccessToken);
  
  // Initialize Arena Mode
  if (window.ArenaMode) {
    arena = new window.ArenaMode(arenaGrid, arenaResults, arenaVoting, arenaFeedback);
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAPIService);
  } else {
    initializeAPIService();
  }
}

// ========== Utilities ==========
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
}

function getCachedLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.items) return null;
    
    // Use config for cache expiry
    const expiryMs = window.DUALMIND_CONFIG.cache?.leaderboardExpiry || (5 * 60 * 1000);
    if (Date.now() - parsed.timestamp > expiryMs) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function setCachedLeaderboard(items) {
  try {
    localStorage.setItem(
      LEADERBOARD_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), items })
    );
  } catch {
    // ignore storage errors
  }
}

function renderLeaderboardData(items) {
  if (!leaderboardContent) return false;
  if (!Array.isArray(items) || !items.length) {
    renderLeaderboardState({
      title: 'No stats yet',
      subtitle: 'Vote in Battle mode to populate the leaderboard.',
      actionLabel: 'Refresh'
    });
    return false;
  }

  const totals = items.reduce((acc, it) => {
    acc.wins += Number(it.totalWins || 0);
    acc.responses += Number(it.totalResponses || 0);
    return acc;
  }, { wins: 0, responses: 0 });

  leaderboardContent.innerHTML = `
    <div class="leaderboard-shell">
      <div class="leaderboard-top">
        <div class="leaderboard-top-left">
          <div class="leaderboard-title">Model Leaderboard</div>
          <div class="leaderboard-subtitle">${escapeHtml(String(items.length))} models · ${escapeHtml(String(totals.wins))} wins · ${escapeHtml(String(totals.responses))} responses</div>
        </div>
        <button class="leaderboard-refresh" type="button">
          <i class="ri-refresh-line"></i><span>Refresh</span>
        </button>
      </div>

      <div class="leaderboard-table-wrap">
        <table class="leaderboard-table leaderboard-table-premium">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Model</th>
              <th>Win rate</th>
              <th>Wins</th>
              <th>Responses</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => {
              const rank = i + 1;
              const modelName = item.modelName || 'Unknown';
              const provider = item.providerName || '';
              const winRate = Number(item.winRate || 0);
              const wins = Number(item.totalWins || 0);
              const responses = Number(item.totalResponses || 0);

              const medal = rank <= 3 ? ` rank-${rank}` : '';
              return `
                <tr class="leaderboard-row">
                  <td class="rank${medal}"><span class="rank-pill">#${rank}</span></td>
                  <td>
                    <div class="lb-model">
                      <div class="lb-model-name">${escapeHtml(modelName)}</div>
                      ${provider ? `<div class="lb-model-provider">${escapeHtml(provider)}</div>` : ''}
                    </div>
                  </td>
                  <td class="win-rate"><span class="win-pill">${escapeHtml(winRate.toFixed(1))}%</span></td>
                  <td class="stats">${escapeHtml(String(wins))}</td>
                  <td class="stats">${escapeHtml(String(responses))}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const refresh = leaderboardContent.querySelector('.leaderboard-refresh');
  if (refresh) refresh.addEventListener('click', () => loadLeaderboard());
  return true;
}

function renderArenaFeedback(message, tone = 'info') {
  if (!arenaFeedback) return;
  const msg = (message || '').trim();
  if (!msg) {
    arenaFeedback.hidden = true;
    arenaFeedback.textContent = '';
    arenaFeedback.className = 'arena-feedback';
    return;
  }
  arenaFeedback.hidden = false;
  arenaFeedback.textContent = msg;
  arenaFeedback.className = `arena-feedback ${tone ? `is-${tone}` : ''}`;
}

function setModelPickerHint(message) {
  if (!modelPickerHint) return;
  const msg = (message || '').trim();
  const isSideBySide = currentMode === 'sidebyside';
  if (!isSideBySide || !msg) {
    modelPickerHint.hidden = true;
    modelPickerHint.textContent = '';
    return;
  }
  modelPickerHint.hidden = false;
  modelPickerHint.textContent = msg;
}

async function copyToClipboard(text) {
  const value = (text || '').trim();
  if (!value) {
    showToast('Nothing to copy');
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      checkHealth();
      setInterval(checkHealth, window.DUALMIND_CONFIG.api?.healthCheckInterval || 30000);
      document.execCommand('copy');
      ta.remove();
    }
    showToast('Copied');
  } catch {
    showToast('Copy failed');
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getApiBase() {
  return (window.DUALMIND_API_BASE || 'http://localhost:65476').replace(/\/$/, '');
}

function setApiOfflineClass(isOffline) {
  document.documentElement.classList.toggle('api-offline', Boolean(isOffline));
}

function notifyApiOffline() {
  apiIsOffline = true;
  canCreateThread = false;
  setApiOfflineClass(true);
  document.querySelectorAll('.vote-btn').forEach((b) => {
    b.disabled = true;
  });
  renderArenaFeedback('Backend offline. Voting and leaderboard are unavailable.', 'warn');
  if (apiStatus) {
    apiStatus.classList.remove('is-online');
    apiStatus.classList.add('is-offline');
    const label = apiStatus.querySelector('.label');
    if (label) label.textContent = 'Offline';
    apiStatus.title = 'API offline';
  }
  const now = Date.now();
  if (now - lastApiOfflineToastAt > 3000) {
    lastApiOfflineToastAt = now;
    showToast('Backend offline (503). Start API server.');
  }
}

function notifyApiOnline() {
  apiIsOffline = false;
  canCreateThread = true;
  setApiOfflineClass(false);
  renderArenaFeedback('', '');
  if (lastDualResponse && !hasVoted && !isVoting) {
    document.querySelectorAll('.vote-btn').forEach((b) => {
      b.disabled = false;
    });
  }
  if (apiStatus) {
    apiStatus.classList.remove('is-offline');
    apiStatus.classList.add('is-online');
    const label = apiStatus.querySelector('.label');
    if (label) label.textContent = 'Online';
    apiStatus.title = 'API online';
  }
}

function renderThreadListState({ title, subtitle, actionLabel } = {}) {
  if (!threadList) return;
  const safeTitle = escapeHtml(title || '');
  const safeSubtitle = escapeHtml(subtitle || '');
  const action = actionLabel
    ? `<button class="navlink thread-retry" type="button"><i class="ri-refresh-line"></i><span>${escapeHtml(actionLabel)}</span></button>`
    : '';

  threadList.innerHTML = `
    <div class="thread-empty">
      <div class="thread-empty-body">
        <div class="thread-empty-title">${safeTitle}</div>
        ${safeSubtitle ? `<div class="thread-empty-subtitle">${safeSubtitle}</div>` : ''}
      </div>
      ${action}
    </div>
  `;

  const retry = threadList.querySelector('.thread-retry');
  if (retry) {
    retry.addEventListener('click', () => {
      loadThreads();
    });
  }
}

async function getSupabaseAccessToken() {
  const client = window.supabaseClient;
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session?.access_token || null;
}

async function getCurrentUserId() {
  const client = window.supabaseClient;
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session?.user?.id || null;
}

async function apiCall(endpoint, method = 'GET', body = null, extraFetchOpts = {}) {
  const token = await getSupabaseAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const { timeoutMs, ...fetchOpts } = extraFetchOpts || {};
  const controller = timeoutMs ? new AbortController() : null;
  const options = { method, headers, ...fetchOpts };
  if (controller) options.signal = controller.signal;
  if (body) options.body = JSON.stringify(body);

  let timeoutId;
  if (controller && timeoutMs) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  // Debug logging if enabled
  if (window.DUALMIND_CONFIG?.debug?.logApiCalls) {
    console.log(`API ${method} ${endpoint}`, { body, timeoutMs });
  }

  let res;
  let json = {};
  try {
    res = await fetch(`${getApiBase()}${endpoint}`, options);
    json = await res.json().catch(() => ({}));
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId);
    notifyApiOffline();
    const err = new Error(e?.name === 'AbortError' ? 'Request timed out' : 'API unreachable');
    err.status = 0;
    err.cause = e;
    throw err;
  }

  if (timeoutId) clearTimeout(timeoutId);

  // If we got an HTTP response, the API is reachable.
  // (503/500/etc. are server-side errors, not offline.)
  notifyApiOnline();
  
  if (!res.ok) {
    const message =
      json?.error ||
      json?.message ||
      json?.Message ||
      json?.error_description ||
      json?.details ||
      json?.Details ||
      `API error (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function retryLastRequest() {
  if (!lastRequest?.prompt) {
    showToast('Nothing to retry');
    return;
  }
  if (apiIsOffline) {
    notifyApiOffline();
    return;
  }

  const token = await getSupabaseAccessToken();
  if (!token) {
    showToast('Login required');
    return;
  }

  if (!promptInput || !sendBtn) {
    if (lastRequest.kind === 'single') {
      await sendSingleChat(lastRequest.prompt);
    } else {
      await sendDualChat(lastRequest.prompt);
    }
    return;
  }

  promptInput.value = lastRequest.prompt;
  sendBtn.disabled = false;
  handleSend();
}

function setSelectMessage(selectEl, message) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="">${escapeHtml(message)}</option>`;
  selectEl.value = '';
}

function getModelOptionText(model) {
  const name = model?.displayName || model?.modelName || '';
  const provider = (model?.providerName || '').trim();
  return provider ? `${name} · ${provider}` : name;
}

function populateModelSelect(selectEl, models, selectedValue) {
  if (!selectEl) return;
  const options = (models || []).map((m) => {
    const modelName = m?.modelName || '';
    return `<option value="${escapeHtml(modelName)}">${escapeHtml(getModelOptionText(m) || modelName)}</option>`;
  }).join('');

  selectEl.innerHTML = `<option value="">Select a model…</option>${options}`;
  if (selectedValue) selectEl.value = selectedValue;
}

function resolveSavedModelPair(models) {
  const list = Array.isArray(models) ? models : [];
  const names = list.map((m) => m?.modelName).filter(Boolean);

  const saved1 = localStorage.getItem(MODEL1_STORAGE_KEY) || '';
  const saved2 = localStorage.getItem(MODEL2_STORAGE_KEY) || '';

  let model1 = names.includes(saved1) ? saved1 : (names[0] || '');
  let model2 = names.includes(saved2) ? saved2 : (names.find((n) => n !== model1) || '');

  if (model1 && model2 && model1 === model2) {
    model2 = names.find((n) => n !== model1) || '';
  }

  if (model1) localStorage.setItem(MODEL1_STORAGE_KEY, model1);
  if (model2) localStorage.setItem(MODEL2_STORAGE_KEY, model2);
  return { model1, model2 };
}

function populateModelSelects(models) {
  const list = Array.isArray(models) ? models : [];
  if (!model1Select || !model2Select) return;

  if (list.length < 2) {
    const msg = list.length ? 'Need at least 2 models' : 'No models available';
    setSelectMessage(model1Select, msg);
    setSelectMessage(model2Select, msg);
    model1Select.disabled = true;
    model2Select.disabled = true;
    swapModelsBtn && (swapModelsBtn.disabled = true);
    return;
  }

  const { model1, model2 } = resolveSavedModelPair(list);
  populateModelSelect(model1Select, list, model1);
  populateModelSelect(model2Select, list, model2);

  model1Select.disabled = false;
  model2Select.disabled = false;
  swapModelsBtn && (swapModelsBtn.disabled = false);
}

function updateModelPickerVisibility() {
  if (!modelPicker) return;
  const isSideBySide = currentMode === 'sidebyside';
  const isBattle = currentMode === 'battle';
  
  // Model picker only in side-by-side
  modelPicker.hidden = !isSideBySide;
  
  // Battle mode selector only in battle mode
  battleModeSelector && (battleModeSelector.hidden = !isBattle);

  if (!isSideBySide) {
    setModelPickerHint('');
    model1Select && (model1Select.disabled = true);
    model2Select && (model2Select.disabled = true);
    swapModelsBtn && (swapModelsBtn.disabled = true);
    return;
  }

  if (Array.isArray(availableModels) && availableModels.length >= 2) {
    model1Select && (model1Select.disabled = false);
    model2Select && (model2Select.disabled = false);
    swapModelsBtn && (swapModelsBtn.disabled = false);
  }
}

// Ensure correct visibility on initial load
updateModelPickerVisibility();

// Battle mode selection handlers
function setBattleSelectionMode(mode) {
  battleSelectionMode = mode;
  if (topperModelBtn) {
    topperModelBtn.classList.toggle('active', mode === 'topper');
  }
  if (randomPairBtn) {
    randomPairBtn.classList.toggle('active', mode === 'random');
  }
}

if (topperModelBtn) {
  topperModelBtn.addEventListener('click', () => setBattleSelectionMode('topper'));
}

if (randomPairBtn) {
  randomPairBtn.addEventListener('click', () => setBattleSelectionMode('random'));
}

async function loadModels(force = false) {
  if (!model1Select || !model2Select) return null;
  if (modelsLoadPromise) return modelsLoadPromise;

  modelsLoadPromise = (async () => {
    const token = await getSupabaseAccessToken();
    if (!token) {
      availableModels = null;
      setSelectMessage(model1Select, 'Login to load models');
      setSelectMessage(model2Select, 'Login to load models');
      setModelPickerHint('Login required to load models for Side by Side.');
      model1Select.disabled = true;
      model2Select.disabled = true;
      swapModelsBtn && (swapModelsBtn.disabled = true);
      updateModelPickerVisibility();
      return null;
    }

    if (apiIsOffline) {
      availableModels = null;
      setSelectMessage(model1Select, 'Backend offline');
      setSelectMessage(model2Select, 'Backend offline');
      setModelPickerHint('Backend offline. Start the API server to load models.');
      model1Select.disabled = true;
      model2Select.disabled = true;
      swapModelsBtn && (swapModelsBtn.disabled = true);
      updateModelPickerVisibility();
      return null;
    }

    if (!force && Array.isArray(availableModels) && availableModels.length) {
      populateModelSelects(availableModels);
      updateModelPickerVisibility();
      return availableModels;
    }

    try {
      setSelectMessage(model1Select, 'Loading models…');
      setSelectMessage(model2Select, 'Loading models…');
      setModelPickerHint('Pick two different models to compare.');
      model1Select.disabled = true;
      model2Select.disabled = true;
      swapModelsBtn && (swapModelsBtn.disabled = true);

      availableModels = await dualMindAPI.getModels();
      populateModelSelects(availableModels);
      updateModelPickerVisibility();
      setModelPickerHint('Pick two different models to compare.');
      return availableModels;
    } catch (e) {
      availableModels = null;
      if (e?.status === 503 || e?.status === 0) {
        notifyApiOffline();
        setSelectMessage(model1Select, 'Backend offline');
        setSelectMessage(model2Select, 'Backend offline');
        setModelPickerHint('Backend offline. Start the API server to load models.');
      } else {
        setSelectMessage(model1Select, 'Failed to load models');
        setSelectMessage(model2Select, 'Failed to load models');
        setModelPickerHint('Could not load models. Try again later.');
        console.error('Failed to load models:', e);
      }
      model1Select.disabled = true;
      model2Select.disabled = true;
      swapModelsBtn && (swapModelsBtn.disabled = true);
      updateModelPickerVisibility();
      return null;
    }
  })();

  try {
    return await modelsLoadPromise;
  } finally {
    modelsLoadPromise = null;
  }
}

if (model1Select) {
  model1Select.addEventListener('change', () => {
    localStorage.setItem(MODEL1_STORAGE_KEY, model1Select.value || '');
  });
}

if (model2Select) {
  model2Select.addEventListener('change', () => {
    localStorage.setItem(MODEL2_STORAGE_KEY, model2Select.value || '');
  });
}

if (swapModelsBtn && model1Select && model2Select) {
  swapModelsBtn.addEventListener('click', () => {
    const a = model1Select.value;
    const b = model2Select.value;
    model1Select.value = b;
    model2Select.value = a;
    localStorage.setItem(MODEL1_STORAGE_KEY, model1Select.value || '');
    localStorage.setItem(MODEL2_STORAGE_KEY, model2Select.value || '');
  });
}

let useStreaming = true; // Force streaming always enabled

// Streaming toggle functionality
const streamingToggle = document.getElementById('streamingToggle');
if (streamingToggle) {
  // Check if streaming feature is enabled in config
  const streamingEnabled = window.DUALMIND_CONFIG?.features?.streaming !== false;
  if (!streamingEnabled) {
    streamingToggle.style.display = 'none';
    useStreaming = false;
  } else {
    streamingToggle.addEventListener('click', () => {
      useStreaming = !useStreaming;
      streamingToggle.classList.toggle('active', useStreaming);
      const icon = streamingToggle.querySelector('i');
      if (icon) {
        icon.className = useStreaming ? 'ri-play-circle-line' : 'ri-pause-circle-line';
      }
      streamingToggle.title = useStreaming ? 'Streaming Enabled' : 'Streaming Disabled';
      showToast(useStreaming ? 'Streaming enabled' : 'Streaming disabled');
    });
  }
}

// ========== Arena (Dual Chat) Rendering ==========
function renderSkeleton() {
  if (!arenaResults || !arenaGrid) return;
  arenaResults.hidden = false;
  chatResults && (chatResults.hidden = true);
  arenaVoting && (arenaVoting.hidden = true);
  arenaFooter && (arenaFooter.hidden = true);
  
  arenaGrid.innerHTML = `
    <div class="arena-card">
      <div class="arena-card-head">
        <div class="arena-card-title">
          <div class="label">Agent 1</div>
          <div class="model">Thinking…</div>
        </div>
        <div class="arena-card-meta">Loading</div>
      </div>
      <div class="arena-skeleton">
        <div class="arena-skel-line w-90"></div>
        <div class="arena-skel-line w-70"></div>
        <div class="arena-skel-line w-55"></div>
        <div class="arena-skel-line w-90"></div>
        <div class="arena-skel-line w-35"></div>
      </div>
    </div>
    <div class="arena-card">
      <div class="arena-card-head">
        <div class="arena-card-title">
          <div class="label">Agent 2</div>
          <div class="model">Thinking…</div>
        </div>
        <div class="arena-card-meta">Loading</div>
      </div>
      <div class="arena-skeleton">
        <div class="arena-skel-line w-90"></div>
        <div class="arena-skel-line w-70"></div>
        <div class="arena-skel-line w-55"></div>
        <div class="arena-skel-line w-90"></div>
        <div class="arena-skel-line w-35"></div>
      </div>
    </div>
  `;
}

function renderError(message) {
  if (!arenaResults || !arenaGrid) return;
  arenaResults.hidden = false;
  chatResults && (chatResults.hidden = true);
  arenaVoting && (arenaVoting.hidden = true);

  const canRetry = Boolean(lastRequest?.prompt) && !apiIsOffline;
  const subtitle = apiIsOffline
    ? 'Backend offline'
    : 'Request failed';

  arenaGrid.innerHTML = `
    <div class="arena-card arena-error arena-error-full">
      <div class="arena-card-head">
        <div class="arena-card-title">
          <div class="label">Error</div>
          <div class="model">${escapeHtml(subtitle)}</div>
        </div>
        <div class="arena-card-meta">${canRetry ? 'Retry available' : 'Check connection'}</div>
      </div>
      <div class="arena-card-body">
        <div class="arena-message">${escapeHtml(message)}</div>
        ${canRetry ? `
          <div class="arena-error-actions">
            <button type="button" class="arena-cta" id="arenaRetryBtn"><i class="ri-refresh-line"></i><span>Retry</span></button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  const retryBtn = document.getElementById('arenaRetryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      retryLastRequest();
    });
  }
}

function renderDualResponse(data, showModels = false) {
  if (!arenaResults || !arenaGrid) return;
  const a1 = data?.agent1;
  const a2 = data?.agent2;

  // In battle mode, hide model names until vote
  const m1 = showModels ? (a1?.model?.displayName || a1?.model?.name || 'Model A') : 'Model A';
  const m2 = showModels ? (a2?.model?.displayName || a2?.model?.name || 'Model B') : 'Model B';
  const canShowMeta = hasVoted;
  const t1 = canShowMeta && typeof a1?.responseTimeMs === 'number' ? `${a1.responseTimeMs}ms` : '';
  const t2 = canShowMeta && typeof a2?.responseTimeMs === 'number' ? `${a2.responseTimeMs}ms` : '';

  const showWinner = hasVoted && (userWinner === 'agent1' || userWinner === 'agent2' || userWinner === 'tie');
  const c1Winner = showWinner && (userWinner === 'agent1' || userWinner === 'tie');
  const c2Winner = showWinner && (userWinner === 'agent2' || userWinner === 'tie');

  const badgeText = userWinner === 'tie' ? 'Tie' : 'Winner';
  const badgeIcon = userWinner === 'tie' ? 'ri-equal-line' : 'ri-award-line';
  const badge1 = c1Winner ? `<span class="winner-badge"><i class="${badgeIcon}"></i> ${badgeText}</span>` : '';
  const badge2 = c2Winner ? `<span class="winner-badge"><i class="${badgeIcon}"></i> ${badgeText}</span>` : '';

  arenaResults.hidden = false;
  chatResults && (chatResults.hidden = true);

  arenaGrid.innerHTML = `
    <div class="arena-card ${c1Winner ? 'winner' : ''}" id="card1">
      <div class="arena-card-head">
        <div class="arena-head-left">
          <span class="arena-agent-pill">Agent 1</span>
          <div class="arena-model-name">${escapeHtml(m1)}</div>
        </div>
        <div class="arena-head-right">
          ${badge1}
          ${t1 ? `<span class="arena-meta-pill"><i class="ri-timer-line"></i>${escapeHtml(t1)}</span>` : ''}
          <button class="copy-btn arena-copy" type="button" data-copy-card="card1" aria-label="Copy response"><i class="ri-file-copy-line"></i></button>
        </div>
      </div>
      <div class="arena-card-body">
        <div class="arena-message">${escapeHtml(a1?.message || 'No response')}</div>
      </div>
    </div>
    <div class="arena-card ${c2Winner ? 'winner' : ''}" id="card2">
      <div class="arena-card-head">
        <div class="arena-head-left">
          <span class="arena-agent-pill">Agent 2</span>
          <div class="arena-model-name">${escapeHtml(m2)}</div>
        </div>
        <div class="arena-head-right">
          ${badge2}
          ${t2 ? `<span class="arena-meta-pill"><i class="ri-timer-line"></i>${escapeHtml(t2)}</span>` : ''}
          <button class="copy-btn arena-copy" type="button" data-copy-card="card2" aria-label="Copy response"><i class="ri-file-copy-line"></i></button>
        </div>
      </div>
      <div class="arena-card-body">
        <div class="arena-message">${escapeHtml(a2?.message || 'No response')}</div>
      </div>
    </div>
  `;

  if (arenaVoting) {
    arenaVoting.hidden = !!hasVoted;
  }
}

// ========== Single Chat Rendering ==========
function renderSingleSkeleton() {
  if (!chatResults || !chatMessages) return;
  chatResults.hidden = false;
  arenaResults && (arenaResults.hidden = true);
  
  const pendingId = `pending_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  chatMessages.insertAdjacentHTML('beforeend', `
    <div class="chat-bubble assistant" data-pending-id="${pendingId}">
      <div class="arena-skeleton">
        <div class="arena-skel-line w-90"></div>
        <div class="arena-skel-line w-70"></div>
        <div class="arena-skel-line w-55"></div>
      </div>
    </div>
  `);

  chatMessages.lastElementChild?.scrollIntoView({ behavior: 'auto', block: 'end' });
  return pendingId;
}

function renderSingleResponse(data, userPrompt, pendingId = null) {
  if (!chatResults || !chatMessages) return;
  chatResults.hidden = false;
  arenaResults && (arenaResults.hidden = true);

  const model = data?.model?.displayName || data?.model?.name || 'AI';
  const message = data?.message || 'No response';

  if (pendingId) {
    const pending = chatMessages.querySelector(`[data-pending-id="${pendingId}"]`);
    if (pending) {
      pending.innerHTML = `
        <div class="chat-bubble-top">
          <div class="model-tag">${escapeHtml(model)}</div>
          <button class="copy-btn copy-chat" type="button" aria-label="Copy response"><i class="ri-file-copy-line"></i></button>
        </div>
        <div class="chat-content">${escapeHtml(message)}</div>
      `;
      pending.removeAttribute('data-pending-id');
      pending.scrollIntoView({ behavior: 'auto', block: 'end' });
      return;
    }
    return;
  }

  chatMessages.innerHTML = `
    <div class="chat-bubble user">
      <div class="model-tag">You</div>
      <div class="chat-content">${escapeHtml(userPrompt)}</div>
    </div>
    <div class="chat-bubble assistant">
      <div class="chat-bubble-top">
        <div class="model-tag">${escapeHtml(model)}</div>
        <button class="copy-btn copy-chat" type="button" aria-label="Copy response"><i class="ri-file-copy-line"></i></button>
      </div>
      <div class="chat-content">${escapeHtml(message)}</div>
    </div>
  `;
}

// ========== API Calls ==========
async function sendDualChat(prompt) {
  const token = await getSupabaseAccessToken();
  if (!token) {
    if (arena) {
      arena.renderError('Please login to use the arena.', false);
    } else {
      renderError('Please login to use the arena.');
    }
    showToast('Login required');
    return;
  }

  if (!dualMindAPI) {
    if (arena) {
      arena.renderError('API service not initialized', false);
    } else {
      renderError('API service not initialized');
    }
    return;
  }

  if (currentMode === 'sidebyside') {
    await loadModels();
    const m1 = model1Select?.value;
    const m2 = model2Select?.value;
    if (!m1 || !m2) {
      showToast('Select Model A and Model B');
      return;
    }
    if (m1 === m2) {
      showToast('Pick two different models');
      return;
    }
  }

  document.querySelectorAll('.vote-btn').forEach((b) => {
    b.disabled = false;
    b.classList.remove('voted');
  });

  hasVoted = false;
  userWinner = null;
  lastDualResponse = null;

  // Use new Arena module if available
  if (arena) {
    // Prepare model configurations based on mode
    const models = [
      { 
        id: 'agent1', 
        label: 'Agent 1',
        name: currentMode === 'sidebyside' ? model1Select?.value : null,
        hidden: currentMode === 'battle'
      },
      { 
        id: 'agent2', 
        label: 'Agent 2',
        name: currentMode === 'sidebyside' ? model2Select?.value : null,
        hidden: currentMode === 'battle'
      }
    ];
    
    arena.initialize(models);
    arena.renderSkeleton();
  } else {
    renderSkeleton();
  }

  try {
    const userId = await getCurrentUserId();
    const options = {
      threadId: currentThreadId,
      userId: userId,
      battleMode: battleSelectionMode
    };

    if (currentMode === 'sidebyside') {
      options.model1 = model1Select?.value;
      options.model2 = model2Select?.value;
    }

    const result = await dualMindAPI.dualChat(prompt, options);
    
    const json = {
      agent1: {
        message: result.agent1.text,
        model: result.agent1.model,
        responseTimeMs: result.agent1.responseTimeMs
      },
      agent2: {
        message: result.agent2.text,
        model: result.agent2.model,
        responseTimeMs: result.agent2.responseTimeMs
      },
      comparisonId: result.comparisonId,
      arena: result.arena
    };
    
    lastDualResponse = json;
    
    // Update using Arena module if available
    if (arena) {
      // Update models with actual metadata from response
      arena.models[0].displayName = json.agent1.model?.displayName || json.agent1.model?.name || 'Model A';
      arena.models[0].model = json.agent1.model;
      arena.models[0].responseTimeMs = json.agent1.responseTimeMs;
      
      arena.models[1].displayName = json.agent2.model?.displayName || json.agent2.model?.name || 'Model B';
      arena.models[1].model = json.agent2.model;
      arena.models[1].responseTimeMs = json.agent2.responseTimeMs;
      
      // Update card content
      arena.updateModelCard('agent1', json.agent1.message, true);
      arena.updateModelCard('agent2', json.agent2.message, true);
      
      // Show voting for battle mode
      if (currentMode === 'battle') {
        arena.showVoting([
          { id: 'agent1', label: 'Agent 1' },
          { id: 'agent2', label: 'Agent 2' }
        ]);
      } else {
        // Reveal model names immediately in side-by-side mode
        arena.revealModels();
      }
    } else {
      renderDualResponse(json, false);
    }
  } catch (e) {
    if (arena) {
      arena.renderError(e.message || 'Failed to get response', Boolean(lastRequest?.prompt));
    } else {
      renderError(e.message || 'Failed to get response');
    }
  }
}

async function sendSingleChat(prompt, useStreaming = false) {
  const token = await getSupabaseAccessToken();
  if (!token) {
    if (chatResults && chatMessages) {
      chatResults.hidden = false;
      arenaResults && (arenaResults.hidden = true);
      arenaVoting && (arenaVoting.hidden = true);

      chatMessages.innerHTML = `
        <div class="chat-bubble assistant" style="color:var(--danger)">${escapeHtml('Please login to chat.')}</div>
      `;
    } else {
      renderError('Please login to chat.');
    }
    showToast('Login required');
    return;
  }

  if (!dualMindAPI) {
    showToast('API service not initialized');
    return;
  }

  if (chatResults && chatMessages) {
    chatResults.hidden = false;
    arenaResults && (arenaResults.hidden = true);
    arenaVoting && (arenaVoting.hidden = true);

    if (chatMessages.querySelector('.thread-empty')) {
      chatMessages.innerHTML = '';
    }

    chatMessages.insertAdjacentHTML('beforeend', `
      <div class="chat-bubble user">
        <div class="model-tag">You</div>
        <div class="chat-content">${escapeHtml(prompt)}</div>
      </div>
    `);
  }

  const pendingId = renderSingleSkeleton();

  try {
    const userId = await getCurrentUserId();
    const options = {
      model: window.DUALMIND_CONFIG.models?.defaultModel || 'llama-3.1-8b-instant',
      threadId: currentThreadId,
      userId: userId
    };

    if (useStreaming) {
      // Streaming mode
      await dualMindAPI.chatStreaming(
        prompt,
        options,
        (deltaText, fullText) => {
          // Update the streaming response in real-time
          const pending = pendingId ? chatMessages?.querySelector(`[data-pending-id="${pendingId}"]`) : null;
          if (pending) {
            // Replace skeleton with streaming content
            pending.innerHTML = `
              <div class="chat-bubble-top">
                <div class="model-tag">AI</div>
                <button class="copy-btn copy-chat" type="button" aria-label="Copy response"><i class="ri-file-copy-line"></i></button>
              </div>
              <div class="chat-content">${escapeHtml(fullText)}</div>
            `;
            // Use config for smooth scrolling
            const scrollBehavior = window.DUALMIND_CONFIG.ui?.scrollBehavior || 'smooth';
            pending.scrollIntoView({ behavior: scrollBehavior, block: 'end' });
          }
        },
        (result) => {
          // Streaming complete - update with final result
          const pending = pendingId ? chatMessages?.querySelector(`[data-pending-id="${pendingId}"]`) : null;
          if (pending) {
            pending.innerHTML = `
              <div class="chat-bubble-top">
                <div class="model-tag">${escapeHtml(result.model?.displayName || result.model?.name || 'AI')}</div>
                <button class="copy-btn copy-chat" type="button" aria-label="Copy response"><i class="ri-file-copy-line"></i></button>
              </div>
              <div class="chat-content">${escapeHtml(result.text)}</div>
            `;
            pending.removeAttribute('data-pending-id');
            const scrollBehavior = window.DUALMIND_CONFIG.ui?.scrollBehavior || 'smooth';
            pending.scrollIntoView({ behavior: scrollBehavior, block: 'end' });
          }
          console.log('Streaming complete:', result);
        },
        (error) => {
          // Handle streaming error
          const pending = pendingId ? chatMessages?.querySelector(`[data-pending-id="${pendingId}"]`) : null;
          if (pending) {
            pending.style.color = 'var(--danger)';
            pending.innerHTML = `<div class="model-tag">Error</div><div class="chat-content">${escapeHtml(error.message)}</div>`;
            pending.removeAttribute('data-pending-id');
            pending.scrollIntoView({ behavior: 'auto', block: 'end' });
          } else {
            showToast('Request failed: ' + (error?.message || 'Unknown error'));
          }
        }
      );
    } else {
      // Non-streaming mode (original behavior)
      const result = await dualMindAPI.chatNonStreaming(prompt, options);
      
      const json = {
        message: result.text,
        model: result.model,
        responseTimeMs: result.responseTimeMs
      };
      
      renderSingleResponse(json, prompt, pendingId);
    }
  } catch (e) {
    const pending = pendingId ? chatMessages?.querySelector(`[data-pending-id="${pendingId}"]`) : null;
    if (pending) {
      pending.style.color = 'var(--danger)';
      pending.innerHTML = `<div class="model-tag">Error</div><div class="chat-content">${escapeHtml(e.message)}</div>`;
      pending.removeAttribute('data-pending-id');
      pending.scrollIntoView({ behavior: 'auto', block: 'end' });
    } else {
      showToast('Request failed: ' + (e?.message || 'Unknown error'));
    }
  }
}

// ========== Voting ==========
async function submitVote(winner) {
  if (!lastDualResponse || hasVoted || isVoting) return;

  if (apiIsOffline) {
    notifyApiOffline();
    showToast('Backend offline. Vote unavailable');
    return;
  }

  const responseSnapshot = lastDualResponse;
  const comparisonId = responseSnapshot.comparisonId;
  if (!comparisonId) {
    showToast('No comparison to vote on');
    return;
  }

  if (winner === 'tie') {
    hasVoted = true;
    userWinner = 'tie';
    showToast('Tie recorded');
    
    if (arena) {
      arena.showFeedback('Vote recorded. Thanks for helping improve the leaderboard.', 'success');
      arena.highlightWinner(['agent1', 'agent2']);
      arena.revealModels();
    } else {
      renderArenaFeedback('Vote recorded. Thanks for helping improve the leaderboard.', 'success');
      renderDualResponse(responseSnapshot, true);
    }
    
    arenaVoting && (arenaVoting.hidden = true);

    document.querySelectorAll('.vote-btn').forEach((b) => {
      b.disabled = true;
      if (b.dataset.vote === 'tie') b.classList.add('voted');
    });
    return;
  }

  let winnerModelName = null;
  if (winner === 'agent1') {
    winnerModelName = responseSnapshot.agent1?.model?.name;
  } else if (winner === 'agent2') {
    winnerModelName = responseSnapshot.agent2?.model?.name;
  }

  if (!winnerModelName) {
    showToast('Vote failed: missing model name');
    return;
  }

  try {
    isVoting = true;
    document.querySelectorAll('.vote-btn').forEach((b) => {
      b.disabled = true;
    });

    const userId = await getCurrentUserId();
    await dualMindAPI.submitVote(comparisonId, winnerModelName, userId);

    const stillSameComparison = lastDualResponse?.comparisonId === comparisonId;
    showToast('Vote submitted!');
    renderArenaFeedback('Vote recorded. Thanks for helping improve the leaderboard.', 'success');

    if (stillSameComparison) {
      hasVoted = true;
      userWinner = winner;

      // Reveal model names and highlight winner using Arena module
      if (arena) {
        arena.showFeedback('Vote recorded. Thanks for helping improve the leaderboard.', 'success');
        arena.highlightWinner(winner);
        arena.revealModels();
      } else {
        renderDualResponse(responseSnapshot, true);
      }
      
      arenaVoting && (arenaVoting.hidden = true);

      document.querySelectorAll('.vote-btn').forEach((b) => {
        b.disabled = true;
        if (b.dataset.vote === winner) b.classList.add('voted');
      });
    } else {
      document.querySelectorAll('.vote-btn').forEach((b) => {
        b.disabled = false;
      });
    }

    if (leaderboardModal?.classList.contains('open')) {
      loadLeaderboard();
    }
  } catch (e) {
    document.querySelectorAll('.vote-btn').forEach((b) => {
      b.disabled = false;
    });

    if (e?.status === 503 || e?.status === 0) {
      notifyApiOffline();
      showToast('Backend offline. Vote unavailable');
      return;
    }
    showToast('Vote failed: ' + e.message);
  } finally {
    isVoting = false;
  }
}

// Vote button handlers - use event delegation for dynamically created buttons
if (arenaVoting) {
  arenaVoting.addEventListener('click', (e) => {
    const btn = e.target.closest('.vote-btn');
    if (btn && !btn.disabled) {
      const vote = btn.dataset.vote;
      submitVote(vote);
    }
  });
}

// Fallback for statically created vote buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.vote-btn');
  if (btn && !btn.disabled && !arenaVoting?.contains(btn)) {
    const vote = btn.dataset.vote;
    submitVote(vote);
  }
});

// ========== Threads ==========
async function loadThreads() {
  if (!threadList) return;
  
  const token = await getSupabaseAccessToken();
  if (!token) {
    renderThreadListState({
      title: 'Login to see history',
      subtitle: 'Your recent chats will appear here once you sign in.'
    });
    return;
  }

  if (apiIsOffline) {
    renderThreadListState({
      title: 'History unavailable',
      subtitle: 'Backend is offline. Start the API server to load chats.',
      actionLabel: 'Retry'
    });
    return;
  }

  renderThreadListState({ title: 'Loading…', subtitle: 'Fetching recent chats.' });

  try {
    const userId = await getCurrentUserId();
    const threads = await dualMindAPI.getThreads(20, userId);

    if (!threads.length) {
      renderThreadListState({
        title: 'No chats yet',
        subtitle: 'Start a new chat and it will show up here.'
      });
      return;
    }

    threadList.innerHTML = threads.map(t => `
      <button class="thread-item ${t.threadId === currentThreadId ? 'active' : ''}" data-id="${t.threadId}">
        <i class="ri-chat-3-line"></i>
        <span>${escapeHtml(t.title || 'Untitled')}</span>
      </button>
    `).join('');

    // Click handlers
    threadList.querySelectorAll('.thread-item').forEach(item => {
      item.addEventListener('click', () => loadThread(item.dataset.id));
    });
  } catch (e) {
    if (e?.status === 503 || e?.status === 0) {
      notifyApiOffline();
      renderThreadListState({
        title: 'History unavailable',
        subtitle: 'Backend is offline. Start the API server to load chats.',
        actionLabel: 'Retry'
      });
      return;
    }

    renderThreadListState({
      title: 'Failed to load history',
      subtitle: e?.message || 'Unexpected error',
      actionLabel: 'Retry'
    });
  }
}

async function loadThread(threadId) {
  currentThreadId = threadId;
  localStorage.setItem(THREAD_ID_STORAGE_KEY, threadId);
  
  // Update active state
  threadList?.querySelectorAll('.thread-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === threadId);
  });

  if (chatMessages && chatResults) {
    chatResults.hidden = false;
    arenaResults && (arenaResults.hidden = true);
    arenaVoting && (arenaVoting.hidden = true);
    chatMessages.innerHTML = '<div class="thread-empty">Loading...</div>';
  }

  try {
    const messages = await dualMindAPI.getThreadMessages(threadId);

    if (chatMessages) {
      chatResults.hidden = false;
      arenaResults && (arenaResults.hidden = true);

      if (!messages.length) {
        chatMessages.innerHTML = '<div class="thread-empty">No messages yet</div>';
        return;
      }

      chatMessages.innerHTML = messages.map((m, idx) => {
        const prompt = m.promptText || '';
        const resp1 = m.model1Response || '';
        const resp2 = m.model2Response || '';
        const name1 = m.model1Name || 'Agent 1';
        const name2 = m.model2Name || 'Agent 2';
        const winnerModel = m.winnerModelName || null;
        const isLast = idx === messages.length - 1;

        const model1IsWinner = winnerModel && name1 && winnerModel.toLowerCase() === name1.toLowerCase();
        const model2IsWinner = winnerModel && name2 && winnerModel.toLowerCase() === name2.toLowerCase();

        let html = `
          <div class="chat-bubble user">
            <div class="model-tag">You</div>
            <div class="chat-content">${escapeHtml(prompt)}</div>
          </div>
        `;

        if (resp1) {
          const winnerClass = model1IsWinner ? 'thread-winner' : '';
          const lastClass = isLast ? 'thread-last' : '';
          html += `
            <div class="chat-bubble assistant ${winnerClass} ${lastClass}">
              <div class="chat-bubble-top">
                <div class="model-tag">${escapeHtml(name1)}${model1IsWinner ? ' <i class="ri-trophy-fill"></i>' : ''}</div>
                <button class="copy-btn copy-chat" type="button" aria-label="Copy response"><i class="ri-file-copy-line"></i></button>
              </div>
              <div class="chat-content">${escapeHtml(resp1)}</div>
            </div>
          `;
        }

        if (resp2) {
          const winnerClass = model2IsWinner ? 'thread-winner' : '';
          const lastClass = isLast ? 'thread-last' : '';
          html += `
            <div class="chat-bubble assistant ${winnerClass} ${lastClass}">
              <div class="chat-bubble-top">
                <div class="model-tag">${escapeHtml(name2)}${model2IsWinner ? ' <i class="ri-trophy-fill"></i>' : ''}</div>
                <button class="copy-btn copy-chat" type="button" aria-label="Copy response"><i class="ri-file-copy-line"></i></button>
              </div>
              <div class="chat-content">${escapeHtml(resp2)}</div>
            </div>
          `;
        }

        return html;
      }).join('');

      chatMessages.lastElementChild?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  } catch (e) {
    if (e?.status === 401 || e?.status === 403 || e?.status === 404) {
      currentThreadId = null;
      localStorage.removeItem(THREAD_ID_STORAGE_KEY);
      threadList?.querySelectorAll('.thread-item').forEach(item => {
        item.classList.remove('active');
      });
    }

    if (e?.status === 0) {
      notifyApiOffline();
    }

    if (chatMessages) {
      chatMessages.innerHTML = '<div class="thread-empty">Failed to load</div>';
    }
    showToast('Failed to load thread');
  }
}

async function createNewThread(title) {
  try {
    const userId = await getCurrentUserId();
    const json = await dualMindAPI.createThread(title, userId);
    currentThreadId = json.threadId;
    localStorage.setItem(THREAD_ID_STORAGE_KEY, currentThreadId);
    await loadThreads();
    return currentThreadId;
  } catch (e) {
    canCreateThread = false;
    showToast('History unavailable (thread create failed)');
    if (e?.status === 0) notifyApiOffline();
    if (e?.status !== 503 && e?.status !== 0) console.error('Failed to create thread:', e);
    return null;
  }
}

// New Chat button
if (newChatBtn) {
  newChatBtn.addEventListener('click', async () => {
    currentThreadId = null;
    localStorage.removeItem(THREAD_ID_STORAGE_KEY);
    hasVoted = false;
    userWinner = null;
    lastDualResponse = null;
    canCreateThread = true;

    // Clear results
    arenaResults && (arenaResults.hidden = true);
    chatResults && (chatResults.hidden = true);
    arenaVoting && (arenaVoting.hidden = true);

    if (chatMessages) {
      chatMessages.innerHTML = '';
    }
    
    // Clear active thread
    threadList?.querySelectorAll('.thread-item').forEach(item => {
      item.classList.remove('active');
    });

    promptInput?.focus();
    showToast('New chat started');
  });
}

// ========== Mode Switching ==========
function setMode(mode) {
  currentMode = mode;
  
  // Update UI label and icon
  const modeConfig = {
    battle: { label: 'Battle', icon: 'ri-sword-line' },
    sidebyside: { label: 'Side by Side', icon: 'ri-layout-column-line' },
    direct: { label: 'Direct Chat', icon: 'ri-send-plane-line' }
  };

  const cfg = modeConfig[mode] || modeConfig.battle;
  if (viewSwitcherSpan) viewSwitcherSpan.textContent = cfg.label;
  if (crumbIcon) crumbIcon.className = cfg.icon;
  document.title = `Duel_mind Arena – ${cfg.label}`;

  // Reset state
  hasVoted = false;
  userWinner = null;
  lastDualResponse = null;
  arenaResults && (arenaResults.hidden = true);
  chatResults && (chatResults.hidden = true);
  arenaVoting && (arenaVoting.hidden = true);

  document.querySelectorAll('.vote-btn').forEach((b) => {
    b.disabled = false;
    b.classList.remove('voted');
  });

  updateModelPickerVisibility();
  if (currentMode === 'sidebyside') {
    loadModels();
  }
}

document.addEventListener('click', (e) => {
  const cardBtn = e.target.closest('[data-copy-card]');
  if (cardBtn) {
    const cardId = cardBtn.dataset.copyCard;
    const text = document.getElementById(cardId)?.querySelector('.arena-message')?.innerText || '';
    copyToClipboard(text);
    return;
  }

  const chatBtn = e.target.closest('.copy-chat');
  if (chatBtn) {
    const bubble = chatBtn.closest('.chat-bubble');
    const text = bubble?.querySelector('.chat-content')?.innerText || '';
    copyToClipboard(text);
  }
});

// ========== Send Handler ==========
async function handleSend() {
  if (!promptInput || !sendBtn) return;
  if (isSending) return;
  const value = (promptInput.value || '').trim();
  if (!value) {
    showToast('Type something first.');
    return;
  }

  lastRequest = {
    prompt: value,
    kind: currentMode === 'direct' ? 'single' : 'dual',
    mode: currentMode
  };

  isSending = true;
  sendBtn.disabled = true;

  try {
    const token = await getSupabaseAccessToken();
    if (!token) {
      if (currentMode === 'direct') {
        if (chatResults && chatMessages) {
          chatResults.hidden = false;
          arenaResults && (arenaResults.hidden = true);
          arenaVoting && (arenaVoting.hidden = true);
          chatMessages.innerHTML = `
            <div class="chat-bubble assistant" style="color:var(--danger)">${escapeHtml('Please login to chat.')}</div>
          `;
        } else {
          renderError('Please login to chat.');
        }
      } else {
        renderError('Please login to use the arena.');
      }

      showToast('Login required');
      return;
    }

    // Create thread if needed
    if (!currentThreadId && canCreateThread) {
      const cleaned = value.replace(/\s+/g, ' ').trim();
      const title = cleaned.length > 30 ? cleaned.substring(0, 30) + '...' : cleaned;
      await createNewThread(title);
    }

    if (currentMode === 'direct') {
      await sendSingleChat(value, useStreaming);
    } else {
      await sendDualChat(value);
    }

    promptInput.value = '';
    if (promptInput.tagName === 'TEXTAREA') {
      promptInput.style.height = 'auto';
      promptInput.style.overflowY = 'hidden';
    }
    promptInput.focus();
  } finally {
    isSending = false;
    sendBtn.disabled = !(promptInput.value || '').trim();
  }
}

if (promptInput && sendBtn && toast) {
  const autoResizePrompt = () => {
    if (promptInput.tagName !== 'TEXTAREA') return;
    
    // Use config for auto-resize
    const autoResize = window.DUALMIND_CONFIG.ui?.autoResizeTextarea ?? true;
    if (!autoResize) return;
    
    promptInput.style.height = 'auto';
    const maxHeight = window.DUALMIND_CONFIG.ui?.maxTextareaHeight || 180;
    const next = Math.min(promptInput.scrollHeight || 0, maxHeight);
    promptInput.style.height = (next ? `${next}px` : 'auto');
    promptInput.style.overflowY = (promptInput.scrollHeight > maxHeight) ? 'auto' : 'hidden';
  };

  const syncSendState = () => {
    sendBtn.disabled = !(promptInput.value || '').trim();
    autoResizePrompt();
  };
  syncSendState();
  promptInput.addEventListener('input', syncSendState);

  promptInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    e.preventDefault();
    handleSend();
  });

  promptInput.addEventListener('blur', () => {
    if (promptInput.tagName !== 'TEXTAREA') return;
    if ((promptInput.value || '').trim()) return;
    promptInput.style.height = 'auto';
    promptInput.style.overflowY = 'hidden';
  });

  sendBtn.addEventListener('click', handleSend);
}

// Mode dropdown menu
const viewSwitcher = document.getElementById('viewSwitcher');
const viewMenu     = document.getElementById('viewMenu');

function closeMenu() {
  viewMenu?.classList.remove('open');
  viewMenu?.setAttribute('aria-hidden', 'true');
  viewSwitcher?.setAttribute('aria-expanded', 'false');
}

function toggleMenu() {
  const open = !viewMenu?.classList.contains('open');
  if (open) {
    viewMenu?.classList.add('open');
    viewMenu?.setAttribute('aria-hidden', 'false');
    viewSwitcher?.setAttribute('aria-expanded', 'true');
  } else {
    closeMenu();
  }
}

if (viewSwitcher && viewMenu) {
  viewSwitcher.addEventListener('click', toggleMenu);

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!viewMenu.contains(e.target) && !viewSwitcher.contains(e.target)) {
      closeMenu();
    }
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Mode selection handler
  viewMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    
    const mode = item.dataset.mode;
    if (mode) {
      setMode(mode);
    }
    closeMenu();
  });
}

// Keyboard shortcut: focus input with "/" (like many UIs)
document.addEventListener('keydown', (e) => {
  const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (e.key === '/' && !isTyping) {
    e.preventDefault();
    promptInput?.focus();
  }
});

// Sidebar collapse/expand toggle
const sidebar = document.getElementById('sidebar');
const sidebarToggleRight = document.getElementById('sidebarToggleRight');

if (sidebar && sidebarToggleRight) {
  sidebarToggleRight.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('collapsed');

    if (appRoot) {
      appRoot.classList.toggle('sidebar-collapsed', sidebar.classList.contains('collapsed'));
    }
  });
}

// Brand dropdown menu
const brandBtn = document.getElementById('brandBtn');
const brandWrapper = brandBtn?.closest('.brand-wrapper');
const brandMenu = document.getElementById('brandMenu');

function closeBrandMenu() {
  brandWrapper?.classList.remove('open');
}

function toggleBrandMenu() {
  brandWrapper?.classList.toggle('open');
}

if (brandBtn && brandWrapper) {
  brandBtn.addEventListener('click', (e) => {
    // Don't toggle menu if clicking on sidebar toggle
    if (e.target.closest('#sidebarToggleRight') || e.target.closest('.sidebar-toggle-right')) return;
    
    // If sidebar is collapsed, expand it instead of opening menu
    if (sidebar && sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');

      if (appRoot) {
        appRoot.classList.remove('sidebar-collapsed');
      }
      return;
    }
    
    toggleBrandMenu();
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!brandWrapper.contains(e.target)) {
      closeBrandMenu();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBrandMenu();
  });
}

// Leaderboard Modal
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardClose = document.getElementById('leaderboardClose');
const leaderboardContent = document.getElementById('leaderboardContent');

function renderLeaderboardState({ title, subtitle, actionLabel } = {}) {
  if (!leaderboardContent) return;
  const safeTitle = escapeHtml(title || '');
  const safeSubtitle = escapeHtml(subtitle || '');
  const action = actionLabel
    ? `<button class="leaderboard-action" type="button"><i class="ri-refresh-line"></i><span>${escapeHtml(actionLabel)}</span></button>`
    : '';

  leaderboardContent.innerHTML = `
    <div class="leaderboard-shell">
      <div class="leaderboard-state">
        <div class="leaderboard-state-title">${safeTitle}</div>
        ${safeSubtitle ? `<div class="leaderboard-state-subtitle">${safeSubtitle}</div>` : ''}
        ${action}
      </div>
    </div>
  `;

  const btn = leaderboardContent.querySelector('.leaderboard-action');
  if (btn) {
    btn.addEventListener('click', () => loadLeaderboard());
  }
}

function renderLeaderboardSkeleton() {
  if (!leaderboardContent) return;
  leaderboardContent.innerHTML = `
    <div class="leaderboard-shell">
      <div class="leaderboard-top">
        <div class="leaderboard-top-left">
          <div class="leaderboard-title">Leaderboard</div>
          <div class="leaderboard-subtitle">Loading stats…</div>
        </div>
        <button class="leaderboard-refresh" type="button" disabled>
          <i class="ri-refresh-line"></i><span>Refresh</span>
        </button>
      </div>

      <div class="leaderboard-table-wrap">
        <table class="leaderboard-table leaderboard-table-premium">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Model</th>
              <th>Win rate</th>
              <th>Wins</th>
              <th>Responses</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: 8 }).map(() => `
              <tr class="leaderboard-row-skel">
                <td><div class="lb-skel lb-skel-rank"></div></td>
                <td><div class="lb-skel lb-skel-wide"></div><div class="lb-skel lb-skel-narrow"></div></td>
                <td><div class="lb-skel lb-skel-mid"></div></td>
                <td><div class="lb-skel lb-skel-mid"></div></td>
                <td><div class="lb-skel lb-skel-mid"></div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function loadLeaderboard() {
  if (!leaderboardContent) return;

  const token = await getSupabaseAccessToken();
  if (!token) {
    renderLeaderboardState({
      title: 'Login to view leaderboard',
      subtitle: 'Sign in to see live model rankings.'
    });
    return;
  }

  if (apiIsOffline) {
    renderLeaderboardState({
      title: 'Leaderboard unavailable',
      subtitle: 'Backend is offline. Start the API server to load stats.',
      actionLabel: 'Retry'
    });
    return;
  }

  renderLeaderboardSkeleton();

  // Show cached data immediately if available
  const cached = getCachedLeaderboard();
  if (cached) {
    renderLeaderboardData(cached);
  }

  let slowTimer = setTimeout(() => {
    renderLeaderboardState({
      title: 'Still loading…',
      subtitle: 'Taking longer than expected. Try again.',
      actionLabel: 'Retry'
    });
  }, 6000);

  try {
    const items = await dualMindAPI.getLeaderboard();

    const rendered = renderLeaderboardData(items);
    if (rendered) setCachedLeaderboard(items);
  } catch (e) {
    if (e?.status === 503 || e?.status === 0) {
      notifyApiOffline();
      renderLeaderboardState({
        title: 'Leaderboard unavailable',
        subtitle: 'Backend is offline. Start the API server to load stats.',
        actionLabel: 'Retry'
      });
      return;
    }

    renderLeaderboardState({
      title: 'Failed to load leaderboard',
      subtitle: e?.message || 'Unexpected error',
      actionLabel: 'Retry'
    });
  } finally {
    if (slowTimer) clearTimeout(slowTimer);
  }
}

function openLeaderboardModal() {
  leaderboardModal?.classList.add('open');
  loadLeaderboard();
}

function closeLeaderboardModal() {
  leaderboardModal?.classList.remove('open');
}

if (leaderboardBtn) {
  leaderboardBtn.addEventListener('click', openLeaderboardModal);
}

if (leaderboardClose) {
  leaderboardClose.addEventListener('click', closeLeaderboardModal);
}

if (leaderboardModal) {
  leaderboardModal.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) closeLeaderboardModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && leaderboardModal.classList.contains('open')) {
      closeLeaderboardModal();
    }
  });
}

// Theme switcher with localStorage persistence
const themeBtns = document.querySelectorAll('.theme-btn');

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  if (theme === 'system') {
    theme = getSystemTheme();
  }
  document.documentElement.setAttribute('data-theme', theme);
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
  
  // Update active button
  themeBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.theme === savedTheme) {
      btn.classList.add('active');
    }
  });
}

// Initialize theme on page load
initTheme();

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'system') {
    applyTheme('system');
  }
});

themeBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const theme = btn.dataset.theme;
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Update UI
    themeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Apply theme
    applyTheme(theme);
  });
});

// ========== Initialization ==========
async function initApp() {
  await loadThreads();

  const token = await getSupabaseAccessToken();
  if (token) {
    const savedThreadId = localStorage.getItem(THREAD_ID_STORAGE_KEY);
    if (savedThreadId) {
      await loadThread(savedThreadId);
    }
  } else {
    localStorage.removeItem(THREAD_ID_STORAGE_KEY);
  }

  if (window.supabaseClient && !authListenerBound) {
    authListenerBound = true;
    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
      canCreateThread = true;

      if (!session) {
        currentThreadId = null;
        localStorage.removeItem(THREAD_ID_STORAGE_KEY);
        lastDualResponse = null;
        hasVoted = false;
        arenaResults && (arenaResults.hidden = true);
        chatResults && (chatResults.hidden = true);
        arenaVoting && (arenaVoting.hidden = true);
        if (chatMessages) chatMessages.innerHTML = '';
        if (arenaGrid) arenaGrid.innerHTML = '';
      }

      await loadThreads();
      if (session) {
        loadModels(true);
      }
    });
  }

  updateModelPickerVisibility();
  if (currentMode === 'sidebyside') {
    loadModels();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initApp();

  requestAnimationFrame(() => {
    document.documentElement.classList.add('ui-ready');
  });

  const inlineLb = document.querySelector('.subtitle a');
  if (inlineLb) {
    inlineLb.addEventListener('click', (e) => {
      e.preventDefault();
      openLeaderboardModal();
    });
  }
});
