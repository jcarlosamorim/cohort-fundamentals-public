const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const { logError } = require('./_shared/logger');
const { requireAuth } = require('./_shared/auth-guard');
const { rateLimit } = require('./_shared/rate-limiter');
const { logTokenUsage } = require('./_shared/token-logger');
const { enforceQuota, recordUsage } = require('./_shared/quota-guard');

const SYSTEM_PROMPT = `Você é um especialista em psicometria e autoconhecimento com profunda experiência nos 7 frameworks a seguir. Analise o documento fornecido e extraia/infira dados para preencher um dashboard psicométrico completo.

O documento pode ser um relatório de autoconhecimento, mapa de zona de genialidade, avaliação psicométrica, ou qualquer texto que revele padrões cognitivos, comportamentais e de personalidade.

INSTRUÇÕES CRÍTICAS:
1. Identifique o nome da pessoa no documento
2. Para cada framework, extraia dados EXPLÍCITOS quando disponíveis ou faça INFERÊNCIAS INTELIGENTES baseadas em pistas do conteúdo
3. Gere leituras personalizadas profundas (3-5 frases cada) que usem o nome da pessoa e referências específicas ao documento
4. Use HTML inline nas leituras: <strong> para destaques, <em> para termos técnicos
5. Scores: números inteiros de 1 a 10 (exceto porcentagens)
6. Porcentagens de zonas DEVEM somar 100
7. Seja específico, acionável e empático nas recomendações
8. O plano de ação deve ter itens concretos organizados por timeframe (esta semana, próximas 2 semanas, próximo mês)
9. Inclua 3-5 anti-padrões (O que NÃO fazer) baseados nos pontos fracos identificados
10. Recomende um squad ideal com domínio de expertise, propósito e usuário-alvo

OS 7 FRAMEWORKS:
1. Gay Hendricks (O Grande Salto): Zonas de Genialidade/Excelência/Competência/Incompetência — % de tempo em cada
2. CliftonStrengths (Don Clifton): Top 5 talentos dominantes com scores 1-10
3. Kolbe A (Kathy Kolbe): 4 instintos conativos (Investigador, Seguimento, Início Rápido, Implementador) 1-10
4. Equação de Valor (Alex Hormozi): Resultado Sonhado × Probabilidade ÷ (Tempo × Esforço)
5. Wealth Dynamics (Roger Hamilton) + Fascination Advantage (Sally Hogshead) — perfis
6. Habilidade Única (Dan Sullivan): alinhamento %, tempo na zona %, potencial %
7. Convergência: cruzamento de todos os frameworks em 6 eixos`;

