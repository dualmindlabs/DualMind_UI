/**
 * DualMind API Singleton Instance for Next.js
 * EXACT COPY of original apiInstance.js
 * @module lib/api/apiInstance
 */

import { DualMindApi } from './DualMindApi';

// Backend URL - same as original config.js
const getBackendUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side - use env variable
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5079';
  }
  // Client-side
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1';
  
  return isLocalhost ? 'http://localhost:5079' : 'https://api.dualmindlab.tech';
};

// Create singleton
export const api = new DualMindApi({
  baseUrl: getBackendUrl(),
  debug: false,
  auth: {
    allowGuest: false // No guest mode - require authentication
  }
});

export default api;
