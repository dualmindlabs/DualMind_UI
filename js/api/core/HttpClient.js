/**
 * DualMind HTTP Client
 * Core HTTP client with auth, retries, abort, and separate SSE/Raw streaming
 * @module api/core/HttpClient
 */

import { getAuthToken } from '../utils/authProvider.js';
import {
    ApiError,
    TimeoutError,
    NetworkError,
    normalizeError,
    createErrorFromStatus,
} from '../utils/errors.js';

/**
 * @typedef {Object} HttpClientConfig
 * @property {string} baseUrl - Base URL for API
 * @property {number} [timeout=30000] - Request timeout in ms
 * @property {number} [retryAttempts=2] - Number of retry attempts
 * @property {number} [retryDelay=1000] - Base retry delay in ms
 * @property {boolean} [debug=false] - Enable debug logging
 * @property {Object} [auth] - Auth configuration
 * @property {Function} [auth.getToken] - Custom token getter
 */

/**
 * @typedef {Object} HttpClientDeps
 * @property {Function} [fetchImpl] - Custom fetch implementation
 */

/**
 * Core HTTP Client for DualMind API
 */
export class HttpClient {
    /**
     * @param {HttpClientConfig} config - Configuration
     * @param {HttpClientDeps} [deps] - Dependencies
     */
    constructor(config, deps = {}) {
        this.baseUrl = config.baseUrl.replace(/\/+$/, '');
        this.timeout = config.timeout ?? 30000;
        this.retryAttempts = config.retryAttempts ?? 2;
        this.retryDelay = config.retryDelay ?? 1000;
        this.debug = config.debug ?? false;

        this.getAuthToken = config.auth?.getToken || deps.getAuthToken || getAuthToken;
        this.fetchImpl = deps.fetchImpl || globalThis.fetch.bind(globalThis);
    }

