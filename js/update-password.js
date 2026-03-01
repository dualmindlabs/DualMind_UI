document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase to be ready
    if (window.DualMindAuthReady) {
        await window.DualMindAuthReady;
    }

    const form = document.getElementById('updatePasswordForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
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
            ? '<span class="loader"></span> Updating...'
            : '<span class="btn-text">Update Password</span><span class="btn-icon"><i class="ri-check-line"></i></span>';
    }

    // Check if we are authenticated (from reset link hash)
    // Supabase client automatically handles the hash fragment on load
    // So window._DUALMIND_AUTH should be authenticated if the link is valid
    const authService = window._DUALMIND_AUTH;

    if (!authService) {
        showMessage('error', 'Auth service error. Please try clicking the reset link again.');
        return;
    }

    // Give a moment for the session to be established from the URL hash
    setTimeout(() => {
        if (!authService.isAuthenticated()) {
            // Check for error in URL hash
            const hash = window.location.hash;
            if (hash && hash.includes('error=')) {
                showMessage('error', 'Invalid or expired password reset link. Please request a new one.');
            } else {
                // Not authenticated yet, maybe session restore is happening
                console.log('Waiting for authentication...');
            }
        }
    }, 1000);

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password !== confirmPassword) {
            showMessage('error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            showMessage('error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';

        try {
            // Update password user
            const result = await authService.changePassword(password);

            if (result.success) {
                showMessage('success', 'Password updated successfully! Redirecting to login...');
                setTimeout(() => {
                    window.location.href = 'login-modern.html';
                }, 2000);
            } else {
                showMessage('error', result.error || 'Failed to update password. Please try again.');
            }
        } catch (error) {
            console.error('Update password error:', error);
            showMessage('error', 'An unexpected error occurred. Please try again later.');
        } finally {
            setLoading(false);
        }
    });
});
