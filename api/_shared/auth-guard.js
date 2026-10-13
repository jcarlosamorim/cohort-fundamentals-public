/**
 * Auth Guard — Supabase JWT verification for API endpoints
 * Validates Bearer token via Supabase /auth/v1/user endpoint
 * No npm dependencies — uses native fetch only
 */

var { SUPABASE_URL, getAnonKey } = require('./supabase-config');

/**
 * Extract and verify Supabase JWT from Authorization header
 * @param {object} req - HTTP request
 * @returns {object|null} Supabase user object or null
 */
async function verifyAuth(req) {
  var header = req.headers['authorization'];
  if (!header || header.indexOf('Bearer ') !== 0) return null;

  var token = header.slice(7);
  if (!token || token.length < 20) return null;

  try {
    var resp = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'apikey': getAnonKey()
      }
    });
    if (!resp.ok) return null;
    var user = await resp.json();
    return user && user.id ? user : null;
  } catch (e) {
    return null;
  }
}

/**
 * Require authentication — sends 401 if not authenticated
 * @param {object} req
 * @param {object} res
 * @returns {object|null} user if authenticated, null if 401 was sent
 */
function getClientIP(req) {
  var ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  if (typeof ip === 'string' && ip.indexOf(',') !== -1) ip = ip.split(',')[0].trim();
  return ip;
}

async function requireAuth(req, res) {
  var user = await verifyAuth(req);
  if (!user) {
    var ip = getClientIP(req);
    console.warn('[SECURITY] AUTH_FAILURE ip=' + ip + ' endpoint=' + (req.url || '') + ' ua=' + (req.headers['user-agent'] || '').slice(0, 100));
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return user;
}

module.exports = { verifyAuth: verifyAuth, requireAuth: requireAuth };
