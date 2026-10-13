/**
 * /api/message-gen — Cold outreach message generation via Claude Haiku
 * Receives {lead_data, offer_data, squad_type} and returns personalized message
 * Uses SMYKM (Sam McKenna) + 4-T (Josh Braun) frameworks
 * Rate limited: max 10 messages per day per user
 * No npm dependencies — uses native fetch only
 */

var { requireAuth } = require('./_shared/auth-guard');
var { rateLimit } = require('./_shared/rate-limiter');

var ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Per-user daily rate limit (10 messages/day)
var userDailyLimits = {};
var MAX_MESSAGES_PER_DAY = 10;

function checkUserDailyLimit(userId) {
  var now = Date.now();
  var entry = userDailyLimits[userId];
  var todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  var todayMs = todayStart.getTime();

  if (!entry || entry.dayStart < todayMs) {
    userDailyLimits[userId] = { count: 1, dayStart: todayMs };
    return { allowed: true, remaining: MAX_MESSAGES_PER_DAY - 1 };
  }

  if (entry.count >= MAX_MESSAGES_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_MESSAGES_PER_DAY - entry.count };
}

function buildSystemPrompt(squadType) {
  var profileContext = squadType === 'Thinker'
    ? 'O remetente e um consultor/estrategista (perfil Thinker) que oferece servicos de alto valor (consultoria, mentoria, estrategia). Tom mais executivo e consultivo.'
    : 'O remetente e um implementador/construtor (perfil Maker) que oferece projetos e automacoes. Tom mais pratico e orientado a resultados tecnicos.';

  return 'Voce e um especialista em cold outreach B2B, treinado nos frameworks de Sam McKenna (SMYKM — Show Me You Know Me) e Josh Braun (4-T: Trigger, Thesis, Third Party, Tee-up).\n\n'
    + 'PERFIL DO REMETENTE:\n' + profileContext + '\n\n'
    + 'REGRAS ABSOLUTAS:\n'
    + '1. Maximo 150 palavras\n'
    + '2. Tom profissional mas humano e direto\n'
    + '3. SEM emojis\n'
    + '4. SEM frases cliche ("eu sei que voce e ocupado", "espero que esteja bem", "me desculpe pelo contato frio")\n'
    + '5. COMECE mostrando que pesquisou o lead (SMYKM) — referencie algo REAL da bio ou posts recentes\n'
    + '6. USE o framework 4-T:\n'
    + '   - Trigger: o que motivou o contato (algo especifico do lead)\n'
    + '   - Thesis: sua hipotese de como pode ajudar\n'
    + '   - Third Party: mencione resultado similar com outro cliente (pode ser generico)\n'
    + '   - Tee-up: fechamento suave pedindo conversa rapida\n'
    + '7. A mensagem deve funcionar como DM (Instagram ou LinkedIn), nao como email\n'
    + '8. Responda APENAS com a mensagem pronta, sem explicacoes ou comentarios\n'
    + '9. Escreva em portugues brasileiro';
}

