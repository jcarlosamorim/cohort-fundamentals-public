/* ==========================================================================
   AUTH - Supabase client initialization & session management
   Email + Password auth with forced password change on first login
   ========================================================================== */

if (typeof Config === 'undefined') {
  throw new Error('[Auth] Config module not loaded. Check script order in index.html — config.js must be loaded before auth.js.');
}

const Auth = (() => {
  // D2 fix: credentials centralized in js/config.js (loaded before this script)
  const SUPABASE_URL = Config.SUPABASE_URL;
  const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY;

  let supabase = null;
  let currentUser = null;
  let cachedAccessToken = null;
  let onAuthChangeCallbacks = [];
  let isPasswordRecovery = false;

  function getClient() { return supabase; }
  function getUser() { return currentUser; }
  function onAuthChange(cb) { onAuthChangeCallbacks.push(cb); }

  function mustChangePassword() {
    if (!currentUser) return false;
    var meta = currentUser.user_metadata;
    return meta && meta.must_change_password === true;
  }

  async function init() {
    // Guard: Supabase JS CDN must be loaded
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.error('[Auth] Supabase JS library not loaded. CDN may be blocked or offline.');
      return null;
    }

    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { flowType: 'implicit' }
    });

    supabase.auth.onAuthStateChange((event, session) => {
      var prev = currentUser;
      currentUser = session ? session.user : null;
      cachedAccessToken = session ? session.access_token : null;
      if (event === 'PASSWORD_RECOVERY') {
        isPasswordRecovery = true;
      }
      if (event === 'TOKEN_REFRESHED' && !session) {
        // Refresh failed — force re-login
        currentUser = null;
      }
      if (prev !== currentUser) {
        onAuthChangeCallbacks.forEach(function(cb) { cb(currentUser, event); });
      }
    });

    try {
      var result = await supabase.auth.getSession();
      var session = result.data.session;
      currentUser = session ? session.user : null;
      cachedAccessToken = session ? session.access_token : null;
    } catch (e) {
      console.error('[Auth] Failed to get session:', e.message);
      currentUser = null;
    }
    return currentUser;
  }

  var SVC_ERR = { error: { message: 'Serviço indisponível. Recarregue a página.' } };

  async function signInWithPassword(email, password) {
    if (!supabase) return SVC_ERR;
    var result = await supabase.auth.signInWithPassword({ email: email, password: password });
    if (!result.error && result.data.user) currentUser = result.data.user;
    return result;
  }

  async function signUp(email, password, name) {
    if (!supabase) return SVC_ERR;
    var options = {
      email: email,
      password: password
    };
    if (name) {
      options.options = { data: { name: name, must_change_password: false } };
    }
    var result = await supabase.auth.signUp(options);
    if (!result.error && result.data.session) currentUser = result.data.session.user;
    return result;
  }

  async function updatePassword(newPassword) {
    var result = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false }
    });
    if (!result.error && result.data.user) currentUser = result.data.user;
    return { error: result.error };
  }

  function getAccessToken() { return cachedAccessToken; }

  function authHeaders() {
    var token = cachedAccessToken;
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  function isRecovery() { return isPasswordRecovery; }
  function clearRecovery() { isPasswordRecovery = false; }

  async function resetPasswordForEmail(email) {
    if (!supabase) return { error: { message: 'Serviço indisponível. Recarregue a página.' } };
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/home'
    });
  }

  async function signOut() {
    // Clear all user-scoped localStorage before sign out
    clearUserStorage();
    var result = await supabase.auth.signOut();
    if (result.error) throw result.error;
    currentUser = null;
    window.location.reload();
  }

  function clearUserStorage() {
    try {
      // Remove old non-scoped keys (legacy)
      localStorage.removeItem('psicometria_data_v2');
      localStorage.removeItem('psicometria_source_v2');
      // Remove all user-scoped psicometria keys
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && (key.indexOf('psicometria_') === 0)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
    } catch(e) {}
  }

  return {
    init: init,
    getClient: getClient,
    getUser: getUser,
    getAccessToken: getAccessToken,
    authHeaders: authHeaders,
    signInWithPassword: signInWithPassword,
    signUp: signUp,
    updatePassword: updatePassword,
    resetPasswordForEmail: resetPasswordForEmail,
    signOut: signOut,
    onAuthChange: onAuthChange,
    mustChangePassword: mustChangePassword,
    isRecovery: isRecovery,
    clearRecovery: clearRecovery
  };
})();
