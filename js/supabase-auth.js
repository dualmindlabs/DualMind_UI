/**
 * Supabase Authentication Service
 * Direct integration with Supabase Auth (no backend required)
 * Provides login, signup, logout, and session management
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.0/+esm';

export class SupabaseAuthService {
  constructor(supabaseUrl, supabaseKey) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and API key are required');
    }

    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.storageKey = 'dualmind.auth.supabase';
    this.user = null;
    this.session = null;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initialized = false;
    this._initPromise = null;

    this._initPromise = this.init();
  }
  
  /**
   * Wait for initialization to complete
   */
  async waitForInit() {
    if (this._initPromise) {
      await this._initPromise;
    }
    return this.initialized;
  }

  /**
   * Initialize and restore session from localStorage
   */
  async init() {
    try {
      // First, check for existing Supabase session
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (!error && session) {
        // Valid session from Supabase
        this.session = session;
        this.user = session.user;
        this._saveSession();
        console.log('✅ Session restored from Supabase:', this.user?.email);
      } else {
        // Try to restore from localStorage
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          this.session = data.session;
          this.user = data.user;

          // Validate session and refresh if needed
          if (this.session && this.session.access_token) {
            try {
              const { data: refreshData, error: refreshError } = await this.supabase.auth.refreshSession();
              if (!refreshError && refreshData.session) {
                this.session = refreshData.session;
                this.user = refreshData.user;
                this._saveSession();
                console.log('✅ Session refreshed from localStorage:', this.user?.email);
              } else {
                // Session invalid, clear it
                console.log('❌ Session invalid, clearing');
                this.logout();
              }
            } catch (e) {
              console.warn('Session refresh failed:', e);
              this.logout();
            }
          }
        }
      }

      // Set up auth state listener
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔄 Auth state changed:', event);
        this.session = session;
        this.user = session?.user || null;
        if (session) {
          this._saveSession();
        } else {
          this._clearSession();
        }
      });
      
      this.initialized = true;
      console.log('✅ Auth initialization complete');
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.initialized = true;
      this.logout();
    }
  }

  /**
   * Sign up with email and password
   */
  async signup(email, password, fullName) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            avatar_url: null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      this.session = data.session;
      this.user = data.user;

      if (this.session) {
        this._saveSession();
      }

      return {
        success: true,
        user: this.user,
        needsEmailConfirmation: !data.session, // User needs to confirm email
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error.message || 'Signup failed',
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async login(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      this.session = data.session;
      this.user = data.user;
      this._saveSession();

      return {
        success: true,
        user: this.user,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Sign out the current user
   */
  async logout() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
      this.user = null;
      this.session = null;
      this._clearSession();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      return {
        success: true,
        message: 'Password reset email sent. Check your inbox.',
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error.message || 'Reset password failed',
      };
    }
  }

  /**
   * Sign up with email OTP
   */
  async signupWithEmailOtp(email, fullName) {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            full_name: fullName,
            avatar_url: null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      return {
        success: true,
        message: 'OTP sent to your email. Please check your inbox.',
      };
    } catch (error) {
      console.error('Email OTP signup error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP',
      };
    }
  }

  /**
   * Sign in with email OTP
   */
  async loginWithEmailOtp(email) {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      return {
        success: true,
        message: 'OTP sent to your email. Please check your inbox.',
      };
    } catch (error) {
      console.error('Email OTP login error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP',
      };
    }
  }

  /**
   * Verify email OTP
   */
  async verifyEmailOtp(email, token) {
    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      this.session = data.session;
      this.user = data.user;
      this._saveSession();

      return {
        success: true,
        user: this.user,
      };
    } catch (error) {
      console.error('Email OTP verification error:', error);
      return {
        success: false,
        error: error.message || 'OTP verification failed',
      };
    }
  }

  /**
   * Send SMS OTP for phone verification
   */
  async sendSmsOtp(phone) {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      return {
        success: true,
        message: 'OTP sent to your phone. Please check your messages.',
      };
    } catch (error) {
      console.error('SMS OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS OTP',
      };
    }
  }

  /**
   * Verify SMS OTP
   */
  async verifySmsOtp(phone, token) {
    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      this.session = data.session;
      this.user = data.user;
      this._saveSession();

      return {
        success: true,
        user: this.user,
      };
    } catch (error) {
      console.error('SMS OTP verification error:', error);
      return {
        success: false,
        error: error.message || 'SMS OTP verification failed',
      };
    }
  }

  /**
   * Update user phone number
   */
  async updatePhone(phone) {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        phone: phone,
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      this.user = data.user;
      this._saveSession();

      return {
        success: true,
        user: this.user,
      };
    } catch (error) {
      console.error('Update phone error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update phone',
      };
    }
  }
  async updateProfile(updates) {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      this.user = data.user;
      this._saveSession();

      return {
        success: true,
        user: this.user,
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.message || 'Profile update failed',
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(newPassword) {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          error: this._parseError(error),
        };
      }

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: error.message || 'Password change failed',
      };
    }
  }

  /**
   * Get current session access token for API calls
   */
  async getAccessToken() {
    if (!this.session || !this.session.access_token) {
      return null;
    }

    // Check if token is expired and refresh if needed
    if (this.session.expires_at) {
      const expiresAt = this.session.expires_at * 1000; // Convert to milliseconds
      if (Date.now() >= expiresAt) {
        const { data, error } = await this.supabase.auth.refreshSession();
        if (!error && data.session) {
          this.session = data.session;
          this.user = data.user;
          this._saveSession();
        } else {
          return null;
        }
      }
    }

    return this.session.access_token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.user && !!this.session;
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Get user's email
   */
  getUserEmail() {
    return this.user?.email || null;
  }

  /**
   * Get user's full name
   */
  getUserName() {
    return this.user?.user_metadata?.full_name || this.user?.email || 'User';
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials() {
    const name = this.getUserName();
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Get user ID
   */
  getUserId() {
    return this.user?.id || null;
  }

  /**
   * Get session
   */
  getSession() {
    return this.session;
  }

  /**
   * Private: Save session to localStorage
   */
  _saveSession() {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        user: this.user,
        session: this.session,
      })
    );
    // Also set for API client - CRITICAL for HttpClient
    if (this.session?.access_token) {
      window.DUALMIND_AUTH_TOKEN = this.session.access_token;
      console.log('[SupabaseAuth] Token saved to window.DUALMIND_AUTH_TOKEN');
    } else {
      console.warn('[SupabaseAuth] No access token in session to save');
    }
  }

  /**
   * Private: Clear session from localStorage
   */
  _clearSession() {
    localStorage.removeItem(this.storageKey);
    delete window.DUALMIND_AUTH_TOKEN;
  }

  /**
   * Private: Parse Supabase errors to user-friendly messages
   */
  _parseError(error) {
    const message = error.message || error.msg || '';

    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (message.includes('Email not confirmed')) {
      return 'Please confirm your email before logging in';
    }
    if (message.includes('User already registered')) {
      return 'This email is already registered';
    }
    if (message.includes('Password should be at least')) {
      return 'Password must be at least 6 characters';
    }
    if (message.includes('Invalid email')) {
      return 'Please enter a valid email address';
    }
    if (message.includes('Weak password')) {
      return 'Password is too weak. Use uppercase, numbers, and special characters';
    }
    if (message.includes('Invalid phone number')) {
      return 'Please enter a valid phone number with country code (e.g., +1234567890)';
    }
    if (message.includes('Invalid token')) {
      return 'Invalid verification code. Please check and try again.';
    }
    if (message.includes('Token has expired')) {
      return 'Verification code has expired. Please request a new one.';
    }
    if (message.includes('Too many requests')) {
      return 'Too many attempts. Please wait a few minutes before trying again.';
    }
    if (message.includes('SMS')) {
      return 'SMS sending failed. Please check your phone number and try again.';
    }

    return message || 'An error occurred. Please try again.';
  }
}

// Create and export singleton instance
let supabaseAuthService = null;

export function initializeSupabaseAuth(supabaseUrl, supabaseKey) {
  if (!supabaseAuthService) {
    supabaseAuthService = new SupabaseAuthService(supabaseUrl, supabaseKey);
  }
  return supabaseAuthService;
}

export function getSupabaseAuthService() {
  if (!supabaseAuthService) {
    throw new Error(
      'Supabase auth service not initialized. Call initializeSupabaseAuth() first.'
    );
  }
  return supabaseAuthService;
}

// Auto-expose for global access
window.SupabaseAuthService = SupabaseAuthService;
window.initializeSupabaseAuth = initializeSupabaseAuth;
window.getSupabaseAuthService = getSupabaseAuthService;

export default SupabaseAuthService;
