/**
 * DualMind API Client for Next.js
 * Main facade for all API services - EXACT COPY of original API
 * @module lib/api/DualMindApi
 */

import { createConfig } from './config/ApiConfig';
import { HttpClient } from './core/HttpClient';
import { ArenaService } from './services/ArenaService';
import { ThreadService } from './services/ThreadService';
import { ModelService } from './services/ModelService';
import { UserService } from './services/UserService';

/**
 * Main DualMind API Client
 */
export class DualMindApi {
  arena: ArenaService;
  threads: ThreadService;
  models: ModelService;
  users: UserService;
  http: HttpClient;
  config: ReturnType<typeof createConfig>;

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

        // Create service instances
        this.arena = new ArenaService(httpClient);
        this.threads = new ThreadService(httpClient);
        this.models = new ModelService(httpClient);
        this.users = new UserService(httpClient);
        this.http = httpClient;
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
 * @returns {DualMindApi} New API instance
 */
export function createDualMindApi(config = {}) {
    return new DualMindApi(config);
}

export default DualMindApi;
