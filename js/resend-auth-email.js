/**
 * DualMind - js/resend-auth-email.js
 *
 * Public API:
 *   DualMindResendEmail.sendWelcome(opts?)
 *   DualMindResendEmail.sendLogin(opts?)
 *   DualMindResendEmail.sendLoginOnceSafely(opts?)
 *   DualMindResendEmail.syncSession(session)
 *   DualMindResendEmail.getUser()
 *   DualMindResendEmail.getUserEmail()
 */
(function (g) {
  'use strict';

  if (g.__DUALMIND_RESEND_EMAIL_INITIALIZED) {
    return;
  }

  g.__DUALMIND_RESEND_EMAIL_INITIALIZED = true;

  var _session = null;
  var _loginSent = false;
  var _lastLoginAt = 0;
  var _subscribed = false;
  var _loginInFlight = null;

  function cfg() { return g.DUALMIND_CONFIG || {}; }
  function emailCfg() { return cfg().email || {}; }
  function sbCfg() { return cfg().supabase || {}; }

  function getFunctionUrl() {
    var url = sbCfg().authEmailFunctionUrl;
    if (!url) {
      console.error(
        '[DualMindResendEmail] DUALMIND_CONFIG.supabase.authEmailFunctionUrl is not set.\n' +
        'Set it in config.js to: https://YOUR_PROJECT.supabase.co/functions/v1/send-user-auth-email'
      );
    }
    return url || null;
  }

  function getSBClient() {
    if (g._DUALMIND_AUTH && g._DUALMIND_AUTH.supabase) {
      return g._DUALMIND_AUTH.supabase;
    }

    if (g.__DUALMIND_EMAIL_SUPABASE__ && g.__DUALMIND_EMAIL_SUPABASE__.auth) {
      return g.__DUALMIND_EMAIL_SUPABASE__;
    }

    if (g._supabase && g._supabase.auth) {
      return g._supabase;
    }

    if (g.supabase && g.supabase.auth) {
      return g.supabase;
    }

    if (g.supabase && typeof g.supabase.createClient === 'function' && sbCfg().url && sbCfg().anonKey) {
      g.__DUALMIND_EMAIL_SUPABASE__ = g.supabase.createClient(sbCfg().url, sbCfg().anonKey);
      return g.__DUALMIND_EMAIL_SUPABASE__;
    }

    if (g.DualMindAuth && g._DUALMIND_AUTH && g._DUALMIND_AUTH.supabase) {
      return g._DUALMIND_AUTH.supabase;
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
    _session = session || null;
  }

  async function ensureSession() {
    if (_session && _session.access_token) {
      return _session;
    }

    var sb = getSBClient();
    if (!sb) {
      try {
        var stored = JSON.parse(localStorage.getItem('dualmind.auth.supabase') || '{}');
        _session = stored.session || null;
      } catch (e) {
        _session = null;
      }
      return _session;
    }

    try {
      var result = await sb.auth.getSession();
      _session = (result.data && result.data.session) || null;
    } catch (e) {
      console.warn('[DualMindResendEmail] getSession failed:', e);
      _session = null;
    }

    return _session;
  }

  function getUser() {
    return _session ? _session.user : null;
  }

  function getUserEmail() {
    return _session && _session.user ? _session.user.email || null : null;
  }

  function isDebounced() {
    var ms = emailCfg().clientDebounceMs;
    if (typeof ms !== 'number') ms = 30000;
    return (Date.now() - _lastLoginAt) < ms;
  }

  async function send(type, opts) {
    var url = getFunctionUrl();
    if (!url) {
      return { success: false, error: 'authEmailFunctionUrl is not configured in config.js' };
    }

    var session = await ensureSession();
    if (!session || !session.access_token) {
      return { success: false, error: 'No active session - the user must be signed in first.' };
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

    var res;
    var data;

    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token,
        },
        body: JSON.stringify(payload),
      });
      data = await res.json();
    } catch (networkErr) {
      var errMsg = networkErr && networkErr.message ? networkErr.message : 'Network error';
      console.error('[DualMindResendEmail] Network error:', errMsg);
      return { success: false, error: errMsg };
    }

    if (!res.ok) {
      console.error('[DualMindResendEmail] HTTP ' + res.status + ':', data);
      return {
        success: false,
        error: data && data.error ? data.error : ('HTTP ' + res.status),
        status: res.status,
        detail: data && data.detail ? data.detail : null,
      };
    }

    if (type === 'login') {
      _loginSent = true;
      _lastLoginAt = Date.now();
    }

    return {
      success: true,
      sentTo: data.sentTo || null,
      type: data.type || type,
      messageId: data.messageId || null,
    };
  }

  function sendWelcome(opts) {
    return send('welcome', opts);
  }

  function sendLogin(opts) {
    return send('login', opts);
  }

  async function sendLoginOnceSafely(opts) {
    if (_loginSent) return null;
    if (_loginInFlight) return _loginInFlight;
    if (isDebounced()) return null;

    _lastLoginAt = Date.now();
    _loginInFlight = send('login', opts)
      .finally(function () {
        _loginInFlight = null;
      });

    return _loginInFlight;
  }

  function subscribeToAuth(sb) {
    if (_subscribed || !sb || !sb.auth) {
      return;
    }

    _subscribed = true;
    ensureSession();

    sb.auth.onAuthStateChange(function (event, session) {
      syncSession(session);

      if (event === 'SIGNED_IN') {
        if (emailCfg().sendLoginNotification !== false) {
          sendLoginOnceSafely().catch(function (e) {
            console.warn('[DualMindResendEmail] sendLoginOnceSafely error:', e);
          });
        }
      }

      if (event === 'SIGNED_OUT') {
        _loginSent = false;
        _session = null;
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        syncSession(session);
      }
    });
  }

  function autoSetup() {
    if (g.DualMindAuthReady && typeof g.DualMindAuthReady.then === 'function') {
      g.DualMindAuthReady
        .then(function () {
          var readyClient = getSBClient();
          if (readyClient) {
            subscribeToAuth(readyClient);
            return;
          }
          console.warn('[DualMindResendEmail] Supabase client not found after DualMindAuthReady resolved.');
        })
        .catch(function (e) {
          console.warn('[DualMindResendEmail] DualMindAuthReady failed:', e);
        });
      return;
    }

    var sb = getSBClient();
    if (sb) {
      subscribeToAuth(sb);
      return;
    }

    setTimeout(function () {
      var retryClient = getSBClient();
      if (retryClient) {
        subscribeToAuth(retryClient);
      } else {
        console.warn('[DualMindResendEmail] Supabase client not found. Load the SDK before this script.');
      }
    }, 0);
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
}(typeof globalThis !== 'undefined' ? globalThis : window));
