// Main application JavaScript for DualMind Login
class DualMindAuth {
    constructor() {
        this.supabase = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        // Wait for Supabase to be available
        if (typeof window.supabaseClient === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.supabase = window.supabaseClient;
        this.isInitialized = true;
        this.setupEventHandlers();
        this.checkSession();
    }

    setupEventHandlers() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Social login buttons
        const googleBtn = document.getElementById('google-login');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Form toggle
        const toggleBtn = document.getElementById('form-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleForm();
            });
        }
    }

    async checkSession() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                window.location.href = '../index.html';
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            window.location.href = '../index.html';
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        full_name: `${firstName} ${lastName}`
                    }
                }
            });

            if (error) throw error;

            this.showSuccess('Account created! Please check your email to verify.');
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleGoogleLogin() {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/index.html`
                }
            });

            if (error) throw error;
        } catch (error) {
            this.showError(error.message);
        }
    }

    toggleForm() {
        const loginForm = document.getElementById('login-section');
        const registerForm = document.getElementById('register-section');
        const toggleText = document.getElementById('toggle-text');
        const toggleBtn = document.getElementById('form-toggle');

        if (loginForm.style.display === 'none') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            toggleText.textContent = "Don't have an account? ";
            toggleBtn.textContent = 'Register';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            toggleText.textContent = 'Already have an account? ';
            toggleBtn.textContent = 'Login';
        }
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }
    }

    showSuccess(message) {
        const successEl = document.getElementById('success-message');
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize the auth system
window.dualMindAuth = new DualMindAuth();
