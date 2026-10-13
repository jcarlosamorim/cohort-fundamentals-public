/* ==========================================================================
   SHARED SUPABASE CONFIG — Single source of truth for Supabase credentials
   All API files MUST import from here instead of hardcoding keys.
   Keys are loaded from process.env (Vercel Environment Variables).
   ========================================================================== */

var SUPABASE_URL = process.env.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';

function getServiceRoleKey() {
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('[SECURITY] SUPABASE_SERVICE_ROLE_KEY not configured. Set it in Vercel Environment Variables.');
  }
  return key;
}

function getAnonKey() {
  var key = process.env.SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('[SECURITY] SUPABASE_ANON_KEY not configured. Set it in Vercel Environment Variables.');
  }
  return key;
}

module.exports = { SUPABASE_URL: SUPABASE_URL, getServiceRoleKey: getServiceRoleKey, getAnonKey: getAnonKey };
