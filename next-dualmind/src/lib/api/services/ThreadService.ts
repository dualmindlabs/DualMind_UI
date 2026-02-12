/**
 * DualMind Thread Service
 * Handles thread and message management - EXACT COPY for Next.js
 * @module lib/api/services/ThreadService
 */

import { HttpClient } from '../core/HttpClient';

export class ThreadService {
  private http: HttpClient;

  /**
   * @param {HttpClient} httpClient - HTTP client instance
   */
  constructor(httpClient: HttpClient) {
    this.http = httpClient;
  }

  /**
   * Get list of threads
   * @param {number} [limit=20] - Number of threads to fetch
   * @param {string} [userId] - Filter by user ID
   * @returns {Promise<Array>} Array of threads
   */
  async getThreads(limit = 20, userId?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });

    const data = await this.http.get(`/api/threads?${params}`);
    return (data as any).items || data || [];
  }

  /**
   * Get single thread by ID
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Thread object
   */
  async getThread(threadId: string) {
    return this.http.get(`/api/threads/${threadId}`);
  }

  /**
   * Get messages in a thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<Array>} Array of messages
   */
  async getThreadMessages(threadId: string) {
    const data = await this.http.get(`/api/threads/${threadId}/messages`);
    return (data as any).items || data || [];
  }

  /**
   * Create new thread
   * @param {string} title - Thread title
   * @param {string} [userId] - User ID (Ignored by backend)
   * @returns {Promise<Object>} Created thread
   */
  async createThread(title: string, userId?: string) {
    const body: any = { title };
    return this.http.post('/api/threads', body);
  }

  /**
   * Update thread title
   * @param {string} threadId - Thread ID
   * @param {string} title - New title
   * @returns {Promise<Object>} Updated thread
   */
  async updateThread(threadId: string, title: string) {
    return this.http.patch(`/api/threads/${threadId}`, { title });
  }

  /**
   * Delete thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<void>}
   */
  async deleteThread(threadId: string) {
    return this.http.delete(`/api/threads/${threadId}`);
  }
}

export default ThreadService;
