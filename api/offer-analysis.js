/**
 * /api/offer-analysis — Offer diagnosis via Value Equation (Hormozi framework)
 * Receives {offer_data, squad_type} and returns scores, diagnosis, suggestions
 * Uses Claude Haiku for fast, affordable analysis
 * Rate limited: max 5 analyses per day per user
 * No npm dependencies — uses native fetch only
 */

var { requireAuth } = require('./_shared/auth-guard');
var { rateLimit } = require('./_shared/rate-limiter');

var ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Per-user daily rate limit (5 analyses/day)
var userDailyLimits = {};
var MAX_ANALYSES_PER_DAY = 5;

function checkUserDailyLimit(userId) {
  var now = Date.now();
  var entry = userDailyLimits[userId];
  var todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  var todayMs = todayStart.getTime();

  if (!entry || entry.dayStart < todayMs) {
    userDailyLimits[userId] = { count: 1, dayStart: todayMs };
    return { allowed: true, remaining: MAX_ANALYSES_PER_DAY - 1 };
  }

  if (entry.count >= MAX_ANALYSES_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_ANALYSES_PER_DAY - entry.count };
}

var SYSTEM_PROMPT = ''
  + 'Voce e um analista de ofertas treinado na Value Equation de Alex Hormozi.\n\n'
  + 'A FORMULA:\n'
  + 'Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort & Sacrifice)\n\n'
  + 'REGRAS DE PONTUACAO (cada variavel de 1 a 10):\n\n'
  + '1. RESULTADO DOS SONHOS (dream_outcome):\n'
  + '   10 = Transformacao ultra-especifica, conectada a status, com resultado mensuravel\n'
  + '   7 = Resultado claro mas generico, sem conexao emocional forte\n'
  + '   4 = Vago, poderia ser de qualquer negocio\n'
  + '   1 = Sem resultado definido\n\n'
  + '2. PROBABILIDADE PERCEBIDA (perceived_likelihood):\n'
  + '   10 = Garantia forte (anti-garantia) + multiplas provas + mecanismo unico nomeado\n'
  + '   7 = Garantia basica + algumas provas OU mecanismo claro\n'
  + '   4 = Sem garantia, poucas provas, metodo generico\n'
  + '   1 = Zero provas, zero garantia, zero diferenciacao\n\n'
  + '3. VELOCIDADE DO RESULTADO (time_delay — SCORE ALTO = RESULTADO RAPIDO):\n'
  + '   10 = Resultado imediato (mesma semana), quick win claro\n'
  + '   7 = 2-4 semanas ate primeiro resultado tangivel\n'
  + '   4 = 1-3 meses ate sentir algo\n'
  + '   1 = 3+ meses sem nenhuma vitoria intermediaria\n\n'
  + '4. FACILIDADE PARA O CLIENTE (effort_sacrifice — SCORE ALTO = POUCO ESFORCO):\n'
  + '   10 = Done For You (cliente nao faz quase nada)\n'
  + '   7 = Done With You (guia passo-a-passo com suporte)\n'
  + '   4 = DIY com algum material de apoio\n'
  + '   1 = Cliente faz tudo sozinho sem suporte\n\n'
  + 'CALCULO DO VALUE SCORE:\n'
  + 'value_score = (dream_outcome * perceived_likelihood) / ((11 - time_delay) * (11 - effort_sacrifice))\n'
  + 'Onde scores invertidos: 11 - score transforma "bom = alto" em denominador correto.\n'
  + 'Exemplo: time_delay=10 (rapido) -> denominador parte = 1 (bom). time_delay=1 (lento) -> denominador parte = 10 (ruim).\n\n'
  + 'REGRAS DE RESPOSTA:\n'
  + '- Responda APENAS com JSON valido, sem markdown, sem texto extra, sem ```\n'
  + '- O JSON deve ter exatamente esta estrutura:\n'
  + '{\n'
  + '  "scores": {\n'
  + '    "dream_outcome": <1-10>,\n'
  + '    "perceived_likelihood": <1-10>,\n'
  + '    "time_delay": <1-10>,\n'
  + '    "effort_sacrifice": <1-10>\n'
  + '  },\n'
  + '  "value_score": <numero decimal calculado pela formula>,\n'
  + '  "weakest": "<chave do score mais fraco: dream_outcome|perceived_likelihood|time_delay|effort_sacrifice>",\n'
  + '  "diagnosis": "<2-3 frases diretas em portugues sobre o estado da oferta. Sem bajulacao. Se for fraca, diga.>",\n'
  + '  "suggestions": [\n'
  + '    "<acao 1 concreta e especifica para melhorar>",\n'
  + '    "<acao 2 concreta e especifica para melhorar>",\n'
  + '    "<acao 3 concreta e especifica para melhorar>"\n'
  + '  ]\n'
  + '}\n\n'
  + 'FOCO NO DENOMINADOR: priorize identificar problemas em Time Delay e Effort — e a onde a maioria erra.\n'
  + 'Seja direto, sem bajulacao. Se a oferta for fraca, diga. Se estiver forte, diga o que falta para ser Grand Slam.\n'
  + 'As sugestoes devem ser acoes que o aluno pode executar ESTA SEMANA — nada abstrato.';

