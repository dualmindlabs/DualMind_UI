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
      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const text = await res.text();
      const data = text ? safeJsonParse(text) : null;

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
        threadId: opts.threadId,
        userId: opts.userId || undefined,
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
        userId: opts.userId || undefined,
      },
    });
  }

  async submitVote(comparisonId, winnerModelName, userId) {
    return this._request('/api/arena/model-vote', {
      method: 'POST',
      body: {
        comparisonId,
        winnerModelName,
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

  async getModels() {
    return this._request('/api/models', {
      method: 'GET',
    });
  }
}

export function getApiBaseUrl() {
  // Use relative URLs to go through Cloudflare Worker proxy
  // Worker will forward to https://api.dualmindlab.tech
  return '';
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