function buildUserPrompt(leadData, offerData, squadType) {
  var parts = ['Gere uma mensagem de prospeccao fria para:\n'];

  parts.push('LEAD:');
  parts.push('- Nome: ' + (leadData.name || 'Desconhecido'));
  if (leadData.handle) parts.push('- Handle: @' + leadData.handle);
  if (leadData.bio) parts.push('- Bio: ' + leadData.bio.slice(0, 300));
  if (leadData.followers) parts.push('- Seguidores: ' + leadData.followers);
  if (leadData.platform) parts.push('- Plataforma: ' + leadData.platform);

  if (leadData.recentPosts && leadData.recentPosts.length > 0) {
    parts.push('- Posts recentes:');
    leadData.recentPosts.slice(0, 3).forEach(function(post, i) {
      if (post.text) parts.push('  ' + (i + 1) + '. "' + post.text.slice(0, 150) + '"');
    });
  }

  parts.push('\nMINHA OFERTA:');
  parts.push('- Titulo: ' + (offerData.title || 'Consultoria/Projeto'));
  if (offerData.ticket) parts.push('- Ticket: R$ ' + offerData.ticket);

  parts.push('\nMEU PERFIL: ' + (squadType || 'Maker'));
  parts.push('CANAL: ' + (leadData.platform || 'instagram') + ' DM');

  return parts.join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 15 requests per minute per IP (burst protection)
  if (!rateLimit(req, res, 15, 60 * 1000)) return;

  // Auth: required
  var user = await requireAuth(req, res);
  if (!user) return;

  // Per-user daily limit: 10 messages/day
  var dailyCheck = checkUserDailyLimit(user.id);
  if (!dailyCheck.allowed) {
    return res.status(429).json({
      error: 'Limite diario atingido (' + MAX_MESSAGES_PER_DAY + ' mensagens/dia)',
      code: 'DAILY_LIMIT',
      remaining: 0,
      suggestion: 'Voce ja gerou ' + MAX_MESSAGES_PER_DAY + ' mensagens hoje. Tente novamente amanha.'
    });
  }

  var body = req.body || {};
  var leadData = body.lead_data;
  var offerData = body.offer_data;
  var squadType = body.squad_type;

  // Validate lead_data
  if (!leadData || typeof leadData !== 'object') {
    return res.status(400).json({ error: 'Campo "lead_data" obrigatorio (objeto com name, handle, bio)' });
  }
  if (!leadData.name || typeof leadData.name !== 'string') {
    return res.status(400).json({ error: 'lead_data.name obrigatorio' });
  }

  // Validate offer_data
  if (!offerData || typeof offerData !== 'object') {
    return res.status(400).json({ error: 'Campo "offer_data" obrigatorio (objeto com title, ticket)' });
  }
  if (!offerData.title || typeof offerData.title !== 'string') {
    return res.status(400).json({ error: 'offer_data.title obrigatorio' });
  }

  // Validate squad_type
  if (!squadType || (squadType !== 'Thinker' && squadType !== 'Maker')) {
    return res.status(400).json({ error: 'Campo "squad_type" obrigatorio. Use: Thinker ou Maker' });
  }

  // Call Claude Haiku
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Servico de geracao de mensagem indisponivel',
      code: 'CONFIG_ERROR',
      suggestion: 'Contate o suporte.'
    });
  }

  var systemPrompt = buildSystemPrompt(squadType);
  var userPrompt = buildUserPrompt(leadData, offerData, squadType);

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
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      }),
      signal: AbortSignal.timeout(30000) // 30s timeout
    });

    if (!resp.ok) {
      var errBody = await resp.text().catch(function() { return ''; });
      console.error('[MESSAGE-GEN] Anthropic API error:', resp.status, errBody.slice(0, 500));
      return res.status(502).json({
        error: 'Falha ao gerar mensagem',
        code: 'AI_ERROR',
        suggestion: 'Tente novamente em alguns segundos.'
      });
    }

    var data = await resp.json();
    var textBlock = data.content && data.content.find(function(c) { return c.type === 'text'; });
    var message = textBlock ? textBlock.text.trim() : null;

    if (!message) {
      return res.status(502).json({
        error: 'Resposta vazia do modelo de IA',
        code: 'AI_EMPTY',
        suggestion: 'Tente novamente.'
      });
    }

    return res.status(200).json({
      message: message,
      remaining_today: dailyCheck.remaining,
      lead_name: leadData.name,
      squad_type: squadType
    });
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return res.status(504).json({
        error: 'Timeout ao gerar mensagem',
        code: 'TIMEOUT',
        suggestion: 'O servico esta lento. Tente novamente.'
      });
    }
    console.error('[MESSAGE-GEN] Error:', e.message);
    return res.status(500).json({
      error: 'Erro interno ao gerar mensagem',
      code: 'INTERNAL_ERROR'
    });
  }
};
