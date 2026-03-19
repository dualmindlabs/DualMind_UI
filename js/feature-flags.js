/**
 * Feature Flags and Role-Based UI handling
 * Controls visibility of elements based on the user's role (e.g. 'tester')
 */

document.addEventListener('DOMContentLoaded', () => {
  // We need to wait for auth to initialize before checking roles
  setTimeout(checkUserRoleAndFeatures, 1000); // Small delay to let Supabase auth settle
});

async function checkUserRoleAndFeatures() {
  try {
    // 1. Get the auth service
    const authService = window.getSupabaseAuthService ? window.getSupabaseAuthService() : null;
    if (!authService || !authService.isAuthenticated()) {
      return; // Not logged in
    }

    // 2. Setup the API client to fetch /api/users/me
    const token = await authService.getAccessToken();
    if (!token) return;

    // Use existing config or dualmind URL safely
    const apiUrl = window.DUALMIND_CONFIG ? window.DUALMIND_CONFIG.API_URL : 'http://localhost:5079';
    const api = new window.DualMindAPIService(apiUrl, () => token);

    // 3. Fetch user profile from DB (which includes 'role')
    const meResponse = await api.getMe();
    
    // 4. If the user is a tester, reveal the hidden tester UI/features
    if (meResponse && meResponse.role === 'tester') {
      console.log('✅ Tester role detected! Unlocking tester features...');
      
      // Add a global class to body so CSS can reveal items 
      // e.g. .role-tester .tester-only { display: block; }
      document.body.classList.add('role-tester');

      // Also specifically reveal any elements with data-role="tester"
      const testerElements = document.querySelectorAll('[data-role="tester"]');
      testerElements.forEach(el => {
        el.style.display = ''; // Reset display to default (removes inline display:none if any)
        el.classList.remove('hidden', 'd-none'); // Remove common hiding classes
      });

      // You can add further specific UI injections here if needed!
    }
  } catch (error) {
    console.warn('Failed to check user role/features:', error);
  }
}
