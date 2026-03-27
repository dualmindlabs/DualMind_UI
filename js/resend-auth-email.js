/**
 * DualMind auth email helper
 * Sends welcome/login notifications through Supabase Edge Function.
 */
(function (g) {
  'use strict';

  if (g.__DUALMIND_RESEND_EMAIL_INITIALIZED) {
    return;
  }

  g.__DUALMIND_RESEND_EMAIL_INITIALIZED = true;

  var sessionCache = null;
  var subscribed = false;
  var loginSent = false;
  var loginInFlight = null;
  var lastLoginAt = 0;

  function cfg() {
    return g.DUALMIND_CONFIG || {};
  }

  function supabaseCfg() {
    return cfg().supabase || {};
  }

  function emailCfg() {
    return cfg().email || {};
  }

  function getFunctionUrl() {
    return supabaseCfg().authEmailFunctionUrl || null;
  }

  function getClient() {
    if (g.__DUALMIND_EMAIL_SUPABASE__ && g.__DUALMIND_EMAIL_SUPABASE__.auth) {
      return g.__DUALMIND_EMAIL_SUPABASE__;
    }

    if (g._DUALMIND_AUTH && g._DUALMIND_AUTH.supabase) {
      return g._DUALMIND_AUTH.supabase;
    }

    if (g._supabase && g._supabase.auth) {
      return g._supabase;
    }

    if (g.supabase && g.supabase.auth) {
      return g.supabase;
    }

    return null;
  }

  function registerClient(client) {
    if (!client || !client.auth) {
      return;
    }

    g.__DUALMIND_EMAIL_SUPABASE__ = client;
    subscribeToAuth(client);
  }

  function syncSession(session) {
    sessionCache = session || null;
  }

  async function ensureSession() {
    if (sessionCache && sessionCache.access_token) {
      return sessionCache;
    }

    var client = getClient();
    if (!client) {
      try {
        var stored = JSON.parse(localStorage.getItem('dualmind.auth.supabase') || '{}');
        sessionCache = stored.session || null;
      } catch (e) {
        sessionCache = null;
      }
      return sessionCache;
    }

    try {
      var result = await client.auth.getSession();
      sessionCache = (result.data && result.data.session) || null;
    } catch (e) {
      sessionCache = null;
    }

    return sessionCache;
  }

  function getUser() {
    return sessionCache ? sessionCache.user : null;
  }

  function getUserEmail() {
    var user = getUser();
    return user ? user.email || null : null;
  }

  function isLoginDebounced() {
    var debounceMs = emailCfg().clientDebounceMs;
    if (typeof debounceMs !== 'number') debounceMs = 30000;
    return Date.now() - lastLoginAt < debounceMs;
  }

  async function send(type, opts) {
    var url = getFunctionUrl();
    if (!url) {
      console.error('[DualMindAuthEmail] Missing authEmailFunctionUrl config.');
      return { success: false, error: 'Missing config: supabase.authEmailFunctionUrl' };
    }

    var session = await ensureSession();
    if (!session || !session.access_token) {
      return { success: false, error: 'No active session to authorize email send.' };
    }

    var timezone = 'UTC';
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) {
      timezone = 'UTC';
    }

    var userAgent = '';
    try {
      userAgent = navigator.userAgent || '';
    } catch (e) {
      userAgent = '';
    }

    var payload = Object.assign(
      {
        type: type,
        timezone: timezone,
        userAgent: userAgent,
      },
      opts || {}
    );

    console.info('[DualMindAuthEmail] Sending request', {
      url: url,
      type: type,
      email: getUserEmail(),
      hasSession: !!(session && session.access_token),
      payload: payload,
    });

    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token,
        },
        body: JSON.stringify(payload),
      });

      var body = {};
      try {
        body = await res.json();
      } catch (e) {
        body = {};
      }

      if (!res.ok) {
        console.error('[DualMindAuthEmail] Request failed', {
          url: url,
          type: type,
          status: res.status,
          response: body,
        });
        return {
          success: false,
          error: body.error || ('HTTP ' + res.status),
          status: res.status,
          detail: body.detail || null,
        };
      }

      if (type === 'login') {
        loginSent = true;
        lastLoginAt = Date.now();
      }

      console.info('[DualMindAuthEmail] Request succeeded', {
        url: url,
        type: type,
        response: body,
      });

      return {
        success: true,
        sentTo: body.sentTo || null,
        messageId: body.messageId || null,
        type: body.type || type,
      };
    } catch (networkErr) {
      console.error('[DualMindAuthEmail] Network error', {
        url: url,
        type: type,
        error: networkErr,
      });
      return {
        success: false,
        error: networkErr && networkErr.message ? networkErr.message : 'Network error',
      };
    }
  }

  function sendWelcome(opts) {
    return send('welcome', opts);
  }

  function sendLogin(opts) {
    return send('login', opts);
  }

  async function sendLoginOnceSafely(opts) {
    if (loginSent || isLoginDebounced()) {
      console.info('[DualMindAuthEmail] Login email skipped (already sent or debounced).');
      return null;
    }

    if (loginInFlight) {
      return loginInFlight;
    }

    lastLoginAt = Date.now();
    loginInFlight = send('login', opts).finally(function () {
      loginInFlight = null;
    });

    return loginInFlight;
  }

  function subscribeToAuth(client) {
    if (subscribed || !client || !client.auth) {
      return;
    }

    subscribed = true;
    ensureSession();

    client.auth.onAuthStateChange(function (event, session) {
      syncSession(session);

      if (event === 'SIGNED_IN') {
        if (emailCfg().sendLoginNotification !== false) {
          sendLoginOnceSafely().catch(function () {
            // Keep this non-fatal in UI flows.
          });
        }
      }

      if (event === 'SIGNED_OUT') {
        loginSent = false;
        sessionCache = null;
      }
    });
  }

  function autoSetup() {
    if (g.DualMindAuthReady && typeof g.DualMindAuthReady.then === 'function') {
      g.DualMindAuthReady
        .then(function () {
          var client = getClient();
          if (client) {
            subscribeToAuth(client);
          }
        })
        .catch(function () {
          // Ignore boot failures for helper setup.
        });
      return;
    }

    var client = getClient();
    if (client) {
      subscribeToAuth(client);
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoSetup);
    } else {
      autoSetup();
    }
  }

  g.DualMindResendEmail = {
    sendWelcome: sendWelcome,
    sendLogin: sendLogin,
    sendLoginOnceSafely: sendLoginOnceSafely,
    syncSession: syncSession,
    registerClient: registerClient,
    getUser: getUser,
    getUserEmail: getUserEmail,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
