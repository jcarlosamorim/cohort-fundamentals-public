/**
 * /api/cron/diagnose-errors — Vercel Cron safety net
 * Processes error_logs with fix_status='new' that weren't caught by frontend trigger
 * Runs on schedule defined in vercel.json
 * No npm dependencies — uses native fetch only
 */

var { SUPABASE_URL, getServiceRoleKey } = require('../_shared/supabase-config');
var ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// ─── Inline diagnosis logic (self-contained, no require across Vercel functions) ───

var SYSTEM_PROMPT = 'You are an expert software debugger and auto-remediation agent for "Cohort Fundamentals", a learning platform.\n\n'
  + 'TECH STACK: Vanilla JS frontend (IIFE modules), Vercel Serverless Functions (Node.js, no npm), Supabase (PostgreSQL via REST), Supabase Auth, Claude API, Uazapi WhatsApp.\n\n'
  + 'KEY FILES: index.html, js/auth.js, js/persistence.js, js/aurora.js, js/gamification.js, js/psicometria-upload.js, js/error-logger.js, api/analyze.js, api/aurora.js, api/error-log.js\n\n'
  + 'COMMON PATTERNS: TDZ, RLS_BLOCK, API_TIMEOUT, NULL_REF, DOM_NOT_READY, CORS, AUTH_EXPIRED, NETWORK, JSON_PARSE, QUOTA\n\n'
  + 'Analyze the error. Be specific about file/line. Include actual code in suggested_fix. All text in Portuguese brasileiro.';

var DIAGNOSIS_TOOL = {
  name: 'diagnose_and_fix',
  description: 'Analyze a software error, identify root cause, and suggest a concrete fix',
  input_schema: {
    type: 'object',
    required: ['root_cause', 'severity_assessment', 'category', 'explanation_child', 'explanation_technical', 'suggested_fix', 'remediation_steps', 'auto_fixable', 'confidence'],
    properties: {
      root_cause: { type: 'string' },
      severity_assessment: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      category: { type: 'string', enum: ['runtime', 'logic', 'network', 'auth', 'database', 'config', 'ui', 'performance'] },
      file_likely: { type: 'string' },
      line_likely: { type: 'string' },
      explanation_child: { type: 'string' },
      explanation_technical: { type: 'string' },
      suggested_fix: { type: 'string' },
      remediation_steps: { type: 'array', items: { type: 'string' } },
      auto_fixable: { type: 'boolean' },
      known_pattern: { type: 'boolean' },
      pattern_name: { type: 'string' },
      confidence: { type: 'number' },
      prevention: { type: 'string' }
    }
  }
};

function supabaseKey() {
  return getServiceRoleKey();
}

async function fetchPendingErrors(limit) {
  var key = supabaseKey();
  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/error_logs?fix_status=eq.new&order=created_at.desc&limit=' + (limit || 3),
      { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } }
    );
    if (!resp.ok) return [];
    return await resp.json();
  } catch (e) {
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
    return false;
  }
}

async function diagnoseWithOpus(entry) {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  var userContent = 'ERRO:\n- Severity: ' + entry.severity
    + '\n- Source: ' + entry.source
    + '\n- Message: ' + entry.message
    + (entry.stack ? '\n- Stack:\n' + entry.stack.slice(0, 3000) : '')
    + (entry.url ? '\n- URL: ' + entry.url : '')
    + (entry.context ? '\n- Context: ' + JSON.stringify(entry.context) : '');

  try {
    var resp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
        tools: [DIAGNOSIS_TOOL],
        tool_choice: { type: 'tool', name: 'diagnose_and_fix' }
      })
    });
    if (!resp.ok) return null;
    var data = await resp.json();
    var toolUse = data.content && data.content.find(function(c) { return c.type === 'tool_use'; });
    return toolUse && toolUse.input ? toolUse.input : null;
  } catch (e) {
    return null;
  }
}

