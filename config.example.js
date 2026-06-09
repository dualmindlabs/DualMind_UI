window.DUALMIND_CONFIG = window.DUALMIND_CONFIG || {};

// ========== BACKEND URL CONFIGURATION ==========
const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '::1';

const BACKEND_URL = isLocalhost ? 'http://localhost:5079' : 'https://dualmind-arena-cgh0cvdfhkbgatba.uaenorth-01.azurewebsites.net';

window.DUALMIND_CONFIG.apiBaseUrl = BACKEND_URL;
window.DUALMIND_CONFIG.backendUrl = BACKEND_URL;

// ========== SUPABASE CONFIGURATION ==========
window.DUALMIND_CONFIG.supabase = window.DUALMIND_CONFIG.supabase || {};

// Copy this file to .env and fill in real values, never commit real credentials
window.DUALMIND_CONFIG.supabase.url = window.DUALMIND_CONFIG.supabase.url || 'YOUR_SUPABASE_URL';
window.DUALMIND_CONFIG.supabase.anonKey = window.DUALMIND_CONFIG.supabase.anonKey || 'YOUR_SUPABASE_ANON_KEY';
window.DUALMIND_CONFIG.supabase.authEmailFunctionUrl = window.DUALMIND_CONFIG.supabase.authEmailFunctionUrl || 'YOUR_SUPABASE_URL/functions/v1/email-wel-safe';

// Optional: Supabase storage bucket for user avatars
window.DUALMIND_CONFIG.supabase.storageBucket = window.DUALMIND_CONFIG.supabase.storageBucket || 'avatars';
