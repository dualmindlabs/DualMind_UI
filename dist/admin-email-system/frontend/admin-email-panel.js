// Admin Email Panel - JavaScript
// Handles user authentication, user list fetching, email composition, and sending

// Configuration - Update these with your Supabase project details
const SUPABASE_URL = 'https://calqfzajyidkdzbaswjp.supabase.co'; // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbHFmemFqeWlka2R6YmFzd2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzMwODMsImV4cCI6MjA3OTg0OTA4M30.ptXyUNCcAhGi9u2kVDHOxSBvQv0W72S5HHqkIFXQS08';
const EDGE_FUNCTION_URL = 'https://calqfzajyidkdzbaswjp.supabase.co/functions/v1/send-admin-email'; // e.g., https://xxxxx.supabase.co/functions/v1/send-admin-email

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State management
let currentUser = null;
let allUsers = [];
let selectedUserEmails = new Set();

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const accessDenied = document.getElementById('accessDenied');
const mainPanel = document.getElementById('mainPanel');
const userListContainer = document.getElementById('userListContainer');
const selectAllCheckbox = document.getElementById('selectAll');
const selectedCountEl = document.getElementById('selectedCount');
const emailForm = document.getElementById('emailForm');
const emailSubject = document.getElementById('emailSubject');
const emailTitle = document.getElementById('emailTitle');
const emailBody = document.getElementById('emailBody');
const htmlMode = document.getElementById('htmlMode');
const previewBox = document.getElementById('previewBox');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const alertContainer = document.getElementById('alertContainer');
const loginCard = document.getElementById('loginCard');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

async function handleLogin() {
  loginError.textContent = '';
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i> Logging in...';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.value.trim(),
      password: loginPassword.value.trim(),
    });
    if (error) throw error;
    // After login, re-run init to show the panel
    await init();
  } catch (err) {
    console.error('Login error:', err);
    loginError.textContent = err.message || 'Login failed';
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="ri-login-box-line"></i> Login';
  }
}
// Initialize app
async function init() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      // show login, hide others
      loginCard.style.display = 'block';
      loadingScreen.style.display = 'none';
      accessDenied.style.display = 'none';
      mainPanel.style.display = 'none';
      return;
    }
    loginCard.style.display = 'none';
    currentUser = session.user;
    const isAdmin = await verifyAdminRole(currentUser.id);
    if (!isAdmin) {
      showAccessDenied();
      return;
    }
    loadingScreen.style.display = 'none';
    mainPanel.style.display = 'block';
    await loadUsers();
    setupEventListeners();
  } catch (error) {
    console.error('Initialization error:', error);
    showAccessDenied();
  }
}

// Verify if user has admin role
async function verifyAdminRole(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Role verification error:', error);
      return false;
    }

    return data && data.role === 'admin';
  } catch (error) {
    console.error('Role check failed:', error);
    return false;
  }
}

// Show access denied screen
function showAccessDenied() {
  loadingScreen.style.display = 'none';
  accessDenied.style.display = 'block';
  mainPanel.style.display = 'none';
}

// Load all users from Supabase
async function loadUsers() {
  try {
    userListContainer.innerHTML = `
      <div class="loading-state">
        <i class="ri-loader-4-line"></i>
        <p style="margin-top: 16px;">Loading users...</p>
      </div>
    `;

    const { data, error } = await supabase
      .from('users')
      .select('user_id, email, full_name')
      .order('full_name', { ascending: true });

    if (error) throw error;

    allUsers = data || [];

    if (allUsers.length === 0) {
      userListContainer.innerHTML = `
        <div class="empty-state">
          <i class="ri-user-line" style="font-size: 32px; color: #999;"></i>
          <p style="margin-top: 16px;">No users found</p>
        </div>
      `;
      return;
    }

    renderUserList();
  } catch (error) {
    console.error('Error loading users:', error);
    userListContainer.innerHTML = `
      <div class="error-state">
        <i class="ri-error-warning-line" style="font-size: 32px; color: #dc3545;"></i>
        <p style="margin-top: 16px; color: #dc3545;">Failed to load users</p>
        <button class="btn btn-primary" onclick="loadUsers()" style="margin-top: 16px; max-width: 150px;">
          <i class="ri-refresh-line"></i> Retry
        </button>
      </div>
    `;
  }
}

// Render user list with checkboxes
function renderUserList() {
  const userListHTML = allUsers.map(user => {
    const isSelected = selectedUserEmails.has(user.email);
    return `
      <div class="user-item ${isSelected ? 'selected' : ''}" data-email="${user.email}">
        <input 
          type="checkbox" 
          ${isSelected ? 'checked' : ''}
          onchange="toggleUserSelection('${user.email}')"
        >
        <div class="user-info">
          <div class="user-name">${escapeHtml(user.full_name || 'No name')}</div>
          <div class="user-email">${escapeHtml(user.email)}</div>
        </div>
      </div>
    `;
  }).join('');

  userListContainer.innerHTML = `<div class="user-list">${userListHTML}</div>`;
  updateSelectedCount();
}

