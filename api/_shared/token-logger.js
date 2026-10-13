/* ==========================================================================
   SHARED TOKEN LOGGER — Fire-and-forget token usage tracking
   Used by: api/aurora.js, api/error-diagnose.js
   Grava cada chamada API na tabela api_token_usage (Supabase)
   ========================================================================== */

var { SUPABASE_URL, getServiceRoleKey } = require('./supabase-config');

/**
 * Grava uso de tokens na tabela api_token_usage.
 * Retorna Promise — deve ser awaited antes de enviar a response ao usuario,
 * senao a Vercel mata o processo e o log se perde.
 * @param {string} endpoint - Ex: '/api/aurora'
 * @param {string} model - Ex: 'claude-haiku-4-5-20251001'
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {Promise<void>}
 */
async function logTokenUsage(endpoint, model, inputTokens, outputTokens) {
  if (!inputTokens && !outputTokens) return;

  var key = getServiceRoleKey();
  try {
    await fetch(SUPABASE_URL + '/rest/v1/api_token_usage', {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        endpoint: endpoint,
        model: model,
        input_tokens: inputTokens || 0,
        output_tokens: outputTokens || 0
      })
    });
  } catch (e) {
    console.error('logTokenUsage failed:', e.message);
  }
}

module.exports = { logTokenUsage };
