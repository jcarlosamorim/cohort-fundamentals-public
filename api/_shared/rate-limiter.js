/**
 * Rate Limiter — In-memory per-IP rate limiting for Vercel serverless
 * Provides basic protection per warm instance
 * No npm dependencies
 */

var stores = {};
var lastCleanup = Date.now();
var CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 min

/**
 * Check rate limit for request IP
 * @param {object} req - HTTP request
 * @param {object} res - HTTP response
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} true if allowed, false if 429 was sent
 */
function rateLimit(req, res, maxRequests, windowMs) {
  // Prefer x-real-ip (set by Vercel, not spoofable by client)
  // Fallback to first entry in x-forwarded-for, then socket IP
  var ip = req.headers['x-real-ip']
    || (req.socket && req.socket.remoteAddress)
    || 'unknown';
  if (ip === 'unknown' && req.headers['x-forwarded-for']) {
    var fwd = req.headers['x-forwarded-for'];
    ip = (typeof fwd === 'string' && fwd.indexOf(',') !== -1)
      ? fwd.split(',')[0].trim()
      : fwd;
  }

  var endpoint = req.url || '/unknown';
  var key = endpoint + ':' + ip;
  var now = Date.now();

  // Periodic cleanup of expired entries to prevent memory leak
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    var keys = Object.keys(stores);
    for (var k = 0; k < keys.length; k++) {
      if (stores[keys[k]].resetAt < now) delete stores[keys[k]];
    }
  }

  var entry = stores[key];
  if (!entry || now > entry.resetAt) {
    stores[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    var retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    console.warn('[SECURITY] RATE_LIMIT_HIT ip=' + ip + ' endpoint=' + endpoint + ' count=' + entry.count + '/' + maxRequests);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Too many requests. Try again in ' + retryAfter + 's.' });
    return false;
  }

  return true;
}

module.exports = { rateLimit: rateLimit };
