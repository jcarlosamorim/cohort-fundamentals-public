/* ==========================================================================
   CONFIG - Centralized Supabase credentials for client-side scripts
   Debito D2: SUPABASE_URL and SUPABASE_ANON_KEY were hardcoded in auth.js
   All client-side JS should reference Config.SUPABASE_URL / Config.SUPABASE_ANON_KEY
   Note: server-side scripts (api/, scripts/) use process.env — see those files.
   ========================================================================== */

var Config = (function () {
  var SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

  return {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY
  };
})();
