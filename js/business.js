/* ==========================================================================
   BUSINESS - Revenue Operating System personalizado por perfil (Thinker/Maker)
   Orquestra renderizacao: Oferta, Core Four, Pipeline, Roadmap, Lead Search
   IIFE pattern matching Sidebar/Router/Persistence modules
   ========================================================================== */

const Business = (() => {
  let squadType = null;
  let offerData = null;
  let defaults = null;

  // ── Profile defaults ────────────────────────────────────────────────

  const THINKER_DEFAULTS = {
    offer: { title: 'Consultoria de [sua expertise]', ticket: 5000, perceived_value: 22400 },
    coreFour: {
      warmOutreach:  { current: 0, goal: 20,  primary: true },
      freeContent:   { current: 0, goal: 5,   primary: true },
      coldOutreach:  { current: 0, goal: 50,  primary: false },
      paidAds:       { current: 0, goal: 0,   locked: true, unlocksAt: 'mes3' }
    },
    searchDefaults: { platform: 'linkedin' },
    roadmap: [
      { id: 'r1', label: 'Fechar 2 clientes piloto com desconto', done: false, phase: 1 },
      { id: 'r2', label: 'Coletar depoimentos dos pilotos', done: false, phase: 1 },
      { id: 'r3', label: 'Ajustar oferta com feedback real', done: false, phase: 2 },
      { id: 'r4', label: 'Subir ticket em 30%', done: false, phase: 2 },
      { id: 'r5', label: 'Publicar 1 conteudo/semana no LinkedIn', done: false, phase: 2 },
      { id: 'r6', label: 'Adicionar Cold Outreach como segundo canal', done: false, phase: 3 },
      { id: 'r7', label: 'Automatizar follow-up com templates', done: false, phase: 3 },
      { id: 'r8', label: 'Fechar 5+ clientes/mes consistente', done: false, phase: 3 }
    ]
  };

  const MAKER_DEFAULTS = {
    offer: { title: 'Automacao/Projeto de [sua expertise]', ticket: 2000, perceived_value: 8000 },
    coreFour: {
      warmOutreach:  { current: 0, goal: 10,  primary: false },
      freeContent:   { current: 0, goal: 3,   primary: false },
      coldOutreach:  { current: 0, goal: 100, primary: true },
      paidAds:       { current: 0, goal: 0,   locked: true, unlocksAt: 'mes3' }
    },
    searchDefaults: { platform: 'instagram' },
    roadmap: [
      { id: 'r1', label: 'Fechar 3-5 projetos pequenos para portfolio', done: false, phase: 1 },
      { id: 'r2', label: 'Criar 2 case studies com resultados', done: false, phase: 1 },
      { id: 'r3', label: 'Otimizar proposta e processo de entrega', done: false, phase: 2 },
      { id: 'r4', label: 'Criar template de projeto reutilizavel', done: false, phase: 2 },
      { id: 'r5', label: 'Publicar 1 tutorial tecnico/semana', done: false, phase: 2 },
      { id: 'r6', label: 'Subir ticket e adicionar Free Content', done: false, phase: 3 },
      { id: 'r7', label: 'Criar oferta recorrente (retainer/SaaS)', done: false, phase: 3 },
      { id: 'r8', label: 'Fechar 8+ projetos/mes consistente', done: false, phase: 3 }
    ]
  };

  // ── Init ─────────────────────────────────────────────────────────────

  async function init(container) {
    if (!container) return;

    squadType = await Persistence.loadSquadType();

    if (!squadType) {
      renderEmptyState(container);
      return;
    }

    defaults = squadType === 'Thinker' ? THINKER_DEFAULTS : MAKER_DEFAULTS;
    offerData = await Persistence.loadOffer();

    // If no saved offer, initialize with defaults
    if (!offerData) {
      offerData = {
        title: defaults.offer.title,
        ticket: defaults.offer.ticket,
        perceived_value: defaults.offer.perceived_value,
        value_score: 0,
        core_four: defaults.coreFour,
        roadmap_phase: 1,
        roadmap_checklist: defaults.roadmap
      };
    }

    render(container);
  }

  // ── Render ───────────────────────────────────────────────────────────

  function render(container) {
    var typeLower = squadType.toLowerCase();
    var colorVar = typeLower === 'thinker' ? 'var(--color-thinker)' : 'var(--color-maker)';

    container.innerHTML = ''
      + '<header class="hero">'
      + '  <div class="hero-badge">Menu de Negocios</div>'
      + '  <h1>Sistema de Receita<br><span style="color:' + colorVar + '">Trilha ' + squadType + '</span></h1>'
      + '  <p>Seu plano personalizado de monetizacao baseado no seu perfil ' + squadType + '.</p>'
      + '</header>'
      + '<div class="content biz-content">'
      + '  <div id="biz-offer"></div>'
      + '  <div id="biz-core-four"></div>'
      + '  <div id="biz-pipeline"></div>'
      + '  <div id="biz-lead-search"></div>'
      + '  <div id="biz-roadmap"></div>'
      + '</div>';

    renderOffer();
    renderCoreFour();
    Pipeline.init(document.getElementById('biz-pipeline'));
    LeadSearch.init(document.getElementById('biz-lead-search'));
    renderRoadmap();
  }

  // ── Empty state (no psicometria) ────────────────────────────────────

  function renderEmptyState(container) {
    container.innerHTML = ''
      + '<header class="hero">'
      + '  <div class="hero-badge">Menu de Negocios</div>'
      + '  <h1>Sistema de Receita</h1>'
      + '  <p>Descubra como monetizar com seu perfil unico.</p>'
      + '</header>'
      + '<div class="content" style="text-align:center;padding-top:2rem;">'
      + '  <div class="biz-empty">'
      + '    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l7-7"/><circle cx="12" cy="12" r="3"/></svg>'
      + '    <h2 style="color:var(--color-text-secondary);margin:1.5rem 0 0.5rem;">Complete sua Psicometria primeiro</h2>'
      + '    <p style="color:var(--color-text-muted);max-width:400px;margin:0 auto 1.5rem;line-height:1.6;">Precisamos conhecer seu perfil cognitivo para personalizar seu plano de monetizacao.</p>'
      + '    <button class="biz-cta-btn" onclick="Router.navigate(\'/psicometria\')">'
      + '      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l7-7"/><circle cx="12" cy="12" r="3"/></svg>'
      + '      Ir para Psicometria'
      + '    </button>'
      + '  </div>'
      + '</div>';
  }

  // ── Offer section — Value Equation fields ───────────────────────────

  function renderOffer() {
    var el = document.getElementById('biz-offer');
    if (!el) return;

    var d = {
      title: offerData.title || '',
      ticket: offerData.ticket || 0,
      dream_outcome: offerData.dream_outcome || '',
      unique_mechanism: offerData.unique_mechanism || '',
      guarantee: offerData.guarantee || '',
      time_to_result: offerData.time_to_result || 'weeks',
      delivery_level: offerData.delivery_level || 'dwy',
      proofs: offerData.proofs || ''
    };

    var vs = calcOfferScore(d);
    var vsDisplay = vs.toFixed(1);
    var vsPct = Math.min(vs * 10, 100);

    el.innerHTML = ''
      + '<div class="section-label">'
      + '  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>'
      + '  Sua Oferta — Value Equation'
      + '</div>'
      + '<div class="biz-offer-card">'
      // ─ Nome da Oferta
      + '  <div class="biz-offer-field">'
      + '    <label>Nome da Oferta</label>'
      + '    <input type="text" id="biz-offer-title" value="' + escapeAttr(d.title) + '" placeholder="Ex: Sistema de Automacao para Clinicas em 30 Dias" />'
      + '  </div>'
      // ─ Resultado dos Sonhos (Dream Outcome)
      + '  <div class="biz-offer-field">'
      + '    <label>Resultado dos Sonhos</label>'
      + '    <span class="biz-offer-hint">Qual a transformacao final que seu cliente vai viver? Pense em status, emocao, resultado concreto.</span>'
      + '    <textarea id="biz-offer-dream" rows="3" placeholder="Ex: Meu cliente vai sair de 0 clientes para uma agenda lotada em 60 dias, sendo reconhecido como referencia no nicho">' + escapeAttr(d.dream_outcome) + '</textarea>'
      + '  </div>'
      // ─ Mecanismo Unico
      + '  <div class="biz-offer-field">'
      + '    <label>Mecanismo Unico</label>'
      + '    <span class="biz-offer-hint">O que torna seu metodo diferente? Qual o "como" que so voce tem?</span>'
      + '    <input type="text" id="biz-offer-mechanism" value="' + escapeAttr(d.unique_mechanism) + '" placeholder="Ex: Framework de 5 Passos com IA + Automacao personalizada" />'
      + '  </div>'
      // ─ Ticket + Nivel de Entrega (row)
      + '  <div class="biz-offer-row">'
      + '    <div class="biz-offer-field">'
      + '      <label>Ticket (R$)</label>'
      + '      <input type="number" id="biz-offer-ticket" value="' + d.ticket + '" min="0" step="100" />'
      + '    </div>'
      + '    <div class="biz-offer-field">'
      + '      <label>Nivel de Entrega</label>'
      + '      <span class="biz-offer-hint">Quanto do trabalho voce faz pelo cliente?</span>'
      + '      <select id="biz-offer-delivery">'
      + '        <option value="dfy">Eu Faco Tudo (Done For You)</option>'
      + '        <option value="dwy">Fazemos Juntos (Done With You)</option>'
      + '        <option value="diy">Cliente Faz Sozinho (DIY)</option>'
      + '      </select>'
      + '    </div>'
      + '  </div>'
      // ─ Garantia
      + '  <div class="biz-offer-field">'
      + '    <label>Garantia</label>'
      + '    <span class="biz-offer-hint">Qual risco voce tira do cliente? Quanto mais forte, mais facil vender.</span>'
      + '    <input type="text" id="biz-offer-guarantee" value="' + escapeAttr(d.guarantee) + '" placeholder="Ex: Resultado em 30 dias ou dinheiro de volta + R$500 pelo seu tempo" />'
      + '  </div>'
      // ─ Tempo ate Primeiro Resultado
      + '  <div class="biz-offer-row">'
      + '    <div class="biz-offer-field">'
      + '      <label>Tempo ate Primeiro Resultado</label>'
      + '      <span class="biz-offer-hint">Quando o cliente sente a primeira vitoria?</span>'
      + '      <select id="biz-offer-time">'
      + '        <option value="immediate">Imediato (mesma semana)</option>'
      + '        <option value="weeks">2-4 semanas</option>'
      + '        <option value="months">1-3 meses</option>'
      + '        <option value="long">3+ meses</option>'
      + '      </select>'
      + '    </div>'
      + '  </div>'
      // ─ Provas e Resultados
      + '  <div class="biz-offer-field">'
      + '    <label>Provas e Resultados</label>'
      + '    <span class="biz-offer-hint">Depoimentos, cases, prints, numeros — qualquer evidencia de que funciona. Ainda nao tem? Escreva "Nenhuma ainda".</span>'
      + '    <textarea id="biz-offer-proofs" rows="2" placeholder="Ex: Ajudei 3 clientes a faturar R$10k em 45 dias. Tenho 2 depoimentos em video.">' + escapeAttr(d.proofs) + '</textarea>'
      + '  </div>'
      // ─ Value Score bar
      + '  <div class="biz-offer-bottom">'
      + '    <div class="biz-value-score">'
      + '      <div class="biz-value-score__label">Value Score</div>'
      + '      <div class="biz-value-score__bar">'
      + '        <div class="biz-value-score__fill" id="biz-vs-fill" style="width:' + vsPct + '%"></div>'
      + '      </div>'
      + '      <div class="biz-value-score__num" id="biz-vs-num">' + vsDisplay + '</div>'
      + '    </div>'
      + '  </div>'
      + '  <div id="biz-suggestion-reasoning"></div>'
      + '</div>';

    // Set select values after innerHTML
    var timeSelect = document.getElementById('biz-offer-time');
    var deliverySelect = document.getElementById('biz-offer-delivery');
    if (timeSelect) timeSelect.value = d.time_to_result;
    if (deliverySelect) deliverySelect.value = d.delivery_level;

    // Debounced save on any field change
    var saveTimer = null;
    function onFieldChange() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function() {
        var data = {
          title: document.getElementById('biz-offer-title').value.trim(),
          ticket: parseInt(document.getElementById('biz-offer-ticket').value) || 0,
          dream_outcome: document.getElementById('biz-offer-dream').value.trim(),
          unique_mechanism: document.getElementById('biz-offer-mechanism').value.trim(),
          guarantee: document.getElementById('biz-offer-guarantee').value.trim(),
          time_to_result: document.getElementById('biz-offer-time').value,
          delivery_level: document.getElementById('biz-offer-delivery').value,
          proofs: document.getElementById('biz-offer-proofs').value.trim()
        };
        Object.assign(offerData, data);
        Persistence.saveOffer(data);
        // Update Value Score bar live
        var newScore = calcOfferScore(data);
        var fillEl = document.getElementById('biz-vs-fill');
        var numEl = document.getElementById('biz-vs-num');
        if (fillEl) fillEl.style.width = Math.min(newScore * 10, 100) + '%';
        if (numEl) numEl.textContent = newScore.toFixed(1);
      }, 800);
    }

    el.querySelectorAll('input, textarea, select').forEach(function(inp) {
      inp.addEventListener('input', onFieldChange);
      inp.addEventListener('change', onFieldChange);
    });

    // Render last suggestion reasoning if exists
    if (offerData.suggestion_reasoning) {
      renderSuggestionReasoning(offerData.suggestion_reasoning);
    }
  }

  // ── Analyze Offer via AI ──────────────────────────────────────────

  async function analyzeOffer() {
    var btn = document.getElementById('biz-analyze-btn');
    var resultEl = document.getElementById('biz-analysis-result');
    if (!btn || !resultEl) return;

    // Collect current field values
    var fields = {
      title: (document.getElementById('biz-offer-title') || {}).value || '',
      ticket: parseInt((document.getElementById('biz-offer-ticket') || {}).value) || 0,
      dream_outcome: (document.getElementById('biz-offer-dream') || {}).value || '',
      unique_mechanism: (document.getElementById('biz-offer-mechanism') || {}).value || '',
      guarantee: (document.getElementById('biz-offer-guarantee') || {}).value || '',
      time_to_result: (document.getElementById('biz-offer-time') || {}).value || '',
      delivery_level: (document.getElementById('biz-offer-delivery') || {}).value || '',
      proofs: (document.getElementById('biz-offer-proofs') || {}).value || ''
    };

    // Validate minimum fields
    if (!fields.title || !fields.dream_outcome) {
      resultEl.innerHTML = '<div class="biz-analysis-error">Preencha pelo menos o Nome da Oferta e o Resultado dos Sonhos antes de analisar.</div>';
      return;
    }

    // Loading state
    btn.disabled = true;
    btn.innerHTML = '<svg class="biz-spinner" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Analisando...';

    try {
      var token = '';
      if (typeof supabase !== 'undefined' && supabase.auth) {
        var session = await supabase.auth.getSession();
        token = (session.data && session.data.session) ? session.data.session.access_token : '';
      }

      var resp = await fetch('/api/offer-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          offer_data: fields,
          squad_type: squadType
        })
      });

      if (!resp.ok) {
        var errData = await resp.json().catch(function() { return {}; });
        throw new Error(errData.error || 'Erro ao analisar oferta');
      }

      var data = await resp.json();
      var analysis = data.analysis;

      // Save analysis to offerData
      offerData.analysis = analysis;
      offerData.value_score = analysis.value_score;
      Persistence.saveOffer({ analysis: analysis, value_score: analysis.value_score });

      // Update Value Score display
      var fillEl = document.getElementById('biz-vs-fill');
      var numEl = document.getElementById('biz-vs-num');
      if (fillEl) fillEl.style.width = Math.min(analysis.value_score * 10, 100) + '%';
      if (numEl) numEl.textContent = analysis.value_score.toFixed(1);

      renderAnalysis(analysis);
    } catch (e) {
      resultEl.innerHTML = '<div class="biz-analysis-error">' + escapeAttr(e.message) + '</div>';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> Analisar Oferta';
    }
  }

  // ── Render Analysis Result ────────────────────────────────────────

  function renderAnalysis(analysis) {
    var el = document.getElementById('biz-analysis-result');
    if (!el || !analysis) return;

    var s = analysis.scores;
    var labels = {
      dream_outcome: 'Resultado dos Sonhos',
      perceived_likelihood: 'Probabilidade Percebida',
      time_delay: 'Velocidade do Resultado',
      effort_sacrifice: 'Facilidade para o Cliente'
    };
    var keys = ['dream_outcome', 'perceived_likelihood', 'time_delay', 'effort_sacrifice'];

    var html = '<div class="biz-analysis">'
      + '  <div class="biz-analysis__header">'
      + '    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'
      + '    Diagnostico da Oferta'
      + '  </div>'
      + '  <div class="biz-analysis__scores">';

    keys.forEach(function(key) {
      var score = s[key] || 0;
      var isWeakest = analysis.weakest === key;
      html += '<div class="biz-analysis__score-row' + (isWeakest ? ' biz-analysis__score-row--weak' : '') + '">'
        + '  <div class="biz-analysis__score-label">'
        + '    <span>' + labels[key] + '</span>'
        + (isWeakest ? '<span class="biz-analysis__weak-badge">Alavanca principal</span>' : '')
        + '  </div>'
        + '  <div class="biz-analysis__score-bar">'
        + '    <div class="biz-analysis__score-fill" style="width:' + (score * 10) + '%"></div>'
        + '  </div>'
        + '  <span class="biz-analysis__score-num">' + score + '/10</span>'
        + '</div>';
    });

    html += '  </div>'
      + '  <div class="biz-analysis__formula">'
      + '    Value = (' + s.dream_outcome + ' x ' + s.perceived_likelihood + ') / (' + (11 - s.time_delay) + ' x ' + (11 - s.effort_sacrifice) + ') = <strong>' + analysis.value_score.toFixed(1) + '</strong>'
      + '  </div>'
      + '  <p class="biz-analysis__diagnosis">' + escapeAttr(analysis.diagnosis) + '</p>'
      + '  <div class="biz-analysis__suggestions">'
      + '    <div class="biz-analysis__suggestions-title">'
      + '      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/></svg>'
      + '      3 acoes para aumentar o Value Score:'
      + '    </div>'
      + '    <ol class="biz-analysis__suggestions-list">';

    (analysis.suggestions || []).forEach(function(s) {
      html += '<li>' + escapeAttr(s) + '</li>';
    });

    html += '    </ol>'
      + '  </div>'
      + '</div>';

    el.innerHTML = html;
  }

  // ── Suggest Offer via AI (psicometria → oferta) ─────────────────────

  async function suggestOffer() {
    var btn = document.getElementById('biz-suggest-btn');
    var reasoningEl = document.getElementById('biz-suggestion-reasoning');
    if (!btn) return;

    // Load psicometria
    var psico = await Persistence.loadPsicometria();
    if (!psico || !psico.profile_data) {
      if (reasoningEl) reasoningEl.innerHTML = '<div class="biz-analysis-error">Complete sua Psicometria primeiro para gerar uma oferta personalizada.</div>';
      return;
    }

    // Check if fields already have data — confirm before overwriting
    var titleEl = document.getElementById('biz-offer-title');
    var hasData = titleEl && titleEl.value.trim() && titleEl.value.trim() !== (defaults.offer.title || '');
    if (hasData) {
      if (!confirm('Seus campos ja estao preenchidos. Deseja sobrescrever com a sugestao da IA?')) return;
    }

    // Loading state
    btn.disabled = true;
    btn.innerHTML = '<svg class="biz-spinner" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Gerando oferta personalizada...';

    try {
      var token = '';
      if (typeof supabase !== 'undefined' && supabase.auth) {
        var session = await supabase.auth.getSession();
        token = (session.data && session.data.session) ? session.data.session.access_token : '';
      }

      var resp = await fetch('/api/offer-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          profile_data: psico.profile_data,
          squad_type: squadType
        })
      });

      if (!resp.ok) {
        var errData = await resp.json().catch(function() { return {}; });
        throw new Error(errData.error || 'Erro ao gerar sugestao');
      }

      var data = await resp.json();
      var suggestion = data.suggestion;
      var reasoning = data.reasoning;

      // Auto-fill DOM fields
      var fields = {
        'biz-offer-title': suggestion.title || '',
        'biz-offer-dream': suggestion.dream_outcome || '',
        'biz-offer-mechanism': suggestion.unique_mechanism || '',
        'biz-offer-ticket': suggestion.ticket || 0,
        'biz-offer-guarantee': suggestion.guarantee || '',
        'biz-offer-proofs': suggestion.proofs || ''
      };
      Object.keys(fields).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = fields[id];
      });

      // Set select values
      var timeSelect = document.getElementById('biz-offer-time');
      var deliverySelect = document.getElementById('biz-offer-delivery');
      if (timeSelect && suggestion.time_to_result) timeSelect.value = suggestion.time_to_result;
      if (deliverySelect && suggestion.delivery_level) deliverySelect.value = suggestion.delivery_level;

      // Update offerData in memory
      Object.assign(offerData, {
        title: suggestion.title,
        dream_outcome: suggestion.dream_outcome,
        unique_mechanism: suggestion.unique_mechanism,
        ticket: suggestion.ticket,
        delivery_level: suggestion.delivery_level,
        guarantee: suggestion.guarantee,
        time_to_result: suggestion.time_to_result,
        proofs: suggestion.proofs,
        ai_suggested: true,
        suggestion_reasoning: reasoning
      });

      // Save to persistence
      Persistence.saveOffer({
        title: suggestion.title,
        dream_outcome: suggestion.dream_outcome,
        unique_mechanism: suggestion.unique_mechanism,
        ticket: suggestion.ticket,
        delivery_level: suggestion.delivery_level,
        guarantee: suggestion.guarantee,
        time_to_result: suggestion.time_to_result,
        proofs: suggestion.proofs,
        ai_suggested: true,
        suggestion_reasoning: reasoning
      });

      // Render reasoning section
      renderSuggestionReasoning(reasoning);
    } catch (e) {
      if (reasoningEl) reasoningEl.innerHTML = '<div class="biz-analysis-error">' + escapeAttr(e.message) + '</div>';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6h4c0-3 2-4 2-6a4 4 0 0 0-4-4z"/><line x1="10" y1="16" x2="14" y2="16"/><line x1="10" y1="19" x2="14" y2="19"/><line x1="11" y1="22" x2="13" y2="22"/></svg> Gerar Oferta a Partir do Meu Perfil';
    }
  }

  // ── Render Suggestion Reasoning ─────────────────────────────────────

  function renderSuggestionReasoning(reasoning) {
    var el = document.getElementById('biz-suggestion-reasoning');
    if (!el || !reasoning) return;

    var labels = {
      title: 'Nome da Oferta',
      dream_outcome: 'Resultado dos Sonhos',
      unique_mechanism: 'Mecanismo Unico',
      ticket: 'Ticket',
      delivery_level: 'Nivel de Entrega',
      guarantee: 'Garantia',
      time_to_result: 'Tempo ate Resultado',
      proofs: 'Provas e Resultados'
    };

    var keys = ['title', 'dream_outcome', 'unique_mechanism', 'ticket', 'delivery_level', 'guarantee', 'time_to_result', 'proofs'];

    var html = '<div class="biz-reasoning">'
      + '  <div class="biz-reasoning__header" onclick="this.parentElement.classList.toggle(\'biz-reasoning--collapsed\')">'
      + '    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6h4c0-3 2-4 2-6a4 4 0 0 0-4-4z"/><line x1="10" y1="16" x2="14" y2="16"/><line x1="10" y1="19" x2="14" y2="19"/></svg>'
      + '    Conexao Psicometria → Oferta'
      + '    <svg class="biz-reasoning__chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
      + '  </div>'
      + '  <div class="biz-reasoning__body">';

    keys.forEach(function(key) {
      if (reasoning[key]) {
        html += '<div class="biz-reasoning__item">'
          + '  <div class="biz-reasoning__label">' + labels[key] + '</div>'
          + '  <div class="biz-reasoning__text">' + escapeAttr(reasoning[key]) + '</div>'
          + '</div>';
      }
    });

    html += '  </div>'
      + '</div>';

    el.innerHTML = html;
  }

  // ── Core Four — Conteudo por perfil ─────────────────────────────────

  var CORE_FOUR_META = {
    warmOutreach: {
      label: 'Prospeccao Quente',
      icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75',
      desc: 'Contatar pessoas que ja te conhecem: amigos, ex-colegas, seguidores, contatos de WhatsApp. A taxa de conversao e muito maior porque ja existe confianca. Voce nao precisa "vender" — so precisa mostrar que pode resolver um problema real.',
      projection: {
        Thinker: '20/semana = 80 contatos/mes. Com 5% de conversao em call, sao 4 reunioes. Se metade fechar, sao 2 clientes a R$5k = R$10.000/mes so com esse canal.',
        Maker: '10/semana = 40 contatos/mes. Com 5% de conversao, sao 2 reunioes. 1 projeto fechado a R$2k = R$2.000/mes como complemento.'
      }
    },
    freeContent: {
      label: 'Conteudo Gratuito',
      icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
      desc: 'Publicar posts, videos, tutoriais ou artigos que demonstrem sua expertise. Nao e sobre viralizar — e sobre criar provas publicas de que voce sabe o que faz. Quem te encontra ja chega pre-convencido.',
      projection: {
        Thinker: '5 publicacoes/semana = 20/mes. Em 90 dias, seu perfil vira referencia no nicho. Leads inbound comecam a aparecer — pessoas te procurando, nao o contrario.',
        Maker: '3 tutoriais/semana = 12/mes. Seu portfolio publico cresce. Clientes veem seu trabalho antes de falar com voce — a venda fica muito mais facil.'
      }
    },
    coldOutreach: {
      label: 'Prospeccao Fria',
      icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z|M22 6l-10 7L2 6',
      desc: 'Abordar pessoas que ainda nao te conhecem via DM, email ou mensagem direta. O volume compensa a taxa de resposta menor. A chave e personalizar cada mensagem — nunca copiar e colar.',
      projection: {
        Thinker: '50/semana = 200 contatos/mes. Com 2% de conversao, sao 4 calls extras. 1-2 clientes adicionais a R$5k = R$5-10k/mes a mais.',
        Maker: '100/semana = 400 contatos/mes. Com 2% de conversao, sao 8 calls. 3-4 projetos fechados a R$2k = R$6.000-8.000/mes. Esse e seu motor principal.'
      }
    },
    paidAds: {
      label: 'Anuncios Pagos',
      icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      desc: 'Investir dinheiro em trafego pago para acelerar a aquisicao de clientes. So faz sentido depois de validar sua oferta com os outros 3 canais — senao voce queima dinheiro testando algo que nao funciona.',
      projection: {
        Thinker: 'A partir do mes 3, com oferta validada e depoimentos, cada R$1 investido pode retornar R$3-5. Escala previsivel e automatizada.',
        Maker: 'A partir do mes 3, com portfolio e cases prontos, anuncios aceleram a captacao. Voce sai de 4 projetos/mes para 8-10 sem aumentar esforco manual.'
      }
    }
  };

  // ── Core Four section ───────────────────────────────────────────────

  function renderCoreFour() {
    var el = document.getElementById('biz-core-four');
    if (!el) return;

    // Metas fixas: SEMPRE usa goal/primary/locked dos defaults do perfil
    // Dados salvos so servem para `current` (progresso do aluno)
    var defaultCf = defaults.coreFour;
    var savedCf = offerData.core_four || {};
    var cf = {};
    ['warmOutreach', 'freeContent', 'coldOutreach', 'paidAds'].forEach(function(key) {
      var def = defaultCf[key] || {};
      var saved = savedCf[key] || {};
      cf[key] = {
        current: saved.current || 0,
        goal: def.goal,
        primary: def.primary || false,
        locked: def.locked || false,
        unlocksAt: def.unlocksAt || null
      };
    });
    var keys = ['warmOutreach', 'freeContent', 'coldOutreach', 'paidAds'];

    var html = '<div class="section-label">'
      + '  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'
      + '  Core Four — Suas Metas Semanais'
      + '</div>'
      + '<p class="biz-cf-intro">Esses sao os 4 canais de receita do seu negocio. As metas abaixo sao calibradas para o perfil <strong>' + squadType + '</strong> — siga os numeros toda semana e veja os resultados aparecerem.</p>'
      + '<div class="biz-corefour-grid">';

    keys.forEach(function(key) {
      var meta = CORE_FOUR_META[key];
      var data = cf[key] || { current: 0, goal: 0 };
      var isPrimary = data.primary;
      var isLocked = data.locked;

      var paths = meta.icon.split('|').map(function(d) {
        return '<path d="' + d + '"/>';
      }).join('');

      html += '<div class="biz-cf-item' + (isPrimary ? ' biz-cf-item--primary' : '') + (isLocked ? ' biz-cf-item--locked' : '') + '">'
        + '  <div class="biz-cf-item__header">'
        + '    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>'
        + '    <span>' + meta.label + '</span>'
        + (isPrimary ? '<span class="biz-cf-badge">Principal</span>' : '')
        + (isLocked ? '<span class="biz-cf-badge biz-cf-badge--locked">Mes 3</span>' : '')
        + '  </div>';

      if (!isLocked) {
        html += '  <div class="biz-cf-goal">'
          + '    <span class="biz-cf-goal__number">' + data.goal + '</span>'
          + '    <span class="biz-cf-goal__unit">por semana</span>'
          + '  </div>'
          + '  <p class="biz-cf-desc">' + meta.desc + '</p>'
          + '  <div class="biz-cf-projection">'
          + '    <div class="biz-cf-projection__header">'
          + '      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/></svg>'
          + '      Se voce seguir essa meta:'
          + '    </div>'
          + '    <p class="biz-cf-projection__text">' + meta.projection[squadType] + '</p>'
          + '  </div>';
      } else {
        html += '  <p class="biz-cf-desc">' + meta.desc + '</p>'
          + '  <div class="biz-cf-locked-msg">'
          + '    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
          + '    Disponivel a partir do mes 3 — primeiro valide sua oferta'
          + '  </div>'
          + '  <div class="biz-cf-projection">'
          + '    <div class="biz-cf-projection__header">'
          + '      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/></svg>'
          + '      Quando desbloquear:'
          + '    </div>'
          + '    <p class="biz-cf-projection__text">' + meta.projection[squadType] + '</p>'
          + '  </div>';
      }

      html += '</div>';
    });

    html += '</div>';
    el.innerHTML = html;
  }

  // ── Roadmap 30-60-90 section ────────────────────────────────────────

  function renderRoadmap() {
    var el = document.getElementById('biz-roadmap');
    if (!el) return;

    var checklist = offerData.roadmap_checklist || defaults.roadmap;
    var currentPhase = offerData.roadmap_phase || 1;

    var phases = [
      { num: 1, label: 'Validacao (30 dias)', color: 'var(--color-accent-green)' },
      { num: 2, label: 'Otimizacao (60 dias)', color: 'var(--color-accent-gold)' },
      { num: 3, label: 'Escala (90 dias)', color: 'var(--color-pink)' }
    ];

    var completedCount = checklist.filter(function(c) { return c.done; }).length;
    var totalCount = checklist.length;
    var pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    var html = '<div class="section-label">'
      + '  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      + '  Roadmap 30-60-90'
      + '</div>';

    // Phase progress bar
    html += '<div class="biz-roadmap-progress">'
      + '  <div class="biz-roadmap-progress__bar">'
      + '    <div class="biz-roadmap-progress__fill" style="width:' + pct + '%"></div>'
      + '  </div>'
      + '  <div class="biz-roadmap-progress__label">' + completedCount + '/' + totalCount + ' marcos concluidos</div>'
      + '</div>';

    // Phase tabs
    html += '<div class="biz-roadmap-phases">';
    phases.forEach(function(ph) {
      var phaseItems = checklist.filter(function(c) { return c.phase === ph.num; });
      var phaseComplete = phaseItems.filter(function(c) { return c.done; }).length;
      html += '<div class="biz-roadmap-phase' + (ph.num === currentPhase ? ' biz-roadmap-phase--active' : '') + '">'
        + '  <div class="biz-roadmap-phase__header" style="border-left-color:' + ph.color + '">'
        + '    <span>' + ph.label + '</span>'
        + '    <span class="biz-roadmap-phase__count">' + phaseComplete + '/' + phaseItems.length + '</span>'
        + '  </div>'
        + '  <div class="biz-roadmap-phase__items">';

      phaseItems.forEach(function(item) {
        html += '<label class="biz-roadmap-item">'
          + '  <input type="checkbox" data-id="' + item.id + '"' + (item.done ? ' checked' : '') + ' />'
          + '  <span>' + item.label + '</span>'
          + '</label>';
      });

      html += '  </div></div>';
    });
    html += '</div>';

    el.innerHTML = html;

    // Bind checkbox changes
    el.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var id = cb.dataset.id;
        var item = checklist.find(function(c) { return c.id === id; });
        if (item) item.done = cb.checked;

        offerData.roadmap_checklist = checklist;

        // Recalculate phase
        var newPhase = 1;
        var p1Done = checklist.filter(function(c) { return c.phase === 1 && c.done; }).length;
        var p1Total = checklist.filter(function(c) { return c.phase === 1; }).length;
        var p2Done = checklist.filter(function(c) { return c.phase === 2 && c.done; }).length;
        var p2Total = checklist.filter(function(c) { return c.phase === 2; }).length;
        if (p1Done === p1Total && p1Total > 0) newPhase = 2;
        if (p1Done === p1Total && p2Done === p2Total && p2Total > 0) newPhase = 3;
        offerData.roadmap_phase = newPhase;

        Persistence.saveOffer({
          roadmap_checklist: checklist,
          roadmap_phase: newPhase
        });

        // Re-render for updated counts
        renderRoadmap();
      });
    });
  }

  // ── Utils ───────────────────────────────────────────────────────────

  // Value Score based on Hormozi Value Equation: completeness + quality of each field
  // Score 0-10: Dream Outcome, Likelihood (guarantee+proofs), Time Delay, Effort (delivery)
  function safeStr(v, maxLen) {
    return (typeof v === 'string') ? v.slice(0, maxLen) : '';
  }

  function calcOfferScore(d) {
    if (!d || typeof d !== 'object') return 0;
    var s = 0;
    var title = safeStr(d.title, 200);
    var dream = safeStr(d.dream_outcome, 2000);
    var mech = safeStr(d.unique_mechanism, 2000);
    var guar = safeStr(d.guarantee, 2000);
    var proofs = safeStr(d.proofs, 2000);
    var ticket = typeof d.ticket === 'number' ? d.ticket : parseInt(d.ticket) || 0;
    if (title.length > 5) s += 1.2;
    if (dream.length > 20) s += 1.5;
    else if (dream.length > 5) s += 0.5;
    if (mech.length > 10) s += 1.3;
    else if (mech.length > 3) s += 0.4;
    if (guar.length > 10) s += 1.5;
    else if (guar.length > 3) s += 0.5;
    if (proofs.length > 10) s += 1.5;
    else if (proofs.length > 3) s += 0.5;
    if (ticket > 0 && ticket < 1000000) s += 0.5;
    var timeScores = { immediate: 1.0, weeks: 0.7, months: 0.4, long: 0.2 };
    s += timeScores[d.time_to_result] || 0.4;
    var deliveryScores = { dfy: 1.0, dwy: 0.7, diy: 0.4 };
    s += deliveryScores[d.delivery_level] || 0.5;
    return Math.min(Math.round(s * 10) / 10, 10);
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Public API ──────────────────────────────────────────────────────

  function getSquadType() { return squadType; }
  function getDefaults() { return defaults; }
  function getOffer() { return offerData; }

  return { init, getSquadType, getDefaults, getOffer };
})();
