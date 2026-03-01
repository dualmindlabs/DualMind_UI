/**
 * DualMind Response Extractors
 * Helpers to normalize backend responses into clean UI objects
 * @module api/utils/extractors
 */

/**
 * Extract clean chat response from backend payload
 * @param {Object} data - Raw backend response
 * @returns {Object} Normalized chat response
 */
export function extractChatResponse(data) {
    if (!data) {
        return createEmptyChatResponse();
    }

    let text = '';

    // 1. Try canonical output.content[] (preferred)
    if (data.output?.content && Array.isArray(data.output.content)) {
        const textContent = data.output.content.find(c => c.type === 'output_text');
        text = textContent?.text || '';
    }

    // 2. Fallback to message field
    if (!text && data.message) {
        text = data.message;
    }

    // 3. Fallback to text field
    if (!text && data.text) {
        text = data.text;
    }

    return {
        text: text || '',
        message: text || '', // Alias for compatibility
        model: data.model || null,
        usage: data.usage || null,
        finishReason: data.finishReason || data.finish_reason || null,
        responseTimeMs: data.responseTimeMs || null,
        timestamp: data.timestamp || null,
    };
}

/**
 * Extract dual chat response
 * @param {Object} data - Raw backend response
 * @returns {Object} Normalized dual chat response
 */
export function extractDualChatResponse(data) {
    return {
        agent1: extractChatResponse(data?.agent1),
        agent2: extractChatResponse(data?.agent2),
        arena: data?.arena || null,
        comparisonId: data?.comparisonId || null,
    };
}

/**
 * Create empty/default chat response
 * @returns {Object} Empty response object
 */
export function createEmptyChatResponse() {
    return {
        text: '',
        message: '',
        model: null,
        usage: null,
        finishReason: null,
        responseTimeMs: null,
        timestamp: null,
    };
}

export default {
    extractChatResponse,
    extractDualChatResponse,
    createEmptyChatResponse,
};
