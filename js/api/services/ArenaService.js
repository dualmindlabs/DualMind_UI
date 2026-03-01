/**
 * DualMind Arena Service
 * Handles all arena/battle and chat endpoints
 * @module api/services/ArenaService
 */

import { extractChatResponse, extractDualChatResponse } from '../utils/extractors.js';

/**
 * Arena Service - AI battles and chat
 */
export class ArenaService {
    /**
     * @param {import('../core/HttpClient.js').HttpClient} httpClient - HTTP client instance
     */
    constructor(httpClient) {
        this.http = httpClient;
    }

    /**
     * Single model chat (non-streaming)
     */
    async chat(prompt, options = {}) {
        const body = {
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
            timeout: options.timeout, // Allow override
        });

        return extractChatResponse(data);
    }

    /**
     * Single model chat (streaming) - returns AsyncIterator
     */
    async *chatStream(prompt, options = {}) {
        const body = {
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
    async dualChat(prompt, options = {}) {
        const body = {
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
    async textToSpeech(text) {
        return this.http.post('/api/audio/tts', { text }, { responseType: 'blob' });
    }

    /**
     * Submit vote for battle
     */
    async submitVote(comparisonIdOrObj, voteChoiceOrWinnerModelName, userId) {
        let comparisonId, voteChoice, winnerModelName, uid;

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

        const body = { comparisonId };
        if (voteChoice) body.voteChoice = voteChoice;
        if (winnerModelName) body.winnerModelName = winnerModelName;
        if (uid) body.userId = uid;
        if (typeof comparisonIdOrObj === 'object' && comparisonIdOrObj.voteDurationMs != null) {
            body.voteDurationMs = comparisonIdOrObj.voteDurationMs;
        }

        return this.http.post('/api/arena/model-vote', body);
    }

    /**
     * Get leaderboard (model stats)
     */
    async getLeaderboard() {
        const data = await this.http.get('/api/arena/model-stats');
        return data?.items || data || [];
    }
}

export default ArenaService;
