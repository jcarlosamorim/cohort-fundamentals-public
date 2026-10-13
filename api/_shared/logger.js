/* ==========================================================================
   SHARED LOGGER — WhatsApp error alerts + child-friendly explanations
   Used by: api/analyze.js, api/aurora.js
   ========================================================================== */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function logError(severity, source, message, context) {
  var baseUrl = process.env.UAZAPI_BASE_URL;
  var token = process.env.UAZAPI_TOKEN;
  var number = process.env.NOTIFICATION_NUMBER;
  if (!baseUrl || !token || !number) return;
  if (severity !== 'critical' && severity !== 'error') return;

  var explanation = await explainForChild(severity, source, message, context);

  var emoji = severity === 'critical' ? '\u{1F6A8}' : '\u{26A0}\u{FE0F}';
  var text = emoji + ' *COHORT — ' + severity.toUpperCase() + '*\n\n'
    + '*Source:* ' + source + '\n'
    + '*Message:* ' + (message || '').slice(0, 500) + '\n'
    + (context && context.endpoint ? '*Endpoint:* ' + context.endpoint + '\n' : '');

  if (explanation) {
    text += '\n\u{1F9D2} *Explicando como criança:*\n' + explanation + '\n';
  }

  text += '\n_' + new Date().toISOString() + '_';

  try {
    await fetch(baseUrl + '/send/text', {
      method: 'POST',
      headers: { 'token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: number, text: text })
    });
  } catch(e) { /* silent */ }
}

async function explainForChild(severity, source, message, context) {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    var resp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: 'Explique este erro de software como se fosse pra uma criança de 10 anos. Max 3 frases curtas, use analogias do dia a dia, sem jargão técnico, em português brasileiro. Comece direto.\n\nErro: ' + severity + ' em ' + source + ' — ' + message + (context && context.stack ? '\nStack: ' + context.stack.slice(0, 300) : '') }]
      })
    });
    if (!resp.ok) return null;
    var data = await resp.json();
    var tb = data.content && data.content.find(function(c) { return c.type === 'text'; });
    return tb ? tb.text.trim() : null;
  } catch(e) { return null; }
}

module.exports = { logError };