async function sendDiagnosisReport(entry, diagnosis) {
  var baseUrl = process.env.UAZAPI_BASE_URL;
  var token = process.env.UAZAPI_TOKEN;
  var number = process.env.NOTIFICATION_NUMBER;
  if (!baseUrl || !token || !number) return false;

  var conf = diagnosis.confidence ? Math.round(diagnosis.confidence * 100) + '%' : '?';
  var text = '\u{1F9E0} *OPUS DIAGNOSIS — ' + entry.severity.toUpperCase() + '*\n'
    + '\u{1F50D} Severidade: *' + diagnosis.severity_assessment + '* (' + conf + ')\n\n'
    + '\u{1F9D2} *Como crianca:*\n' + (diagnosis.explanation_child || '') + '\n\n'
    + '\u{1F3AF} *Causa raiz:*\n' + (diagnosis.root_cause || '') + '\n\n';

  if (diagnosis.file_likely) {
    text += '\u{1F4C1} *Arquivo:* ' + diagnosis.file_likely;
    if (diagnosis.line_likely) text += ' (L' + diagnosis.line_likely + ')';
    text += '\n';
  }

  if (diagnosis.suggested_fix) {
    text += '\n\u{1F527} *Fix:*\n' + diagnosis.suggested_fix.slice(0, 800) + '\n';
  }

  if (diagnosis.remediation_steps && diagnosis.remediation_steps.length > 0) {
    text += '\n\u{1F4CB} *Passos:*\n';
    diagnosis.remediation_steps.forEach(function(s, i) { text += (i + 1) + '. ' + s + '\n'; });
  }

  if (diagnosis.prevention) {
    text += '\n\u{1F6E1} *Prevencao:* ' + diagnosis.prevention + '\n';
  }

  text += '\n_Opus 4.6 | ' + new Date().toISOString() + ' | via cron_';
  if (text.length > 4000) text = text.slice(0, 3950) + '\n_[truncado]_';

  try {
    var resp = await fetch(baseUrl + '/send/text', {
      method: 'POST',
      headers: { 'token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: number, text: text })
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function processSingleError(entry) {
  await updateErrorRow(entry.id, { fix_status: 'diagnosing' });

  var diagnosis = await diagnoseWithOpus(entry);
  if (!diagnosis) {
    await updateErrorRow(entry.id, { fix_status: 'new' });
    return { id: entry.id, diagnosed: false };
  }

  var status = diagnosis.suggested_fix ? 'fix_suggested' : 'diagnosed';
  await updateErrorRow(entry.id, {
    fix_status: status,
    diagnosis: diagnosis,
    diagnosed_at: new Date().toISOString(),
    fix_suggestion: (diagnosis.suggested_fix || '').slice(0, 5000)
  });

  var reported = await sendDiagnosisReport(entry, diagnosis);
  return { id: entry.id, diagnosed: true, reported: reported, status: status };
}

// ─── Cron Handler ───

module.exports = async function handler(req, res) {
  // Verify cron secret (Vercel injects this for cron calls)
  var cronSecret = process.env.CRON_SECRET;
  var auth = req.headers['authorization'];
  if (!cronSecret || auth !== 'Bearer ' + cronSecret) {
    var ip = req.headers['x-forwarded-for'] || 'unknown';
    console.warn('[SECURITY] CRON_AUTH_FAILURE ip=' + ip + ' endpoint=/api/cron/diagnose-errors');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var pending = await fetchPendingErrors(3);
  if (pending.length === 0) {
    return res.status(200).json({ processed: 0, message: 'No pending errors' });
  }

  console.log('[CRON] Processing ' + pending.length + ' pending errors');

  var results = [];
  for (var i = 0; i < pending.length; i++) {
    try {
      var result = await processSingleError(pending[i]);
      results.push(result);
    } catch (e) {
      console.error('[CRON] Error processing ' + pending[i].id + ':', e.message);
      results.push({ id: pending[i].id, diagnosed: false, error: e.message });
    }
  }

  return res.status(200).json({ processed: results.length, results: results });
};
