// Supabase initialization
window.supabase = window.supabase || {};

// Initialize Supabase client
function initializeSupabase() {
    // TODO: Replace with your real Supabase values from Project Settings -> API
    const SUPABASE_URL = 'https://calqfzajyidkdzbaswjp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbHFmemFqeWlka2R6YmFzd2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzMwODMsImV4cCI6MjA3OTg0OTA4M30.ptXyUNCcAhGi9u2kVDHOxSBvQv0W72S5HHqkIFXQS08';
    
    if (window.supabase.createClient) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    }
    return false;
}

// Initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSupabase);
} else {
    initializeSupabase();
}