// Toggle user selection
function toggleUserSelection(email) {
  if (selectedUserEmails.has(email)) {
    selectedUserEmails.delete(email);
  } else {
    selectedUserEmails.add(email);
  }
  
  renderUserList();
  updateSelectAllCheckbox();
}

// Update selected count display
function updateSelectedCount() {
  selectedCountEl.textContent = `${selectedUserEmails.size} selected`;
  
  // Update send button state
  sendBtn.disabled = selectedUserEmails.size === 0;
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
  if (allUsers.length === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    return;
  }

  if (selectedUserEmails.size === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else if (selectedUserEmails.size === allUsers.length) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
  }
}

// Handle select all toggle
function handleSelectAll() {
  if (selectAllCheckbox.checked) {
    // Select all
    allUsers.forEach(user => selectedUserEmails.add(user.email));
  } else {
    // Deselect all
    selectedUserEmails.clear();
  }
  
  renderUserList();
}

// Setup event listeners
function setupEventListeners() {
  // Select all checkbox
  selectAllCheckbox.addEventListener('change', handleSelectAll);
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (loginPassword) {
    loginPassword.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    selectedUserEmails.clear();
    clearForm();
    loginCard.style.display = 'block';
    mainPanel.style.display = 'none';
  });

  // Character counters
  emailSubject.addEventListener('input', () => {
    document.getElementById('subjectCount').textContent = 
      `${emailSubject.value.length} / 200`;
    updatePreview();
  });

  emailTitle.addEventListener('input', () => {
    document.getElementById('titleCount').textContent = 
      `${emailTitle.value.length} / 100`;
    updatePreview();
  });

  emailBody.addEventListener('input', () => {
    document.getElementById('bodyCount').textContent = 
      `${emailBody.value.length} characters`;
    updatePreview();
  });

  // HTML mode toggle
  htmlMode.addEventListener('change', updatePreview);

  // Clear form button
  clearBtn.addEventListener('click', clearForm);

  // Form submission
  emailForm.addEventListener('submit', handleSendEmail);
}

// Update email preview
function updatePreview() {
  const title = emailTitle.value || 'Email Title';
  const body = emailBody.value || 'Your message will appear here...';
  
  if (htmlMode.checked) {
    previewBox.innerHTML = body;
  } else {
    previewBox.innerHTML = `
      <h2 style="color: #667eea; font-size: 22px; margin-top: 0;">${escapeHtml(title)}</h2>
      <p style="white-space: pre-wrap;">${escapeHtml(body)}</p>
    `;
  }
}

// Clear form
function clearForm() {
  emailSubject.value = '';
  emailTitle.value = '';
  emailBody.value = '';
  htmlMode.checked = false;
  previewBox.innerHTML = '';
  document.getElementById('subjectCount').textContent = '0 / 200';
  document.getElementById('titleCount').textContent = '0 / 100';
  document.getElementById('bodyCount').textContent = '0 characters';
  hideAlert();
}

// Handle email sending
async function handleSendEmail(e) {
  e.preventDefault();

  if (selectedUserEmails.size === 0) {
    showAlert('error', 'No Recipients', 'Please select at least one user to send the email.');
    return;
  }

  const subject = emailSubject.value.trim();
  const title = emailTitle.value.trim();
  const body = emailBody.value.trim();

  if (!subject || !title || !body) {
    showAlert('error', 'Missing Fields', 'Please fill in all required fields.');
    return;
  }

  // Confirm before sending
  const confirmMsg = `Send email to ${selectedUserEmails.size} user(s)?\n\nSubject: ${subject}`;
  if (!confirm(confirmMsg)) {
    return;
  }

  // Disable send button and show loading
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i> Sending...';

  try {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Prepare email content
    const htmlContent = htmlMode.checked ? body : `<p style="white-space: pre-wrap;">${escapeHtml(body)}</p>`;

    // Call edge function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        emails: Array.from(selectedUserEmails),
        subject: subject,
        title: title,
        html: htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    // Show success message
    showAlert(
      'success', 
      'Email Sent Successfully!', 
      `Email sent to ${result.sent} user(s). ${result.failed > 0 ? `${result.failed} failed.` : ''}`
    );

    // Clear form after successful send
    clearForm();
    selectedUserEmails.clear();
    renderUserList();

  } catch (error) {
    console.error('Send email error:', error);
    showAlert('error', 'Send Failed', error.message || 'Failed to send email. Please try again.');
  } finally {
    // Re-enable send button
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Send Email';
  }
}

// Show alert message
function showAlert(type, title, message) {
  const iconMap = {
    success: 'ri-checkbox-circle-line',
    error: 'ri-error-warning-line',
    info: 'ri-information-line',
  };

  alertContainer.innerHTML = `
    <div class="alert alert-${type}">
      <i class="${iconMap[type]}"></i>
      <div class="alert-content">
        <div class="alert-title">${title}</div>
        <div class="alert-message">${message}</div>
      </div>
    </div>
  `;

  // Auto-hide success alerts after 5 seconds
  if (type === 'success') {
    setTimeout(hideAlert, 5000);
  }
}

// Hide alert
function hideAlert() {
  alertContainer.innerHTML = '';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
