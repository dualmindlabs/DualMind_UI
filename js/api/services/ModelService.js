/**
 * DualMind Model Service
 * Handles AI model listing and information
 * @module api/services/ModelService
 */

/**
 * Model Service - AI model operations
 */
export class ModelService {
    /**
     * @param {import('../core/HttpClient.js').HttpClient} httpClient - HTTP client instance
     */
    constructor(httpClient) {
        this.http = httpClient;
    }

    /**
     * Get all available models
     * @returns {Promise<Array>} Array of model objects
     */
    async getModels() {
        const data = await this.http.get('/api/models');
        return data.items || data || [];
    }

    /**
     * Get single model by ID
     * @param {string} modelId - Model ID
     * @returns {Promise<Object>} Model object
     */
    async getModel(modelId) {
        return this.http.get(`/api/models/${modelId}`);
    }
}

export default ModelService;
