/**
 * DualMind API Client (minimal, UI-friendly)
 * - Uses Supabase JWT via Authorization: Bearer <token>
 * - Base URL defaults to same-origin (""), but can be overridden via window.DUALMIND_API_BASE_URL
 */
export class DualMindApiClient {
  constructor({ baseUrl = '', getAuthToken } = {}) {
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.getAuthToken = typeof getAuthToken === 'function' ? getAuthToken : defaultGetAuthToken;
  }

  async _request(path, { method = 'GET', body } = {}) {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const token = await this.getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const logApiCalls = !!window.DUALMIND_CONFIG?.debug?.logApiCalls;
      if (logApiCalls) {
        console.log(`[DualMind API] ${method} ${url}`);
      }

      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const traceId = res.headers.get('x-trace-id') || res.headers.get('x-request-id') || null;

      const text = await res.text();
      const data = text ? safeJsonParse(text) : null;

      if (logApiCalls) {
        const bodyTraceId = data?.traceId || data?.data?.traceId || null;
        console.log(`[DualMind API] ${res.status} ${method} ${url}${traceId || bodyTraceId ? ` (traceId=${traceId || bodyTraceId})` : ''}`);
      }

      if (!res.ok) {
        const msg =
          data?.message ||
          data?.error ||
          (typeof data === 'string' ? data : null) ||
          `Request failed (${res.status})`;
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (error) {
      // Handle network errors (backend not available)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.warn(`⚠️ Backend not available for ${method} ${path}`);
        throw new Error('Backend server is not available. Running in offline mode.');
      }

      // Handle timeout errors
      if (error.name === 'AbortError') {
        console.warn(`⏰ Request timeout for ${method} ${path}`);
        throw new Error('Request timed out. Backend may be unavailable.');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async health() {
    try {
      return await this._request('/api/health', { method: 'GET' });
    } catch (e) {
      return await this._request('/health', { method: 'GET' });
    }
  }

  // Battle: 1 prompt -> 2 model replies + comparisonId
  async dualChat(prompt, opts = {}) {
    return this._request('/api/arena/dualchat', {
      method: 'POST',
      body: {
        prompt,
        system: opts.system,
        maxTokens: opts.maxTokens,
        selectionMode: opts.selectionMode, // "random" | "topper"
        model1: opts.model1,
        model2: opts.model2,
        battleId: opts.battleId, // UUID for linking
        threadId: opts.threadId,
        threadId: opts.threadId,
        userId: opts.userId || undefined,
        temperature: opts.temperature
      },
    });
  }

  // Direct: 1 prompt -> 1 reply
  async chat(prompt, opts = {}) {
    return this._request('/api/arena/chat', {
      method: 'POST',
      body: {
        prompt,
        system: opts.system,
        maxTokens: opts.maxTokens,
        model: opts.model, // or "auto"
        threadId: opts.threadId,
        threadId: opts.threadId,
        userId: opts.userId || undefined,
        temperature: opts.temperature
      },
    });
  }

  async submitVote({ comparisonId, voteChoice, userId }) {
    return this._request('/api/arena/model-vote', {
      method: 'POST',
      body: {
        comparisonId,
        voteChoice, // 'left' | 'right' | 'tie' | 'both-bad'
        userId: userId || undefined,
      },
    });
  }

  async getLeaderboard() {
    // Returns: { items: ModelStatsDto[] }
    return this._request('/api/arena/model-stats', {
      method: 'GET',
    });
  }

  async createThread(title, userId = null) {
    return this._request('/api/threads', {
      method: 'POST',
      body: {
        title,
        userId: userId || undefined,
      },
    });
  }

  async syncUser(userData) {
    return this._request('/api/users/sync', {
      method: 'POST',
      body: userData,
    });
  }

  async getThreads(limit = 20, userId = null) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (userId) params.append('userId', userId);
    return this._request(`/api/threads?${params}`, {
      method: 'GET',
    });
  }

  async getThreadMessages(threadId) {
    return this._request(`/api/threads/${threadId}/messages`, {
      method: 'GET',
    });
  }

  async updateThread(threadId, title) {
    return this._request(`/api/threads/${threadId}`, {
      method: 'PATCH',
      body: { title },
    });
  }

  async deleteThread(threadId) {
    return this._request(`/api/threads/${threadId}`, {
      method: 'DELETE',
    });
  }

  async getModels() {
    return this._request('/api/models', {
      method: 'GET',
    });
  }

  async textToSpeech(text, voice = 'Celeste-PlayAI') {
    const url = `${this.baseUrl}/api/speech/generate`; // Correct endpoint
    const token = await this.getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voice }),
    });

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.statusText}`);
    }

    // Return audio blob
    return await response.blob();
  }
}

export function getApiBaseUrl() {
  const configured =
    window.DUALMIND_CONFIG?.apiBaseUrl ||
    window.DUALMIND_CONFIG?.backendUrl ||
    window.DUALMIND_API_BASE_URL ||
    'https://api.dualmindlab.tech';

  const override = window.DUALMIND_CONFIG?.dev?.apiBaseUrlOverride;
  if (typeof override === 'string' && override.trim()) {
    return override.trim().replace(/\/+$/, '');
  }

  return String(configured || '').trim().replace(/\/+$/, '');
}

export async function defaultGetAuthToken() {
  // 1) Explicit injection (easiest for local dev)
  if (typeof window.DUALMIND_AUTH_TOKEN === 'string' && window.DUALMIND_AUTH_TOKEN.trim()) {
    return window.DUALMIND_AUTH_TOKEN.trim();
  }

  // 2) Optional hook (if you later wire Supabase client in the UI)
  if (typeof window.getSupabaseAccessToken === 'function') {
    try {
      const t = await window.getSupabaseAccessToken();
      if (typeof t === 'string' && t.trim()) return t.trim();
    } catch {
      // ignore
    }
  }

  // 3) Common localStorage patterns (best-effort)
  const candidates = [
    'dualmind.auth.token',
    'supabase.auth.token',
    'sb-access-token',
  ];
  for (const key of candidates) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    // raw token
    if (raw.startsWith('eyJ')) return raw;

    // JSON containers (Supabase varies by version)
    const parsed = safeJsonParse(raw);
    const token =
      parsed?.access_token ||
      parsed?.currentSession?.access_token ||
      parsed?.session?.access_token ||
      parsed?.data?.session?.access_token;
    if (typeof token === 'string' && token.trim()) return token.trim();
  }

  // 4) Fallback to Supabase Anon Key (for guest access)
  if (window.DUALMIND_CONFIG?.supabase?.anonKey) {
    return window.DUALMIND_CONFIG.supabase.anonKey;
  }

  return null;
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export default DualMindApiClient;


