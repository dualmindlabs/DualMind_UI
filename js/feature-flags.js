/**
 * Feature Flags and Role-Based UI handling
 * Controls visibility of elements based on the user's role (e.g. 'tester')
 */

document.addEventListener('DOMContentLoaded', () => {
  initFeatureFlags();
});

let testerHeaderObserverAttached = false;
let testerMissingTargetsWarned = false;

function attachTesterHeaderObserver() {
  if (testerHeaderObserverAttached) return;
  if (!document.body) return;

  const observer = new MutationObserver(() => {
    if (!document.querySelector('#main-header .header-controls')) return;

    // Keep badge in sync when header mounts/re-mounts after role already resolved.
    setTesterBadgeVisible(document.body.classList.contains('role-tester'));
    const cachedBalance = Number.isFinite(window._DUALMIND_TESTER_ENERGY_BALANCE)
      ? window._DUALMIND_TESTER_ENERGY_BALANCE
      : null;
    setTesterCreditsVisible(document.body.classList.contains('role-tester'), cachedBalance);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  testerHeaderObserverAttached = true;
}

async function initFeatureFlags() {
  attachTesterHeaderObserver();

  if (window.DualMindAuthReady && typeof window.DualMindAuthReady.then === 'function') {
    try {
      await window.DualMindAuthReady;
    } catch (err) {
      console.warn('[FeatureFlags] DualMindAuthReady failed:', err);
    }
  }

  await checkUserRoleAndFeatures();

  // Re-check after auth/login events to keep role gating up to date.
  document.addEventListener('user-logged-in', () => {
    checkUserRoleAndFeatures();
  });

  document.addEventListener('backend-available', (evt) => {
    if (evt?.detail?.available) {
      checkUserRoleAndFeatures();
    }
  });
}

function getAuthService() {
  if (window.getSupabaseAuthService) {
    try {
      return window.getSupabaseAuthService();
    } catch {
      // Continue to fallbacks.
    }
  }

  if (window._DUALMIND_AUTH) {
    return window._DUALMIND_AUTH;
  }

  return null;
}

function getApiBaseUrl() {
  return window.DUALMIND_CONFIG?.apiBaseUrl ||
    window.DUALMIND_CONFIG?.backendUrl ||
    window.DUALMIND_CONFIG?.serverUrl ||
    'http://localhost:5079';
}

function extractRole(meResponse) {
  const normalized = normalizeMeResponse(meResponse);
  if (!normalized) return null;
  return normalized.role || normalized.user_role || normalized.userRole || null;
}

function extractEnergyBalance(meResponse) {
  const normalized = normalizeMeResponse(meResponse);
  if (!normalized) return null;

  const candidates = [
    normalized.energy_balance,
    normalized.energyBalance,
    normalized.credits,
    normalized.credit_balance,
    normalized.balance,
    meResponse?.energy_balance,
    meResponse?.energyBalance,
    meResponse?.user?.energy_balance,
    meResponse?.data?.energy_balance
  ];

  for (const candidate of candidates) {
    if (candidate === 0) return 0;
    if (candidate === null || candidate === undefined) continue;

    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeMeResponse(meResponse) {
  if (!meResponse) return null;

  // Case: endpoint returns a plain user object
  if (typeof meResponse === 'object' && !Array.isArray(meResponse) && meResponse.role) {
    return meResponse;
  }

  // Case: endpoint returns array of users
  if (Array.isArray(meResponse)) {
    return meResponse[0] || null;
  }

  // Case: wrapped payloads
  if (Array.isArray(meResponse.data)) {
    return meResponse.data[0] || null;
  }

  if (Array.isArray(meResponse.items)) {
    return meResponse.items[0] || null;
  }

  if (meResponse.user && typeof meResponse.user === 'object') {
    return meResponse.user;
  }

  if (meResponse.data && typeof meResponse.data === 'object') {
    return meResponse.data;
  }

  return typeof meResponse === 'object' ? meResponse : null;
}

function buildSyncFallbackPayload(authUser) {
  if (!authUser) return null;

  return {
    id: authUser.id,
    email: authUser.email,
    phone: authUser.phone || null,
    name: authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split('@')[0] ||
      'User',
    avatar_url: authUser.user_metadata?.avatar_url || null,
    provider: authUser.app_metadata?.provider || 'email'
  };
}

async function trySyncFallbackProfile(apiUrl, token, authUser) {
  const payload = buildSyncFallbackPayload(authUser);
  if (!payload?.id || !payload?.email) {
    throw new Error('Cannot build sync fallback payload from auth user.');
  }

  const response = await fetch(`${apiUrl}/api/users/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`/api/users/sync fallback failed: ${response.status}`);
  }

  return response.json();
}

async function fetchSupabaseUserMeta(token, authUserId) {
  if (!authUserId) return null;

  const projectUrl = window.DUALMIND_CONFIG?.supabase?.url;
  const anonKey = window.DUALMIND_CONFIG?.supabase?.anonKey;
  if (!projectUrl || !anonKey) return null;

  const endpointWithEnergy = `${projectUrl}/rest/v1/users?select=role,user_id,energy_balance&user_id=eq.${encodeURIComponent(authUserId)}&limit=1`;
  let response = await fetch(endpointWithEnergy, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  // Fallback for projects where energy_balance is not exposed/available.
  if (!response.ok) {
    const endpointRoleOnly = `${projectUrl}/rest/v1/users?select=role,user_id&user_id=eq.${encodeURIComponent(authUserId)}&limit=1`;
    response = await fetch(endpointRoleOnly, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  if (!response.ok) {
    let errorPayload = null;
    try {
      errorPayload = await response.text();
    } catch {
      errorPayload = null;
    }

    console.warn('[FeatureFlags] Supabase users role lookup failed:', {
      status: response.status,
      authUserId,
      error: errorPayload
    });
    return null;
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return {
    role: rows[0]?.role || null,
    user_id: rows[0]?.user_id || authUserId,
    energy_balance: rows[0]?.energy_balance ?? null
  };
}

async function fetchMeResponse(token, authUser) {
  const apiUrl = getApiBaseUrl();
  // Primary source: working sync endpoint.
  const syncResponse = await trySyncFallbackProfile(apiUrl, token, authUser);

  // If backend sync response does not include role, query Supabase users table as fallback.
  const normalized = normalizeMeResponse(syncResponse);
  const role = extractRole(syncResponse);
  const energyBalance = extractEnergyBalance(syncResponse);

  const authUserId = authUser?.id || normalized?.user_id || normalized?.id || null;
  const supabaseMeta = await fetchSupabaseUserMeta(token, authUserId);
  if (!supabaseMeta) {
    return syncResponse;
  }

  if (role && Number.isFinite(energyBalance)) {
    return syncResponse;
  }

  const base = normalized && typeof normalized === 'object' ? normalized : {};
  return {
    ...base,
    role: base.role || supabaseMeta.role || null,
    user_id: base.user_id || supabaseMeta.user_id || authUserId || null,
    energy_balance: (base.energy_balance ?? supabaseMeta.energy_balance ?? null)
  };
}

function ensureTesterBadge() {
  const headerControls = document.querySelector('#main-header .header-controls');
  if (!headerControls) return null;

  let badge = document.getElementById('tester-mode-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'tester-mode-badge';
    badge.className = 'tester-mode-badge hidden';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.textContent = 'Tester Mode';
    headerControls.prepend(badge);
  }

  return badge;
}

function ensureTesterCreditsChip() {
  const headerControls = document.querySelector('#main-header .header-controls');
  if (!headerControls) return null;

  let chip = document.getElementById('tester-credits-chip');
  if (!chip) {
    chip = document.createElement('span');
    chip.id = 'tester-credits-chip';
    chip.className = 'tester-credits-chip hidden';
    chip.setAttribute('role', 'status');
    chip.setAttribute('aria-live', 'polite');
    chip.setAttribute('aria-hidden', 'true');
    headerControls.prepend(chip);
  }

  return chip;
}

function setTesterCreditsVisible(visible, energyBalance = null) {
  const chip = ensureTesterCreditsChip();
  if (!chip) return;

  if (!visible) {
    chip.classList.add('hidden');
    chip.setAttribute('aria-hidden', 'true');
    return;
  }

  const creditsLabel = Number.isFinite(energyBalance)
    ? `${Math.max(0, Math.floor(energyBalance))} Credits`
    : 'Credits --';

  chip.textContent = creditsLabel;
  chip.classList.remove('hidden');
  chip.setAttribute('aria-hidden', 'false');
}

function setTesterBadgeVisible(visible) {
  const badge = ensureTesterBadge();
  if (!badge) return;

  if (visible) {
    badge.classList.remove('hidden');
    badge.setAttribute('aria-hidden', 'false');
    return;
  }

  badge.classList.add('hidden');
  badge.setAttribute('aria-hidden', 'true');
}

function applyTesterFeatures() {
  document.body.classList.add('role-tester');
  setTesterBadgeVisible(true);

  // Retry once after paint in case header renders just after role resolution.
  requestAnimationFrame(() => {
    setTesterBadgeVisible(true);
    setTesterCreditsVisible(true);
  });
  setTimeout(() => {
    setTesterBadgeVisible(true);
    setTesterCreditsVisible(true);
  }, 200);

  const testerElements = document.querySelectorAll('[data-role="tester"], .tester-only');
  testerElements.forEach((el) => {
    el.style.display = '';
    el.classList.remove('hidden', 'd-none');
  });

  const hasBadge = !!document.getElementById('tester-mode-badge');
  if (!testerElements.length && !hasBadge && !testerMissingTargetsWarned) {
    testerMissingTargetsWarned = true;
    console.warn('[FeatureFlags] Role is tester, but no tester-marked elements found. Add [data-role="tester"] or .tester-only in UI.');
  }
}

function clearTesterFeatures() {
  document.body.classList.remove('role-tester');
  setTesterBadgeVisible(false);
  setTesterCreditsVisible(false);
}

async function checkUserRoleAndFeatures() {
  try {
    const authService = getAuthService();
    if (!authService || !authService.isAuthenticated()) {
      clearTesterFeatures();
      return;
    }

    const token = await authService.getAccessToken();
    if (!token) {
      clearTesterFeatures();
      return;
    }

    const authUser = authService.getUser ? authService.getUser() : null;
    const meResponse = await fetchMeResponse(token, authUser);
    const normalized = normalizeMeResponse(meResponse);
    const role = extractRole(meResponse);
    const energyBalance = extractEnergyBalance(meResponse);
    window._DUALMIND_TESTER_ENERGY_BALANCE = Number.isFinite(energyBalance) ? energyBalance : null;
    const responseUserId = normalized?.user_id || normalized?.userId || normalized?.id || null;
    const authUserId = authUser?.id || null;

    console.info('[FeatureFlags] Role payload received:', {
      role,
      authUserId,
      responseUserId,
      raw: meResponse
    });

    if (authUserId && responseUserId && authUserId !== responseUserId) {
      clearTesterFeatures();
      console.warn('[FeatureFlags] /api/users/me user mismatch. Role gating skipped.', {
        authUserId,
        responseUserId
      });
      return;
    }

    if (role === 'tester') {
      console.info('[FeatureFlags] Tester role detected. Unlocking tester features.');
      applyTesterFeatures();
      setTesterCreditsVisible(true, energyBalance);
      return;
    }

    clearTesterFeatures();
    console.info('[FeatureFlags] User role is not tester:', role);
  } catch (error) {
    console.warn('[FeatureFlags] Failed to check user role/features:', error);
  }
}
