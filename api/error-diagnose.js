/**
 * /api/error-diagnose — Auto-remediation engine powered by Claude Sonnet 4.6
 * Receives an error entry, produces structured diagnosis with root cause + fix
 * Updates error_logs row with diagnosis, sends detailed WhatsApp report
 * No npm dependencies — uses native fetch only
 */

var { logTokenUsage } = require('./_shared/token-logger');
var { verifyAuth } = require('./_shared/auth-guard');
var { rateLimit } = require('./_shared/rate-limiter');

var { SUPABASE_URL, getServiceRoleKey } = require('./_shared/supabase-config');
var ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

var SYSTEM_PROMPT = 'You are an expert software debugger and auto-remediation agent for "Cohort Fundamentals", a learning platform.\n\n'
  + 'TECH STACK:\n'
  + '- Frontend: Vanilla JavaScript (no frameworks, no build system, IIFE modules)\n'
  + '- Backend: Vercel Serverless Functions (Node.js, no npm packages, native fetch only)\n'
  + '- Database: Supabase (PostgreSQL) via REST API\n'
  + '- Auth: Supabase Auth\n'
  + '- AI: Claude API (Haiku for chat, Sonnet for analysis)\n'
  + '- WhatsApp alerts: Uazapi API\n'
  + '- No package.json — all code uses native browser/Node.js APIs\n\n'
  + 'KEY FILES:\n'
  + '- index.html — Main SPA entry point with hash-based routing\n'
  + '- js/auth.js — Supabase authentication (Auth IIFE)\n'
  + '- js/persistence.js — CRUD via Supabase REST (Persistence IIFE)\n'
  + '- js/aurora.js — AI chat interface (Aurora IIFE)\n'
  + '- js/gamification.js — Learning gamification, quizzes, terms (Gamification IIFE)\n'
  + '- js/psicometria-upload.js — File upload + psychometric analysis\n'
  + '- js/error-logger.js — Error capture/reporting (ErrorLogger IIFE)\n'
  + '- api/analyze.js — Psychometric analysis via Claude Sonnet\n'
  + '- api/aurora.js — Chat endpoint via Claude Haiku\n'
  + '- api/error-log.js — Error logging endpoint\n'
  + '- api/error-diagnose.js — This file (auto-remediation)\n\n'
  + 'COMMON ERROR PATTERNS:\n'
  + '1. TDZ (Temporal Dead Zone) — const/let used before declaration in same scope\n'
  + '2. RLS_BLOCK — Supabase Row Level Security blocking operations\n'
  + '3. API_TIMEOUT — Claude API calls exceeding Vercel function timeout\n'
  + '4. NULL_REF — Accessing properties of undefined user/profile/DOM elements\n'
  + '5. DOM_NOT_READY — Manipulating DOM before elements exist\n'
  + '6. CORS — Cross-origin requests blocked\n'
  + '7. AUTH_EXPIRED — Supabase session expired, token invalid\n'
  + '8. NETWORK — Fetch failed due to connectivity or DNS\n'
  + '9. JSON_PARSE — Invalid JSON in API response or localStorage\n'
  + '10. QUOTA — localStorage or API rate limit exceeded\n\n'
  + 'INSTRUCTIONS:\n'
  + '- Analyze the error and produce a PRECISE structured diagnosis\n'
  + '- Be SPECIFIC about file and line when possible\n'
  + '- Include ACTUAL code in suggested_fix (not pseudocode)\n'
  + '- explanation_child must be in Portuguese brasileiro, max 3 sentences, using everyday analogies\n'
  + '- explanation_technical must be in Portuguese brasileiro, 2-4 sentences\n'
  + '- remediation_steps in Portuguese brasileiro\n'
  + '- suggested_fix should contain the actual code change needed\n'
  + '- Set confidence 0.0-1.0 based on how much info you have\n'
  + '- If error is vague, still provide best-effort diagnosis';

