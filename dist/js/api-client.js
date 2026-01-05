/**
 * API Client with Supabase Auth Integration
 * Automatically adds auth headers to all API requests
 * Handles token refresh and error responses
 */

export class APIClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.timeout = window.DUALMIND_CONFIG?.api?.timeout || 30000;
    this.retryAttempts = window.DUALMIND_CONFIG?.api?.retryAttempts || 2;
    this.retryDelay = window.DUALMIND_CONFIG?.api?.retryDelay || 1000;
  }

  /**
   * Get authorization headers with Supabase token
   */
  async getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    try {
      // Try to get Supabase auth service
      const { getSupabaseAuthService } = await import('/js/supabase-auth.js');
      const auth = getSupabaseAuthService();
      const token = await auth.getAccessToken();

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Could not get Supabase auth token:', error);
      
      // Fallback to stored token
      const storedToken = window.DUALMIND_AUTH_TOKEN || localStorage.getItem('dualmind.auth.token');
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }
    }

    // Add user ID if available
    try {
      const { getSupabaseAuthService } = await import('/js/supabase-auth.js');
      const auth = getSupabaseAuthService();
      const userId = auth.getUserId();
      if (userId) {
        headers['X-User-ID'] = userId;
      }
    } catch (error) {
      // Continue without user ID header
    }

    return headers;
  }

  /**
   * Make a GET request
   */
  async get(path, options = {}) {
    return this._request('GET', path, null, options);
  }

  /**
   * Make a POST request
   */
  async post(path, data, options = {}) {
    return this._request('POST', path, data, options);
  }

  /**
   * Make a PUT request
   */
  async put(path, data, options = {}) {
    return this._request('PUT', path, data, options);
  }

  /**
   * Make a PATCH request
   */
  async patch(path, data, options = {}) {
    return this._request('PATCH', path, data, options);
  }

  /**
   * Make a DELETE request
   */
  async delete(path, options = {}) {
    return this._request('DELETE', path, null, options);
  }

  /**
   * Internal request method with retry logic
   */
  async _request(method, path, data, options = {}, attempt = 1) {
    const url = `${this.baseUrl}${path}`;
    
    try {
      const headers = await this.getAuthHeaders();
      Object.assign(headers, options.headers || {});

      const fetchOptions = {
        method,
        headers,
        signal: AbortSignal.timeout(this.timeout),
        ...options,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(data);
      }

      // Log API call in debug mode
      if (window.DUALMIND_CONFIG?.debug?.logApiCalls) {
        console.log(`[API] ${method} ${path}`);
      }

      const response = await fetch(url, fetchOptions);
      const responseData = await this._parseResponse(response);

      if (!response.ok) {
        // Handle 401 - Unauthorized
        if (response.status === 401) {
          try {
            const { getSupabaseAuthService } = await import('/js/supabase-auth.js');
            const auth = getSupabaseAuthService();
            await auth.logout();
            window.location.href = '/login.html';
          } catch (error) {
            console.error('Could not logout:', error);
          }
        }

        throw new APIError(
          responseData.message || responseData.error || `HTTP ${response.status}`,
          response.status,
          responseData
        );
      }

      if (window.DUALMIND_CONFIG?.debug?.logApiCalls) {
        console.log(`[API] ✓ ${method} ${path}`, responseData);
      }

      return responseData;
    } catch (error) {
      // Retry on network errors (but not on client errors like 400, 401, etc.)
      if (
        attempt < this.retryAttempts &&
        (error instanceof TypeError || // Network error
          (error instanceof APIError && error.status >= 500)) // Server error
      ) {
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * attempt)
        );
        return this._request(method, path, data, options, attempt + 1);
      }

      if (window.DUALMIND_CONFIG?.debug?.logApiCalls) {
        console.error(`[API] ✗ ${method} ${path}`, error);
      }

      throw error;
    }
  }

  /**
   * Parse response body
   */
  async _parseResponse(response) {
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
  async uploadFile(path, file, options = {}) {
    const url = `${this.baseUrl}${path}`;

    try {
      const headers = await this.getAuthHeaders();
      delete headers['Content-Type']; // Let browser set multipart boundary

      const formData = new FormData();
      formData.append('file', file);

      // Add additional fields if provided
      if (options.data) {
        Object.entries(options.data).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: AbortSignal.timeout(this.timeout * 2), // Longer timeout for uploads
        ...options,
      });

      return await this._parseResponse(response);
    } catch (error) {
      throw new APIError(
        `File upload failed: ${error.message}`,
        0,
        error
      );
    }
  }
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(message, status = 0, data = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Create API client instance
 */
export function createAPIClient(baseUrl) {
  if (!baseUrl) {
    baseUrl = window.DUALMIND_CONFIG?.serverUrl || 'http://localhost:65476';
  }
  return new APIClient(baseUrl);
}

// Auto-export singleton instance
let apiClient = null;

export function getAPIClient() {
  if (!apiClient) {
    const baseUrl = window.DUALMIND_CONFIG?.serverUrl || 'http://localhost:65476';
    apiClient = createAPIClient(baseUrl);
  }
  return apiClient;
}

// Global access
window.APIClient = APIClient;
window.createAPIClient = createAPIClient;
window.getAPIClient = getAPIClient;

export default APIClient;
