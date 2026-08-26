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
    const passwordInput = document.getElementById('password');

    const passwordRules = {
        minLength: 10,
        lower: /[a-z]/,
        upper: /[A-Z]/,
        number: /\d/,
        symbol: /[^A-Za-z0-9]/,
    };

    let passwordSecurityEls = null;
    let confirmPasswordEls = null;
    let passwordBreachState = 'idle'; // idle | checking | clean | pwned | error
    let breachDebounceTimer = null;
    let breachRequestId = 0;

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
    initPasswordSecurityUI();
    initRealTimeValidation();
    updateUIState();

    function evaluatePassword(value) {
        const checks = {
            minLength: value.length >= passwordRules.minLength,
            lower: passwordRules.lower.test(value),
            upper: passwordRules.upper.test(value),
            number: passwordRules.number.test(value),
            symbol: passwordRules.symbol.test(value),
        };

        const score = Object.values(checks).filter(Boolean).length;
        let label = 'Too weak';
        let color = 'var(--error)';
        let percent = 10;

        if (score >= 5) {
            label = 'Strong';
            color = 'var(--success)';
            percent = 100;
        } else if (score >= 4) {
            label = 'Good';
            color = '#f59e0b';
            percent = 80;
        } else if (score >= 3) {
            label = 'Fair';
            color = '#f97316';
            percent = 60;
        } else if (score >= 2) {
            label = 'Weak';
            color = '#ef4444';
            percent = 40;
        }

        return {
            checks,
            score,
            label,
            color,
            percent,
            isStrong: score === 5,
        };
    }

    async function sha1Hex(value) {
        const enc = new TextEncoder();
        const data = enc.encode(value);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
    }

    function setPasswordBreachUI(state, count = 0) {
        if (!passwordSecurityEls?.breachCheck) return;
        const node = passwordSecurityEls.breachCheck;
        const icon = node.querySelector('i');
        const text = node.querySelector('.password-check-text');

        node.classList.remove('valid', 'warning', 'checking');

        if (state === 'checking') {
            node.classList.add('checking');
            if (icon) icon.className = 'ri-loader-4-line spin-anim';
            if (text) text.textContent = 'Checking breach database...';
            return;
        }

        if (state === 'clean') {
            node.classList.add('valid');
            if (icon) icon.className = 'ri-checkbox-circle-fill';
            if (text) text.textContent = 'Not found in known breach data';
            return;
        }

        if (state === 'pwned') {
            node.classList.add('warning');
            if (icon) icon.className = 'ri-error-warning-fill';
            if (text) text.textContent = `Found in breach data (${count} times). Use a different password.`;
            return;
        }

        if (state === 'error') {
            node.classList.add('warning');
            if (icon) icon.className = 'ri-alarm-warning-fill';
            if (text) text.textContent = 'Breach check unavailable right now';
            return;
        }

        if (icon) icon.className = 'ri-checkbox-blank-circle-line';
        if (text) text.textContent = 'Breach check runs automatically';
    }

    async function runBreachCheck(passwordValue) {
        const currentRequestId = ++breachRequestId;

        if (!passwordValue || passwordValue.length < passwordRules.minLength) {
            passwordBreachState = 'idle';
            setPasswordBreachUI('idle');
            return { state: 'idle', count: 0 };
        }

        passwordBreachState = 'checking';
        setPasswordBreachUI('checking');

        try {
            const hash = await sha1Hex(passwordValue);
            const prefix = hash.slice(0, 5);
            const suffix = hash.slice(5);

            const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
                method: 'GET',
                headers: {
                    'Add-Padding': 'true',
                },
            });

            if (!res.ok) {
                throw new Error(`HIBP error ${res.status}`);
            }

            const body = await res.text();
            const lines = body.split('\n');
            let breachCount = 0;

            for (const line of lines) {
                const [lineSuffix, countStr] = line.trim().split(':');
                if (lineSuffix === suffix) {
                    breachCount = parseInt(countStr || '0', 10) || 0;
                    break;
                }
            }

            if (currentRequestId !== breachRequestId) {
                return { state: passwordBreachState, count: 0 };
            }

            if (breachCount > 0) {
                passwordBreachState = 'pwned';
                setPasswordBreachUI('pwned', breachCount);
                return { state: 'pwned', count: breachCount };
            }

            passwordBreachState = 'clean';
            setPasswordBreachUI('clean');
            return { state: 'clean', count: 0 };
        } catch (err) {
            if (currentRequestId !== breachRequestId) {
                return { state: passwordBreachState, count: 0 };
            }
            passwordBreachState = 'error';
            setPasswordBreachUI('error');
            return { state: 'error', count: 0 };
        }
    }

    function initPasswordSecurityUI() {
        if (authContext !== 'signup' || !passwordGroup) return;

        const confirmWrapper = document.createElement('div');
        confirmWrapper.className = 'confirm-password-wrapper';
        confirmWrapper.innerHTML = `
            <div class="input-group">
                <input type="password" id="confirmPassword" class="input-field" placeholder="Confirm password" autocomplete="new-password">
                <i class="ri-shield-check-line input-icon"></i>
            </div>
            <div class="confirm-password-hint" id="confirmPasswordHint"></div>
        `;
        passwordGroup.insertAdjacentElement('afterend', confirmWrapper);
        confirmPasswordEls = {
            wrapper: confirmWrapper,
            input: document.getElementById('confirmPassword'),
            hint: document.getElementById('confirmPasswordHint'),
        };

        const wrapper = document.createElement('div');
        wrapper.className = 'password-security';
        wrapper.innerHTML = `
            <div class="password-security-header">
                <span class="password-security-title"><i class="ri-lock-2-line"></i> Password security</span>
                <button type="button" class="password-tips-trigger" id="passwordTipsTrigger" aria-expanded="false">Show secure password tips</button>
            </div>
            <div class="password-tips-popover" id="passwordTipsPopover" hidden>
                <div class="password-tips-heading">Use a secure password</div>
                <ul>
                    <li>Avoid names, birthdays, and keyboard patterns.</li>
                    <li>Use 3-4 random words with symbols and numbers.</li>
                    <li>Do not reuse passwords from other apps.</li>
                    <li>Use a password manager to save strong passwords.</li>
                </ul>
            </div>
            <div class="password-strength-track">
                <div class="password-strength-fill" id="passwordStrengthFill"></div>
            </div>
            <div class="password-strength-label" id="passwordStrengthLabel">Too weak</div>
            <div class="password-checklist">
                <div class="password-check" id="checkMinLength"><i class="ri-checkbox-blank-circle-line"></i> At least 10 characters</div>
                <div class="password-check" id="checkUpper"><i class="ri-checkbox-blank-circle-line"></i> 1 uppercase letter</div>
                <div class="password-check" id="checkLower"><i class="ri-checkbox-blank-circle-line"></i> 1 lowercase letter</div>
                <div class="password-check" id="checkNumber"><i class="ri-checkbox-blank-circle-line"></i> 1 number</div>
                <div class="password-check" id="checkSymbol"><i class="ri-checkbox-blank-circle-line"></i> 1 special character</div>
                <div class="password-check" id="checkBreach"><i class="ri-checkbox-blank-circle-line"></i> <span class="password-check-text">Breach check runs automatically</span></div>
            </div>
        `;

        confirmWrapper.insertAdjacentElement('afterend', wrapper);
        passwordSecurityEls = {
            wrapper,
            strengthFill: document.getElementById('passwordStrengthFill'),
            strengthLabel: document.getElementById('passwordStrengthLabel'),
            tipsTrigger: document.getElementById('passwordTipsTrigger'),
            tipsPopover: document.getElementById('passwordTipsPopover'),
            checks: {
                minLength: document.getElementById('checkMinLength'),
                upper: document.getElementById('checkUpper'),
                lower: document.getElementById('checkLower'),
                number: document.getElementById('checkNumber'),
                symbol: document.getElementById('checkSymbol'),
            },
            breachCheck: document.getElementById('checkBreach'),
        };

        passwordSecurityEls.tipsTrigger?.addEventListener('click', () => {
            const isOpen = !passwordSecurityEls.tipsPopover.hidden;
            passwordSecurityEls.tipsPopover.hidden = isOpen;
            passwordSecurityEls.tipsTrigger.setAttribute('aria-expanded', String(!isOpen));
            passwordSecurityEls.tipsTrigger.textContent = isOpen ? 'Show secure password tips' : 'Hide secure password tips';
        });

        document.addEventListener('click', (event) => {
            if (!passwordSecurityEls || passwordSecurityEls.tipsPopover.hidden) return;
            if (passwordSecurityEls.wrapper.contains(event.target)) return;
            passwordSecurityEls.tipsPopover.hidden = true;
            passwordSecurityEls.tipsTrigger?.setAttribute('aria-expanded', 'false');
            if (passwordSecurityEls.tipsTrigger) {
                passwordSecurityEls.tipsTrigger.textContent = 'Show secure password tips';
            }
        });

        setPasswordBreachUI('idle');
    }

    function updateConfirmPasswordUI() {
        if (!confirmPasswordEls || !passwordInput) return false;

        const passwordValue = passwordInput.value || '';
        const confirmValue = confirmPasswordEls.input.value || '';

        if (!confirmValue) {
            showInputStatus(confirmPasswordEls.input, 'none');
            confirmPasswordEls.hint.textContent = '';
            return false;
        }

        const isMatch = passwordValue === confirmValue;
        showInputStatus(confirmPasswordEls.input, isMatch ? 'success' : 'error');
        confirmPasswordEls.hint.textContent = isMatch ? 'Passwords match' : 'Passwords do not match';
        confirmPasswordEls.hint.classList.toggle('valid', isMatch);
        confirmPasswordEls.hint.classList.toggle('invalid', !isMatch);
        return isMatch;
    }

    function updatePasswordSecurityUI(passwordValue) {
        if (!passwordSecurityEls) return;

        const evaluation = evaluatePassword(passwordValue);
        passwordSecurityEls.strengthFill.style.width = `${evaluation.percent}%`;
        passwordSecurityEls.strengthFill.style.backgroundColor = evaluation.color;
        passwordSecurityEls.strengthLabel.textContent = evaluation.label;
        passwordSecurityEls.strengthLabel.style.color = evaluation.color;

        Object.entries(passwordSecurityEls.checks).forEach(([key, node]) => {
            const valid = evaluation.checks[key];
            node.classList.toggle('valid', valid);
            const icon = node.querySelector('i');
            if (icon) {
                icon.className = valid ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line';
            }
        });

        return evaluation;
    }

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
        const confirmPassword = confirmPasswordEls?.input?.value || '';

        const evaluation = evaluatePassword(password);
        if (!evaluation.isStrong) {
            throw new Error('Use a stronger password before creating your account.');
        }
        if (!confirmPassword) {
            throw new Error('Please confirm your password.');
        }
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match.');
        }

        if (passwordBreachState === 'checking') {
            const check = await runBreachCheck(password);
            if (check.state === 'pwned') {
                throw new Error('This password appears in breach databases. Choose a different one.');
            }
        } else if (passwordBreachState === 'pwned') {
            throw new Error('This password appears in breach databases. Choose a different one.');
        }

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
        const confirmPassword = confirmPasswordEls?.input?.value || '';

        if (window.DUALMIND_CONFIG?.debug?.enabled) console.log('Starting phone auth process...', { phone, context: authContext });

        if (authContext === 'signup') {
            const evaluation = evaluatePassword(password || '');
            if (!evaluation.isStrong) throw new Error('Use a stronger password for signup security.');
            if (!confirmPassword) throw new Error('Please confirm your password.');
            if (password !== confirmPassword) throw new Error('Passwords do not match.');
            if (passwordBreachState === 'checking') {
                const check = await runBreachCheck(password);
                if (check.state === 'pwned') throw new Error('This password appears in breach databases. Choose a different one.');
            } else if (passwordBreachState === 'pwned') {
                throw new Error('This password appears in breach databases. Choose a different one.');
            }
            
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
                    if (confirmPasswordEls) updateConfirmPasswordUI();
                    return;
                }

                if (authContext === 'signup') {
                    const result = updatePasswordSecurityUI(val);
                    const isValid = result?.isStrong;
                    showInputStatus(passwordInput, isValid ? 'success' : 'error');
                    if (confirmPasswordEls) updateConfirmPasswordUI();

                    if (breachDebounceTimer) {
                        clearTimeout(breachDebounceTimer);
                    }

                    if (isValid) {
                        breachDebounceTimer = setTimeout(() => {
                            runBreachCheck(val);
                        }, 550);
                    } else {
                        passwordBreachState = 'idle';
                        setPasswordBreachUI('idle');
                    }
                } else {
                    // Just check length for login
                    showInputStatus(passwordInput, val.length >= 6 ? 'success' : 'none');
                }
            });
        }

        if (confirmPasswordEls?.input) {
            confirmPasswordEls.input.addEventListener('input', () => {
                updateConfirmPasswordUI();
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
