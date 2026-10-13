/* ==========================================================================
   LEADERBOARD - Real-time XP ranking widget
   IIFE pattern matching Calendar/Router/Sidebar modules
   Depends on: persistence.js (fetchLeaderboard, subscribeToLeaderboard, getMyTotalXP)
   ========================================================================== */

const Leaderboard = (() => {
  let expanded = false;
  let widgetEl = null;
  let panelEl = null;
  let refreshTimer = null;
  let channel = null;

  function init() {
    if (!Auth.getUser()) return;
    buildWidget();
    refresh();
    channel = Persistence.subscribeToLeaderboard(debounceRefresh);
  }

  function debounceRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 500);
  }

  async function refresh() {
    const rows = await Persistence.fetchLeaderboard();
    const myXP = Persistence.getMyTotalXP();
    updateWidget(myXP);
    updatePanel(rows, myXP);
  }

  // ── Calculate points for a scenario ────────────────────────────────

  function calculatePoints(scenario, attempts) {
    const base = scenario.points || 0;
    if (base === 0) return 0;
    return attempts === 0 ? Math.floor(base * 1.5) : base;
  }

  // ── Build DOM ──────────────────────────────────────────────────────

  function buildWidget() {
    widgetEl = document.createElement('div');
    widgetEl.className = 'lb-widget';
    widgetEl.innerHTML = `
      <div class="lb-widget__trigger" title="Ranking">
        <svg class="lb-widget__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
        <span class="lb-widget__xp">0 XP</span>
      </div>`;

    panelEl = document.createElement('div');
    panelEl.className = 'lb-panel';
    panelEl.innerHTML = `
      <div class="lb-panel__header">
        <div class="lb-panel__title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
          </svg>
          Ranking
        </div>
        <div class="lb-panel__live">
          <span class="lb-panel__live-dot"></span> ao vivo
        </div>
      </div>
      <div class="lb-panel__list"></div>
      <div class="lb-panel__me"></div>`;

    widgetEl.appendChild(panelEl);
    document.body.appendChild(widgetEl);

    widgetEl.querySelector('.lb-widget__trigger').addEventListener('click', toggle);
  }

  function toggle() {
    expanded = !expanded;
    widgetEl.classList.toggle('lb-widget--expanded', expanded);
    if (expanded) refresh();
  }

  // ── Update renders ─────────────────────────────────────────────────

  function updateWidget(myXP) {
    if (!widgetEl) return;
    widgetEl.querySelector('.lb-widget__xp').textContent = `${myXP} XP`;
  }

  function updatePanel(rows, myXP) {
    if (!panelEl) return;
    const listEl = panelEl.querySelector('.lb-panel__list');
    const meEl = panelEl.querySelector('.lb-panel__me');

    if (!rows || rows.length === 0) {
      listEl.innerHTML = '<div class="lb-empty">Nenhum resultado ainda</div>';
      meEl.innerHTML = '';
      return;
    }

    const top10 = rows.slice(0, 10);
    listEl.innerHTML = top10.map((r, i) => rowHTML(r, i)).join('');

    // Show user's position if not in top 10
    const myIdx = rows.findIndex(r => r.is_me);
    if (myIdx >= 10) {
      meEl.innerHTML = `<div class="lb-row lb-row--me">
        <span class="lb-row__rank">${myIdx + 1}</span>
        ${avatarHTML(rows[myIdx])}
        <span class="lb-row__name">${rows[myIdx].display_name || 'Você'}</span>
        <span class="lb-row__xp">${rows[myIdx].total_xp} XP</span>
      </div>`;
    } else if (myIdx >= 0) {
      meEl.innerHTML = '';
    } else {
      meEl.innerHTML = `<div class="lb-row lb-row--me">
        <span class="lb-row__rank">--</span>
        ${avatarHTML({ display_name: 'Você' })}
        <span class="lb-row__name">Você</span>
        <span class="lb-row__xp">${myXP} XP</span>
      </div>`;
    }
  }

  function rowHTML(r, idx) {
    const medals = ['lb-medal--gold', 'lb-medal--silver', 'lb-medal--bronze'];
    const medalClass = idx < 3 ? medals[idx] : '';
    const isMe = !!r.is_me;
    return `<div class="lb-row ${isMe ? 'lb-row--me' : ''}">
      <span class="lb-row__rank ${medalClass}">${idx + 1}</span>
      ${avatarHTML(r)}
      <span class="lb-row__name">${displayName(r)}${isMe ? ' (você)' : ''}</span>
      <span class="lb-row__xp">${r.total_xp} XP</span>
    </div>`;
  }

  function avatarHTML(r) {
    const name = displayName(r);
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const hue = hashToHue(name);
    return `<span class="lb-avatar" style="background:hsl(${hue},60%,35%)">${initials}</span>`;
  }

  function displayName(r) {
    if (r.display_name) return r.display_name;
    if (r.email) {
      const prefix = r.email.split('@')[0];
      if (prefix.length <= 2) return prefix + '***';
      return prefix.slice(0, 2) + '***';
    }
    return 'Aluno';
  }

  function hashToHue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return Math.abs(h) % 360;
  }

  // ── XP Toast (called from Gamification) ────────────────────────────

  function showXPToast(pts) {
    if (!pts || pts <= 0) return;
    const toast = document.createElement('div');
    toast.className = 'xp-toast';
    const bonus = pts > 100 ? ' (bonus!)' : '';
    toast.textContent = `+${pts} XP${bonus}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('xp-toast--visible'));
    setTimeout(() => {
      toast.classList.add('xp-toast--fade');
      setTimeout(() => toast.remove(), 400);
    }, 1800);
  }

  return { init, refresh, calculatePoints, showXPToast };
})();
