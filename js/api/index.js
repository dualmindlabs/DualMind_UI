/**
 * DualMind API - Single Entry Point
 * @module api
 */

// Main API
export { DualMindApi, createApi, api } from './DualMindApi.js';

// Config
export { getApiBaseUrl, defaultConfig, createConfig } from './config/ApiConfig.js';

// HTTP Client
export { HttpClient } from './core/HttpClient.js';

// Services
export { ArenaService } from './services/ArenaService.js';
export { ThreadService } from './services/ThreadService.js';
export { ModelService } from './services/ModelService.js';
export { UserService } from './services/UserService.js';

// Errors
export {
    ApiError,
    AuthError,
    NetworkError,
    TimeoutError,
    ValidationError,
    RateLimitError,
    normalizeError,
    createErrorFromStatus,
} from './utils/errors.js';

// Error Messages
export { toUserMessage, getErrorDetails } from './utils/errorMessages.js';

// Auth
export { getAuthToken, isAuthenticated, getUserId } from './utils/authProvider.js';