var DIAGNOSIS_TOOL = {
  name: 'diagnose_and_fix',
  description: 'Analyze a software error, identify root cause, and suggest a concrete fix',
  input_schema: {
    type: 'object',
    required: ['root_cause', 'severity_assessment', 'category', 'explanation_child', 'explanation_technical', 'suggested_fix', 'remediation_steps', 'auto_fixable', 'confidence'],
    properties: {
      root_cause: {
        type: 'string',
        description: 'Clear description of what caused the error (Portuguese)'
      },
      severity_assessment: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description: 'Real severity assessment (may differ from reported)'
      },
      category: {
        type: 'string',
        enum: ['runtime', 'logic', 'network', 'auth', 'database', 'config', 'ui', 'performance'],
        description: 'Error category'
      },
      file_likely: {
        type: 'string',
        description: 'Most likely file where error originates (e.g. js/gamification.js)'
      },
      line_likely: {
        type: 'string',
        description: 'Approximate line number or range (e.g. "328" or "310-330")'
      },
      explanation_child: {
        type: 'string',
        description: 'Simple explanation for a 10-year-old in Portuguese brasileiro. Max 3 short sentences using everyday analogies.'
      },
      explanation_technical: {
        type: 'string',
        description: 'Technical explanation for developers in Portuguese brasileiro. 2-4 sentences.'
      },
      suggested_fix: {
        type: 'string',
        description: 'Concrete code fix. Include the actual code change needed, not pseudocode. Format: show what to change from → to.'
      },
      remediation_steps: {
        type: 'array',
        items: { type: 'string' },
        description: '3-5 ordered steps to fix this error (Portuguese brasileiro)'
      },
      auto_fixable: {
        type: 'boolean',
        description: 'Whether this can be auto-fixed without human review'
      },
      known_pattern: {
        type: 'boolean',
        description: 'Whether this matches a known error pattern from the COMMON ERROR PATTERNS list'
      },
      pattern_name: {
        type: 'string',
        description: 'Name of the known pattern if applicable (TDZ, RLS_BLOCK, NULL_REF, DOM_NOT_READY, CORS, AUTH_EXPIRED, NETWORK, JSON_PARSE, QUOTA, API_TIMEOUT)'
      },
      confidence: {
        type: 'number',
        description: 'Confidence in this diagnosis from 0.0 to 1.0'
      },
      prevention: {
        type: 'string',
        description: 'How to prevent this error in the future (Portuguese brasileiro)'
      }
    }
  }
};

// ─── Helpers ───

var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return typeof str === 'string' && UUID_RE.test(str);
}

function supabaseKey() {
  return getServiceRoleKey();
}

async function fetchErrorById(errorId) {
  if (!isValidUUID(errorId)) return null;
  var key = supabaseKey();
  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/error_logs?id=eq.' + errorId + '&select=*',
      {
        headers: {
          'apikey': key,
          'Authorization': 'Bearer ' + key
        }
      }
    );
    if (!resp.ok) return null;
    var rows = await resp.json();
    return rows && rows.length > 0 ? rows[0] : null;
  } catch (e) {
    console.error('fetchErrorById failed:', e.message);
    return null;
  }
}

async function fetchPendingErrors(limit) {
  var key = supabaseKey();
  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/error_logs?fix_status=eq.new&order=created_at.desc&limit=' + (limit || 5),
      {
        headers: {
          'apikey': key,
          'Authorization': 'Bearer ' + key
        }
      }
    );
    if (!resp.ok) return [];
    return await resp.json();
  } catch (e) {
    console.error('fetchPendingErrors failed:', e.message);
    return [];
  }
}

async function updateErrorRow(errorId, fields) {
  var key = supabaseKey();
  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/error_logs?id=eq.' + errorId,
      {
        method: 'PATCH',
        headers: {
          'apikey': key,
          'Authorization': 'Bearer ' + key,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(fields)
      }
    );
    return resp.ok;
  } catch (e) {
    console.error('updateErrorRow failed:', e.message);
    return false;
  }
}

// ─── Claude Sonnet 4.6 Diagnosis ───

async function diagnoseWithClaude(entry) {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  var userContent = 'ERRO PARA DIAGNOSTICAR:\n\n'
    + '- Severity: ' + entry.severity + '\n'
    + '- Source: ' + entry.source + '\n'
    + '- Message: ' + entry.message + '\n'
    + (entry.stack ? '- Stack trace:\n' + entry.stack.slice(0, 3000) + '\n' : '')
    + (entry.url ? '- URL: ' + entry.url + '\n' : '')
    + (entry.user_agent ? '- User Agent: ' + entry.user_agent + '\n' : '')
    + (entry.context ? '- Context: ' + JSON.stringify(entry.context) + '\n' : '');

  try {
    var resp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
        tools: [DIAGNOSIS_TOOL],
        tool_choice: { type: 'tool', name: 'diagnose_and_fix' }
      })
    });

    if (!resp.ok) {
      var errText = await resp.text();
      console.error('Claude API error:', resp.status, errText.slice(0, 500));
      return null;
    }

    var data = await resp.json();
    if (data.usage) await logTokenUsage('/api/error-diagnose', 'claude-sonnet-4-6', data.usage.input_tokens, data.usage.output_tokens);
    var toolUse = data.content && data.content.find(function(c) { return c.type === 'tool_use'; });
    if (!toolUse || !toolUse.input) return null;

    return toolUse.input;
  } catch (e) {
    console.error('diagnoseWithClaude failed:', e.message);
    return null;
  }
}

// ─── WhatsApp Report ───

