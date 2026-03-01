/**
 * DualMind Error Messages
 * User-friendly error message mapping
 * @module api/utils/errorMessages
 */

import { ApiError, AuthError, NetworkError, TimeoutError, ValidationError, RateLimitError } from './errors.js';

/**
 * Map error to user-friendly message
 * @param {Error} error - Error object
 * @returns {string} User-friendly message
 */
export function toUserMessage(error) {
    if (error instanceof AuthError) {
        if (error.status === 403) {
            return 'You do not have permission to perform this action.';
        }
        return 'Please log in to continue.';
    }

    if (error instanceof NetworkError) {
        return 'Unable to connect to the server. Please check your internet connection.';
    }

    if (error instanceof TimeoutError) {
        return 'The request took too long. Please try again.';
    }

    if (error instanceof RateLimitError) {
        if (error.retryAfter) {
            return `Too many requests. Please wait ${error.retryAfter} seconds.`;
        }
        return 'Too many requests. Please slow down and try again.';
    }

    if (error instanceof ValidationError) {
        // Validation messages are usually specific enough
        return error.message || 'Invalid input. Please check your data.';
    }

    if (error instanceof ApiError) {
        // Server errors
        if (error.status >= 500) {
            return 'Server error. Please try again later.';
        }
        return error.message || 'Something went wrong.';
    }

    // Generic fallback
    return error?.message || 'An unexpected error occurred.';
}

/**
 * Get error details for logging
 * @param {Error} error - Error object
 * @returns {Object} Error details
 */
export function getErrorDetails(error) {
    if (error instanceof ApiError) {
        return {
            name: error.name,
            message: error.message,
            status: error.status,
            code: error.code,
            data: error.data,
            timestamp: error.timestamp,
            isRetryable: error.isRetryable,
        };
    }

    return {
        name: error?.name || 'Error',
        message: error?.message || String(error),
    };
}

export default {
    toUserMessage,
    getErrorDetails,
};
