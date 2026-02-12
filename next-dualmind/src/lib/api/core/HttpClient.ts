/**
 * HTTP Client with Auth Integration
 * Automatically adds auth headers to all API requests
 * Handles token refresh and error responses
 * EXACT COPY of original api-client.js for Next.js
 * @module lib/api/core/HttpClient
 */

import { APIError } from '../utils/APIError';

interface Config {
  baseUrl?: string;
  timeout?: number;
  retry?: {
    attempts?: number;
    delay?: number;
  };
  debug?: boolean;
}

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: boolean;
  signal?: AbortSignal;
  responseType?: string;
  [key: string]: any;
}

export class HttpClient {
  config: Config;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  fetchImpl: typeof fetch;

  constructor(config: Config, deps: { fetchImpl?: typeof fetch } = {}) {
    this.config = config;
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retry?.attempts || 2;
    this.retryDelay = config.retry?.delay || 1000;
    // Don't store fetch directly - call it from window to avoid 'this' binding issues
    this.fetchImpl = deps.fetchImpl || ((...args: Parameters<typeof fetch>) => fetch(...args));
  }

  /**
   * Get authorization headers with token
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      // Get token from localStorage (set by auth)
      const token = typeof window !== 'undefined' ? localStorage.getItem('dualmind.auth.token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add user ID if available
      const userId = typeof window !== 'undefined' ? localStorage.getItem('dualmind.auth.userId') : null;
      if (userId) {
        headers['X-User-ID'] = userId;
      }
    } catch (error) {
      console.warn('Could not get auth token:', error);
    }

    return headers;
  }

  /**
   * Make a GET request
   */
  async get(path: string, options: RequestOptions = {}): Promise<any> {
    return this._request('GET', path, null, options);
  }

  /**
   * Make a POST request
   */
  async post(path: string, data: any, options: RequestOptions = {}): Promise<any> {
    return this._request('POST', path, data, options);
  }

  /**
   * Make a PUT request
   */
  async put(path: string, data: any, options: RequestOptions = {}): Promise<any> {
    return this._request('PUT', path, data, options);
  }

  /**
   * Make a PATCH request
   */
  async patch(path: string, data: any, options: RequestOptions = {}): Promise<any> {
    return this._request('PATCH', path, data, options);
  }

  /**
   * Make a DELETE request
   */
  async delete(path: string, options: RequestOptions = {}): Promise<any> {
    return this._request('DELETE', path, null, options);
  }

  /**
   * Internal request method with retry logic
   */
  private async _request(method: string, path: string, data: any, options: RequestOptions, attempt: number = 1): Promise<any> {
    const baseUrl = this.config.baseUrl || '';
    const url = `${baseUrl}${path}`;

    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const headers = await this.getAuthHeaders();
      Object.assign(headers, options.headers || {});

      const fetchOptions: RequestInit = {
        method,
        headers,
      };

      // Add timeout signal
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);
      fetchOptions.signal = options.signal || controller.signal;

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(data);
      }

      // Log API call in debug mode
      if (this.config.debug) {
        console.log(`[API] ${method} ${path}`);
      }

      const response = await this.fetchImpl(url, fetchOptions);
      clearTimeout(timeoutId);

      const responseData = await this._parseResponse(response);

      if (!response.ok) {
        // Handle 401 - Unauthorized
        if (response.status === 401) {
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }

        throw new APIError(
          responseData.message || responseData.error || `HTTP ${response.status}`,
          response.status,
          responseData
        );
      }

      if (this.config.debug) {
        console.log(`[API] ✓ ${method} ${path}`, responseData);
      }

      return responseData;
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);

      // Retry on network errors (but not on client errors like 400, 401, etc.)
      if (
        attempt < this.retryAttempts &&
        options.retry !== false &&
        (error instanceof TypeError || // Network error
          (error instanceof APIError && error.status >= 500)) // Server error
      ) {
        await new Promise(resolve =>
          setTimeout(resolve, this.retryDelay * attempt)
        );
        return this._request(method, path, data, options, attempt + 1);
      }

      if (this.config.debug) {
        console.error(`[API] ✗ ${method} ${path}`, error);
      }

      throw error;
    }
  }

  /**
   * Stream response for SSE endpoints
   */
  async *stream(path: string, data: any, options: RequestOptions = {}): AsyncGenerator<any> {
    const baseUrl = this.config.baseUrl || '';
    const url = `${baseUrl}${path}`;

    const headers = await this.getAuthHeaders();
    Object.assign(headers, options.headers || {});

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout * 2);

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new APIError(`HTTP ${response.status}`, response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new APIError('No response body for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') return;
            try {
              yield JSON.parse(dataStr);
            } catch (e) {
              yield { text: dataStr };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parse response body
   */
  private async _parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else if (contentType && contentType.includes('text/')) {
      return response.text();
    } else {
      return response.blob();
    }
  }

  /**
   * Upload file
   */
  async uploadFile(path: string, file: File, options: RequestOptions = {}): Promise<any> {
    const baseUrl = this.config.baseUrl || '';
    const url = `${baseUrl}${path}`;

    try {
      const headers = await this.getAuthHeaders();
      delete (headers as Record<string, string>)['Content-Type']; // Let browser set multipart boundary

      const formData = new FormData();
      formData.append('file', file);

      // Add additional fields if provided
      if (options.data) {
        Object.entries(options.data as Record<string, string>).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2);

      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: options.signal || controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      return await this._parseResponse(response);
    } catch (error: any) {
      throw new APIError(
        `File upload failed: ${error.message}`,
        0,
        error
      );
    }
  }
}

export default HttpClient;