function sanitizeField(val, maxLen) {
  if (!val || typeof val !== 'string') return '(vazio)';
  return val.slice(0, maxLen).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function buildUserPrompt(offerData, squadType) {
  var deliveryMap = { dfy: 'Done For You (eu faco tudo)', dwy: 'Done With You (fazemos juntos)', diy: 'DIY (cliente faz sozinho)' };
  var timeMap = { immediate: 'Imediato (mesma semana)', weeks: '2-4 semanas', months: '1-3 meses', long: '3+ meses' };

  var st = (squadType === 'Thinker' || squadType === 'Maker') ? squadType : 'Maker';
  var ticket = parseInt(offerData.ticket) || 0;
  if (ticket < 0) ticket = 0;
  if (ticket > 999999) ticket = 999999;

  var dl = deliveryMap[offerData.delivery_level] || '(vazio)';
  var tr = timeMap[offerData.time_to_result] || '(vazio)';

  var parts = ['Analise esta oferta de um aluno perfil ' + st + ':\n'];
  parts.push('NOME DA OFERTA: ' + sanitizeField(offerData.title, 200));
  parts.push('RESULTADO DOS SONHOS: ' + sanitizeField(offerData.dream_outcome, 1000));
  parts.push('MECANISMO UNICO: ' + sanitizeField(offerData.unique_mechanism, 1000));
  parts.push('TICKET: R$ ' + ticket);
  parts.push('NIVEL DE ENTREGA: ' + dl);
  parts.push('GARANTIA: ' + sanitizeField(offerData.guarantee, 1000));
  parts.push('TEMPO ATE PRIMEIRO RESULTADO: ' + tr);
  parts.push('PROVAS E RESULTADOS: ' + sanitizeField(offerData.proofs, 1000));

  return parts.join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 10 requests per minute per IP (burst protection)
  if (!rateLimit(req, res, 10, 60 * 1000)) return;

  // Auth: required
  var user = await requireAuth(req, res);
  if (!user) return;

  // Per-user daily limit
  var dailyCheck = checkUserDailyLimit(user.id);
  if (!dailyCheck.allowed) {
    return res.status(429).json({
      error: 'Limite diario atingido (' + MAX_ANALYSES_PER_DAY + ' analises/dia)',
      code: 'DAILY_LIMIT',
      remaining: 0,
      suggestion: 'Voce ja analisou ' + MAX_ANALYSES_PER_DAY + ' vezes hoje. Ajuste sua oferta e tente amanha.'
    });
  }

  var body = req.body || {};
  var offerData = body.offer_data;
  var squadType = body.squad_type;

  // Validate
  if (!offerData || typeof offerData !== 'object') {
    return res.status(400).json({ error: 'Campo "offer_data" obrigatorio' });
  }
  if (!offerData.title) {
    return res.status(400).json({ error: 'offer_data.title obrigatorio' });
  }
  if (!offerData.dream_outcome) {
    return res.status(400).json({ error: 'offer_data.dream_outcome obrigatorio — preencha o Resultado dos Sonhos' });
  }
  if (!squadType || (squadType !== 'Thinker' && squadType !== 'Maker')) {
    return res.status(400).json({ error: 'Campo "squad_type" obrigatorio. Use: Thinker ou Maker' });
  }

  // Call Claude Haiku
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Servico de analise indisponivel',
      code: 'CONFIG_ERROR',
      suggestion: 'Contate o suporte.'
    });
  }

  var userPrompt = buildUserPrompt(offerData, squadType);

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
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!resp.ok) {
      var errBody = await resp.text().catch(function() { return ''; });
      console.error('[OFFER-ANALYSIS] Anthropic API error:', resp.status, errBody.slice(0, 500));
      return res.status(502).json({
        error: 'Falha ao analisar oferta',
        code: 'AI_ERROR',
        suggestion: 'Tente novamente em alguns segundos.'
      });
    }

    var data = await resp.json();
    var textBlock = data.content && data.content.find(function(c) { return c.type === 'text'; });
    var rawText = textBlock ? textBlock.text.trim() : null;

    if (!rawText) {
      return res.status(502).json({
        error: 'Resposta vazia do modelo de IA',
        code: 'AI_EMPTY',
        suggestion: 'Tente novamente.'
      });
    }

    // Parse JSON response from AI
    var analysis;
    try {
      analysis = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[OFFER-ANALYSIS] JSON parse error:', rawText.slice(0, 300));
      return res.status(502).json({
        error: 'Resposta do modelo em formato inesperado',
        code: 'AI_FORMAT_ERROR',
        suggestion: 'Tente novamente.'
      });
    }

    // Validate analysis structure
    if (!analysis.scores || !analysis.diagnosis || !analysis.suggestions) {
      return res.status(502).json({
        error: 'Analise incompleta do modelo',
        code: 'AI_INCOMPLETE',
        suggestion: 'Tente novamente.'
      });
    }

    // Recalculate value_score server-side to ensure correctness
    var s = analysis.scores;
    var timeDenom = 11 - (s.time_delay || 5);
    var effortDenom = 11 - (s.effort_sacrifice || 5);
    if (timeDenom < 1) timeDenom = 1;
    if (effortDenom < 1) effortDenom = 1;
    analysis.value_score = Math.round(((s.dream_outcome || 5) * (s.perceived_likelihood || 5)) / (timeDenom * effortDenom) * 10) / 10;

    return res.status(200).json({
      analysis: analysis,
      remaining_today: dailyCheck.remaining,
      squad_type: squadType
    });
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return res.status(504).json({
        error: 'Timeout ao analisar oferta',
        code: 'TIMEOUT',
        suggestion: 'O servico esta lento. Tente novamente.'
      });
    }
    console.error('[OFFER-ANALYSIS] Error:', e.message);
    return res.status(500).json({
      error: 'Erro interno ao analisar oferta',
      code: 'INTERNAL_ERROR'
    });
  }
};
