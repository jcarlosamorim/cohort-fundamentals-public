/**
 * /api/admin/users — Gestao administrativa de usuarios (Supabase Auth)
 *   GET  -> lista usuarios (email, id, criado em, ultimo login)
 *   POST -> cria usuario { email, password }  (email ja confirmado)
 *   PUT  -> reseta senha  { email | user_id, password }
 *
 * Protegido por admin-guard (header x-admin-key). Usa service_role via _shared.
 * Sem dependencias npm — apenas fetch nativo.
 */

var { requireAdmin } = require('../_shared/admin-guard');
var { SUPABASE_URL, getServiceRoleKey } = require('../_shared/supabase-config');

var MIN_PASSWORD = 6;
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function adminFetch(path, opts) {
  var key = getServiceRoleKey();
  opts = opts || {};
  opts.headers = Object.assign({
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  }, opts.headers || {});
  return fetch(SUPABASE_URL + '/auth/v1' + path, opts);
}

// Pagina admin/users e devolve um array minimo p/ a UI
async function listUsers() {
  var out = [];
  var page = 1;
  var perPage = 1000;
  for (;;) {
    var resp = await adminFetch('/admin/users?per_page=' + perPage + '&page=' + page, { method: 'GET' });
    if (!resp.ok) throw new Error('Supabase list falhou: HTTP ' + resp.status);
    var data = await resp.json();
    var users = (data && data.users) || [];
    for (var i = 0; i < users.length; i++) {
      out.push({
        id: users[i].id,
        email: users[i].email,
        created_at: users[i].created_at,
        last_sign_in_at: users[i].last_sign_in_at || null,
        confirmed: !!users[i].email_confirmed_at
      });
    }
    if (users.length < perPage) break;
    page++;
    if (page > 50) break; // guarda de seguranca (50k usuarios)
  }
  return out;
}

async function findByEmail(email) {
  var target = email.toLowerCase();
  var users = await listUsers();
  for (var i = 0; i < users.length; i++) {
    if ((users[i].email || '').toLowerCase() === target) return users[i];
  }
  return null;
}

async function createUser(email, password) {
  var resp = await adminFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: email, password: password, email_confirm: true })
  });
  var data = await resp.json().catch(function () { return {}; });
  if (!resp.ok) {
    var msg = data.msg || data.error_description || data.message || ('HTTP ' + resp.status);
    return { ok: false, error: msg };
  }
  return { ok: true, user: { id: data.id, email: data.email, created_at: data.created_at } };
}

async function resetPassword(userId, password) {
  var resp = await adminFetch('/admin/users/' + userId, {
    method: 'PUT',
    body: JSON.stringify({ password: password })
  });
  var data = await resp.json().catch(function () { return {}; });
  if (!resp.ok) {
    var msg = data.msg || data.error_description || data.message || ('HTTP ' + resp.status);
    return { ok: false, error: msg };
  }
  return { ok: true, user: { id: data.id, email: data.email } };
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      var users = await listUsers();
      users.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
      return res.status(200).json({ count: users.length, users: users });
    }

    var body = req.body || {};

    if (req.method === 'POST') {
      var email = (body.email || '').trim();
      var password = body.password || '';
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'E-mail invalido' });
      if (password.length < MIN_PASSWORD) return res.status(400).json({ error: 'Senha precisa de ao menos ' + MIN_PASSWORD + ' caracteres' });

      var existing = await findByEmail(email);
      if (existing) return res.status(409).json({ error: 'Ja existe um usuario com esse e-mail', user: existing });

      var created = await createUser(email, password);
      if (!created.ok) return res.status(400).json({ error: created.error });
      return res.status(201).json({ ok: true, action: 'created', user: created.user });
    }

    if (req.method === 'PUT') {
      var pwd = body.password || '';
      if (pwd.length < MIN_PASSWORD) return res.status(400).json({ error: 'Senha precisa de ao menos ' + MIN_PASSWORD + ' caracteres' });

      var userId = body.user_id;
      var targetEmail = null;
      if (!userId) {
        var femail = (body.email || '').trim();
        if (!EMAIL_RE.test(femail)) return res.status(400).json({ error: 'Informe user_id ou e-mail valido' });
        var found = await findByEmail(femail);
        if (!found) return res.status(404).json({ error: 'Usuario nao encontrado' });
        userId = found.id;
        targetEmail = found.email;
      }

      var reset = await resetPassword(userId, pwd);
      if (!reset.ok) return res.status(400).json({ error: reset.error });
      return res.status(200).json({ ok: true, action: 'password_reset', user: reset.user || { id: userId, email: targetEmail } });
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    return res.status(405).json({ error: 'Metodo nao permitido' });
  } catch (e) {
    console.error('[admin/users] erro:', e.message);
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
};
