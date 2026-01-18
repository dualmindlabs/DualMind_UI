/**
 * DualMind API Configuration
 * Centralized configuration for the API client
 * @module api/config/ApiConfig
 */

/**
 * Default API configuration
 * @typedef {Object} ApiConfig
 * @property {string} baseUrl - Base URL for the API
 * @property {number} timeout - Request timeout in milliseconds
 * @property {number} retryAttempts - Number of retry attempts on failure
 * @property {number} retryDelay - Base delay between retries in milliseconds
 * @property {boolean} debug - Enable debug logging
 */

/**
 * Get the configured API base URL
 * @returns {string} The API base URL
 */
export function getApiBaseUrl() {
    // Priority: window.DUALMIND_CONFIG > localStorage > default
    const configured =
        window.DUALMIND_CONFIG?.apiBaseUrl ||
        window.DUALMIND_CONFIG?.backendUrl ||
        window.DUALMIND_CONFIG?.serverUrl ||
        localStorage.getItem('dualmind.api.baseUrl') ||
        'http://localhost:5079';

    return String(configured).trim().replace(/\/+$/, '');
}

/**
 * Default API configuration
 */
export const defaultConfig = {
    baseUrl: getApiBaseUrl(),
    timeout: 30000, // 30 seconds
    retryAttempts: 2,
    retryDelay: 1000, // 1 second base delay
    debug: window.DUALMIND_CONFIG?.debug?.logApiCalls || false,
};

/**
 * Merge user config with defaults
 * @param {Partial<ApiConfig>} userConfig - User-provided configuration
 * @returns {ApiConfig} Merged configuration
 */
export function createConfig(userConfig = {}) {
    return {
        ...defaultConfig,
        ...userConfig,
        baseUrl: (userConfig.baseUrl || defaultConfig.baseUrl).replace(/\/+$/, ''),
    };
}

export default {
    getApiBaseUrl,
    defaultConfig,
    createConfig,
};
