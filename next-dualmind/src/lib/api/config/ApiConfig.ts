/**
 * API Configuration
 * Creates merged config with defaults
 * @module lib/api/config/ApiConfig
 */

interface Config {
  baseUrl?: string;
  timeout?: number;
  debug?: boolean;
  auth?: {
    allowGuest?: boolean;
  };
  retry?: {
    attempts?: number;
    delay?: number;
  };
}

const isServer = typeof window === 'undefined';

const DEFAULTS = {
    // Backend URL - same as original
    baseUrl: isServer
        ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5079')
        : (process.env.NEXT_PUBLIC_BACKEND_URL ||
           (typeof window !== 'undefined' && window.location?.hostname === 'localhost'
               ? 'http://localhost:5079'
               : 'https://api.dualmindlab.tech')),
    timeout: 30000,
    debug: false,
    auth: {
        allowGuest: false, // No guest mode - require authentication
    },
    retry: {
        attempts: 2,
        delay: 1000,
    },
};

/**
 * Create merged configuration
 * @param {Object} userConfig - User overrides
 * @returns {Object} Merged config
 */
export function createConfig(userConfig: Config = {}) {
    return {
        ...DEFAULTS,
        ...userConfig,
        auth: { ...DEFAULTS.auth, ...(userConfig.auth || {}) },
        retry: { ...DEFAULTS.retry, ...(userConfig.retry || {}) },
    };
}

export default createConfig;
