/**
 * DualMind Thread Service
 * Handles thread and message management
 * @module api/services/ThreadService
 */

/**
 * Thread Service - Thread and message operations
 */
export class ThreadService {
    /**
     * @param {import('../core/HttpClient.js').HttpClient} httpClient - HTTP client instance
     */
    constructor(httpClient) {
        this.http = httpClient;
    }

    /**
     * Get list of threads
     * @param {number} [limit=20] - Number of threads to fetch
     * @param {string} [userId] - Filter by user ID
     * @returns {Promise<Array>} Array of threads
     */
    async getThreads(limit = 20, userId) {
        const params = new URLSearchParams({ limit: limit.toString() });
        // UserId is now handled by backend auth token
        // if (userId) params.append('userId', userId); 

        const data = await this.http.get(`/api/threads?${params}`);
        return data.items || data || [];
    }

    /**
     * Get single thread by ID
     * @param {string} threadId - Thread ID
     * @returns {Promise<Object>} Thread object
     */
    async getThread(threadId) {
        return this.http.get(`/api/threads/${threadId}`);
    }

    /**
     * Get messages in a thread
     * @param {string} threadId - Thread ID
     * @returns {Promise<Array>} Array of messages
     */
    async getThreadMessages(threadId) {
        const data = await this.http.get(`/api/threads/${threadId}/messages`);
        return data.items || data || [];
    }

    /**
     * Create new thread
     * @param {string} title - Thread title
     * @param {string} [userId] - User ID (Ignored by backend)
     * @param {string} [mode] - Thread mode (battle, arena, direct)
     * @returns {Promise<Object>} Created thread
     */
    async createThread(title, userId, mode = null) {
        const body = { title };
        if (mode) body.mode = mode;
        // UserId is handled by backend auth token
        // if (userId) body.userId = userId;

        return this.http.post('/api/threads', body);
    }

    /**
     * Update thread title
     * @param {string} threadId - Thread ID
     * @param {string} title - New title
     * @returns {Promise<Object>} Updated thread
     */
    async updateThread(threadId, title) {
        return this.http.patch(`/api/threads/${threadId}`, { title });
    }

    /**
     * Delete thread
     * @param {string} threadId - Thread ID
     * @returns {Promise<void>}
     */
    async deleteThread(threadId) {
        return this.http.delete(`/api/threads/${threadId}`);
    }
}

export default ThreadService;
