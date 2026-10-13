/**
 * /api/cron/token-report — Relatorio diario de consumo de tokens
 * Roda diariamente as 9h UTC (6h Manaus)
 * Agrega ultimas 24h da tabela api_token_usage
 * Envia resumo via WhatsApp (Uazapi)
 * No npm dependencies — uses native fetch only
 */

var { SUPABASE_URL, getServiceRoleKey } = require('../_shared/supabase-config');

// Precos por 1M tokens (USD) — Fev 2026
var PRICING = {
  'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 }
};

// Baseline pre-otimizacao: ~$22/dia (~$665/mes)
var BASELINE_DAILY_USD = 22;

function supabaseKey() {
  return getServiceRoleKey();
}

async function fetchLast24h() {
  var key = supabaseKey();
  var since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/api_token_usage?created_at=gte.' + encodeURIComponent(since) + '&select=endpoint,model,input_tokens,output_tokens',
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
    console.error('fetchLast24h failed:', e.message);
    return [];
  }
}

function aggregateUsage(rows) {
  var byModel = {};
  var byEndpoint = {};
  var totalCalls = rows.length;
  var totalInputTokens = 0;
  var totalOutputTokens = 0;
  var totalCostUSD = 0;

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var model = r.model;
    var endpoint = r.endpoint;
    var inp = r.input_tokens || 0;
    var out = r.output_tokens || 0;

    // Por modelo
    if (!byModel[model]) {
      byModel[model] = { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
    }
    byModel[model].calls++;
    byModel[model].input_tokens += inp;
    byModel[model].output_tokens += out;

    var pricing = PRICING[model] || { input: 3.00, output: 15.00 };
    var cost = (inp / 1000000) * pricing.input + (out / 1000000) * pricing.output;
    byModel[model].cost_usd += cost;

    // Por endpoint
    if (!byEndpoint[endpoint]) {
      byEndpoint[endpoint] = { calls: 0, input_tokens: 0, output_tokens: 0 };
    }
    byEndpoint[endpoint].calls++;
    byEndpoint[endpoint].input_tokens += inp;
    byEndpoint[endpoint].output_tokens += out;

    totalInputTokens += inp;
    totalOutputTokens += out;
    totalCostUSD += cost;
  }

  return {
    totalCalls: totalCalls,
    totalInputTokens: totalInputTokens,
    totalOutputTokens: totalOutputTokens,
    totalCostUSD: totalCostUSD,
    byModel: byModel,
    byEndpoint: byEndpoint
  };
}

function formatCurrency(usd) {
  return '$' + usd.toFixed(4);
}

function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function buildReport(agg) {
  var projectedMonthly = agg.totalCostUSD * 30;
  var savingsVsBaseline = BASELINE_DAILY_USD - agg.totalCostUSD;
  var savingsPct = BASELINE_DAILY_USD > 0 ? ((savingsVsBaseline / BASELINE_DAILY_USD) * 100).toFixed(1) : '0';

  var text = '\u{1F4CA} *TOKEN REPORT — Ultimas 24h*\n'
    + '_Cohort Fundamentals_\n\n';

  // Resumo geral
  text += '\u{1F4B0} *Custo total:* ' + formatCurrency(agg.totalCostUSD) + '\n'
    + '\u{1F4DE} *Total chamadas:* ' + agg.totalCalls + '\n'
    + '\u{1F4E5} *Input tokens:* ' + formatTokens(agg.totalInputTokens) + '\n'
    + '\u{1F4E4} *Output tokens:* ' + formatTokens(agg.totalOutputTokens) + '\n\n';

  // Por modelo
  text += '\u{1F916} *Por modelo:*\n';
  var models = Object.keys(agg.byModel);
  for (var i = 0; i < models.length; i++) {
    var m = models[i];
    var d = agg.byModel[m];
    var shortName = m.replace('claude-', '').replace('-20251001', '');
    text += '  \u{2022} ' + shortName + ': ' + d.calls + ' calls, '
      + formatTokens(d.input_tokens) + ' in / ' + formatTokens(d.output_tokens) + ' out, '
      + formatCurrency(d.cost_usd) + '\n';
  }
  text += '\n';

  // Por endpoint
  text += '\u{1F310} *Por endpoint:*\n';
  var endpoints = Object.keys(agg.byEndpoint);
  for (var j = 0; j < endpoints.length; j++) {
    var ep = endpoints[j];
    var ed = agg.byEndpoint[ep];
    text += '  \u{2022} ' + ep + ': ' + ed.calls + ' calls\n';
  }
  text += '\n';

  // Comparacao com baseline
  text += '\u{1F4C8} *vs Baseline ($' + BASELINE_DAILY_USD + '/dia pre-otimizacao):*\n';
  if (savingsVsBaseline > 0) {
    text += '\u{2705} Economia: ' + formatCurrency(savingsVsBaseline) + '/dia (' + savingsPct + '% menor)\n';
  } else {
    text += '\u{26A0}\u{FE0F} Acima do baseline: +' + formatCurrency(Math.abs(savingsVsBaseline)) + '/dia\n';
  }
  text += '\u{1F4C5} *Projecao mensal:* ' + formatCurrency(projectedMonthly) + '/mes\n';

  text += '\n_Gerado em ' + new Date().toISOString() + '_';

  return text;
}

async function sendWhatsApp(text) {
  var baseUrl = process.env.UAZAPI_BASE_URL;
  var token = process.env.UAZAPI_TOKEN;
  var number = process.env.NOTIFICATION_NUMBER;
  if (!baseUrl || !token || !number) return false;

  try {
    var resp = await fetch(baseUrl + '/send/text', {
      method: 'POST',
      headers: { 'token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: number, text: text })
    });
    return resp.ok;
  } catch (e) {
    console.error('WhatsApp token report failed:', e.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  // Cron verification
  var cronSecret = process.env.CRON_SECRET;
  var authHeader = req.headers['authorization'];
  var isCron = cronSecret && authHeader === 'Bearer ' + cronSecret;

  if (!isCron) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var rows = await fetchLast24h();

  if (rows.length === 0) {
    return res.status(200).json({ sent: false, reason: 'No usage in last 24h' });
  }

  var agg = aggregateUsage(rows);
  var report = buildReport(agg);
  var sent = await sendWhatsApp(report);

  return res.status(200).json({
    sent: sent,
    summary: {
      calls: agg.totalCalls,
      cost_usd: agg.totalCostUSD,
      projected_monthly: agg.totalCostUSD * 30
    }
  });
};
