/**
 * DualMind API Service - LEGACY SHIM
 * @deprecated Use DualMindApi from './js/api/DualMindApi.js' instead
 */

import { DualMindApi, getApiBaseUrl } from './js/api/index.js';
import { getAuthToken } from './js/api/utils/authProvider.js';

class DualMindAPIService {
  constructor(baseUrl, getAuthTokenFn) {
    if (!DualMindAPIService._warned && window.DUALMIND_CONFIG?.debug?.logApiCalls) {
      console.warn(
        '⚠️ DualMindAPIService is deprecated. Migrate to:\n' +
        "   import { api } from './js/apiInstance.js';"
      );
      DualMindAPIService._warned = true;
    }

    this.baseUrl = baseUrl || getApiBaseUrl();
    this.getAuthToken = getAuthTokenFn || getAuthToken;
    this._api = new DualMindApi({ baseUrl: this.baseUrl, getAuthToken: this.getAuthToken });
  }

  async chatNonStreaming(prompt, options = {}) {
    return this._api.arena.chat(prompt, options);
  }

  async chatStreaming(prompt, options = {}, onChunk, onComplete, onError) {
    try {
      let accumulatedText = '';
      for await (const chunk of this._api.arena.chatStream(prompt, options)) {
        accumulatedText += chunk;
        if (onChunk) onChunk(chunk, accumulatedText);
      }
      const result = {
        text: accumulatedText,
        message: accumulatedText,
        model: null,
        finishReason: 'stop',
        usage: null,
      };
      if (onComplete) onComplete(result);
      return result;
    } catch (error) {
      if (onError) onError(error);
      throw error;
    }
  }

  async dualChat(prompt, options = {}) {
    return this._api.arena.dualChat(prompt, {
      ...options,
      selectionMode: options.battleMode || 'random'
    });
  }

  extractResponse(responseData) {
    // Basic extraction shim
    if (!responseData) return { text: '', message: '' };
    let text = responseData.message || responseData.text || '';
    if (responseData.output?.content) {
      const t = responseData.output.content.find(c => c.type === 'output_text');
      if (t) text = t.text;
    }
    return { text, message: text, model: responseData.model };
  }

  async getModels() { return this._api.models.getModels(); }
  async submitVote(comparisonId, winner, userId) { return this._api.arena.submitVote(comparisonId, winner, userId); }
  async getLeaderboard() { return this._api.arena.getLeaderboard(); }
  async getThreads(limit, userId) { return this._api.threads.getThreads(limit, userId); }
  async getThreadMessages(threadId) { return this._api.threads.getThreadMessages(threadId); }
  async createThread(title, userId) { return this._api.threads.createThread(title, userId); }
  async healthCheck() { return this._api.healthCheck(); }
}

if (typeof window !== 'undefined') window.DualMindAPIService = DualMindAPIService;
export default DualMindAPIService;
