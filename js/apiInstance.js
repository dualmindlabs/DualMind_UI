/**
 * DualMind API Singleton Instance
 * 
 * This is the recommended way to import the API in the UI.
 * It ensures a single configuration point and shared state.
 * 
 * @example
 * import { api } from './apiInstance.js';
 * await api.arena.chat('Hello');
 */

import { DualMindApi } from './api/DualMindApi.js';

// Create singleton with window config
export const api = new DualMindApi({
    baseUrl: window.DUALMIND_CONFIG?.backendUrl ||
        window.DUALMIND_CONFIG?.apiBaseUrl ||
        'http://localhost:5079',
    debug: window.DUALMIND_CONFIG?.debug?.logApiCalls || false,
    auth: {
        allowGuest: true // Default to true for now to match legacy behavior
    }
});

// Expose on window for legacy scripts
if (typeof window !== 'undefined') {
    window.DualMindApiInstance = api;
}
