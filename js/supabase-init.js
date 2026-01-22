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
        console.log('✅ Supabase Auth initialized successfully');

        // Check if user is logged in
        if (auth.isAuthenticated()) {
          const user = auth.getUser();
          console.log(`✅ User logged in: ${user.email}`);
        } else {
          console.log('ℹ️ No active session. Waiting for login.');
        }

        // Setup global auth reference
        window.getAuth = () => auth;

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
   * Check if user is authenticated
   */
  isLoggedIn() {
    const auth = window._DUALMIND_AUTH || window.getAuth?.();
    return auth ? auth.isAuthenticated() : false;
  },

  /**
   * Get current user
   */
  getUser() {
    const auth = window._DUALMIND_AUTH || window.getAuth?.();
    return auth ? auth.getUser() : null;
  },

  /**
   * Get user email
   */
  getUserEmail() {
    const auth = window._DUALMIND_AUTH || window.getAuth?.();
    return auth ? auth.getUserEmail() : null;
  },

  /**
   * Get user name
   */
  getUserName() {
    const auth = window._DUALMIND_AUTH || window.getAuth?.();
    return auth ? auth.getUserName() : 'User';
  },

  /**
   * Get access token
   */
  async getAccessToken() {
    const auth = window._DUALMIND_AUTH || window.getAuth?.();
    return auth ? await auth.getAccessToken() : null;
  },

  /**
   * Logout user
   */
  async logout() {
    const auth = window._DUALMIND_AUTH || window.getAuth?.();
    if (auth) {
      await auth.logout();
      window.location.href = './login/';
    }
  },

  /**
   * Redirect to login if not authenticated
   */
  requireLogin() {
    if (!this.isLoggedIn()) {
      const currentPath = window.location.pathname;
      window.location.href = './login/?redirect=' + encodeURIComponent(currentPath);
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
console.log('✅ Supabase Auth module loaded');
console.log('📖 Usage: DualMindAuth.isLoggedIn(), DualMindAuth.getUser(), etc.');
