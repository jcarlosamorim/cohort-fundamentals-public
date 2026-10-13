const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const { logError } = require('./_shared/logger');
const { logTokenUsage } = require('./_shared/token-logger');
const { requireAuth } = require('./_shared/auth-guard');
const { rateLimit } = require('./_shared/rate-limiter');
const { enforceQuota, recordUsage } = require('./_shared/quota-guard');

function summarizeDocument(text) {
  if (!text) return '';
  // Extrair primeiras 400 palavras + todos os scores/percentuais/numeros do documento
  var words = text.split(/\s+/);
  var intro = words.slice(0, 400).join(' ');

  // Extrair linhas com dados quantitativos (scores, %, numeros relevantes)
  var dataLines = text.split('\n').filter(function(line) {
    return /\d+%|\b\d+\/\d+\b|score|zona|talento|perfil|nivel|rank|top\s?\d/i.test(line);
  });

  var summary = intro;
  if (dataLines.length > 0) {
    summary += '\n\nDADOS QUANTITATIVOS EXTRAIDOS:\n' + dataLines.slice(0, 50).join('\n');
  }
  return summary;
}

function buildSystemPrompt(profile, originalText) {
  var name = profile && profile.profile ? profile.profile.name : 'aluno';

  var prompt = `Voce e Aurora, a mentora pessoal de autoconhecimento e desenvolvimento de ${name}.

Voce foi ativada com acesso COMPLETO ao perfil psicometrico deste aluno, processado por 7 frameworks cientificos convergentes. Voce conhece ${name} profundamente — seus talentos, zonas, instintos, perfis e potenciais.

SEU PAPEL:
- Ajudar ${name} a entender e aplicar seu perfil psicometrico no dia a dia
- Dar conselhos praticos e acionaveis baseados nos dados concretos
- Conectar insights de diferentes frameworks para revelar padroes
- Ser empatica, direta e motivadora
- Celebrar forcas e orientar sobre pontos de atencao

REGRAS:
- SEMPRE use o nome "${name}" ao se dirigir ao aluno
- SEMPRE referencie dados especificos do perfil (scores, zonas, talentos, percentuais)
- Responda em portugues brasileiro
- Use formatacao clara com paragrafos curtos
- Quando relevante, cite o framework de origem (Hendricks, Clifton, Kolbe, Hormozi, Hamilton, Hogshead, Sullivan)
- Seja concisa mas profunda — maximo 3-4 paragrafos por resposta
- Se nao souber algo, diga que esta baseando sua resposta nos dados disponiveis

PERFIL PSICOMETRICO COMPLETO:
${JSON.stringify(profile, null, 2)}`;

  if (originalText) {
    prompt += '\n\nRESUMO DO DOCUMENTO DO ALUNO:\n' + summarizeDocument(originalText);
  }

  return prompt;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: require valid Supabase JWT
  var user = await requireAuth(req, res);
  if (!user) return;

  // Quota: max 20 messages per day per user
  var blocked = await enforceQuota(req, res, user.id, '/api/aurora', 20, 24 * 60 * 60 * 1000);
  if (blocked) return;

  // Rate limit: 10 requests per minute per IP
  if (!rateLimit(req, res, 10, 60 * 1000)) return;

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  var body = req.body || {};
  var messages = body.messages;
  var profileData = body.profileData;
  var originalText = body.originalText;

  if (!messages || !messages.length || !profileData) {
    return res.status(400).json({ error: 'Missing messages or profile data' });
  }

  try {
    var response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: buildSystemPrompt(profileData, originalText),
        messages: messages.slice(-20)
      })
    });

    if (!response.ok) {
      var err = await response.text();
      console.error('Aurora API error:', response.status, err);
      await logError('error', 'api', 'Aurora API ' + response.status, { endpoint: '/api/aurora', status: response.status, detail: err.slice(0, 500) });
      return res.status(502).json({ error: 'Erro na API (' + response.status + ')' });
    }

    var data = await response.json();
    if (data.usage) await logTokenUsage('/api/aurora', 'claude-haiku-4-5-20251001', data.usage.input_tokens, data.usage.output_tokens);
    var textBlock = data.content && data.content.find(function(c) { return c.type === 'text'; });
    if (!textBlock) return res.status(502).json({ error: 'Resposta vazia' });

    // Record quota usage after successful response
    await recordUsage(user.id, '/api/aurora');

    return res.status(200).json({ response: textBlock.text });
  } catch (err) {
    console.error('Aurora error:', err);
    await logError('critical', 'api', 'Aurora crash: ' + (err.message || 'Unknown'), { endpoint: '/api/aurora', stack: (err.stack || '').slice(0, 2000) });
    return res.status(500).json({ error: 'Erro interno' });
  }
};

