/**
 * Example: Using Supabase Auth in Your DualMind App
 * 
 * This file shows how to integrate authentication into your main application.
 * Copy these patterns into your existing components.
 */

// ============================================
// 1. CHECK IF USER IS LOGGED IN
// ============================================

function setupAuthGuard() {
  // Redirect to login if not authenticated
  if (!DualMindAuth.isLoggedIn()) {
    // Option A: Redirect to login with return URL
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    
    // Option B: Show a message and don't proceed
    // console.warn('User not authenticated');
    // return;
  }

  // If we get here, user is authenticated
  console.log('✅ User authenticated');
  console.log('Email:', DualMindAuth.getUserEmail());
  console.log('Name:', DualMindAuth.getUserName());
}

// Call at app startup
// setupAuthGuard();

// ============================================
// 2. DISPLAY USER INFO IN UI
// ============================================

function updateUserUI() {
  const userName = DualMindAuth.getUserName();
  const userInitials = DualMindAuth.getUser()?.id
    ? DualMindAuth.getUserName()
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  // Update header with user info
  const userElement = document.querySelector('.user-profile-button');
  if (userElement) {
    userElement.textContent = userInitials;
    userElement.title = userName;
  }

  // Update sidebar
  const sidebarUserName = document.querySelector('.sidebar-user-name');
  if (sidebarUserName) {
    sidebarUserName.textContent = userName;
  }
}

// Call when component mounts
// updateUserUI();

// ============================================
// 3. LOGOUT BUTTON HANDLER
// ============================================

async function handleLogout() {
  const confirmed = confirm('Are you sure you want to logout?');
  if (!confirmed) return;

  try {
    await DualMindAuth.logout();
    // DualMindAuth.logout() automatically redirects to login.html
  } catch (error) {
    console.error('Logout failed:', error);
    // Fallback: redirect manually
    window.location.href = '/login.html';
  }
}

// Usage in HTML:
// <button onclick="handleLogout()">Logout</button>

// ============================================
// 4. MAKE AUTHENTICATED API CALLS
// ============================================

async function fetchUserData() {
  try {
    // Option A: Using DualMindAuth helper (simplest)
    const response = await DualMindAuth.fetchWithAuth('/api/user-profile');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    console.log('User data:', data);
    return data;

    // Option B: Manual fetch with auth (also works)
    // const token = await DualMindAuth.getAccessToken();
    // const response = await fetch('/api/user-profile', {
    //   headers: {
    //     'Authorization': `Bearer ${token}`
    //   }
    // });
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    
    // If 401, logout user
    if (error.status === 401) {
      await DualMindAuth.logout();
    }
  }
}

// ============================================
// 5. POST DATA WITH AUTH
// ============================================

async function submitThreadMessage(threadId, message) {
  try {
    const response = await DualMindAuth.fetchWithAuth(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    console.log('Message sent:', data);
    return data;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

// ============================================
// 6. CONDITIONAL RENDERING BASED ON AUTH
// ============================================

function renderUserMenu() {
  if (!DualMindAuth.isLoggedIn()) {
    return `
      <div class="auth-menu">
        <a href="/login.html" class="btn btn-primary">Login</a>
        <a href="/login.html" class="btn btn-secondary">Sign Up</a>
      </div>
    `;
  }

  return `
    <div class="user-menu">
      <div class="user-info">
        <p class="user-name">${DualMindAuth.getUserName()}</p>
        <p class="user-email">${DualMindAuth.getUserEmail()}</p>
      </div>
      <button onclick="handleLogout()" class="btn btn-danger">Logout</button>
    </div>
  `;
}

// ============================================
// 7. HANDLE AUTH STATE CHANGES
// ============================================

// Listen for auth changes (e.g., when user logs in from another tab)
function setupAuthListener() {
  // Create a listener for storage changes (when logout happens in another tab)
  window.addEventListener('storage', (event) => {
    if (event.key === 'dualmind.auth.supabase') {
      if (!event.newValue) {
        // User logged out in another tab
        console.log('User logged out in another tab');
        window.location.href = '/login.html';
      }
    }
  });

  // You can also setup a periodic check
  setInterval(() => {
    const isLoggedIn = DualMindAuth.isLoggedIn();
    console.log('Auth check:', isLoggedIn ? '✅ Logged in' : '❌ Not logged in');
  }, 5 * 60 * 1000); // Check every 5 minutes
}

// ============================================
// 8. PASS USER ID TO API FOR TRACKING
// ============================================

async function createArenaMatch(model1, model2) {
  const userId = DualMindAuth.getUser()?.id;
  
  try {
    const response = await DualMindAuth.fetchWithAuth('/api/arena/matches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId || 'anonymous', // Include user ID
      },
      body: JSON.stringify({
        model1,
        model2,
        createdBy: userId,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to create match:', error);
    throw error;
  }
}

// ============================================
// 9. HANDLE 401 UNAUTHORIZED ERRORS
// ============================================

function setup401Handler() {
  // This is already handled by DualMindAuth.fetchWithAuth
  // but you can add custom logic:

  window.addEventListener('fetch', (event) => {
    if (event.response && event.response.status === 401) {
      console.warn('Unauthorized - logging out user');
      DualMindAuth.logout();
    }
  });
}

// ============================================
// 10. COMPONENT INTEGRATION EXAMPLE
// ============================================

class ChatComponent {
  constructor(containerElement) {
    this.container = containerElement;
    this.init();
  }

  async init() {
    // Check auth on component load
    if (!DualMindAuth.isLoggedIn()) {
      this.container.innerHTML = `
        <div class="auth-required">
          <p>Please <a href="/login.html">login</a> to use chat</p>
        </div>
      `;
      return;
    }

    // Render chat interface
    this.render();
    this.setupEventListeners();
  }

  render() {
    const userName = DualMindAuth.getUserName();
    this.container.innerHTML = `
      <div class="chat">
        <div class="chat-header">
          <h2>Chat with ${userName}</h2>
          <button onclick="handleLogout()" class="logout-btn">Logout</button>
        </div>
        <div class="chat-messages" id="messages"></div>
        <div class="chat-input">
          <input type="text" id="message-input" placeholder="Type a message..." />
          <button id="send-btn">Send</button>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    sendBtn.addEventListener('click', () => this.sendMessage());
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  async sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message) return;

    try {
      const userId = DualMindAuth.getUser().id;
      
      // Send message with auth
      await DualMindAuth.fetchWithAuth('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          userId,
          timestamp: new Date().toISOString(),
        }),
      });

      input.value = '';
      this.loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  }

  async loadMessages() {
    try {
      const response = await DualMindAuth.fetchWithAuth('/api/messages');
      const messages = await response.json();
      
      const messagesDiv = document.getElementById('messages');
      messagesDiv.innerHTML = messages.map(msg => `
        <div class="message">
          <p class="message-author">${msg.author}</p>
          <p class="message-content">${msg.content}</p>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }
}

// Usage:
// const chatComponent = new ChatComponent(document.getElementById('chat-container'));

// ============================================
// EXPORT FOR USE IN OTHER MODULES
// ============================================

export {
  setupAuthGuard,
  updateUserUI,
  handleLogout,
  fetchUserData,
  submitThreadMessage,
  renderUserMenu,
  setupAuthListener,
  createArenaMatch,
  setup401Handler,
  ChatComponent,
};
