/**
 * Admin Guard — protege endpoints administrativos com uma chave secreta
 * A UI envia a chave no header `x-admin-key`; validamos contra process.env.ADMIN_KEY
 * usando comparacao timing-safe. Sem dependencias npm.
 */

var crypto = require('crypto');

function timingSafeEqual(a, b) {
  var ba = Buffer.from(String(a || ''));
  var bb = Buffer.from(String(b || ''));
  // timingSafeEqual exige mesmo tamanho; comparamos hashes p/ evitar leak de length
  var ha = crypto.createHash('sha256').update(ba).digest();
  var hb = crypto.createHash('sha256').update(bb).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function getClientIP(req) {
  var ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  if (typeof ip === 'string' && ip.indexOf(',') !== -1) ip = ip.split(',')[0].trim();
  return ip;
}

/**
 * Retorna true se autorizado; caso contrario ja enviou a resposta de erro.
 */
function requireAdmin(req, res) {
  var expected = process.env.ADMIN_KEY;
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_KEY nao configurada no ambiente' });
    return false;
  }
  var provided = req.headers['x-admin-key'] || '';
  if (!provided || !timingSafeEqual(provided, expected)) {
    console.warn('[SECURITY] ADMIN_AUTH_FAILURE ip=' + getClientIP(req) + ' endpoint=' + (req.url || ''));
    res.status(401).json({ error: 'Nao autorizado' });
    return false;
  }
  return true;
}

module.exports = { requireAdmin: requireAdmin };