const TOOL_SCHEMA = {
  name: 'fill_psychometric_dashboard',
  description: 'Preenche o dashboard psicométrico com dados extraídos e analisados do documento.',
  input_schema: {
    type: 'object',
    required: ['profile', 'zones', 'zonesReading', 'talents', 'kolbe', 'hormozi', 'wealthProfile', 'fascinationProfile', 'profilesReading', 'uniqueAbility', 'convergence', 'timeDistribution', 'recommendation', 'actions', 'actionPlan', 'recommendedSquad'],
    properties: {
      profile: {
        type: 'object', required: ['name', 'initials', 'currentZone', 'zoneTransition', 'tags'],
        properties: {
          name: { type: 'string' }, initials: { type: 'string' },
          currentZone: { type: 'string' }, zoneTransition: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, description: '4 tags de perfil' }
        }
      },
      zones: {
        type: 'object', required: ['genialidade', 'excelencia', 'competencia', 'incompetencia'],
        properties: { genialidade: { type: 'number' }, excelencia: { type: 'number' }, competencia: { type: 'number' }, incompetencia: { type: 'number' } },
        description: 'Porcentagens (somam 100) de tempo em cada zona de Hendricks'
      },
      zonesReading: { type: 'string', description: 'Leitura personalizada 3-5 frases HTML' },
      talents: {
        type: 'object', required: ['labels', 'scores', 'reading'],
        properties: {
          labels: { type: 'array', items: { type: 'string' }, description: '5 nomes de talentos CliftonStrengths' },
          scores: { type: 'array', items: { type: 'number' }, description: '5 scores de 1-10' },
          reading: { type: 'string' }
        }
      },
      kolbe: {
        type: 'object', required: ['investigador', 'seguimento', 'inicioRapido', 'implementador', 'reading'],
        properties: { investigador: { type: 'number' }, seguimento: { type: 'number' }, inicioRapido: { type: 'number' }, implementador: { type: 'number' }, reading: { type: 'string' } }
      },
      hormozi: {
        type: 'object', required: ['resultadoSonhado', 'probabilidade', 'tempoEspera', 'esforco', 'score', 'reading'],
        properties: { resultadoSonhado: { type: 'number' }, probabilidade: { type: 'number' }, tempoEspera: { type: 'number' }, esforco: { type: 'number' }, score: { type: 'number' }, reading: { type: 'string' } }
      },
      wealthProfile: {
        type: 'object', required: ['name', 'description'],
        properties: { name: { type: 'string' }, description: { type: 'string' } }
      },
      fascinationProfile: {
        type: 'object', required: ['name', 'archetype', 'description'],
        properties: { name: { type: 'string' }, archetype: { type: 'string' }, description: { type: 'string' } }
      },
      profilesReading: { type: 'string' },
      uniqueAbility: {
        type: 'object', required: ['description', 'alignment', 'timeInZone', 'potential', 'reading'],
        properties: { description: { type: 'string' }, alignment: { type: 'number' }, timeInZone: { type: 'number' }, potential: { type: 'number' }, reading: { type: 'string' } }
      },
      convergence: {
        type: 'object', required: ['labels', 'current', 'potential', 'insights', 'reading'],
        properties: {
          labels: { type: 'array', items: { type: 'string' }, description: '6 eixos do radar' },
          current: { type: 'array', items: { type: 'number' }, description: '6 scores atuais 1-10' },
          potential: { type: 'array', items: { type: 'number' }, description: '6 scores potenciais 1-10' },
          insights: { type: 'array', items: { type: 'object', required: ['color', 'text'], properties: { color: { type: 'string', description: 'pink|gold|purple|green' }, text: { type: 'string' } } }, description: '4 insights' },
          reading: { type: 'string' }
        }
      },
      timeDistribution: {
        type: 'object', required: ['current', 'target', 'reading'],
        properties: {
          current: { type: 'object', properties: { genialidade: { type: 'number' }, excelencia: { type: 'number' }, competencia: { type: 'number' }, incompetencia: { type: 'number' } } },
          target: { type: 'object', properties: { genialidade: { type: 'number' }, excelencia: { type: 'number' }, competencia: { type: 'number' }, incompetencia: { type: 'number' } } },
          reading: { type: 'string' }
        }
      },
      recommendation: { type: 'string', description: 'Recomendação principal 2-3 frases' },
      actions: {
        type: 'array', description: '5 ações para 90 dias',
        items: { type: 'object', required: ['label', 'description', 'timeframe', 'frameworks'], properties: { label: { type: 'string' }, description: { type: 'string' }, timeframe: { type: 'string' }, frameworks: { type: 'string' } } }
      },
      actionPlan: {
        type: 'object', required: ['thisWeek', 'nextTwoWeeks', 'nextMonth', 'doNot'],
        description: 'Plano de ação com checklist por timeframe e anti-padrões',
        properties: {
          thisWeek: { type: 'array', items: { type: 'string' }, description: '2-3 ações concretas para esta semana' },
          nextTwoWeeks: { type: 'array', items: { type: 'string' }, description: '2-3 ações para próximas 2 semanas' },
          nextMonth: { type: 'array', items: { type: 'string' }, description: '2-3 ações para próximo mês' },
          doNot: { type: 'array', items: { type: 'string' }, description: '3-5 coisas que NÃO deve fazer baseado nos pontos fracos' }
        }
      },
      recommendedSquad: {
        type: 'object', required: ['domain', 'purpose', 'targetUser', 'executionMode'],
        description: 'Squad recomendado para potencializar a Zona de Genialidade',
        properties: {
          domain: { type: 'object', required: ['name', 'description'], properties: { name: { type: 'string', description: 'Nome do domínio (ex: Copywriting, Video Production)' }, description: { type: 'string', description: 'Breve descrição do domínio' } } },
          purpose: { type: 'object', required: ['name', 'description'], properties: { name: { type: 'string', description: 'Propósito principal (ex: Criar conteúdo, Automatizar processos)' }, description: { type: 'string', description: 'O que o squad deve realizar' } } },
          targetUser: { type: 'object', required: ['name', 'description'], properties: { name: { type: 'string', description: 'Usuário-alvo (ex: Eu mesmo, Clientes da mentoria)' }, description: { type: 'string', description: 'Para quem este squad serve' } } },
          executionMode: { type: 'string', description: 'Modo de execução: Incremental, Full ou Burst' }
        }
      }
    }
  }
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: require valid Supabase JWT
  var user = await requireAuth(req, res);
  if (!user) return;

  // Quota: max 3 analyses per week per user
  var blocked = await enforceQuota(req, res, user.id, '/api/analyze', 3, 7 * 24 * 60 * 60 * 1000);
  if (blocked) return;

  // Rate limit: 3 requests per minute per IP (expensive Sonnet call)
  if (!rateLimit(req, res, 3, 60 * 1000)) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no Vercel' });

  const { text, fileName } = req.body || {};
  if (!text || text.length < 50) return res.status(400).json({ error: 'Texto muito curto para análise' });

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 12000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: 'Analise este documento e preencha o dashboard psicométrico completo.\n\nArquivo: ' + (fileName || 'documento') + '\n\n---\n\n' + text.slice(0, 100000) }],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: 'tool', name: 'fill_psychometric_dashboard' }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', response.status, err);
      await logError('error', 'api', 'Analyze API ' + response.status, { endpoint: '/api/analyze', status: response.status, detail: err.slice(0, 500) });
      return res.status(502).json({ error: 'Erro na API de análise (' + response.status + ')' });
    }

    const data = await response.json();

    // Token logging — rastrear custo do Sonnet
    if (data.usage) {
      await logTokenUsage('/api/analyze', 'claude-sonnet-4-6', data.usage.input_tokens, data.usage.output_tokens);
    }

    const toolUse = data.content && data.content.find(function(c) { return c.type === 'tool_use'; });
    if (!toolUse || !toolUse.input) return res.status(502).json({ error: 'Resposta inválida da API' });

    // Record quota usage after successful analysis
    await recordUsage(user.id, '/api/analyze');

    return res.status(200).json(toolUse.input);
  } catch (err) {
    console.error('Analysis error:', err);
    await logError('critical', 'api', 'Analyze crash: ' + (err.message || 'Unknown'), { endpoint: '/api/analyze', stack: (err.stack || '').slice(0, 2000) });
    return res.status(500).json({ error: 'Erro interno ao processar análise' });
  }
};

