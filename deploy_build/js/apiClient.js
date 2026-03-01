/**
 * DualMind API Client - LEGACY SHIM
 * @deprecated Use DualMindApi from './api/DualMindApi.js' instead
 */

import { DualMindApi, getApiBaseUrl as _getApiBaseUrl } from './api/index.js';
import { getAuthToken as _getAuthToken } from './api/utils/authProvider.js';

export class DualMindApiClient {
  constructor({ baseUrl = '', getAuthToken } = {}) {
    // Only warn if debug is enabled
    if (!DualMindApiClient._warned && window.DUALMIND_CONFIG?.debug?.logApiCalls) {
      console.warn(
        '⚠️ DualMindApiClient is deprecated. Migrate to:\n' +
        "   import { api } from './js/apiInstance.js';"
      );
      DualMindApiClient._warned = true;
    }

    this._api = new DualMindApi({
      baseUrl: baseUrl || _getApiBaseUrl(),
      getAuthToken: getAuthToken || _getAuthToken,
    });

    this.baseUrl = this._api.config.baseUrl;
    this.getAuthToken = this._api.config.getAuthToken;
  }

  // ==================== Arena Methods ====================

  async health() {
    const healthy = await this._api.healthCheck();
    return healthy ? { status: 'ok' } : null;
  }

  async dualChat(prompt, opts = {}) {
    return this._api.arena.dualChat(prompt, {
      system: opts.system,
      maxTokens: opts.maxTokens,
      selectionMode: opts.selectionMode,
      model1: opts.model1,
      model2: opts.model2,
      threadId: opts.threadId,
      userId: opts.userId,
      temperature: opts.temperature,
    });
  }

  async chat(prompt, opts = {}) {
    return this._api.arena.chat(prompt, {
      system: opts.system,
      maxTokens: opts.maxTokens,
      model: opts.model,
      threadId: opts.threadId,
      userId: opts.userId,
      temperature: opts.temperature,
    });
  }

  async submitVote({ comparisonId, voteChoice, userId }) {
    return this._api.arena.submitVote(comparisonId, voteChoice, userId);
  }

  async getLeaderboard() {
    const items = await this._api.arena.getLeaderboard();
    return { items };
  }

  // ==================== Thread Methods ====================

  async createThread(title, userId = null) {
    return this._api.threads.createThread(title, userId);
  }

  async syncUser(userData) {
    return this._api.users.syncUser(userData);
  }

  async getThreads(limit = 20, userId = null) {
    const items = await this._api.threads.getThreads(limit, userId);
    return { items };
  }

  async getThreadMessages(threadId) {
    const items = await this._api.threads.getThreadMessages(threadId);
    return { items };
  }

  async updateThread(threadId, title) {
    return this._api.threads.updateThread(threadId, title);
  }

  async deleteThread(threadId) {
    return this._api.threads.deleteThread(threadId);
  }

  // ==================== Model Methods ====================

  async getModels() {
    const items = await this._api.models.getModels();
    return { items };
  }

  // ==================== Speech (Not migrated) ====================

  async textToSpeech(text, voice = 'Celeste-PlayAI') {
    const url = `${this.baseUrl}/api/speech/generate`;
    const token = await this.getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ text, voice }) });
    if (!response.ok) throw new Error(`TTS failed: ${response.statusText}`);
    return await response.blob();
  }
}

export function getApiBaseUrl() { return _getApiBaseUrl(); }
export async function defaultGetAuthToken() { return _getAuthToken(); }
export default DualMindApiClient;
