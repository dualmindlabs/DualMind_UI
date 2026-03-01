/**
 * Modern Auth Logic
 * Handles Email/Password, Phone/OTP, and Social Login via Supabase
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase to be ready
    if (window.DualMindAuthReady) {
        await window.DualMindAuthReady;
    }

    const auth = window.DualMindAuth;
    const supabase = window._DUALMIND_AUTH?.supabase || (window.supabase && window.supabase.createClient ? window.supabase.createClient(window.DUALMIND_CONFIG.supabase.url, window.DUALMIND_CONFIG.supabase.anonKey) : null);

    if (!supabase) {
        console.error('Supabase client not found!');
        showMessage('error', 'Authentication system failed to initialize.');
        return;
    }

    // Elements
    const form = document.getElementById('modernAuthForm');
    const tabs = document.querySelectorAll('.auth-tab');
    const emailGroup = document.getElementById('emailGroup');
    const phoneGroup = document.getElementById('phoneGroup');
    const passwordGroup = document.getElementById('passwordGroup');
    const otpGroup = document.getElementById('otpGroup');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnIcon = submitBtn.querySelector('.btn-icon');
    const errorAlert = document.getElementById('errorAlert');
    const successAlert = document.getElementById('successAlert');
    const forgotLink = document.getElementById('forgotLink');
    const socialGitHub = document.getElementById('socialGitHub');
    const socialGoogle = document.getElementById('socialGoogle');

    let mode = 'email'; // 'email' or 'phone'
    let phoneStep = 'send'; // 'send' or 'verify'
    let isLoading = false;

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            mode = tab.dataset.mode;

            updateUIState();
        });
    });

    function updateUIState() {
        hideMessage();

        if (mode === 'email') {
            emailGroup.style.display = 'block';
            passwordGroup.style.display = 'block';
            phoneGroup.style.display = 'none';
            otpGroup.style.display = 'none';
            forgotLink.style.display = 'inline-block';

            setBtnState('Sign In');
        } else {
            emailGroup.style.display = 'none';
            passwordGroup.style.display = 'none';
            phoneGroup.style.display = 'flex'; // It's a flex container
            forgotLink.style.display = 'none'; // No forgot password for phone

            if (phoneStep === 'send') {
                otpGroup.style.display = 'none';
                setBtnState('Send Code');
            } else {
                otpGroup.style.display = 'block';
                // Hide phone input during verification to prevent editing
                // phoneGroup.style.opacity = '0.5'; 
                // phoneGroup.style.pointerEvents = 'none';
                setBtnState('Verify Code');
            }
        }
    }

    function setBtnState(text, loading = false) {
        if (loading) {
            btnText.textContent = 'Please wait...';
            btnIcon.innerHTML = '<div class="spinner"></div>';
            submitBtn.disabled = true;
            isLoading = true;
        } else {
            btnText.textContent = text;
            btnIcon.innerHTML = '<i class="ri-arrow-right-line"></i>';
            submitBtn.disabled = false;
            isLoading = false;
        }
    }

    function showMessage(type, text) {
        const el = type === 'error' ? errorAlert : successAlert;
        const other = type === 'error' ? successAlert : errorAlert;

        el.textContent = text;
        el.style.display = 'block';
        other.style.display = 'none';
    }

    function hideMessage() {
        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';
    }

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isLoading) return;

        hideMessage();
        setBtnState('', true);

        try {
            if (mode === 'email') {
                await handleEmailLogin();
            } else {
                await handlePhoneLogin();
            }
        } catch (err) {
            console.error(err);
            showMessage('error', err.message || 'An error occurred');
            setBtnState(mode === 'email' ? 'Sign In' : (phoneStep === 'send' ? 'Send Code' : 'Verify Code'));
        }
    });

    async function handleEmailLogin() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) throw new Error('Please enter email and password');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        onLoginSuccess();
    }

    async function handlePhoneLogin() {
        const phoneInput = document.getElementById('phone');
        // Simple cleaning: remove spaces, hyphens. Add country code if missing.
        let phone = phoneInput.value.replace(/[^0-9]/g, '');

        // Assumption: India (+91) default if length is 10
        if (phone.length === 10) {
            phone = '91' + phone;
        }

        // Ensure + prefix
        if (!phone.startsWith('+')) {
            phone = '+' + phone;
        }

        if (phoneStep === 'send') {
            if (phone.length < 10) throw new Error('Please enter a valid phone number');

            const { error } = await supabase.auth.signInWithOtp({
                phone: phone
            });

            if (error) throw error;

            phoneStep = 'verify';
            showMessage('success', 'Verification code sent!');
            updateUIState();
            setBtnState('Verify Code');

            // Auto focus OTP
            setTimeout(() => document.getElementById('otp').focus(), 100);

        } else {
            const token = document.getElementById('otp').value.trim();
            if (!token || token.length !== 6) throw new Error('Please enter the 6-digit code');

            const { data, error } = await supabase.auth.verifyOtp({
                phone: phone,
                token: token,
                type: 'sms'
            });

            if (error) throw error;

            onLoginSuccess();
        }
    }

    async function onLoginSuccess() {
        showMessage('success', 'Login successful! Checking account status...');

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('User session not found');
            }

            // Check if user has a phone number
            const hasPhone = user.phone && user.phone_confirmed_at;

            // Check if user is "new" (created within last 10 minutes)
            const createdAt = new Date(user.created_at).getTime();
            const now = Date.now();
            const isNewUser = (now - createdAt) < 10 * 60 * 1000; // 10 minutes

            console.log('User Status:', { hasPhone, isNewUser, createdAt: user.created_at });

            if (isNewUser && !hasPhone) {
                // FORCE PHONE BINDING
                console.log('⚠️ New user without phone - Enforcing binding');
                showMessage('success', 'Security check required...');
                setTimeout(() => {
                    showPhoneBindingUI();
                }, 1000);
            } else {
                // PROCEED TO APP
                console.log('✅ User authorized - Redirecting');
                setTimeout(() => {
                    const params = new URLSearchParams(window.location.search);
                    let targetUrl = params.get('redirect') || 'index.html';

                    // 🚨 FORCE PORT 8000 FOR LOCALHOST
                    if (window.location.hostname === 'localhost') {
                        targetUrl = 'http://localhost:8000/index.html';
                    }

                    window.location.href = targetUrl;
                }, 1000);
            }

        } catch (err) {
            console.error('Auth Check Error:', err);
            showMessage('error', 'Failed to verify account status.');
        }
    }

    // --- PHONE BINDING LOGIC ---

    const mainAuthContainer = document.getElementById('mainAuthContainer');
    const phoneBindingContainer = document.getElementById('phoneBindingContainer');
    const phoneBindingForm = document.getElementById('phoneBindingForm');
    const bindSubmitBtn = document.getElementById('bindSubmitBtn');

    // Safety check for binding elements which might not exist on all pages
    const bindBtnText = bindSubmitBtn ? bindSubmitBtn.querySelector('.btn-text') : null;
    const bindBtnIcon = bindSubmitBtn ? bindSubmitBtn.querySelector('.btn-icon') : null;

    let bindStep = 'send'; // 'send' or 'verify'

    function showPhoneBindingUI() {
        mainAuthContainer.style.display = 'none';
        phoneBindingContainer.style.display = 'block';
    }

    function setBindBtnState(text, loading = false) {
        if (loading) {
            bindBtnText.textContent = 'Please wait...';
            bindBtnIcon.innerHTML = '<div class="spinner"></div>';
            bindSubmitBtn.disabled = true;
        } else {
            bindBtnText.textContent = text;
            bindBtnIcon.innerHTML = '<i class="ri-arrow-right-line"></i>';
            bindSubmitBtn.disabled = false;
        }
    }

    function showBindMessage(type, text) {
        const el = type === 'error' ? document.getElementById('bindErrorAlert') : document.getElementById('bindSuccessAlert');
        const other = type === 'error' ? document.getElementById('bindSuccessAlert') : document.getElementById('bindErrorAlert');
        el.textContent = text;
        el.style.display = 'block';
        other.style.display = 'none';
    }

    if (phoneBindingForm) {
        phoneBindingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setBindBtnState('', true);
            showBindMessage('success', 'Processing...'); // Reset messages

            const phoneInput = document.getElementById('bindPhone');
            let phone = phoneInput.value.replace(/[^0-9]/g, '');

            // India default
            if (phone.length === 10) phone = '91' + phone;
            if (!phone.startsWith('+')) phone = '+' + phone;

            try {
                if (bindStep === 'send') {
                    // Step 1: Send OTP for Phone Update
                    if (phone.length < 10) throw new Error('Invalid phone number');

                    const { error } = await supabase.auth.updateUser({
                        phone: phone
                    });

                    if (error) throw error;

                    // Switch to verify step
                    bindStep = 'verify';
                    document.getElementById('bindOtpGroup').style.display = 'block';
                    document.getElementById('bindPhone').disabled = true;
                    setBindBtnState('Verify & Login');
                    showBindMessage('success', 'OTP Sent! Check your SMS.');

                } else {
                    // Step 2: Verify OTP
                    const otp = document.getElementById('bindOtp').value;
                    if (otp.length !== 6) throw new Error('Enter 6-digit OTP');

                    const { error } = await supabase.auth.verifyOtp({
                        phone: phone,
                        token: otp,
                        type: 'phone_change'
                    });

                    if (error) throw error;

                    showBindMessage('success', 'Phone verified! Redirecting...');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }
            } catch (err) {
                console.error('Binding Error:', err);
                setBindBtnState(bindStep === 'send' ? 'Send OTP' : 'Verify & Login');
                showBindMessage('error', err.message);
            }
        });
    }


    if (socialGitHub) {
        socialGitHub.addEventListener('click', async () => {
            const redirectUrl = window.location.origin + '/auth-callback.html';

            // Use wrapper if available to keep state consistent
            if (window._DUALMIND_AUTH && typeof window._DUALMIND_AUTH.signInWithOAuth === 'function') {
                const result = await window._DUALMIND_AUTH.signInWithOAuth('github', redirectUrl, { scopes: 'user:email' });
                if (!result.success) showMessage('error', result.error);
            } else {
                // Fallback (shouldn't happen if init is correct)
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: {
                        redirectTo: redirectUrl,
                        scopes: 'user:email'
                    }
                });
                if (error) showMessage('error', error.message);
            }
        });
    }

    if (socialGoogle) {
        socialGoogle.addEventListener('click', async () => {
            const redirectUrl = window.location.origin + '/auth-callback.html';

            if (window._DUALMIND_AUTH && typeof window._DUALMIND_AUTH.signInWithOAuth === 'function') {
                const result = await window._DUALMIND_AUTH.signInWithOAuth('google', redirectUrl);
                if (!result.success) showMessage('error', result.error);
            } else {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: redirectUrl }
                });
                if (error) showMessage('error', error.message);
            }
        });
    }

    // Phone Formatting
    const phoneInput = document.getElementById('phone');
    const bindPhoneInput = document.getElementById('bindPhone');

    [phoneInput, bindPhoneInput].forEach(input => {
        if (input) {
            input.addEventListener('input', (e) => {
                let x = e.target.value.replace(/\D/g, '').match(/(\d{0,5})(\d{0,5})/);
                if (x[1]) {
                    e.target.value = x[1] + (x[2] ? ' ' + x[2] : '');
                }
            });
        }
    });

    // Check if we are handling an OAuth redirect
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            // If we are on login page, run success logic to check phone
            if (!isLoading) onLoginSuccess();
        }
    });
});
