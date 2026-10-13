/* ==========================================================================
   ROUTER - Hash-based SPA navigation
   Loads page partials into #content via fetch()
   Supports /aula/N overview pages rendered from schedule data
   ========================================================================== */

const Router = (() => {
  const contentEl = () => document.getElementById('content');
  const cache = {};
  let currentPath = null;
  let onNavigateCallbacks = [];
  let navData = null;
  let pageEnterTime = null;

  function getPath() {
    const hash = window.location.hash.slice(1) || '/aula/1';
    return hash.startsWith('/') ? hash : '/' + hash;
  }

  function pathToFile(path) {
    if (path === '/calendario') return 'pages/calendario.html';
    if (path === '/downloads') return 'pages/downloads.html';
    if (path === '/psicometria') return 'pages/psicometria.html';
    if (path === '/business') return 'pages/business.html';
    if (path === '/whatsapp') return 'pages/whatsapp-link.html';
    const match = path.match(/^\/aula\/(\d+)\/(.+)$/);
    if (match) return `pages/e${match[1]}-${match[2]}.html`;
    return null;
  }

  async function loadNavData() {
    if (navData) return navData;
    try {
      const res = await fetch('data/navigation.json');
      navData = await res.json();
    } catch (e) { navData = null; }
    return navData;
  }

  function flushTime() {
    if (!pageEnterTime || !currentPath) return;
    const seconds = Math.floor((Date.now() - pageEnterTime) / 1000);
    if (seconds < 1) return;
    // Extract encontro id and lesson slug from path
    const match = currentPath.match(/^\/aula\/(\d+)(?:\/(.+))?$/);
    if (match) {
      const encontroId = parseInt(match[1]);
      const lessonSlug = match[2] || '';
      Persistence.saveTimeSpent(encontroId, lessonSlug, seconds);
    }
    pageEnterTime = null;
  }

  async function loadPage(path) {
    flushTime();

    // Encontro overview: /aula/N (no lesson suffix)
    const overviewMatch = path.match(/^\/aula\/(\d+)$/);
    if (overviewMatch) {
      await renderOverview(parseInt(overviewMatch[1]));
      currentPath = path;
      pageEnterTime = Date.now();
      onNavigateCallbacks.forEach(cb => cb(path));
      return;
    }

    // Default route redirects to E1 overview
    if (path === '/' || path === '') {
      navigate('/aula/1');
      return;
    }

    const file = pathToFile(path);
    if (!file || !isSafePath(file)) {
      showError('Página não encontrada');
      return;
    }

    const el = contentEl();
    if (!el) return;

    el.style.opacity = '0.5';

    try {
      let html;
      if (cache[file]) {
        html = cache[file];
      } else {
        const res = await fetch(file);
        if (!res.ok) {
          showNotReady(path);
          return;
        }
        html = await res.text();
        cache[file] = html;
      }

      el.innerHTML = html;
      el.style.opacity = '1';
      el.scrollTop = 0;
      currentPath = path;
      pageEnterTime = Date.now();

      el.querySelectorAll('script').forEach(old => {
        const s = document.createElement('script');
        if (old.src) {
          s.src = old.src;
        } else {
          s.textContent = old.textContent;
        }
        old.parentNode.replaceChild(s, old);
      });

      el.focus({ preventScroll: true });
      onNavigateCallbacks.forEach(cb => cb(path));
    } catch (err) {
      showError('Erro ao carregar página');
    }
  }

  function isSafePath(file) {
    return /^pages\/[a-z0-9._-]+\.html$/.test(file);
  }

  async function renderOverview(encontroId) {
    const el = contentEl();
    if (!el) return;

    const schedule = Calendar.getData();
    if (!schedule) { showError('Dados não carregados'); return; }

    const enc = schedule.encontros.find(e => e.id === encontroId);
    if (!enc) { showError('Encontro não encontrado'); return; }

    const nav = await loadNavData();
    const navEnc = nav ? nav.encontros.find(e => e.id === encontroId) : null;
    const lessons = navEnc && navEnc.lessons ? navEnc.lessons : [];

    const status = Calendar.computeStatus(enc.date);
    const isAvailable = status === 'available' || status === 'current';
    const [y, m, d] = enc.date.split('-');
    const dateLabel = `${d}/${m}/${y}`;

    const statusBadge = isAvailable
      ? '<span class="ov-status ov-status--available">Disponível</span>'
      : '<span class="ov-status ov-status--upcoming">Em breve</span>';

    const objectivesHtml = enc.objectives.map(obj =>
      `<li class="ov-objective">
        <svg class="ov-objective__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <span>${obj}</span>
      </li>`
    ).join('');

    const blocosHtml = enc.blocos.map((bloco, i) =>
      `<div class="ov-bloco">
        <span class="ov-bloco__num">${i + 1}</span>
        <span class="ov-bloco__title">${bloco}</span>
      </div>`
    ).join('');

    const lessonsHtml = lessons.length > 0 && isAvailable
      ? `<div class="ov-lessons">
          <div class="section-label">Aulas disponíveis</div>
          <div class="ov-lessons__grid">
            ${lessons.map(l => {
              const route = lessonPageToRoute(l.page);
              return `<a class="ov-lesson-link" href="#${route}">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>${l.label}</span>
              </a>`;
            }).join('')}
          </div>
        </div>`
      : '';

    el.style.opacity = '1';
    el.scrollTop = 0;
    el.innerHTML = `
      <header class="hero">
        <div class="hero-badge">Encontro ${enc.id} &middot; ${dateLabel} &middot; ${enc.time}h</div>
        <h1>${enc.title} — <span>${enc.subtitle}</span></h1>
        <p class="ov-bigidea">"${enc.big_idea}"</p>
        ${statusBadge}
      </header>

      <div class="content">
        <div class="ov-section">
          <div class="section-label">O que você vai aprender</div>
          <ul class="ov-objectives">${objectivesHtml}</ul>
        </div>

        <div class="ov-section">
          <div class="section-label">Programação da aula</div>
          <div class="ov-blocos">${blocosHtml}</div>
        </div>

        <div class="insight-card">
          <h4>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Entregável
          </h4>
          <p>${enc.deliverable}</p>
        </div>

        ${lessonsHtml}

        <div class="ov-duration">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${enc.duration} minutos
        </div>
      </div>`;
  }

  function lessonPageToRoute(pagePath) {
    const match = pagePath.match(/pages\/e(\d+)-(.+)\.html$/);
    if (match) return `/aula/${match[1]}/${match[2]}`;
    return '/';
  }

  function showError(msg) {
    const el = contentEl();
    if (!el) return;
    el.style.opacity = '1';
    el.innerHTML = `
      <div class="content" style="text-align:center; padding-top:4rem;">
        <h2 style="color:var(--color-text-secondary)">${msg}</h2>
        <p style="color:var(--color-text-muted)">Tente navegar pelo menu lateral.</p>
      </div>`;
  }

  function showNotReady(path) {
    const el = contentEl();
    if (!el) return;
    el.style.opacity = '1';
    el.innerHTML = `
      <div class="content" style="text-align:center; padding-top:4rem;">
        <div style="font-size:3rem; margin-bottom:1rem;">&#128274;</div>
        <h2 style="color:var(--color-text-secondary)">Conteúdo em breve</h2>
        <p style="color:var(--color-text-muted)">Esta aula será liberada no encontro correspondente.</p>
      </div>`;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function current() {
    return currentPath;
  }

  function onNavigate(cb) {
    onNavigateCallbacks.push(cb);
  }

  function init() {
    window.addEventListener('hashchange', () => loadPage(getPath()));
    window.addEventListener('beforeunload', () => flushTime());
    loadPage(getPath());
  }

  return { init, navigate, current, onNavigate };
})();
