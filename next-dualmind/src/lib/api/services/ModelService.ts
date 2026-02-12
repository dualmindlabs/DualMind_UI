/**
 * DualMind Model Service
 * Handles model listing and management - EXACT COPY for Next.js
 * @module lib/api/services/ModelService
 */

import { HttpClient } from '../core/HttpClient';

export class ModelService {
  private http: HttpClient;

  /**
   * @param {HttpClient} httpClient - HTTP client instance
   */
  constructor(httpClient: HttpClient) {
    this.http = httpClient;
  }

  /**
   * Get list of available models
   * @returns {Promise<Array>} Array of models
   */
  async getModels() {
    const data = await this.http.get('/api/models');
    return (data as any)?.items || data || [];
  }

  /**
   * Get model details
   * @param {string} modelId - Model ID
   * @returns {Promise<Object>} Model details
   */
  async getModel(modelId: string) {
    return this.http.get(`/api/models/${modelId}`);
  }
}

export default ModelService;