async function sendDiagnosisReport(entry, diagnosis) {
  var baseUrl = process.env.UAZAPI_BASE_URL;
  var token = process.env.UAZAPI_TOKEN;
  var number = process.env.NOTIFICATION_NUMBER;
  if (!baseUrl || !token || !number) return false;

  var conf = diagnosis.confidence ? Math.round(diagnosis.confidence * 100) + '%' : '?';
  var severityEmoji = {
    critical: '\u{1F6A8}',
    high: '\u{1F534}',
    medium: '\u{1F7E1}',
    low: '\u{1F7E2}'
  };
  var emoji = severityEmoji[diagnosis.severity_assessment] || '\u{1F50D}';

  var text = '\u{1F9E0} *AI DIAGNOSIS — ' + entry.severity.toUpperCase() + '*\n'
    + emoji + ' Severidade real: *' + diagnosis.severity_assessment + '* (' + conf + ' confianca)\n\n';

  // Child explanation
  if (diagnosis.explanation_child) {
    text += '\u{1F9D2} *Explicando como crianca:*\n' + diagnosis.explanation_child + '\n\n';
  }

  // Technical diagnosis
  text += '\u{1F50D} *Diagnostico tecnico:*\n' + diagnosis.explanation_technical + '\n\n';

  // Root cause
  text += '\u{1F3AF} *Causa raiz:*\n' + diagnosis.root_cause + '\n\n';

  // Location
  if (diagnosis.file_likely) {
    text += '\u{1F4C1} *Arquivo:* ' + diagnosis.file_likely;
    if (diagnosis.line_likely) text += ' (linha ' + diagnosis.line_likely + ')';
    text += '\n';
  }

  // Category + Pattern
  text += '\u{1F3F7} *Categoria:* ' + diagnosis.category;
  if (diagnosis.known_pattern && diagnosis.pattern_name) {
    text += ' | Padrao: ' + diagnosis.pattern_name;
  }
  text += '\n\n';

  // Suggested fix
  if (diagnosis.suggested_fix) {
    text += '\u{1F527} *Fix sugerido:*\n' + diagnosis.suggested_fix.slice(0, 1000) + '\n\n';
  }

  // Remediation steps
  if (diagnosis.remediation_steps && diagnosis.remediation_steps.length > 0) {
    text += '\u{1F4CB} *Passos para corrigir:*\n';
    diagnosis.remediation_steps.forEach(function(step, i) {
      text += (i + 1) + '. ' + step + '\n';
    });
    text += '\n';
  }

  // Prevention
  if (diagnosis.prevention) {
    text += '\u{1F6E1} *Prevencao:*\n' + diagnosis.prevention + '\n\n';
  }

  // Auto-fixable indicator
  if (diagnosis.auto_fixable) {
    text += '\u{2705} Este erro pode ser corrigido automaticamente\n';
  }

  text += '\n_Diagnosticado por Sonnet 4.6 em ' + new Date().toISOString() + '_';

  // Truncate to WhatsApp limit (~4096 chars)
  if (text.length > 4000) {
    text = text.slice(0, 3950) + '\n\n_[truncado]_';
  }

  try {
    var resp = await fetch(baseUrl + '/send/text', {
      method: 'POST',
      headers: { 'token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: number, text: text })
    });
    return resp.ok;
  } catch (e) {
    console.error('WhatsApp diagnosis report failed:', e.message);
    return false;
  }
}

// ─── Diagnosis cache ───

async function findCachedDiagnosis(message, source) {
  var key = supabaseKey();
  var thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/error_logs?message=eq.' + encodeURIComponent(message)
        + '&source=eq.' + encodeURIComponent(source)
        + '&diagnosed_at=gte.' + thirtyMinAgo
        + '&fix_status=neq.new&fix_status=neq.diagnosing'
        + '&order=diagnosed_at.desc&limit=1'
        + '&select=diagnosis',
      {
        headers: {
          'apikey': key,
          'Authorization': 'Bearer ' + key
        }
      }
    );
    if (!resp.ok) return null;
    var rows = await resp.json();
    if (rows && rows.length > 0 && rows[0].diagnosis) {
      console.log('[CACHE HIT] Reusing diagnosis for:', message.slice(0, 80));
      return rows[0].diagnosis;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ─── Core diagnosis pipeline ───

async function runDiagnosis(entry) {
  if (!entry || !entry.id) return { diagnosed: false, reason: 'No entry or ID' };

  // Check cache: reuse recent diagnosis for same message+source
  var cached = await findCachedDiagnosis(entry.message, entry.source);
  if (cached) {
    await updateErrorRow(entry.id, {
      fix_status: cached.suggested_fix ? 'fix_suggested' : 'diagnosed',
      diagnosis: cached,
      diagnosed_at: new Date().toISOString(),
      fix_suggestion: (cached.suggested_fix || '').slice(0, 5000)
    });
    return { diagnosed: true, cached: true, status: cached.suggested_fix ? 'fix_suggested' : 'diagnosed', diagnosis: cached };
  }

  // Mark as diagnosing (prevent double-processing)
  var marked = await updateErrorRow(entry.id, { fix_status: 'diagnosing' });
  if (!marked) return { diagnosed: false, reason: 'Failed to mark as diagnosing' };

  // Run Claude Sonnet 4.6 diagnosis
  var diagnosis = await diagnoseWithClaude(entry);

  if (!diagnosis) {
    // Revert to new so cron can retry
    await updateErrorRow(entry.id, { fix_status: 'new' });
    return { diagnosed: false, reason: 'Claude diagnosis returned null' };
  }

  // Determine fix_status based on diagnosis
  var newStatus = diagnosis.suggested_fix ? 'fix_suggested' : 'diagnosed';

  // Save diagnosis to DB
  await updateErrorRow(entry.id, {
    fix_status: newStatus,
    diagnosis: diagnosis,
    diagnosed_at: new Date().toISOString(),
    fix_suggestion: (diagnosis.suggested_fix || '').slice(0, 5000)
  });

  // Send detailed WhatsApp report
  var reported = await sendDiagnosisReport(entry, diagnosis);

  // Trigger auto-fix daemon if error is auto-fixable
  var webhookTriggered = false;
  if (diagnosis.auto_fixable && entry.id && process.env.AUTO_FIX_WEBHOOK_URL) {
    try {
      var webhookResp = await fetch(process.env.AUTO_FIX_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_id: entry.id, diagnosis: diagnosis })
      });
      webhookTriggered = webhookResp.ok;
    } catch (e) {
      // Silent — daemon will also poll as safety net
      console.error('Auto-fix webhook failed:', e.message);
    }
  }

  return {
    diagnosed: true,
    reported: reported,
    status: newStatus,
    auto_fix_triggered: webhookTriggered,
    diagnosis: diagnosis
  };
}

