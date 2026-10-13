/**
 * /api/offer-suggest — Gerar oferta personalizada a partir da psicometria
 * Analisa 7 frameworks e preenche os 8 campos da Value Equation automaticamente
 * Uses Claude Haiku with tool_use for structured output
 * Rate limited: max 3 suggestions per day per user
 * No npm dependencies — uses native fetch only
 */

var { requireAuth } = require('./_shared/auth-guard');
var { rateLimit } = require('./_shared/rate-limiter');

var ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Per-user daily rate limit (3 suggestions/day)
var userDailyLimits = {};
var MAX_SUGGESTIONS_PER_DAY = 3;

function checkUserDailyLimit(userId) {
  var now = Date.now();
  var entry = userDailyLimits[userId];
  var todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  var todayMs = todayStart.getTime();

  if (!entry || entry.dayStart < todayMs) {
    userDailyLimits[userId] = { count: 1, dayStart: todayMs };
    return { allowed: true, remaining: MAX_SUGGESTIONS_PER_DAY - 1 };
  }

  if (entry.count >= MAX_SUGGESTIONS_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_SUGGESTIONS_PER_DAY - entry.count };
}

var SYSTEM_PROMPT = ''
  + 'Voce e um estrategista de negocios especialista no framework Value Equation de Alex Hormozi.\n'
  + 'Sua missao: analisar o perfil psicometrico completo de um aluno e gerar uma oferta personalizada.\n\n'
  + 'MAPEAMENTO DOS 7 FRAMEWORKS PARA OS CAMPOS DA OFERTA:\n\n'
  + '1. GAY HENDRICKS (Zonas de Competencia):\n'
  + '   - A oferta DEVE estar na Zona de Genialidade do aluno\n'
  + '   - Use a zona para definir o escopo geral e o titulo\n'
  + '   - Se a zona de genialidade nao estiver clara, use a zona de excelencia\n\n'
  + '2. CLIFTONSTRENGTHS (Top Talentos):\n'
  + '   - Os 2 talentos dominantes definem o tipo de transformacao (dream_outcome)\n'
  + '   - Talentos de influencia → transformacao de posicionamento/marca\n'
  + '   - Talentos de execucao → transformacao de resultados tangiveis\n'
  + '   - Talentos estrategicos → transformacao de clareza/direcao\n'
  + '   - Talentos de relacionamento → transformacao de conexao/comunidade\n\n'
  + '3. KOLBE A (Modo de Operacao):\n'
  + '   - inicioRapido alto (7+) → delivery_level deve ser DFY (eu faco tudo)\n'
  + '   - seguimento alto (7+) → delivery_level deve ser DWY (fazemos juntos)\n'
  + '   - investigador alto (7+) → delivery_level deve ser DIY com framework robusto\n'
  + '   - O Kolbe tambem influencia time_to_result (inicioRapido = resultados rapidos)\n\n'
  + '4. HORMOZI (Scores de Ambicao/Execucao):\n'
  + '   - Calibra a ambicao do dream_outcome (score alto = sonho grande)\n'
  + '   - Calibra a forca da garantia (execution alto = garantia mais ousada)\n\n'
  + '5. WEALTH DYNAMICS + FASCINATION:\n'
  + '   - Creator → oferta baseada em propriedade intelectual (cursos, frameworks)\n'
  + '   - Star → oferta baseada em marca pessoal (mentoria, consultoria)\n'
  + '   - Mechanic → oferta baseada em sistemas (automacao, implementacao)\n'
  + '   - Fascination Innovation → garantia ousada e diferenciada\n'
  + '   - Fascination Power → garantia direta e assertiva\n'
  + '   - Fascination Trust → garantia segura e conservadora\n\n'
  + '6. UNIQUE ABILITY (Dan Sullivan):\n'
  + '   - A descricao da Unique Ability e o core do mecanismo unico\n'
  + '   - Use as palavras exatas do aluno para descrever o mecanismo\n\n'
  + '7. CONVERGENCIA + RECOMMENDATION:\n'
  + '   - O campo recommendation e o paragrafo-ancora principal\n'
  + '   - Use-o como base para amarrar todos os campos\n\n'
  + 'REGRAS DE SQUAD TYPE:\n'
  + '- Thinker: ticket sugerido entre R$3.000-R$8.000, tom consultivo, foco em estrategia\n'
  + '- Maker: ticket sugerido entre R$1.500-R$3.000, tom pratico, foco em projetos/entregas\n\n'
  + 'REGRAS DE RESPOSTA:\n'
  + '- Todos os campos devem ser CONCRETOS e ESPECIFICOS (nunca use placeholders como "[sua expertise]")\n'
  + '- Titulo: maximo 10 palavras, claro e direto\n'
  + '- dream_outcome: 2-3 frases com resultado mensuravel (numeros, prazos, metricas)\n'
  + '- guarantee: especifica com prazo e consequencia clara\n'
  + '- proofs: se o aluno nao tem provas, sugira 2-3 provas faceis de conseguir esta semana\n'
  + '- time_to_result: use os valores exatos: "immediate", "weeks", "months", "long"\n'
  + '- delivery_level: use os valores exatos: "dfy", "dwy", "diy"\n'
  + '- reasoning: 1-2 frases por campo conectando o framework especifico ao campo gerado\n'
  + '- Tudo em portugues brasileiro';

