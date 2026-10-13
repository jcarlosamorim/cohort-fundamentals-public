/* ==========================================================================
   ERROR LOGGER — Global error catcher + reporter + diagnosis trigger
   Captures: window.onerror, unhandledrejection, explicit .capture() calls
   Sends batched to /api/error-log (debounced 2s)
   Triggers /api/error-diagnose with Opus 4.6 for critical/error severity
   ========================================================================== */

var ErrorLogger = (function() {
  'use strict';

  var queue = [];
  var timer = null;
  var DEBOUNCE_MS = 2000;
  var MAX_BATCH = 10;
  var LOG_ENDPOINT = '/api/error-log';
  var DIAGNOSE_ENDPOINT = '/api/error-diagnose';

  function init() {
    // Catch all uncaught JS errors
    window.onerror = function(message, source, lineno, colno, error) {
      // Ignore benign ResizeObserver loop warning
      if (typeof message === 'string' && message.indexOf('ResizeObserver loop') !== -1) return true;
      capture('frontend', {
        severity: 'error',
        message: message || 'Unknown error',
        stack: error && error.stack ? error.stack : (source + ':' + lineno + ':' + colno),
        context: { type: 'window.onerror', source: source, line: lineno, col: colno }
      });
    };

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
      var reason = event.reason;
      var msg = 'Unhandled promise rejection';
      var stack = '';

      if (reason instanceof Error) {
        msg = reason.message || msg;
        stack = reason.stack || '';
      } else if (typeof reason === 'string') {
        msg = reason;
      } else if (reason && reason.message) {
        msg = reason.message;
        stack = reason.stack || '';
      }

      capture('frontend', {
        severity: 'error',
        message: msg,
        stack: stack,
        context: { type: 'unhandledrejection' }
      });
    });

    // Intercept console.error to auto-capture
    var originalConsoleError = console.error;
    console.error = function() {
      originalConsoleError.apply(console, arguments);
      var args = Array.prototype.slice.call(arguments);
      var msg = args.map(function(a) {
        if (a instanceof Error) return a.message;
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch(e) { return String(a); }
        }
        return String(a);
      }).join(' ');

      // Only capture if it looks like a real error (not our own logging)
      if (msg.indexOf('[ErrorLogger]') === -1) {
        capture('frontend', {
          severity: 'warn',
          message: msg.slice(0, 1000),
          context: { type: 'console.error' }
        });
      }
    };
  }

  /**
   * Capture an error explicitly
   * @param {string} source - 'frontend' | 'api' | 'auth' | 'database'
   * @param {object} opts - { severity, message, stack, context }
   */
  function capture(source, opts) {
    if (!opts || !opts.message) return;

    var entry = {
      severity: opts.severity || 'error',
      source: source || 'frontend',
      message: (opts.message || '').slice(0, 2000),
      stack: (opts.stack || '').slice(0, 5000),
      context: opts.context || {},
      url: window.location.href,
      user_id: getUserId(),
      user_agent: navigator.userAgent
    };

    queue.push(entry);

    // Flush immediately for critical
    if (entry.severity === 'critical') {
      flush();
      return;
    }

    // Debounced flush for others
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);

    // Flush if batch is full
    if (queue.length >= MAX_BATCH) flush();
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (queue.length === 0) return;

    var batch = queue.splice(0, MAX_BATCH);
    batch.forEach(function(entry) {
      sendOne(entry);
    });
  }

  function getAuthHeader() {
    try {
      var token = typeof Auth !== 'undefined' && Auth.getAccessToken ? Auth.getAccessToken() : null;
      return token ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } : { 'Content-Type': 'application/json' };
    } catch (e) {
      return { 'Content-Type': 'application/json' };
    }
  }

  function sendOne(entry) {
    try {
      fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(entry)
      }).then(function(resp) {
        if (!resp.ok) return;
        return resp.json();
      }).then(function(data) {
        if (!data || !data.error_id) return;
        // Trigger Opus 4.6 diagnosis for critical/error
        if (entry.severity === 'critical' || entry.severity === 'error') {
          triggerDiagnosis(data.error_id);
        }
      }).catch(function() {
        // Silent fail — don't recurse
      });
    } catch(e) {
      // Silent fail
    }
  }

  /**
   * Fire-and-forget: trigger Opus 4.6 deep diagnosis
   * This runs in background — response is handled server-side (WhatsApp report)
   */
  function triggerDiagnosis(errorId) {
    try {
      fetch(DIAGNOSE_ENDPOINT, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ error_id: errorId })
      }).catch(function() {
        // Silent — cron job will pick it up as safety net
      });
    } catch(e) {
      // Silent
    }
  }

  function getUserId() {
    try {
      var user = typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser() : null;
      return user ? user.id : null;
    } catch(e) {
      return null;
    }
  }

  /**
   * Helper: wrap a fetch call with automatic error logging
   * @param {string} endpoint - API endpoint name for context
   * @param {Promise} fetchPromise - the fetch() promise
   * @returns {Promise} - same promise, but errors are logged
   */
  function wrapFetch(endpoint, fetchPromise) {
    return fetchPromise.then(function(response) {
      if (!response.ok) {
        capture('api', {
          severity: response.status >= 500 ? 'error' : 'warn',
          message: 'API ' + response.status + ' on ' + endpoint,
          context: { endpoint: endpoint, status: response.status }
        });
      }
      return response;
    }).catch(function(err) {
      capture('api', {
        severity: 'error',
        message: 'Fetch failed: ' + endpoint + ' — ' + (err.message || 'Network error'),
        stack: err.stack || '',
        context: { endpoint: endpoint, type: 'network_error' }
      });
      throw err;
    });
  }

  return {
    init: init,
    capture: capture,
    wrapFetch: wrapFetch,
    flush: flush,
    triggerDiagnosis: triggerDiagnosis
  };
})();

// Self-init: attach global error handlers as soon as this script loads
ErrorLogger.init();
