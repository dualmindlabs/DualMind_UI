/**
 * DualMind Arena Service
 * Handles all arena/battle and chat endpoints - EXACT COPY for Next.js
 * @module lib/api/services/ArenaService
 */

import { extractChatResponse, extractDualChatResponse } from '../utils/extractors';
import { HttpClient } from '../core/HttpClient';

interface ChatOptions {
  model?: string;
  maxTokens?: number;
  system?: string;
  threadId?: string;
  userId?: string;
  temperature?: number;
  signal?: AbortSignal;
  timeout?: number;
}

interface DualChatOptions {
  model1?: string;
  model2?: string;
  maxTokens?: number;
  system?: string;
  threadId?: string;
  userId?: string;
  selectionMode?: string;
  signal?: AbortSignal;
}

interface VoteData {
  comparisonId: string;
  voteChoice?: string;
  winnerModelName?: string;
  userId?: string;
}

/**
 * Arena Service - AI battles and chat
 */
export class ArenaService {
  private http: HttpClient;

  /**
   * @param {HttpClient} httpClient - HTTP client instance
   */
  constructor(httpClient: HttpClient) {
    this.http = httpClient;
  }

  /**
   * Single model chat (non-streaming)
   */
  async chat(prompt: string, options: ChatOptions = {}) {
    const body: any = {
      prompt,
      model: options.model || 'auto',
      maxTokens: options.maxTokens || 4096,
    };

    if (options.system) body.system = options.system;
    if (options.threadId) body.threadId = options.threadId;
    if (options.userId) body.userId = options.userId;
    if (options.temperature !== undefined) body.temperature = options.temperature;

    const data = await this.http.post('/api/arena/chat', body, {
      signal: options.signal,
      timeout: options.timeout,
    });

    return extractChatResponse(data);
  }

  /**
   * Single model chat (streaming) - returns AsyncIterator
   */
  async *chatStream(prompt: string, options: ChatOptions = {}): AsyncGenerator<any> {
    const body: any = {
      prompt,
      model: options.model || 'auto',
      maxTokens: options.maxTokens || 4096,
    };

    if (options.system) body.system = options.system;
    if (options.threadId) body.threadId = options.threadId;
    if (options.userId) body.userId = options.userId;
    if (options.temperature !== undefined) body.temperature = options.temperature;

    yield* this.http.stream('/api/arena/chat/stream', body, {
      signal: options.signal,
    });
  }

  /**
   * Dual chat (battle mode - 2 models side-by-side)
   */
  async dualChat(prompt: string, options: DualChatOptions = {}) {
    const body: any = {
      prompt,
      maxTokens: options.maxTokens || 4096,
      selectionMode: options.selectionMode || 'random',
    };

    if (options.model1) body.model1 = options.model1;
    if (options.model2) body.model2 = options.model2;
    if (options.system) body.system = options.system;
    if (options.threadId) body.threadId = options.threadId;
    if (options.userId) body.userId = options.userId;

    const data = await this.http.post('/api/arena/dualchat', body, {
      signal: options.signal,
    });

    return extractDualChatResponse(data);
  }

  /**
   * Get TTS audio
   */
  async textToSpeech(text: string) {
    return this.http.post('/api/audio/tts', { text }, { responseType: 'blob' });
  }

  /**
   * Submit vote for battle
   */
  async submitVote(comparisonIdOrObj: string | VoteData, voteChoiceOrWinnerModelName?: string, userId?: string) {
    let comparisonId: string;
    let voteChoice: string | undefined;
    let winnerModelName: string | undefined;
    let uid: string | undefined;

    if (typeof comparisonIdOrObj === 'object' && comparisonIdOrObj !== null) {
      const obj = comparisonIdOrObj;
      comparisonId = obj.comparisonId;
      voteChoice = obj.voteChoice;
      winnerModelName = obj.winnerModelName;
      uid = obj.userId;
    } else {
      comparisonId = comparisonIdOrObj;
      uid = userId;

      if (voteChoiceOrWinnerModelName) {
        const known = new Set(['left', 'right', 'tie', 'both-bad']);
        if (known.has(String(voteChoiceOrWinnerModelName))) {
          voteChoice = voteChoiceOrWinnerModelName;
        } else {
          winnerModelName = voteChoiceOrWinnerModelName;
        }
      }
    }

    const body: any = { comparisonId };
    if (voteChoice) body.voteChoice = voteChoice;
    if (winnerModelName) body.winnerModelName = winnerModelName;
    if (uid) body.userId = uid;

    return this.http.post('/api/arena/model-vote', body);
  }

  /**
   * Get leaderboard (model stats)
   */
  async getLeaderboard() {
    const data = await this.http.get('/api/arena/model-stats');
    return (data as any)?.items || data || [];
  }
}

export default ArenaService;
