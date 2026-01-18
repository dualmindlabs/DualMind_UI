/**
 * DualMind User Service
 * Handles user operations
 * @module api/services/UserService
 */

/**
 * User Service - User management operations
 */
export class UserService {
    /**
     * @param {import('../core/HttpClient.js').HttpClient} httpClient - HTTP client instance
     */
    constructor(httpClient) {
        this.http = httpClient;
    }

    /**
     * Sync user with backend
     * @param {Object} userData - User data from Supabase
     * @param {string} userData.id - User ID
     * @param {string} userData.email - User email
     * @param {string} [userData.full_name] - Full name
     * @param {string} [userData.avatar_url] - Avatar URL
     * @returns {Promise<Object>} Synced user object
     */
    async syncUser(userData) {
        return this.http.post('/api/users/sync', userData);
    }

    /**
     * Get current user info (from backend)
     * @returns {Promise<Object>} User object
     */
    async getCurrentUser() {
        return this.http.get('/api/users/me');
    }
}

export default UserService;
