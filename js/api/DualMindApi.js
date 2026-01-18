/**
 * DualMind API Client
 * Main facade for all API services
 * @module api/DualMindApi
 */

import { createConfig } from './config/ApiConfig.js';
import { HttpClient } from './core/HttpClient.js';
import { ArenaService } from './services/ArenaService.js';
import { ThreadService } from './services/ThreadService.js';
import { ModelService } from './services/ModelService.js';
import { UserService } from './services/UserService.js';

/**
 * Main DualMind API Client
 */
export class DualMindApi {
    /**
     * Create new API client instance
     * @param {Object} [userConfig] - Configuration overrides (baseUrl, timeout, etc.)
     * @param {Object} [deps] - Dependencies (fetchImpl, etc.)
     */
    constructor(userConfig = {}, deps = {}) {
        // Merge config with defaults
        const config = createConfig(userConfig);

        // Create HTTP client
        const httpClient = new HttpClient(config, deps);

        /**
         * Arena service - chat, battles, voting, leaderboard
         * @type {ArenaService}
         */
        this.arena = new ArenaService(httpClient);

        /**
         * Thread service - thread and message management
         * @type {ThreadService}
         */
        this.threads = new ThreadService(httpClient);

        /**
         * Model service - list available AI models
         * @type {ModelService}
         */
        this.models = new ModelService(httpClient);

        /**
         * User service - user sync and profile
         * @type {UserService}
         */
        this.users = new UserService(httpClient);

        /**
         * Raw HTTP client for advanced usage
         * @type {HttpClient}
         */
        this.http = httpClient;

        /**
         * Current configuration
         * @type {Object}
         */
        this.config = config;
    }

    /**
     * Health check - test if backend is reachable
     * @returns {Promise<boolean>} True if backend is healthy
     */
    async healthCheck() {
        try {
            const isProxyBaseUrl = !this.config?.baseUrl;
            const primary = isProxyBaseUrl ? '/api/health' : '/health';
            const secondary = isProxyBaseUrl ? '/health' : '/api/health';

            try {
                await this.http.get(primary, { retry: false, timeout: 5000 });
                return true;
            } catch {
                await this.http.get(secondary, { retry: false, timeout: 5000 });
                return true;
            }
        } catch {
            return false;
        }
    }

    /**
     * Get API version info
     * @returns {Promise<Object>} Version info
     */
    async getVersion() {
        return this.http.get('/api/version');
    }
}

/**
 * Factory function to create API instance
 * @param {Object} [config] - Configuration
 * @param {Object} [deps] - Dependencies
 * @returns {DualMindApi} API instance
 */
export function createApi(config, deps) {
    return new DualMindApi(config, deps);
}

/**
 * Default singleton instance (auto-configured)
 * @type {DualMindApi}
 */
export const api = new DualMindApi();

export default DualMindApi;