    /**
     * Build full URL from path
     * @param {string} path - API path
     * @returns {string} Full URL
     */
    buildUrl(path) {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.baseUrl}${cleanPath}`;
    }

    /**
     * Build headers with auth token
     * @param {Object} [customHeaders] - Additional headers
     * @returns {Promise<Headers>} Headers object
     */
    async buildHeaders(customHeaders = {}) {
        const headers = new Headers({
            'Content-Type': 'application/json',
            ...customHeaders,
        });

        const token = await this.getAuthToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
            if (this.debug) {
                console.log(`[HttpClient] Token attached: ${token.substring(0, 10)}... (Length: ${token.length})`);
            }
        } else {
            console.warn('[HttpClient] No token retrieved!');
            console.warn('[HttpClient] Auth checks:', {
                _DUALMIND_AUTH: !!window._DUALMIND_AUTH,
                DualMindAuth: !!window.DualMindAuth,
                localStorage_dualmind: !!localStorage.getItem('dualmind.auth.supabase')
            });
        }

        return headers;
    }

    /**
     * Log debug message
     * @param {...any} args - Log arguments
     */
    log(...args) {
        if (this.debug) {
            const ts = new Date().toISOString().substring(11, 23);
            console.log(`[API ${ts}]`, ...args);
        }
    }

    /**
     * Calculate retry delay with exponential backoff + jitter
     * @param {number} attempt - Current attempt (0-indexed)
     * @returns {number} Delay in ms
     */
    getRetryDelay(attempt) {
        const exponential = this.retryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * exponential; // 0-30% jitter
        return Math.min(exponential + jitter, 30000); // Cap at 30s
    }

    /**
     * Check if error is retryable
     * @param {Error} error - Error to check
     * @returns {boolean} True if retryable
     */
    isRetryable(error) {
        if (error instanceof ApiError) {
            return error.isRetryable;
        }
        // Network errors are retryable
        if (error?.name === 'TypeError') return true;
        return false;
    }

    /**
     * Safe JSON parse
     * @param {string} str - String to parse
     * @returns {any} Parsed object or null
     */
    safeJsonParse(str) {
        try {
            return JSON.parse(str);
        } catch {
            return null;
        }
    }

    /**
     * Make HTTP request with retries and abort support
     */
    async request(method, path, options = {}) {
        const url = this.buildUrl(path);
        const { body, headers: customHeaders, timeout, retry = true, signal } = options;

        this.log(`→ ${method} ${path}`);

        const headers = await this.buildHeaders(customHeaders);
        const timeoutMs = timeout ?? this.timeout;
        const maxAttempts = retry ? this.retryAttempts + 1 : 1;

        let lastError;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            // Link external signal
            if (signal) {
                if (signal.aborted) {
                    clearTimeout(timeoutId);
                    throw new TimeoutError('Request aborted');
                }
                signal.addEventListener('abort', () => controller.abort(), { once: true });
            }

            try {
                const fetchOptions = {
                    method,
                    headers,
                    signal: controller.signal,
                };

                if (body !== undefined) {
                    fetchOptions.body = JSON.stringify(body);
                }

                const response = await this.fetchImpl(url, fetchOptions);
                clearTimeout(timeoutId);

                this.log(`← ${response.status} ${method} ${path}`);

                // Parse response
                let data;
                if (options.responseType === 'blob') {
                    data = await response.blob();
                } else {
                    const text = await response.text();
                    data = text ? this.safeJsonParse(text) : null;
                }

                // Handle errors
                if (!response.ok) {
                    const error = createErrorFromStatus(response.status, data, response.headers);

                    if (!error.isRetryable) {
                        throw error;
                    }

                    lastError = error;
                    throw error; // Trigger retry logic below
                }

                return data;
            } catch (error) {
                clearTimeout(timeoutId);

                // Normalize error
                const normalized = error instanceof ApiError ? error : normalizeError(error);

                // Don't retry aborts
                if (normalized?.name === 'TimeoutError' && signal?.aborted) {
                    throw normalized;
                }

                lastError = normalized;

                // Check retry conditions
                const isLastAttempt = attempt >= maxAttempts - 1;
                const canRetry = this.isRetryable(normalized);

                if (!canRetry || isLastAttempt) {
                    throw normalized;
                }

                // Wait before retry
                const delay = this.getRetryDelay(attempt);
                this.log(`⟳ Retry ${attempt + 1}/${maxAttempts} in ${Math.round(delay)}ms`);
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    async get(path, options = {}) { return this.request('GET', path, options); }
    async post(path, body, options = {}) { return this.request('POST', path, { ...options, body }); }
    async put(path, body, options = {}) { return this.request('PUT', path, { ...options, body }); }
    async patch(path, body, options = {}) { return this.request('PATCH', path, { ...options, body }); }
    async delete(path, options = {}) { return this.request('DELETE', path, options); }

    /**
     * Streaming POST request
     * Does NOT retry automatically (to avoid dupes)
     */
    async *stream(path, body, options = {}) {
        const url = this.buildUrl(path);
        const { signal } = options;

        this.log(`→ STREAM ${path}`);

        const headers = await this.buildHeaders({
            'Accept': 'text/event-stream',
        });

        const controller = new AbortController();

        if (signal) {
            if (signal.aborted) throw new TimeoutError('Stream aborted');
            signal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        let response;
        try {
            response = await this.fetchImpl(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        } catch (error) {
            // Clean handling of abort
            if (signal?.aborted || error.name === 'AbortError') {
                return; // Exit cleanly on abort
            }
            throw normalizeError(error);
        }

        this.log(`← ${response.status} STREAM ${path}`);

        if (!response.ok) {
            const text = await response.text();
            const data = this.safeJsonParse(text);
            throw createErrorFromStatus(response.status, data, response.headers);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Check if distinct SSE or raw text
        const contentType = response.headers.get('content-type') || '';
        const isSSE = contentType.includes('text/event-stream');

        try {
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const textChunk = decoder.decode(value, { stream: true });

                if (isSSE) {
                    // --- SSE PARSING START ---
                    buffer += textChunk;
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;

                        const jsonStr = trimmed.substring(6);
                        if (jsonStr === '[DONE]') continue;

                        try {
                            const event = JSON.parse(jsonStr);

                            if (event.object === 'ai.error') {
                                throw new ApiError(event.message || 'Stream error', 500, event);
                            }

                            if (event.object === 'ai.stream.delta') {
                                const text = event.delta?.text || '';
                                if (text) yield text;
                            }

                            if (event.object === 'ai.stream.done') {
                                return;
                            }
                        } catch (err) {
                            if (err instanceof ApiError) throw err;
                            // Ignore parse errors from partial JSON
                        }
                    }
                    // --- SSE PARSING END ---
                } else {
                    // RAW TEXT MODE
                    yield textChunk;
                }
            }
        } catch (error) {
            if (signal?.aborted || error.name === 'AbortError') {
                return; // Exit cleanly
            }
            throw normalizeError(error);
        } finally {
            reader.releaseLock();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default HttpClient;
