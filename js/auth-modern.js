import { customModal } from '../components/CustomModal.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (window.DualMindAuthReady) await window.DualMindAuthReady;

    const auth = window.DualMindAuth;
    const supabase = window._DUALMIND_AUTH?.supabase || (window.supabase && window.supabase.createClient ? window.supabase.createClient(window.DUALMIND_CONFIG.supabase.url, window.DUALMIND_CONFIG.supabase.anonKey) : null);

    if (!supabase) {
        console.error('Supabase client not found!');
        return;
    }

    // --- Elements ---
    const form = document.getElementById('modernAuthForm');
    const tabs = document.querySelectorAll('.auth-tab');
    const emailGroup = document.getElementById('emailGroup');
    const phoneGroup = document.getElementById('phoneGroup');
    const passwordGroup = document.getElementById('passwordGroup');
    const otpGroup = document.getElementById('otpGroup');
    const profileGroup = document.getElementById('profileGroup');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnIcon = submitBtn?.querySelector('.btn-icon');
    const errorAlert = document.getElementById('errorAlert');
    const successAlert = document.getElementById('successAlert');
    const stepDots = document.querySelectorAll('.step-dot');
    const stepText = document.querySelector('.step-text');
    const otpInputs = document.querySelectorAll('.otp-box');
    const resendTimerEl = document.getElementById('resendTimer');
    const resendAction = document.getElementById('resendAction');
    const changePhoneAction = document.getElementById('changePhoneAction');
    const togglePassword = document.getElementById('togglePassword');
    const authContainer = document.querySelector('.auth-form-wrapper');
    const termsCheck = document.getElementById('termsCheck');
    const socialGitHub = document.getElementById('socialGitHub');
    const socialGoogle = document.getElementById('socialGoogle');

    // --- State ---
    let mode = 'email'; // 'email' or 'phone'
    let currentStep = 1; // 1: Credentials, 2: OTP, 3: Profile (Phone only)
    let phoneStep = 'send'; // 'send' or 'verify'
    let isLoading = false;
    let resendCooldown = 0;
    let resendInterval = null;
    let authContext = document.body.classList.contains('signup-page') ? 'signup' : 'login';

    // --- Initialization ---
    initTabs();
    initOtpInputs();
    initPhoneFormatting();
    initPasswordToggle();
    initSocialLogins();
    initRealTimeValidation();
    updateUIState();

    // --- Tab Logic ---
    function initTabs() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (currentStep > 1) return; // Disable tab switching during verification
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                mode = tab.dataset.mode;
                updateUIState();
            });
        });
    }

    // --- UI State Management ---
    function updateUIState() {
        if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('Updating UI state:', { mode, currentStep, authContext });
        hideMessage();
        
        // Dynamic Step Counting
        const totalSteps = mode === 'phone' 
            ? (authContext === 'signup' ? 3 : 2) 
            : (authContext === 'signup' ? 2 : 1);

        // Visibility Logic for Step Indicator
        const indicator = document.querySelector('.step-indicator');
        if (indicator) {
            indicator.style.display = totalSteps > 1 ? 'flex' : 'none';
        }

        // Step Dots & Text
        stepDots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx + 1 === currentStep);
            dot.style.display = idx < totalSteps ? 'block' : 'none';
        });
        if (stepText) stepText.textContent = `Step ${currentStep} of ${totalSteps}`;

        // Component Visibility
        const steps = [
            { el: document.getElementById('credentialsStep'), step: 1 },
            { el: document.getElementById('otpGroup'), step: 2 },
            { el: document.getElementById('profileGroup'), step: 3 }
        ];

        steps.forEach(s => {
            if (!s.el) return;
            const isCurrent = s.step === currentStep;
            
            if (isCurrent) {
                s.el.style.display = 'block';
                s.el.classList.remove('fade-out', 'hidden');
                s.el.classList.add('auth-step', 'fade-in');
            } else {
                if (s.el.style.display === 'block') {
                    s.el.classList.remove('fade-in');
                    s.el.classList.add('fade-out');
                    setTimeout(() => {
                        s.el.style.display = 'none';
                        s.el.classList.add('hidden');
                    }, 400);
                } else {
                    s.el.style.display = 'none';
                    s.el.classList.add('hidden');
                }
            }
        });

        // Step 1 Specifics
        if (currentStep === 1) {
            emailGroup.style.display = mode === 'email' ? 'block' : 'none';
            phoneGroup.style.display = mode === 'phone' ? 'flex' : 'none';
            passwordGroup.style.display = (mode === 'email' || authContext === 'signup') ? 'block' : 'none';
            setBtnState(authContext === 'signup' ? 'Create Account' : 'Sign In');
        } 
        else if (currentStep === 2) {
            setBtnState('Verify Code');
        }
        else if (currentStep === 3) {
            setBtnState('Complete Profile');
        }
    }

    function setBtnState(text, loading = false) {
        if (!submitBtn) return;
        if (loading) {
            if (btnText) btnText.textContent = 'Processing...';
            if (btnIcon) btnIcon.innerHTML = '<div class="spinner"></div>';
            submitBtn.disabled = true;
            isLoading = true;
        } else {
            if (btnText) btnText.textContent = text;
            if (btnIcon) btnIcon.innerHTML = '<i class="ri-arrow-right-line"></i>';
            submitBtn.disabled = false;
            isLoading = false;
        }
    }

    // --- Segmented OTP Logic ---
    function initOtpInputs() {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value.length > 1) {
                    e.target.value = value.slice(-1);
                }
                
                if (value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }

                checkAutoSubmit();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }

    function getOtpValue() {
        return Array.from(otpInputs).map(i => i.value).join('');
    }

    function checkAutoSubmit() {
        const otp = getOtpValue();
        if (otp.length === 6 && !isLoading) {
            const container = document.querySelector('.otp-container');
            container?.classList.add('verifying');
            handleFormSubmit().finally(() => {
                container?.classList.remove('verifying');
            });
        }
    }

    // --- Phone Formatting (libphonenumber-js) ---
    function initPhoneFormatting() {
        const phoneInput = document.getElementById('phone');
        if (!phoneInput) return;

        phoneInput.addEventListener('input', (e) => {
            const input = e.target;
            let val = input.value;
            
            // If doesn't start with +, add it temporarily for parsing if it's long enough
            // But we keep the UI simple for now
            const raw = val.replace(/\D/g, '');
            if (raw.length > 10) {
                input.value = raw.slice(0, 10);
                return;
            }

            // Using libphonenumber formatter
            try {
                const formatter = new window.libphonenumber.AsYouType('IN');
                input.value = formatter.input(raw);
            } catch (err) {
                // fallback to simple
                input.value = raw;
            }
        });
    }

    function initPasswordToggle() {
        if (!togglePassword || !passwordGroup) return;
        const passwordInput = passwordGroup.querySelector('input');
        
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePassword.classList.toggle('ri-eye-line', isPassword);
            togglePassword.classList.toggle('ri-eye-off-line', !isPassword);
        });
    }

    function initSocialLogins() {
        if (socialGitHub) {
            socialGitHub.addEventListener('click', async () => handleSocialLogin('github', socialGitHub));
        }
        if (socialGoogle) {
            socialGoogle.addEventListener('click', async () => handleSocialLogin('google', socialGoogle));
        }
    }

    async function handleSocialLogin(provider, button) {
        if (isLoading) return;
        const originalContent = button.innerHTML;
        button.innerHTML = '<div class="spinner-small"></div> Connecting...';
        button.disabled = true;
        isLoading = true;

        try {
            const result = await auth.signInWithOAuth(provider);
            if (!result.success) throw new Error(result.error);
            // Redirect is handled by Supabase
        } catch (err) {
            showMessage('error', err.message);
            button.innerHTML = originalContent;
            button.disabled = false;
            isLoading = false;
        }
    }

    function getValidatedPhone() {
        const phoneInput = document.getElementById('phone');
        const rawPhone = phoneInput.value.replace(/\D/g, '');
        if (rawPhone.length < 10) {
            phoneInput.classList.add('input-error');
            throw new Error('Please enter a valid 10-digit mobile number');
        }
        phoneInput.classList.remove('input-error');
        return '+91' + rawPhone.slice(-10);
    }

    // --- Resend Timer ---
    function startResendCooldown() {
        resendCooldown = 60;
        if (resendAction) resendAction.classList.add('disabled');
        
        if (resendInterval) clearInterval(resendInterval);
        resendInterval = setInterval(() => {
            resendCooldown--;
            if (resendTimerEl) resendTimerEl.textContent = `Resend available in ${resendCooldown}s`;
            
            if (resendCooldown <= 0) {
                clearInterval(resendInterval);
                if (resendTimerEl) resendTimerEl.textContent = '';
                if (resendAction) resendAction.classList.remove('disabled');
            }
        }, 1000);
    }

    if (resendAction) {
        resendAction.addEventListener('click', (e) => {
            e.preventDefault();
            if (resendCooldown > 0) return;
            handleResend();
        });
    }

    if (changePhoneAction) {
        changePhoneAction.addEventListener('click', (e) => {
            e.preventDefault();
            currentStep = 1;
            phoneStep = 'send';
            updateUIState();
        });
    }

    async function handleResend() {
        try {
            const phone = getValidatedPhone();
            const { success, error } = await auth.sendSmsOtp(phone);
            if (!success) throw new Error(error);
            
            showMessage('success', 'Code sent via SMS and Call!');
            startResendCooldown();
        } catch (err) {
            showMessage('error', err.message);
        }
    }

    // --- Form Submission State Machine ---
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit();
        });
    }

    async function handleFormSubmit() {
        if (isLoading) return;
        hideMessage();
        setBtnState('', true);

        try {
            if (authContext === 'signup' && termsCheck && !termsCheck.checked) {
                throw new Error('Please agree to the Terms & Conditions to continue.');
            }

            if (mode === 'email') {
                await (authContext === 'signup' ? handleEmailSignup() : handleEmailLogin());
            } else {
                if (currentStep === 1) await handlePhoneStart();
                else if (currentStep === 2) await handlePhoneVerify();
                else if (currentStep === 3) await handleProfileCompletion();
            }
        } catch (err) {
            console.error(err);
            showMessage('error', err.message || 'An error occurred');
            updateUIState(); // Reset button text
        }
    }

    // --- Authentication Handlers ---

    async function handleEmailLogin() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const result = await auth.login(email, password);
        if (!result.success) throw new Error(result.error);
        onAuthSuccess();
    }

    async function handleEmailSignup() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('fullName')?.value || '';
        const result = await auth.signup(email, password, fullName);
        if (!result.success) throw new Error(result.error);
        
        if (result.needsEmailConfirmation) {
            showMessage('success', 'Verification link sent to your email! Please check your inbox.');
            setBtnState('Verify Email');
        } else {
            onAuthSuccess();
        }
    }

    async function handlePhoneStart() {
        const phone = getValidatedPhone();
        const password = document.getElementById('password').value;

        if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('Starting phone auth process...', { phone, context: authContext });

        if (authContext === 'signup') {
            if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
            
            // For phone signup, we use signupWithPhone which triggers initial OTP
            const result = await auth.signupWithPhone(phone, password);
            if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('Signup result:', result);
            
            if (!result.success) {
                // If user already exists, Supabase might return an error
                if (result.error.toLowerCase().includes('already registered')) {
                    const msg = authContext === 'signup' 
                        ? 'This phone is already registered. Please sign in instead.' 
                        : 'Account error. Please contact support.';
                    showMessage('error', msg);
                    throw new Error(msg);
                }
                throw new Error(result.error);
            }
        } else {
            // Login via OTP only (dual-channel)
            const result = await auth.sendSmsOtp(phone);
            if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('Login OTP request result:', result);
            if (!result.success) throw new Error(result.error);
        }

        currentStep = 2;
        showMessage('success', 'Code sent! You will receive both SMS and Call delivery.');
        startResendCooldown();
        updateUIState();
        setTimeout(() => otpInputs[0].focus(), 100);
    }

    async function handlePhoneVerify() {
        const phone = getValidatedPhone();
        const otp = getOtpValue();
        if (otp.length !== 6) throw new Error('Please enter the 6-digit code');

        const result = await auth.verifySmsOtp(phone, otp);
        if (!result.success) {
            // Shake effect for feedback
            otpGroup.classList.add('shake');
            setTimeout(() => otpGroup.classList.remove('shake'), 400);
            throw new Error(result.error);
        }

        if (authContext === 'signup') {
            currentStep = 3;
            updateUIState();
        } else {
            onAuthSuccess();
        }
    }

    async function handleProfileCompletion() {
        const email = document.getElementById('enrichEmail').value.trim();
        const fullName = document.getElementById('enrichFullName').value.trim();
        
        if (!email || !fullName) throw new Error('Please fill in all profile details');

        const result = await auth.updateProfile({ 
            full_name: fullName,
            email: email 
        });

        if (!result.success) {
            if (result.error.toLowerCase().includes('already exists')) {
                throw new Error('This email is already registered. Please use another or contact support.');
            }
            throw new Error(result.error);
        }

        showMessage('success', 'Profile updated! Redirecting...');
        onAuthSuccess();
    }

    // --- Helpers ---

    function onAuthSuccess() {
        let target = getSafeRedirectTarget();
        
        // Localhost handling: ensure it stays on the dev server (8000)
        // while preserving the relative target (e.g. index.html or something else)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const path = target.startsWith('/') ? target : `/${target}`;
            target = `http://localhost:8000${path}`;
        }
        
        window.location.href = target;
    }

    function showMessage(type, text) {
        if (customModal && customModal.toast) {
            customModal.toast(text, type);
        } else {
            const el = type === 'error' ? errorAlert : successAlert;
            if (!el) return;
            el.textContent = text;
            el.style.display = 'block';
            if (type === 'error' && successAlert) successAlert.style.display = 'none';
            if (type === 'success' && errorAlert) errorAlert.style.display = 'none';
        }
    }

    function hideMessage() {
        if (errorAlert) errorAlert.style.display = 'none';
        if (successAlert) successAlert.style.display = 'none';
    }

    function getSafeRedirectTarget() {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (!redirect) return 'index.html';
        try {
            const target = new URL(redirect, window.location.origin);
            if (target.origin !== window.location.origin) return 'index.html';
            return `${target.pathname}${target.search}${target.hash}` || 'index.html';
        } catch {
            return 'index.html';
        }
    }

    // --- Real-time Validation ---
    function initRealTimeValidation() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (emailInput) {
            emailInput.addEventListener('input', () => {
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
                if (emailInput.value.length > 0) {
                    showInputStatus(emailInput, isValid ? 'success' : 'error');
                } else {
                    showInputStatus(emailInput, 'none');
                }
            });
        }

        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                const val = passwordInput.value;
                if (val.length === 0) {
                    showInputStatus(passwordInput, 'none');
                    return;
                }

                if (authContext === 'signup') {
                    // Password strength for signup
                    const hasUpper = /[A-Z]/.test(val);
                    const hasNum = /[0-9]/.test(val);
                    const isLong = val.length >= 8;
                    const isValid = hasUpper && hasNum && isLong;
                    showInputStatus(passwordInput, isValid ? 'success' : 'error');
                } else {
                    // Just check length for login
                    showInputStatus(passwordInput, val.length >= 6 ? 'success' : 'none');
                }
            });
        }
    }

    function showInputStatus(input, status) {
        const group = input.closest('.input-group');
        if (!group) return;

        group.classList.remove('success', 'input-error-shake');
        
        if (status === 'success') {
            group.style.borderColor = 'var(--color-success)';
            group.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.1)';
        } else if (status === 'error') {
            group.style.borderColor = 'var(--color-error)';
            group.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.1)';
        } else {
            group.style.borderColor = '';
            group.style.boxShadow = '';
        }
    }
});
