/**
 * Authentication Service
 * Handles login, signup, token management, and user session
 */

export class AuthService {
  constructor() {
    this.storageKey = 'dualmind.auth';
    this.user = null;
    this.token = null;
    this.init();
  }

  init() {
    // Load from localStorage
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.user = data.user;
        this.token = data.token;
        
        // Validate token expiry if present
        if (data.expiresAt && Date.now() > data.expiresAt) {
          this.logout();
        }
      } catch (e) {
        console.error('Failed to parse auth data:', e);
        this.logout();
      }
    }
  }

  getApiUrl() {
    return window.DUALMIND_CONFIG?.serverUrl || 'http://localhost:65476';
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Login failed',
        };
      }

      // Store auth data
      this.user = data.user || { email };
      this.token = data.token || data.accessToken;
      
      const expiresAt = data.expiresIn 
        ? Date.now() + (data.expiresIn * 1000)
        : Date.now() + (24 * 60 * 60 * 1000); // 24 hours default

      localStorage.setItem(this.storageKey, JSON.stringify({
        user: this.user,
        token: this.token,
        expiresAt,
      }));

      // Set global token for API client
      window.DUALMIND_AUTH_TOKEN = this.token;

      return { success: true, user: this.user };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  async signup(email, password, name) {
    try {
      const response = await fetch(`${this.getApiUrl()}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Signup failed',
        };
      }

      // Auto-login after signup
      this.user = data.user || { email, name };
      this.token = data.token || data.accessToken;
      
      const expiresAt = data.expiresIn 
        ? Date.now() + (data.expiresIn * 1000)
        : Date.now() + (24 * 60 * 60 * 1000);

      localStorage.setItem(this.storageKey, JSON.stringify({
        user: this.user,
        token: this.token,
        expiresAt,
      }));

      window.DUALMIND_AUTH_TOKEN = this.token;

      return { success: true, user: this.user };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  logout() {
    this.user = null;
    this.token = null;
    localStorage.removeItem(this.storageKey);
    delete window.DUALMIND_AUTH_TOKEN;
  }

  setGuestMode() {
    // Set a guest flag but no real auth
    this.user = { guest: true, name: 'Guest' };
    this.token = null;
    
    localStorage.setItem(this.storageKey, JSON.stringify({
      user: this.user,
      guest: true,
    }));
  }

  isAuthenticated() {
    return !!this.user || this.isGuest();
  }

  isGuest() {
    return this.user?.guest === true;
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  getUserName() {
    if (!this.user) return 'Guest';
    return this.user.name || this.user.email || 'User';
  }

  getUserInitials() {
    const name = this.getUserName();
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // For API client integration
  async getAuthToken() {
    return this.token;
  }
}

// Create singleton instance
const authService = new AuthService();

// Expose globally for API client
window.getSupabaseAccessToken = async () => {
  return authService.getToken();
};

export default authService;
