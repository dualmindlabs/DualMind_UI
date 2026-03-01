/**
 * DualMind API Error Handling
 * Custom error classes and error normalization
 * @module api/utils/errorHandler
 */

/**
 * Base API Error class
 */
export class ApiError extends Error {
    /**
     * @param {string} message - Error message
     * @param {number} [status] - HTTP status code
     * @param {any} [data] - Additional error data
     */
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Authentication Error (401, 403)
 */
export class AuthError extends ApiError {
    constructor(message, status, data) {
        super(message, status, data);
        this.name = 'AuthError';
    }
}

/**
 * Network Error (connectivity issues)
 */
export class NetworkError extends ApiError {
    constructor(message, data) {
        super(message, 0, data);
        this.name = 'NetworkError';
    }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends ApiError {
    constructor(message, data) {
        super(message, 400, data);
        this.name = 'ValidationError';
    }
}

/**
 * Timeout Error
 */
export class TimeoutError extends ApiError {
    constructor(message, data) {
        super(message, 408, data);
        this.name = 'TimeoutError';
    }
}

/**
 * Extract error message from various response formats
 * @param {any} error - Error object or response
 * @returns {string} Normalized error message
 */
export function extractErrorMessage(error) {
    if (typeof error === 'string') return error;

    // Try common error message patterns
    return (
        error?.message ||
        error?.error ||
        error?.data?.message ||
        error?.data?.error ||
        error?.statusText ||
        'An unexpected error occurred'
    );
}

/**
 * Create appropriate error from HTTP response
 * @param {Response} response - Fetch Response object
 * @param {any} data - Parsed response data
 * @returns {ApiError} Appropriate error instance
 */
export function createErrorFromResponse(response, data) {
    const message = extractErrorMessage(data) || `Request failed (${response.status})`;
    const status = response.status;

    // Authentication errors
    if (status === 401 || status === 403) {
        return new AuthError(message, status, data);
    }

    // Validation errors
    if (status === 400 || status === 422) {
        return new ValidationError(message, data);
    }

    // Generic API error
    return new ApiError(message, status, data);
}

/**
 * Create error from network/fetch failure
 * @param {Error} error - Original error
 * @returns {NetworkError|TimeoutError} Appropriate error instance
 */
export function createNetworkError(error) {
    // Timeout errors
    if (error.name === 'AbortError') {
        return new TimeoutError('Request timed out. Backend may be unavailable.', error);
    }

    // Network connectivity errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return new NetworkError('Backend server is not available. Running in offline mode.', error);
    }

    // Generic network error
    return new NetworkError(error.message || 'Network error occurred', error);
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly message
 */
export function getUserFriendlyMessage(error) {
    if (error instanceof AuthError) {
        return 'Authentication required. Please log in again.';
    }

    if (error instanceof NetworkError) {
        return 'Unable to connect to server. Please check your internet connection.';
    }

    if (error instanceof TimeoutError) {
        return 'Request timed out. Please try again.';
    }

    if (error instanceof ValidationError) {
        return error.message; // Validation messages are usually user-friendly
    }

    return error.message || 'Something went wrong. Please try again.';
}

export default {
    ApiError,
    AuthError,
    NetworkError,
    ValidationError,
    TimeoutError,
    extractErrorMessage,
    createErrorFromResponse,
    createNetworkError,
    getUserFriendlyMessage,
};
