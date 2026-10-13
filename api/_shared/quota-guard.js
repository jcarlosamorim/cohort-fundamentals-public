/* ==========================================================================
   SHARED QUOTA GUARD — Per-user quota enforcement (business limits)
   Used by: api/analyze.js (3/week), api/aurora.js (20/day)
   Tracks usage in api_quota_usage table (Supabase)
   Fail-open: if Supabase is unreachable, allows the call through
   ========================================================================== */

var { SUPABASE_URL, getServiceRoleKey } = require('./supabase-config');

/**
 * Verifica se o usuario ainda tem quota disponivel.
 * Retorna true se BLOQUEOU (quota excedida, response 429 ja enviada).
 * Retorna false se OK (pode prosseguir).
 * Em caso de erro no Supabase, retorna false (fail-open).
 *
 * @param {object} req
 * @param {object} res
 * @param {string} userId - UUID do usuario autenticado
 * @param {string} endpoint - Ex: '/api/analyze'
 * @param {number} maxCount - Limite de chamadas no periodo
 * @param {number} windowMs - Janela de tempo em milissegundos
 * @returns {Promise<boolean>} true = bloqueado (429 enviado), false = liberado
 */
async function enforceQuota(req, res, userId, endpoint, maxCount, windowMs) {
  var key;
  try {
    key = getServiceRoleKey();
  } catch (e) {
    console.error('quota-guard: no service key, fail-open');
    return false;
  }

  var since = new Date(Date.now() - windowMs).toISOString();

  try {
    var url = SUPABASE_URL + '/rest/v1/api_quota_usage'
      + '?user_id=eq.' + userId
      + '&endpoint=eq.' + encodeURIComponent(endpoint)
      + '&created_at=gte.' + encodeURIComponent(since)
      + '&select=id';

    var resp = await fetch(url, {
      method: 'HEAD',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Prefer': 'count=exact'
      }
    });

    if (!resp.ok) {
      console.error('quota-guard: Supabase returned ' + resp.status + ', fail-open');
      return false;
    }

    var range = resp.headers.get('content-range');
    // content-range format: "0-N/total" or "*/total" or "*/0"
    var count = 0;
    if (range) {
      var parts = range.split('/');
      count = parseInt(parts[1], 10) || 0;
    }

    if (count >= maxCount) {
      var resetAt = new Date(Date.now() + windowMs);
      res.status(429).json({
        error: 'Quota excedida',
        quota: {
          limit: maxCount,
          used: count,
          windowMs: windowMs,
          resetAt: resetAt.toISOString()
        }
      });
      return true;
    }

    return false;
  } catch (e) {
    console.error('quota-guard: fetch error, fail-open:', e.message);
    return false;
  }
}

/**
 * Registra 1 uso de quota apos sucesso da chamada API.
 * Fire-and-forget friendly, mas deve ser awaited na Vercel.
 *
 * @param {string} userId - UUID do usuario
 * @param {string} endpoint - Ex: '/api/analyze'
 * @returns {Promise<void>}
 */
async function recordUsage(userId, endpoint) {
  var key;
  try {
    key = getServiceRoleKey();
  } catch (e) {
    console.error('quota-guard recordUsage: no service key');
    return;
  }

  try {
    await fetch(SUPABASE_URL + '/rest/v1/api_quota_usage', {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: userId,
        endpoint: endpoint
      })
    });
  } catch (e) {
    console.error('quota-guard recordUsage failed:', e.message);
  }
}

module.exports = { enforceQuota: enforceQuota, recordUsage: recordUsage };
