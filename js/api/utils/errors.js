/**
 * DualMind API Error Classes
 * Custom error types for API operations
 * @module api/utils/errors
 */

/**
 * Base API Error
 * @extends Error
 */
export class ApiError extends Error {
    /**
     * @param {string} message - Error message
     * @param {number} [status] - HTTP status code
     * @param {any} [data] - Additional error data
     * @param {string} [code] - Error code
     */
    constructor(message, status, data, code) {
        super(message);
        this.name = 'ApiError';
        this.status = status ?? 0;
        this.data = data;
        this.code = code;
        this.timestamp = new Date().toISOString();
    }

    /** @returns {boolean} True if retryable */
    get isRetryable() {
        return this.status === 408 || this.status === 429 || this.status >= 500;
    }
}

/**
 * Authentication Error (401, 403)
 * @extends ApiError
 */
export class AuthError extends ApiError {
    constructor(message, status = 401, data) {
        super(message, status, data, 'AUTH_ERROR');
        this.name = 'AuthError';
    }
}

/**
 * Network/Connectivity Error
 * @extends ApiError
 */
export class NetworkError extends ApiError {
    constructor(message, data) {
        super(message, 0, data, 'NETWORK_ERROR');
        this.name = 'NetworkError';
    }

    get isRetryable() {
        return true;
    }
}

/**
 * Timeout Error
 * @extends ApiError
 */
export class TimeoutError extends ApiError {
    constructor(message = 'Request timed out', data) {
        super(message, 408, data, 'TIMEOUT_ERROR');
        this.name = 'TimeoutError';
    }

    get isRetryable() {
        return true;
    }
}

/**
 * Validation Error (400, 422)
 * @extends ApiError
 */
export class ValidationError extends ApiError {
    constructor(message, data) {
        super(message, 400, data, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }

    get isRetryable() {
        return false;
    }
}

/**
 * Rate Limit Error (429)
 * @extends ApiError
 */
export class RateLimitError extends ApiError {
    constructor(message = 'Rate limit exceeded', data, retryAfter) {
        super(message, 429, data, 'RATE_LIMIT_ERROR');
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }

    get isRetryable() {
        return true;
    }
}

/**
 * Normalize any error into an ApiError subclass
 * @param {Error|Response|any} error - Error to normalize
 * @param {any} [data] - Additional data
 * @returns {ApiError} Normalized error
 */
export function normalizeError(error, data) {
    // Already our error type
    if (error instanceof ApiError) {
        return error;
    }

    // Abort/timeout
    if (error?.name === 'AbortError') {
        return new TimeoutError('Request was aborted', error);
    }

    // Network fetch errors
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return new NetworkError('Unable to connect to server', error);
    }

    // Generic Error
    if (error instanceof Error) {
        return new ApiError(error.message, 0, data);
    }

    // Unknown
    return new ApiError(String(error) || 'Unknown error', 0, data);
}

/**
 * Create appropriate error from HTTP response
 * @param {number} status - HTTP status code
 * @param {any} data - Response data
 * @param {Headers} [headers] - Response headers
 * @returns {ApiError} Appropriate error instance
 */
export function createErrorFromStatus(status, data, headers) {
    const message = data?.message || data?.error || `Request failed (${status})`;

    // Auth errors
    if (status === 401 || status === 403 || status === 402) {
        return new AuthError(message, status, data);
    }

    // Validation errors
    if (status === 400 || status === 422) {
        return new ValidationError(message, data);
    }

    // Rate limit
    if (status === 429) {
        const retryAfter = headers?.get?.('Retry-After');
        return new RateLimitError(message, data, retryAfter ? parseInt(retryAfter, 10) : undefined);
    }

    // Timeout
    if (status === 408) {
        return new TimeoutError(message, data);
    }

    // Generic
    return new ApiError(message, status, data);
}

export default {
    ApiError,
    AuthError,
    NetworkError,
    TimeoutError,
    ValidationError,
    RateLimitError,
    normalizeError,
    createErrorFromStatus,
};
