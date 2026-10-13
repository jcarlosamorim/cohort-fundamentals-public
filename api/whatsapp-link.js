/**
 * /api/whatsapp-link — Public endpoint for WhatsApp phone collection
 * GET  → returns list of registered emails (no sensitive data)
 * POST → saves { email, whatsapp_phone } mapping
 * No auth required — this is a public form for students
 */

var { SUPABASE_URL, getServiceRoleKey } = require('./_shared/supabase-config');

// Simple in-memory rate limit per IP
var ipWindow = {};
var RL_MAX = 10;
var RL_MS = 60 * 1000;

function rateLimitOk(ip) {
  var now = Date.now();
  if (!ipWindow[ip] || now > ipWindow[ip].resetAt) {
    ipWindow[ip] = { count: 0, resetAt: now + RL_MS };
  }
  if (ipWindow[ip].count >= RL_MAX) return false;
  ipWindow[ip].count++;
  return true;
}

var ALLOWED_ORIGINS = [
  'https://fundamentals-theta.vercel.app',
  'https://cohort.academialendaria.ai'
];

function getCorsOrigin(req) {
  var origin = req.headers['origin'] || '';
  return ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : ALLOWED_ORIGINS[0];
}

function cors(req, res) {
  var origin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

module.exports = async function handler(req, res) {
  // Set CORS headers on all responses
  cors(req, res);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  var ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

  if (!rateLimitOk(ip)) {
    return res.status(429).json({ error: 'Muitas requisicoes. Aguarde 1 minuto.' });
  }

  try {
    if (req.method === 'GET') {
      return await handleGet(req, res);
    }
    if (req.method === 'POST') {
      return await handlePost(req, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[whatsapp-link] Error:', err.message);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
};

async function handleGet(req, res) {
  var key = getServiceRoleKey();

  // Fetch all users (emails only) from auth.users via admin API
  var authRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users?per_page=500', {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    }
  });

  if (!authRes.ok) {
    return res.status(500).json({ error: 'Erro ao carregar usuarios.' });
  }

  var authData = await authRes.json();
  var users = authData.users || [];

  // Filter out test accounts
  var blocked = ['pentest', 'hacker', 'h4ck3r', 'hack3r', '.invalid', 'atacante@', 'test@tes', 'teste@teste', 'teste@gmail', 'admin@test', 'nonexistent'];
  var realUsers = users.filter(function(u) {
    var e = (u.email || '').toLowerCase();
    return !blocked.some(function(b) { return e.includes(b); });
  });

  // Fetch already-saved WhatsApp numbers
  var waRes = await fetch(SUPABASE_URL + '/rest/v1/student_whatsapp?select=user_id,whatsapp_phone', {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    }
  });
  var waData = waRes.ok ? await waRes.json() : [];
  var phoneMap = {};
  waData.forEach(function(r) { phoneMap[r.user_id] = r.whatsapp_phone; });

  // Build response: email + saved status
  var result = realUsers.map(function(u) {
    return {
      email: u.email,
      user_id: u.id,
      saved: !!phoneMap[u.id],
      phone: phoneMap[u.id] || null
    };
  }).sort(function(a, b) { return a.email.localeCompare(b.email); });

  return res.status(200).json({ users: result, total: result.length });
}

async function handlePost(req, res) {
  var body = req.body || {};
  var email = (body.email || '').trim().toLowerCase();
  var phone = (body.whatsapp_phone || '').trim().replace(/[^0-9]/g, '');

  if (!email || !phone) {
    return res.status(400).json({ error: 'Email e numero do WhatsApp sao obrigatorios.' });
  }

  if (phone.length < 10 || phone.length > 15) {
    return res.status(400).json({ error: 'Numero invalido. Use DDD + numero (10-15 digitos).' });
  }

  var key = getServiceRoleKey();

  // Look up user by email
  var authRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users?per_page=500', {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    }
  });

  if (!authRes.ok) {
    return res.status(500).json({ error: 'Erro ao buscar usuario.' });
  }

  var authData = await authRes.json();
  var user = (authData.users || []).find(function(u) {
    return (u.email || '').toLowerCase() === email;
  });

  if (!user) {
    return res.status(404).json({ error: 'Email nao encontrado na plataforma.' });
  }

  // Upsert into student_whatsapp
  var upsertRes = await fetch(SUPABASE_URL + '/rest/v1/student_whatsapp', {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      user_id: user.id,
      whatsapp_phone: phone,
      updated_at: new Date().toISOString()
    })
  });

  if (!upsertRes.ok) {
    var errText = await upsertRes.text();
    console.error('[whatsapp-link] Upsert error:', errText);
    return res.status(500).json({ error: 'Erro ao salvar. Tente novamente.' });
  }

  return res.status(200).json({ ok: true, email: email, phone: phone });
}
