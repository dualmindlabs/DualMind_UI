document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase to be ready
    if (window.DualMindAuthReady) {
        await window.DualMindAuthReady;
    }

    const form = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submitBtn');
    const errorAlert = document.getElementById('errorAlert');
    const successAlert = document.getElementById('successAlert');

    // Helper functions
    function showMessage(type, message) {
        if (type === 'error') {
            errorAlert.textContent = message;
            errorAlert.style.display = 'block';
            successAlert.style.display = 'none';
        } else {
            successAlert.textContent = message;
            successAlert.style.display = 'block';
            errorAlert.style.display = 'none';
        }
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.innerHTML = isLoading
            ? '<span class="loader"></span> Sending...'
            : '<span class="btn-text">Send Reset Link</span><span class="btn-icon"><i class="ri-send-plane-fill"></i></span>';
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        if (!email) {
            showMessage('error', 'Please enter your email address');
            return;
        }

        // Use the auth service
        const authService = window._DUALMIND_AUTH;
        if (!authService) {
            showMessage('error', 'Auth service not initialized. Please refresh the page.');
            return;
        }

        setLoading(true);
        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';

        try {
            // Call reset password
            // The method in supabase-auth.js handles the Supabase call
            // It uses window.origin + '/update-password.html' as the redirect
            const result = await authService.resetPassword(email);

            if (result.success) {
                showMessage('success', 'Password reset link sent! Please check your email inbox (and spam folder).');
                form.reset();
            } else {
                showMessage('error', result.error || 'Failed to send reset email. Please try again.');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            showMessage('error', 'An unexpected error occurred. Please try again later.');
        } finally {
            setLoading(false);
        }
    });
});
