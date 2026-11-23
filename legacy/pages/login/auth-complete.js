// Complete Auth System with Phone, Email, Password Reset
// This extends the login page functionality

(function() {
  'use strict';

  // Additional elements
  const authTabs = document.querySelectorAll('.auth-tab');
  const emailFields = document.getElementById('emailFields');
  const phoneFields = document.getElementById('phoneFields');
  const phoneInput = document.getElementById('phone');
  const otpInput = document.getElementById('otp');
  const otpField = document.getElementById('otpField');
  const forgotBtn = document.getElementById('forgotBtn');
  const successMsg = document.getElementById('successMsg');
  const form = document.getElementById('authForm');
  const errorMsg = document.getElementById('errorMsg');
  const submitBtn = document.getElementById('submitBtn');
  const isLogin = document.body.classList.contains('login');
  
  let currentAuthMethod = 'email';
  let phoneOtpSent = false;

  // Auth Tab Switching
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const method = tab.dataset.method;
      
      // Update active tab
      authTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Switch fields
      if (method === 'email') {
        emailFields.style.display = 'block';
        phoneFields.style.display = 'none';
        currentAuthMethod = 'email';
        phoneOtpSent = false;
        otpField.style.display = 'none';
      } else if (method === 'phone') {
        emailFields.style.display = 'none';
        phoneFields.style.display = 'block';
        currentAuthMethod = 'phone';
      }
      
      // Reset messages
      errorMsg.style.display = 'none';
      successMsg.style.display = 'none';
      
      // Update submit button
      updateSubmitButton();
    });
  });

  // Forgot Password Handler
  if (forgotBtn) {
    forgotBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      if (!email) {
        showError('Please enter your email address first');
        emailInput.focus();
        return;
      }
      
      try {
        setLoading(true);
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${SITE_URL}/reset-password/`
        });
        
        if (error) throw error;
        
        showSuccess('Password reset email sent! Check your inbox.');
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    });
  }

  // Phone Auth Handler
  async function handlePhoneAuth(e) {
    e.preventDefault();
    
    const phone = phoneInput.value.trim();
    const otp = otpInput.value.trim();
    
    if (!phoneOtpSent) {
      // Send OTP
      if (!phone) {
        showError('Please enter your phone number');
        return;
      }
      
      // Convert to E.164 format (remove spaces and dashes for Supabase)
      const phoneE164 = phone.replace(/\s|-/g, '');
      
      // Validate E.164 format
      if (!phoneE164.startsWith('+91') || phoneE164.length !== 13) {
        showError('Please enter a valid Indian mobile number (10 digits)');
        return;
      }
      
      try {
        setLoading(true);
        const { error } = await supabaseClient.auth.signInWithOtp({
          phone: phoneE164
        });
        
        if (error) throw error;
        
        phoneOtpSent = true;
        otpField.style.display = 'block';
        showSuccess('Verification code sent to your phone!');
        submitBtn.innerHTML = '<span>Verify Code</span><i class="ri-check-line"></i>';
        otpInput.focus();
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Verify OTP
      if (!otp || otp.length !== 6) {
        showError('Please enter the 6-digit verification code');
        return;
      }
      
      try {
        setLoading(true);
        // Convert to E.164 format for verification too
        const phoneE164 = phone.replace(/\s|-/g, '');
        const { data, error } = await supabaseClient.auth.verifyOtp({
          phone: phoneE164,
          token: otp,
          type: 'sms'
        });
        
        if (error) throw error;
        
        if (data.session) {
          localStorage.setItem('dualmind.auth.supabase', JSON.stringify({
            user: data.user,
            session: data.session
          }));
          
          showSuccess('Phone verified! Redirecting...');
          setTimeout(() => {
            window.location.href = '../index.html';
          }, 1000);
        }
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    }
  }

  // Override form submit to handle phone auth
  const originalFormHandler = form.onsubmit;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (currentAuthMethod === 'phone') {
      await handlePhoneAuth(e);
    } else {
      // Use original email auth handler
      // This is already handled in the main script
    }
  });

  // Helper functions
  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    successMsg.style.display = 'none';
  }

  function showSuccess(message) {
    successMsg.textContent = message;
    successMsg.style.display = 'block';
    errorMsg.style.display = 'none';
  }

  function updateSubmitButton() {
    if (currentAuthMethod === 'phone') {
      if (phoneOtpSent) {
        submitBtn.innerHTML = '<span>Verify Code</span><i class="ri-check-line"></i>';
      } else {
        submitBtn.innerHTML = '<span>Send Code</span><i class="ri-smartphone-line"></i>';
      }
    } else {
      submitBtn.innerHTML = isLogin 
        ? '<span>Sign In</span><i class="ri-arrow-right-line"></i>'
        : '<span>Create Account</span><i class="ri-user-add-line"></i>';
    }
  }

  // Auto-format phone number
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 0 && !value.startsWith('91')) {
        value = '91' + value;
      }
      if (value.length > 12) {
        value = value.slice(0, 12);
      }
      
      // Format as +91 XXXXX-XXXXX
      if (value.length >= 2) {
        let formatted = '+' + value.slice(0, 2);
        if (value.length > 2) {
          formatted += ' ' + value.slice(2, 7);
        }
        if (value.length >= 7) {
          formatted += '-' + value.slice(7, 12);
        }
        e.target.value = formatted;
      }
    });
  }

  // OTP input auto-focus and validation
  if (otpInput) {
    otpInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
      
      // Auto-submit when 6 digits entered
      if (e.target.value.length === 6) {
        setTimeout(() => {
          submitBtn.click();
        }, 300);
      }
    });
  }

})();
