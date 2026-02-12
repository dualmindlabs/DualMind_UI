/**
 * DualMind User Service
 * Handles user sync and profile - EXACT COPY for Next.js
 * @module lib/api/services/UserService
 */

import { HttpClient } from '../core/HttpClient';

export class UserService {
  private http: HttpClient;

  /**
   * @param {HttpClient} httpClient - HTTP client instance
   */
  constructor(httpClient: HttpClient) {
    this.http = httpClient;
  }

  /**
   * Sync user with backend database
   * @param {Object} userData - User data from auth provider
   * @returns {Promise<Object>} Synced user object
   */
  async syncUser(userData: { id: string; email: string; name?: string; avatar?: string }) {
    return this.http.post('/api/users/sync', userData);
  }

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile
   */
  async getProfile() {
    return this.http.get('/api/users/profile');
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(updates: { name?: string; avatar?: string }) {
    return this.http.patch('/api/users/profile', updates);
  }
}

export default UserService;
