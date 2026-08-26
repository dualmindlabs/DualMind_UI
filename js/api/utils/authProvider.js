/**
 * DualMind Auth Token Provider
 * Handles authentication token retrieval from Supabase
 * @module api/utils/authProvider
 */

/**
 * Get auth token from Supabase (multiple strategies)
 * @returns {Promise<string|null>} JWT token or null
 */
export async function getAuthToken() {
    // 1. Direct Supabase session check (most reliable) - CHECK FIRST
    if (window._DUALMIND_AUTH) {
        try {
            const token = await window._DUALMIND_AUTH.getAccessToken();
            if (token && token.trim()) {
                return token.trim();
            }
        } catch (err) {
            console.warn('[authProvider] Failed to get token from _DUALMIND_AUTH:', err);
        }
    }

    // 2. Global DualMindAuth (if available)
    if (window.DualMindAuth?.getAccessToken) {
        try {
            const token = await window.DualMindAuth.getAccessToken();
            if (token && token.trim()) {
                return token.trim();
            }
        } catch (err) {
            console.warn('[authProvider] Failed to get token from DualMindAuth:', err);
        }
    }

    // 3. Optional custom hook
    if (typeof window.getSupabaseAccessToken === 'function') {
        try {
            const token = await window.getSupabaseAccessToken();
            if (token && token.trim()) {
                return token.trim();
            }
        } catch { /* ignore */ }
    }

    // 5. LocalStorage fallback (most reliable for persistence)
    const token = getLocalStorageToken();
    if (token && token.trim()) {
        return token.trim();
    }

    // 6. Guest Mode (EXPLICIT ONLY)
    // Only use anon key if guest mode is explicitly enabled via config
    if (window.DUALMIND_CONFIG?.auth?.allowGuest) {
        return window.DUALMIND_CONFIG.supabase?.anonKey || null;
    }

    return null;
}

function getLocalStorageToken() {
    const candidates = [
        'dualmind.auth.supabase', // Key used by login/index.html
        'dualmind.auth.token',
        'supabase.auth.token',
        'sb-access-token',
    ];

    // Also scan for Supabase v2 keys: sb-<ref>-auth-token
    for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            candidates.push(key);
        }
    }

    for (const key of candidates) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        // Direct JWT token
        if (raw.startsWith('eyJ')) return raw.trim();

        // Parse JSON structures
        try {
            const parsed = JSON.parse(raw);

            // Multiple possible structures
            const token =
                parsed?.access_token ||
                parsed?.session?.access_token ||
                parsed?.currentSession?.access_token;

            if (token && typeof token === 'string' && token.startsWith('eyJ')) {
                return token.trim();
            }
        } catch { /* ignore parse errors */ }
    }

    return null;
}

export async function isAuthenticated() {
    const token = await getAuthToken();
    return !!token;
}

export async function getUserId() {
    return window.DualMindAuth?.getUser?.()?.id || null;
}

export default {
    getAuthToken,
    isAuthenticated,
    getUserId,
};
