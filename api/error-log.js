/**
 * /api/error-log — Centralized error logging endpoint
 * Saves to Supabase via REST API + generates AI explanation + sends WhatsApp alert
 * Returns error_id so frontend can trigger /api/error-diagnose
 * No npm dependencies — uses native fetch only
 */

var { verifyAuth } = require('./_shared/auth-guard');
var { rateLimit } = require('./_shared/rate-limiter');

var { SUPABASE_URL, getServiceRoleKey } = require('./_shared/supabase-config');
var ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
var SEVERITY_ALERT = ['critical', 'error'];
var VALID_SEVERITIES = ['critical', 'error', 'warn', 'info'];
var VALID_SOURCES = ['frontend', 'api', 'auth', 'database'];

// Rate limit: max 5 WhatsApp alerts per 10 minutes
var alertWindow = { count: 0, resetAt: 0 };
var ALERT_MAX = 5;
var ALERT_WINDOW_MS = 10 * 60 * 1000;

function canSendAlert() {
  var now = Date.now();
  if (now > alertWindow.resetAt) {
    alertWindow.count = 0;
    alertWindow.resetAt = now + ALERT_WINDOW_MS;
  }
  if (alertWindow.count >= ALERT_MAX) return false;
  alertWindow.count++;
  return true;
}

function generateUUID() {
  return crypto.randomUUID();
}

async function saveToSupabase(entry) {
  var key = getServiceRoleKey();
  // Generate ID server-side so we can return it without needing SELECT
  var id = generateUUID();
  entry.id = id;

  try {
    var resp = await fetch(SUPABASE_URL + '/rest/v1/error_logs', {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(entry)
    });
    return resp.ok ? id : null;
  } catch (e) {
    console.error('Supabase save failed:', e.message);
    return null;
  }
}

async function explainError(entry) {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  var prompt = 'Voce e um assistente que explica erros de software de forma MUITO simples, como se fosse para uma crianca de 10 anos.\n\n'
    + 'REGRAS:\n'
    + '- Maximo 3 frases curtas\n'
    + '- Use analogias do dia a dia (brinquedos, escola, cozinha, etc)\n'
    + '- Nunca use jargao tecnico\n'
    + '- Responda em portugues brasileiro\n'
    + '- Comece direto com a explicacao, sem "Claro!" ou "Vou explicar"\n\n'
    + 'ERRO:\n'
    + '- Tipo: ' + entry.severity + '\n'
    + '- Onde: ' + entry.source + '\n'
    + '- Mensagem: ' + entry.message + '\n'
    + (entry.stack ? '- Stack: ' + entry.stack.slice(0, 500) + '\n' : '')
    + (entry.url ? '- Pagina: ' + entry.url + '\n' : '');

  try {
    var resp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) return null;

    var data = await resp.json();
    var textBlock = data.content && data.content.find(function(c) { return c.type === 'text'; });
    return textBlock ? textBlock.text.trim() : null;
  } catch (e) {
    return null;
  }
}

async function sendWhatsAppAlert(entry, explanation) {
  var baseUrl = process.env.UAZAPI_BASE_URL;
  var token = process.env.UAZAPI_TOKEN;
  var number = process.env.NOTIFICATION_NUMBER;

  if (!baseUrl || !token || !number) return false;
  if (!canSendAlert()) return false;

  var emoji = entry.severity === 'critical' ? '\u{1F6A8}' : '\u{26A0}\u{FE0F}';
  var text = emoji + ' *COHORT FUNDAMENTALS — ' + entry.severity.toUpperCase() + '*\n\n'
    + '*Source:* ' + entry.source + '\n'
    + '*Message:* ' + (entry.message || '').slice(0, 500) + '\n'
    + (entry.url ? '*URL:* ' + entry.url + '\n' : '')
    + (entry.context && entry.context.endpoint ? '*Endpoint:* ' + entry.context.endpoint + '\n' : '');

  if (explanation) {
    text += '\n\u{1F9D2} *Explicando como crianca:*\n' + explanation + '\n';
  }

  text += '\n\u{23F3} _Diagnostico completo via Opus 4.6 em andamento..._';
  text += '\n_' + new Date().toISOString() + '_';

  try {
    var resp = await fetch(baseUrl + '/send/text', {
      method: 'POST',
      headers: { 'token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: number, text: text })
    });
    return resp.ok;
  } catch (e) {
    console.error('WhatsApp alert failed:', e.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: optional (errors can happen before login)
  var authUser = await verifyAuth(req);

  // Rate limit: stricter for unauthenticated (10/min), relaxed for authenticated (20/min)
  var maxReqs = authUser ? 20 : 10;
  if (!rateLimit(req, res, maxReqs, 60 * 1000)) return;

  var body = req.body || {};

  // Reject oversized payloads (max ~10KB effective body)
  var bodyStr = JSON.stringify(body);
  if (bodyStr.length > 10000) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  var severity = body.severity;
  var source = body.source;
  var message = body.message;

  if (!severity || !source || !message) {
    return res.status(400).json({ error: 'Missing severity, source, or message' });
  }
  if (VALID_SEVERITIES.indexOf(severity) === -1) {
    return res.status(400).json({ error: 'Invalid severity. Use: ' + VALID_SEVERITIES.join(', ') });
  }
  if (VALID_SOURCES.indexOf(source) === -1) {
    return res.status(400).json({ error: 'Invalid source. Use: ' + VALID_SOURCES.join(', ') });
  }

  var entry = {
    severity: severity,
    source: source,
    message: (message || '').slice(0, 2000),
    stack: (body.stack || '').slice(0, 5000) || null,
    context: body.context || {},
    url: (body.url || '').slice(0, 500) || null,
    user_id: (authUser && authUser.id) || null,
    user_agent: (body.user_agent || '').slice(0, 500) || null,
    fix_status: 'new'
  };

  // Save to Supabase — returns UUID if successful
  var errorId = await saveToSupabase(entry);
  var saved = !!errorId;

  if (!saved) {
    console.error('[ERROR_LOG_FALLBACK]', JSON.stringify(entry));
  }

  // Quick WhatsApp alert for critical/error (Haiku — fast)
  var alerted = false;
  if (SEVERITY_ALERT.indexOf(severity) !== -1) {
    var explanation = await explainError(entry);
    alerted = await sendWhatsAppAlert(entry, explanation);
  }

  return res.status(201).json({
    logged: saved,
    alerted: alerted,
    error_id: errorId
  });
};