// ─── HTTP Handler ───

module.exports = async function handler(req, res) {
  // Accept both POST (explicit trigger) and GET (cron/manual)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 5 requests per minute per IP
  if (!rateLimit(req, res, 5, 60 * 1000)) return;

  // Cron verification (Vercel injects Authorization header for cron calls)
  var cronSecret = process.env.CRON_SECRET;
  var authHeader = req.headers['authorization'];
  var isCron = cronSecret && authHeader === 'Bearer ' + cronSecret;

  // For GET requests, only allow from cron or with valid secret
  if (req.method === 'GET') {
    if (!isCron) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Process pending errors (cron mode)
    var pending = await fetchPendingErrors(3);
    if (pending.length === 0) {
      return res.status(200).json({ processed: 0, message: 'No pending errors' });
    }

    var results = [];
    for (var i = 0; i < pending.length; i++) {
      var result = await runDiagnosis(pending[i]);
      results.push({ id: pending[i].id, result: result });
    }

    return res.status(200).json({ processed: results.length, results: results });
  }

  // POST mode: require auth (user JWT or cron secret)
  if (!isCron) {
    var user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
  }

  // POST mode: diagnose specific error
  var body = req.body || {};

  // Option 1: Pass error_id to fetch from DB
  if (body.error_id) {
    if (!isValidUUID(body.error_id)) {
      return res.status(400).json({ error: 'Invalid error_id format' });
    }
    var entry = await fetchErrorById(body.error_id);
    if (!entry) {
      return res.status(404).json({ error: 'Error not found: ' + body.error_id });
    }
    // IDOR protection: non-cron users can only access their own errors
    if (!isCron && user && entry.user_id && entry.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Skip if already diagnosed
    if (entry.fix_status !== 'new') {
      return res.status(200).json({ skipped: true, reason: 'Already ' + entry.fix_status, id: entry.id });
    }
    var result = await runDiagnosis(entry);
    return res.status(200).json(result);
  }

  // Option 2: Pass full error entry directly (inline mode)
  if (body.severity && body.source && body.message) {
    // This is a direct entry without DB — diagnose and return
    var inlineEntry = {
      id: null,
      severity: body.severity,
      source: body.source,
      message: body.message,
      stack: body.stack || null,
      url: body.url || null,
      user_agent: body.user_agent || null,
      context: body.context || {}
    };

    var diagnosis = await diagnoseWithClaude(inlineEntry);
    if (!diagnosis) {
      return res.status(502).json({ error: 'Diagnosis failed' });
    }

    // Send WhatsApp report even for inline
    await sendDiagnosisReport(inlineEntry, diagnosis);

    return res.status(200).json({ diagnosed: true, diagnosis: diagnosis });
  }

  return res.status(400).json({ error: 'Provide error_id or full error entry (severity, source, message)' });
};

// Export for reuse by cron endpoint
module.exports.runDiagnosis = runDiagnosis;
module.exports.fetchPendingErrors = fetchPendingErrors;