var TOOL_DEFINITION = {
  name: 'generate_personalized_offer',
  description: 'Gera uma oferta personalizada baseada na psicometria do aluno',
  input_schema: {
    type: 'object',
    properties: {
      suggestion: {
        type: 'object',
        description: 'Os 8 campos da oferta preenchidos',
        properties: {
          title: { type: 'string', description: 'Nome da oferta (max 10 palavras)' },
          dream_outcome: { type: 'string', description: 'Resultado dos sonhos (2-3 frases com resultado mensuravel)' },
          unique_mechanism: { type: 'string', description: 'Mecanismo unico que diferencia a oferta' },
          ticket: { type: 'number', description: 'Preco sugerido em reais' },
          delivery_level: { type: 'string', enum: ['dfy', 'dwy', 'diy'], description: 'Nivel de entrega' },
          guarantee: { type: 'string', description: 'Garantia especifica com prazo e consequencia' },
          time_to_result: { type: 'string', enum: ['immediate', 'weeks', 'months', 'long'], description: 'Tempo ate primeiro resultado' },
          proofs: { type: 'string', description: 'Provas existentes ou sugestoes de provas faceis de conseguir' }
        },
        required: ['title', 'dream_outcome', 'unique_mechanism', 'ticket', 'delivery_level', 'guarantee', 'time_to_result', 'proofs']
      },
      reasoning: {
        type: 'object',
        description: 'Explicacao de por que cada campo foi sugerido, conectando psicometria ao campo',
        properties: {
          title: { type: 'string' },
          dream_outcome: { type: 'string' },
          unique_mechanism: { type: 'string' },
          ticket: { type: 'string' },
          delivery_level: { type: 'string' },
          guarantee: { type: 'string' },
          time_to_result: { type: 'string' },
          proofs: { type: 'string' }
        },
        required: ['title', 'dream_outcome', 'unique_mechanism', 'ticket', 'delivery_level', 'guarantee', 'time_to_result', 'proofs']
      }
    },
    required: ['suggestion', 'reasoning']
  }
};

