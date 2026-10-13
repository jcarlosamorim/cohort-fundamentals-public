/* ==========================================================================
   PERSISTENCE - CRUD layer for Supabase progress, scenarios, notes
   IIFE pattern matching Calendar/Router/Sidebar modules
   ========================================================================== */

const Persistence = (() => {
  let cachedProgress = [];
  let cachedScenarios = [];

  function db() {
    return Auth.getClient();
  }

  function uid() {
    const user = Auth.getUser();
    return user ? user.id : null;
  }

  // ── Load all data on boot ─────────────────────────────────────────────

  async function loadAll() {
    if (!uid()) return;
    await Promise.all([loadProgress(), loadScenarioResults()]);
  }

  async function loadProgress() {
    if (!uid()) return [];
    const { data, error } = await db()
      .from('student_progress')
      .select('*')
      .eq('user_id', uid());
    if (error) { console.error('Load progress error:', error); return []; }
    cachedProgress = data || [];
    return cachedProgress;
  }

  async function loadScenarioResults() {
    if (!uid()) return [];
    const { data, error } = await db()
      .from('scenario_results')
      .select('*')
      .eq('user_id', uid());
    if (error) { console.error('Load scenarios error:', error); return []; }
    cachedScenarios = data || [];
    return cachedScenarios;
  }

  // ── Scenario results ──────────────────────────────────────────────────

  function isScenarioCompleted(scenarioId) {
    return cachedScenarios.some(s => s.scenario_id === scenarioId && s.correct);
  }

  async function saveScenarioResult(scenarioId, pageKey, correct, points) {
    if (!uid()) return;
    const pts = points || 0;
    const existing = cachedScenarios.find(s => s.scenario_id === scenarioId);

    if (existing) {
      // Update attempts count
      const updates = { correct, attempts: existing.attempts + 1, answered_at: new Date().toISOString() };
      if (pts > 0) updates.points = pts;
      const { error } = await db()
        .from('scenario_results')
        .update(updates)
        .eq('id', existing.id);
      if (!error) {
        existing.correct = correct;
        existing.attempts += 1;
        if (pts > 0) existing.points = pts;
      }
    } else {
      const row = {
        user_id: uid(),
        scenario_id: scenarioId,
        page_key: pageKey,
        correct,
        attempts: 1,
        points: pts
      };
      const { data, error } = await db()
        .from('scenario_results')
        .insert(row)
        .select()
        .single();
      if (!error && data) cachedScenarios.push(data);
    }
  }

  // ── Leaderboard (Realtime + RPC) ───────────────────────────────────

  async function fetchLeaderboard() {
    const { data, error } = await db().rpc('get_leaderboard');
    if (error) { console.error('Leaderboard RPC error:', error); return []; }
    return data || [];
  }

  function subscribeToLeaderboard(callback) {
    return db()
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scenario_results' }, () => {
        callback();
      })
      .subscribe();
  }

  function getMyTotalXP() {
    if (!uid()) return 0;
    return cachedScenarios
      .filter(s => s.correct && s.points)
      .reduce((sum, s) => sum + (s.points || 0), 0);
  }

  // ── Progress / time tracking ──────────────────────────────────────────

  async function saveTimeSpent(encontroId, lessonSlug, seconds) {
    if (!uid() || seconds < 1) return;
    const existing = cachedProgress.find(
      p => p.encontro_id === encontroId && (p.lesson_slug || '') === (lessonSlug || '')
    );

    if (existing) {
      const newTime = (existing.time_spent_seconds || 0) + seconds;
      const { error } = await db()
        .from('student_progress')
        .update({ time_spent_seconds: newTime, last_accessed_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (!error) existing.time_spent_seconds = newTime;
    } else {
      const row = {
        user_id: uid(),
        encontro_id: encontroId,
        lesson_slug: lessonSlug || '',
        time_spent_seconds: seconds
      };
      const { data, error } = await db()
        .from('student_progress')
        .insert(row)
        .select()
        .single();
      if (!error && data) cachedProgress.push(data);
    }
  }

  // ── Completion tracking ───────────────────────────────────────────────

  function getCompletedEncontroCount() {
    // An encontro is "completed" if the user completed at least 1 scenario in it
    const encontroIds = new Set();
    cachedScenarios.forEach(s => {
      if (s.correct && s.page_key) {
        // Extract encontro id from page_key like "e1-fundacao"
        const match = s.page_key.match(/^e(\d+)/);
        if (match) encontroIds.add(parseInt(match[1]));
      }
    });
    return encontroIds.size;
  }

  function getScenariosByPage(pageKey) {
    return cachedScenarios.filter(s => s.page_key === pageKey);
  }

  // ── Psicometria (L2 cache — Supabase) ────────────────────────────────

  async function loadPsicometria() {
    if (!uid()) return null;
    const { data, error } = await db()
      .from('student_psicometria')
      .select('profile_data, source_text')
      .eq('user_id', uid())
      .single();
    if (error || !data) return null;
    return data;
  }

  async function savePsicometria(profileData, sourceText, fileName) {
    if (!uid()) return;
    const { error } = await db()
      .from('student_psicometria')
      .upsert({
        user_id: uid(),
        profile_data: profileData,
        source_text: sourceText || null,
        file_name: fileName || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (error) console.error('Save psicometria error:', error);
  }

  // ── Squad Type (Thinker / Maker) ─────────────────────────────────────

  let cachedSquadType = undefined; // undefined = not loaded, null = no data

  const MAKER_KEYWORDS = [
    'desenvolvimento', 'aplicacoes', 'automacao', 'implementacao',
    'codigo', 'deploy', 'build', 'maker', 'engenharia', 'tecnico',
    'ferramentas', 'sistemas', 'infraestrutura', 'operacional'
  ];

  const THINKER_KEYWORDS = [
    'consultoria', 'ideacao', 'criatividade', 'estrategia',
    'analise', 'planejamento', 'design', 'thinker', 'conceitual',
    'inovacao', 'visao', 'mentoria', 'lideranca', 'arquitetura'
  ];

  async function loadSquadType() {
    if (cachedSquadType !== undefined) return cachedSquadType;

    const psico = await loadPsicometria();
    if (!psico || !psico.profile_data) {
      cachedSquadType = null;
      return null;
    }

    const squad = psico.profile_data.recommendedSquad;
    if (!squad) { cachedSquadType = null; return null; }

    // Collect all text from squad fields
    const parts = [
      squad.domain?.name,
      squad.domain?.description,
      squad.purpose?.name,
      squad.purpose?.description
    ].filter(Boolean).join(' ').toLowerCase();

    if (!parts) { cachedSquadType = null; return null; }

    let makerScore = 0;
    let thinkerScore = 0;
    MAKER_KEYWORDS.forEach(kw => { if (parts.includes(kw)) makerScore++; });
    THINKER_KEYWORDS.forEach(kw => { if (parts.includes(kw)) thinkerScore++; });

    cachedSquadType = makerScore > thinkerScore ? 'Maker' : 'Thinker';
    return cachedSquadType;
  }

  // ── Business: Offer (student_offer) ──────────────────────────────────

  let cachedOffer = undefined;

  async function loadOffer() {
    if (cachedOffer !== undefined) return cachedOffer;
    if (!uid()) return null;
    const { data, error } = await db()
      .from('student_offer')
      .select('*')
      .eq('user_id', uid())
      .single();
    if (error || !data) { cachedOffer = null; return null; }
    cachedOffer = data;
    return cachedOffer;
  }

  const OFFER_ALLOWED_FIELDS = ['title', 'dream_outcome', 'unique_mechanism', 'ticket', 'delivery_level', 'guarantee', 'time_to_result', 'proofs'];

  async function saveOffer(fields) {
    if (!uid()) return null;
    const safe = { user_id: uid() };
    OFFER_ALLOWED_FIELDS.forEach(function(k) {
      if (fields.hasOwnProperty(k)) safe[k] = fields[k];
    });
    const { data, error } = await db()
      .from('student_offer')
      .upsert(safe, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) { console.error('Save offer error:', error); return null; }
    cachedOffer = data;
    return cachedOffer;
  }

  // ── Business: Pipeline (student_pipeline) ──────────────────────────

  let cachedPipeline = undefined;

  async function loadPipeline() {
    if (cachedPipeline !== undefined) return cachedPipeline;
    if (!uid()) return [];
    const { data, error } = await db()
      .from('student_pipeline')
      .select('*')
      .eq('user_id', uid())
      .order('column_id')
      .order('position');
    if (error) { console.error('Load pipeline error:', error); return []; }
    cachedPipeline = data || [];
    return cachedPipeline;
  }

  async function addPipelineLead(lead) {
    if (!uid()) return null;
    const maxPos = (cachedPipeline || [])
      .filter(l => l.column_id === (lead.column_id || 'spears'))
      .reduce((max, l) => Math.max(max, l.position), -1);
    const row = {
      user_id: uid(),
      lead_name: lead.lead_name,
      lead_handle: lead.lead_handle || null,
      lead_platform: lead.lead_platform || 'instagram',
      lead_bio: lead.lead_bio || null,
      lead_followers: lead.lead_followers || 0,
      column_id: lead.column_id || 'spears',
      position: maxPos + 1,
      suggested_message: lead.suggested_message || null
    };
    const { data, error } = await db()
      .from('student_pipeline')
      .insert(row)
      .select()
      .single();
    if (error) { console.error('Add pipeline lead error:', error); return null; }
    if (data && cachedPipeline) cachedPipeline.push(data);
    return data;
  }

  async function updatePipelineLead(id, fields) {
    if (!uid()) return null;
    const { data, error } = await db()
      .from('student_pipeline')
      .update(fields)
      .eq('id', id)
      .eq('user_id', uid())
      .select()
      .single();
    if (error) { console.error('Update pipeline lead error:', error); return null; }
    if (data && cachedPipeline) {
      const idx = cachedPipeline.findIndex(l => l.id === id);
      if (idx >= 0) cachedPipeline[idx] = data;
    }
    return data;
  }

  async function deletePipelineLead(id) {
    if (!uid()) return false;
    const { error } = await db()
      .from('student_pipeline')
      .delete()
      .eq('id', id)
      .eq('user_id', uid());
    if (error) { console.error('Delete pipeline lead error:', error); return false; }
    if (cachedPipeline) {
      cachedPipeline = cachedPipeline.filter(l => l.id !== id);
    }
    return true;
  }

  // ── Notes ─────────────────────────────────────────────────────────────

  let noteTimer = null;

  async function loadNote(encontroId, lessonSlug) {
    if (!uid()) return '';
    const { data, error } = await db()
      .from('student_notes')
      .select('content')
      .eq('user_id', uid())
      .eq('encontro_id', encontroId)
      .eq('lesson_slug', lessonSlug || '')
      .single();
    if (error || !data) return '';
    return data.content || '';
  }

  function saveNoteDebounced(encontroId, lessonSlug, content) {
    if (!uid()) return;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(async () => {
      const { error } = await db()
        .from('student_notes')
        .upsert({
          user_id: uid(),
          encontro_id: encontroId,
          lesson_slug: lessonSlug || '',
          content,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,encontro_id,lesson_slug' });
      if (error) console.error('Save note error:', error);
    }, 1500);
  }

  return {
    loadAll,
    loadProgress,
    loadScenarioResults,
    isScenarioCompleted,
    saveScenarioResult,
    saveTimeSpent,
    getCompletedEncontroCount,
    getScenariosByPage,
    loadNote,
    saveNoteDebounced,
    loadPsicometria,
    savePsicometria,
    loadSquadType,
    loadOffer,
    saveOffer,
    loadPipeline,
    addPipelineLead,
    updatePipelineLead,
    deletePipelineLead,
    fetchLeaderboard,
    subscribeToLeaderboard,
    getMyTotalXP
  };
})();
