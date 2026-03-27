/**
 * Supabase Auth Auto-Initialization
 * Automatically initializes Supabase auth on page load
 * Must be included in all pages that use authentication
 */

// Create promise that resolves when auth is ready
window.DualMindAuthReady = new Promise((resolve) => {
  window._resolveDualMindAuthReady = resolve;
});

(function initSupabaseAuth() {
  // Check if already initialized
  if (window._SUPABASE_AUTH_INITIALIZED) {
    return;
  }

  window._SUPABASE_AUTH_INITIALIZED = true;

  // Load Supabase configuration
  const config = window.DUALMIND_CONFIG;

  if (!config || !config.supabase) {
    console.warn('⚠️ Supabase configuration not found. Make sure config.js is loaded first.');
    window._resolveDualMindAuthReady?.();
    return;
  }

  // Check if credentials are configured
  if (!config.supabase.url || config.supabase.url.includes('your-project')) {
    console.warn('⚠️ Supabase credentials not configured in config.js');
    console.info('ℹ️ Update config.js with your Supabase URL and API key');
    window._resolveDualMindAuthReady?.();
    return;
  }

  // Auto-initialize based on auth mode
  if (config.auth.mode === 'supabase' && config.auth.autoInitialize) {
    import('./supabase-auth.js').then(async module => {
      const { initializeSupabaseAuth } = module;

      try {
        const auth = initializeSupabaseAuth(config.supabase.url, config.supabase.anonKey);

        // Wait for auth to fully initialize
        await auth.init();

        // Expose globally
        window._DUALMIND_AUTH = auth;

        // Log status
        if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('✅ Supabase Auth initialized successfully');

        // Check if user is logged in
        if (auth.isAuthenticated()) {
          const user = auth.getUser();
          if (window.DUALMIND_CONFIG?.debug?.enabled) console.log(`✅ User logged in: ${user.email}`);
        } else {
          if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('ℹ️ No active session. Waiting for login.');
        }

        // Setup global auth reference
        window.getAuth = () => auth;

        // Initialize auth email helper if available.
        import('./resend-auth-email.js').then(() => {
          if (window.DualMindResendEmail?.registerClient) {
            window.DualMindResendEmail.registerClient(auth.supabase);
            if (window.DualMindResendEmail.syncSession) {
              window.DualMindResendEmail.syncSession(auth.getSession());
            }
          }
        }).catch((helperError) => {
          console.warn('Auth email helper not loaded:', helperError);
        });

        // Resolve the ready promise
        window._resolveDualMindAuthReady?.();
      } catch (error) {
        console.error('❌ Failed to initialize Supabase Auth:', error);
        window._resolveDualMindAuthReady?.();
      }
    }).catch(error => {
      console.error('❌ Failed to load Supabase auth module:', error);
      window._resolveDualMindAuthReady?.();
    });
  } else {
    // Auth not configured, resolve immediately
    window._resolveDualMindAuthReady?.();
  }
})();

// Setup interceptor for fetch API to add auth headers automatically
(function setupFetchInterceptor() {
  const originalFetch = window.fetch;

  window.fetch = async function (resource, config = {}) {
    // CRITICAL: Skip interceptor for Supabase API calls to prevent infinite recursion during token refresh
    const url = typeof resource === 'string' ? resource : resource.url || '';
    const supabaseConfig = window.DUALMIND_CONFIG?.supabase;
    const isSupabaseUrl = supabaseConfig && url.includes(supabaseConfig.url.replace('https://', '').replace('http://', ''));

    if (isSupabaseUrl) {
      // Skip auth injection for Supabase calls to prevent recursion
      return originalFetch.apply(this, [resource, config]);
    }

    // Add auth header if user is logged in
    try {
      const auth = window._DUALMIND_AUTH || window.getAuth?.();
      if (auth && auth.isAuthenticated()) {
        const token = await auth.getAccessToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch (error) {
      // Continue without auth if there's an error
      console.warn('Could not add auth header:', error);
    }

    return originalFetch.apply(this, [resource, config]);
  };
})();

// Convenient global functions for common operations
window.DualMindAuth = {
  /**
   * Internal reference to the service instance
   */
  _service() {
    return window._DUALMIND_AUTH || window.getAuth?.();
  },

  /**
   * Check if user is authenticated
   */
  isLoggedIn() {
    const auth = this._service();
    return auth ? auth.isAuthenticated() : false;
  },

  /**
   * Get current user
   */
  getUser() {
    const auth = this._service();
    return auth ? auth.getUser() : null;
  },

  /**
   * Get user email
   */
  getUserEmail() {
    const auth = this._service();
    return auth ? auth.getUserEmail() : null;
  },

  /**
   * Get user name
   */
  getUserName() {
    const auth = this._service();
    return auth ? auth.getUserName() : 'User';
  },

  /**
   * Get access token
   */
  async getAccessToken() {
    const auth = this._service();
    return auth ? await auth.getAccessToken() : null;
  },

  /**
   * Auth methods proxy
   */
  async signup(email, password, fullName) {
    return await this._service()?.signup(email, password, fullName);
  },

  async signupWithPhone(phone, password) {
    return await this._service()?.signupWithPhone(phone, password);
  },

  async login(email, password) {
    return await this._service()?.login(email, password);
  },

  async logout() {
    const auth = this._service();
    if (auth) {
      await auth.logout();
      window.location.href = './login-modern.html';
    }
  },

  async resetPassword(email) {
    return await this._service()?.resetPassword(email);
  },

  async signupWithEmailOtp(email, fullName) {
    return await this._service()?.signupWithEmailOtp(email, fullName);
  },

  async loginWithEmailOtp(email) {
    return await this._service()?.loginWithEmailOtp(email);
  },

  async verifyEmailOtp(email, token) {
    return await this._service()?.verifyEmailOtp(email, token);
  },

  async sendSmsOtp(phone) {
    return await this._service()?.sendSmsOtp(phone);
  },

  async verifySmsOtp(phone, token) {
    return await this._service()?.verifySmsOtp(phone, token);
  },

  async updatePhone(phone) {
    return await this._service()?.updatePhone(phone);
  },

  async updateProfile(updates) {
    return await this._service()?.updateProfile(updates);
  },

  async changePassword(newPassword) {
    return await this._service()?.changePassword(newPassword);
  },

  async signInWithOAuth(provider, redirectTo, options) {
    return await this._service()?.signInWithOAuth(provider, redirectTo, options);
  },

  /**
   * Redirect to login if not authenticated
   */
  requireLogin() {
    if (!this.isLoggedIn()) {
      const currentPath = window.location.pathname;
      window.location.href = './login-modern.html?redirect=' + encodeURIComponent(currentPath);
    }
  },

  /**
   * Add auth to fetch call
   */
  async fetchWithAuth(url, options = {}) {
    const token = await this.getAccessToken();
    const headers = options.headers || {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
  },
};

// Global shorthand
window.auth = window.DualMindAuth;

// Log initialization
if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('✅ Supabase Auth module loaded');
if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('📖 Usage: DualMindAuth.isLoggedIn(), DualMindAuth.getUser(), etc.');