function buildUserPrompt(profileData, squadType) {
  var parts = ['Analise esta psicometria completa e gere uma oferta personalizada.\n'];
  parts.push('SQUAD TYPE: ' + squadType + '\n');

  // Gay Hendricks — Zones
  if (profileData.zones) {
    var z = profileData.zones;
    parts.push('=== GAY HENDRICKS (ZONAS) ===');
    if (z.geniusZone) parts.push('Zona de Genialidade: ' + z.geniusZone);
    if (z.excellenceZone) parts.push('Zona de Excelencia: ' + z.excellenceZone);
    if (z.competenceZone) parts.push('Zona de Competencia: ' + z.competenceZone);
    parts.push('');
  }

  // CliftonStrengths
  if (profileData.talents) {
    parts.push('=== CLIFTONSTRENGTHS ===');
    if (Array.isArray(profileData.talents.top5)) {
      parts.push('Top 5: ' + profileData.talents.top5.join(', '));
    }
    if (profileData.talents.dominantDomain) {
      parts.push('Dominio dominante: ' + profileData.talents.dominantDomain);
    }
    parts.push('');
  }

  // Kolbe A
  if (profileData.kolbeA) {
    var k = profileData.kolbeA;
    parts.push('=== KOLBE A ===');
    if (k.factFinder) parts.push('Investigador (Fact Finder): ' + k.factFinder);
    if (k.followThru) parts.push('Seguimento (Follow Thru): ' + k.followThru);
    if (k.quickStart) parts.push('Inicio Rapido (Quick Start): ' + k.quickStart);
    if (k.implementor) parts.push('Implementador: ' + k.implementor);
    parts.push('');
  }

  // Hormozi scores
  if (profileData.hormoziScores) {
    var h = profileData.hormoziScores;
    parts.push('=== HORMOZI SCORES ===');
    Object.keys(h).forEach(function(key) {
      parts.push(key + ': ' + h[key]);
    });
    parts.push('');
  }

  // Wealth Dynamics
  if (profileData.wealthDynamics) {
    var w = profileData.wealthDynamics;
    parts.push('=== WEALTH DYNAMICS ===');
    if (w.profile) parts.push('Perfil: ' + w.profile);
    if (w.description) parts.push('Descricao: ' + w.description);
    parts.push('');
  }

  // Fascination
  if (profileData.fascination) {
    var f = profileData.fascination;
    parts.push('=== FASCINATION ===');
    if (f.primary) parts.push('Primario: ' + f.primary);
    if (f.secondary) parts.push('Secundario: ' + f.secondary);
    if (f.archetype) parts.push('Arquetipo: ' + f.archetype);
    parts.push('');
  }

  // Unique Ability
  if (profileData.uniqueAbility) {
    var u = profileData.uniqueAbility;
    parts.push('=== UNIQUE ABILITY ===');
    if (typeof u === 'string') {
      parts.push(u);
    } else {
      if (u.description) parts.push('Descricao: ' + u.description);
      if (u.activities) parts.push('Atividades: ' + u.activities);
    }
    parts.push('');
  }

  // Convergencia + Recommendation
  if (profileData.convergence) {
    parts.push('=== CONVERGENCIA ===');
    if (typeof profileData.convergence === 'string') {
      parts.push(profileData.convergence);
    } else if (profileData.convergence.summary) {
      parts.push(profileData.convergence.summary);
    }
    parts.push('');
  }

  if (profileData.recommendation) {
    parts.push('=== RECOMENDACAO GERAL ===');
    if (typeof profileData.recommendation === 'string') {
      parts.push(profileData.recommendation);
    } else if (profileData.recommendation.text) {
      parts.push(profileData.recommendation.text);
    }
    parts.push('');
  }

  // Recommended Squad context
  if (profileData.recommendedSquad) {
    var sq = profileData.recommendedSquad;
    parts.push('=== SQUAD RECOMENDADO ===');
    if (sq.domain) parts.push('Dominio: ' + (sq.domain.name || '') + ' — ' + (sq.domain.description || ''));
    if (sq.purpose) parts.push('Proposito: ' + (sq.purpose.name || '') + ' — ' + (sq.purpose.description || ''));
    parts.push('');
  }

  return parts.join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 5 requests per minute per IP (burst protection)
  if (!rateLimit(req, res, 5, 60 * 1000)) return;

  // Auth: required
  var user = await requireAuth(req, res);
  if (!user) return;

  // Per-user daily limit
  var dailyCheck = checkUserDailyLimit(user.id);
  if (!dailyCheck.allowed) {
    return res.status(429).json({
      error: 'Voce ja gerou ' + MAX_SUGGESTIONS_PER_DAY + ' sugestoes hoje. Tente amanha.',
      code: 'DAILY_LIMIT',
      remaining: 0
    });
  }

  var body = req.body || {};
  var profileData = body.profile_data;
  var squadType = body.squad_type;

  // Validate
  if (!profileData || typeof profileData !== 'object') {
    return res.status(400).json({ error: 'Campo "profile_data" obrigatorio' });
  }

  // Validate minimum psicometria fields
  if (!profileData.zones && !profileData.talents && !profileData.recommendedSquad) {
    return res.status(400).json({
      error: 'Psicometria incompleta. Campos minimos: zones, talents ou recommendedSquad',
      code: 'INCOMPLETE_PROFILE'
    });
  }

  if (!squadType || (squadType !== 'Thinker' && squadType !== 'Maker')) {
    return res.status(400).json({ error: 'Campo "squad_type" obrigatorio. Use: Thinker ou Maker' });
  }

  // Call Claude Haiku with tool_use
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Servico de sugestao indisponivel',
      code: 'CONFIG_ERROR',
      suggestion: 'Contate o suporte.'
    });
  }

  var userPrompt = buildUserPrompt(profileData, squadType);

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
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [TOOL_DEFINITION],
        tool_choice: { type: 'tool', name: 'generate_personalized_offer' },
        messages: [{ role: 'user', content: userPrompt }]
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!resp.ok) {
      var errBody = await resp.text().catch(function() { return ''; });
      console.error('[OFFER-SUGGEST] Anthropic API error:', resp.status, errBody.slice(0, 500));
      return res.status(502).json({
        error: 'Falha ao gerar sugestao de oferta',
        code: 'AI_ERROR',
        suggestion: 'Tente novamente em alguns segundos.'
      });
    }

    var data = await resp.json();

    // Extract tool_use result
    var toolBlock = data.content && data.content.find(function(c) { return c.type === 'tool_use'; });
    if (!toolBlock || !toolBlock.input) {
      console.error('[OFFER-SUGGEST] No tool_use block in response');
      return res.status(502).json({
        error: 'Resposta inesperada do modelo de IA',
        code: 'AI_FORMAT_ERROR',
        suggestion: 'Tente novamente.'
      });
    }

    var result = toolBlock.input;

    // Validate structure
    if (!result.suggestion || !result.reasoning) {
      return res.status(502).json({
        error: 'Sugestao incompleta do modelo',
        code: 'AI_INCOMPLETE',
        suggestion: 'Tente novamente.'
      });
    }

    // Validate all 8 fields exist in suggestion
    var requiredFields = ['title', 'dream_outcome', 'unique_mechanism', 'ticket', 'delivery_level', 'guarantee', 'time_to_result', 'proofs'];
    var missingFields = requiredFields.filter(function(f) { return !result.suggestion[f] && result.suggestion[f] !== 0; });
    if (missingFields.length > 0) {
      return res.status(502).json({
        error: 'Campos faltando na sugestao: ' + missingFields.join(', '),
        code: 'AI_INCOMPLETE',
        suggestion: 'Tente novamente.'
      });
    }

    return res.status(200).json({
      suggestion: result.suggestion,
      reasoning: result.reasoning,
      remaining_today: dailyCheck.remaining,
      squad_type: squadType
    });
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return res.status(504).json({
        error: 'Timeout ao gerar sugestao',
        code: 'TIMEOUT',
        suggestion: 'O servico esta lento. Tente novamente.'
      });
    }
    console.error('[OFFER-SUGGEST] Error:', e.message);
    return res.status(500).json({
      error: 'Erro interno ao gerar sugestao',
      code: 'INTERNAL_ERROR'
    });
  }
};
