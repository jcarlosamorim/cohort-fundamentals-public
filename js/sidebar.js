/* ==========================================================================
   SIDEBAR - Minimal Apple-style: progress bar + clean list
   Status computed from schedule.json via Calendar module (auto-unlock by date)
   All encontros clickable → navigate to overview page
   ========================================================================== */

const Sidebar = (() => {
  let navData = null;
  let sidebarEl = null;

  async function init() {
    sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;

    try {
      const res = await fetch('data/navigation.json');
      navData = await res.json();
      await render();
      setupMobile();
      Router.onNavigate(path => setActiveByPath(path));
    } catch (err) {
      console.error('Failed to load navigation:', err);
    }
  }

  async function render() {
    // Count progress: user completion from Supabase
    const completed = Persistence?.getCompletedEncontroCount?.() || 0;
    const total = navData.encontros.length;

    // Header + progress
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    const pct = (completed / total) * 100;
    header.innerHTML = `
      <div class="sidebar-header__title">${navData.course.title}</div>
      <div class="sidebar-header__progress">
        <div class="sidebar-header__bar">
          <div class="sidebar-header__fill" style="width:${pct}%"></div>
        </div>
        <span class="sidebar-header__count">${completed}/${total}</span>
      </div>`;

    // Squad badge (Thinker / Maker)
    const squadType = await Persistence?.loadSquadType?.();
    if (squadType) {
      const badge = document.createElement('div');
      const typeLower = squadType.toLowerCase();
      badge.className = `sidebar-squad-badge sidebar-squad-badge--${typeLower}`;

      const icon = typeLower === 'thinker'
        ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5C8.35 12.26 8.82 13.02 9 14"/></svg>'
        : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';

      badge.innerHTML = icon + `<span>${squadType.toUpperCase()}</span>`;

      // Insert between title and progress bar
      const progressEl = header.querySelector('.sidebar-header__progress');
      header.insertBefore(badge, progressEl);
    }

    // Calendario button
    const calBtn = document.createElement('button');
    calBtn.className = 'sidebar-cal-btn';
    calBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Calendario';
    calBtn.addEventListener('click', () => {
      Router.navigate('/calendario');
      closeMobile();
    });

    // Aulas Gravadas button (dropdown with Turma 1 / Turma 2)
    const gravWrap = document.createElement('div');
    gravWrap.className = 'sidebar-grav-wrap';

    const gravBtn = document.createElement('button');
    gravBtn.className = 'sidebar-ext-btn';
    gravBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Aulas Gravadas <svg class="sidebar-grav-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    const gravDrop = document.createElement('div');
    gravDrop.className = 'sidebar-grav-dropdown';
    gravDrop.innerHTML = ''
      + '<a class="sidebar-grav-option" href="https://membros.academialendaria.ai/m/lessons/cohort-aios-fundamentals-001" target="_blank" rel="noopener noreferrer">'
      + '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Turma 1</a>'
      + '<a class="sidebar-grav-option" href="https://membros.academialendaria.ai/m/lessons/cohort-aios-fundamentals-002" target="_blank" rel="noopener noreferrer">'
      + '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Turma 2</a>';

    gravBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      gravWrap.classList.toggle('sidebar-grav-wrap--open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      gravWrap.classList.remove('sidebar-grav-wrap--open');
    });

    gravWrap.appendChild(gravBtn);
    gravWrap.appendChild(gravDrop);

    // Downloads button
    const dlBtn = document.createElement('button');
    dlBtn.className = 'sidebar-dl-btn';
    dlBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Downloads';
    dlBtn.addEventListener('click', () => {
      Router.navigate('/downloads');
      closeMobile();
    });

    // Psicometria button
    const psicoBtn = document.createElement('button');
    psicoBtn.className = 'sidebar-psico-btn';
    psicoBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l7-7"/><circle cx="12" cy="12" r="3"/></svg> Psicometria';
    psicoBtn.addEventListener('click', () => {
      Router.navigate('/psicometria');
      closeMobile();
    });

    // Business button
    const bizBtn = document.createElement('button');
    bizBtn.className = 'sidebar-biz-btn';
    bizBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> Business';
    bizBtn.addEventListener('click', () => {
      Router.navigate('/business');
      closeMobile();
    });

    // WhatsApp link button
    const waBtn = document.createElement('button');
    waBtn.className = 'sidebar-wa-btn';
    waBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> WhatsApp';
    waBtn.addEventListener('click', () => {
      Router.navigate('/whatsapp');
      closeMobile();
    });

    // Buttons row
    const btnsRow = document.createElement('div');
    btnsRow.className = 'sidebar-btns';
    btnsRow.appendChild(calBtn);
    btnsRow.appendChild(dlBtn);
    btnsRow.appendChild(gravWrap);
    btnsRow.appendChild(psicoBtn);
    btnsRow.appendChild(bizBtn);
    btnsRow.appendChild(waBtn);

    // Nav list
    const nav = document.createElement('nav');
    nav.className = 'sidebar-nav';

    // Build date lookup from schedule
    const scheduleData = Calendar.getData();
    const dateMap = {};
    if (scheduleData && scheduleData.encontros) {
      scheduleData.encontros.forEach(e => {
        if (e.date) {
          const [y, m, d] = e.date.split('-');
          dateMap[e.id] = `${d}/${m}`;
        }
      });
    }

    navData.encontros.forEach(enc => {
      const status = Calendar.getEncontroStatus(enc.id);
      const isAvailable = status === 'available' || status === 'current';
      const hasLessons = enc.lessons && enc.lessons.length > 0;
      const dateLabel = dateMap[enc.id] || '';

      const item = document.createElement('div');
      item.className = 'sidebar-encontro';
      if (!isAvailable) item.classList.add('sidebar-encontro--locked');
      if (status === 'current') item.classList.add('sidebar-encontro--current');

      const row = document.createElement('button');
      row.className = 'sidebar-encontro__toggle';
      row.innerHTML = `
        <span class="sidebar-encontro__badge">E${enc.id}</span>
        <span class="sidebar-encontro__title">${enc.title}</span>
        <span class="sidebar-encontro__date">${dateLabel}</span>
        ${hasLessons && isAvailable ? '<span class="sidebar-encontro__arrow">&#9656;</span>' : ''}`;

      // All encontros navigate to overview on click
      row.addEventListener('click', () => {
        Router.navigate('/aula/' + enc.id);
        closeMobile();
        // Also toggle expansion if has lessons
        if (hasLessons && isAvailable) {
          item.classList.toggle('sidebar-encontro--expanded');
        }
      });

      item.appendChild(row);

      if (hasLessons) {
        const lessons = document.createElement('div');
        lessons.className = 'sidebar-encontro__lessons';

        enc.lessons.forEach(lesson => {
          const a = document.createElement('a');
          a.className = 'sidebar-lesson';
          a.dataset.page = lesson.page;
          a.textContent = lesson.label;

          const route = pageToRoute(lesson.page);
          a.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            Router.navigate(route);
            closeMobile();
          });

          lessons.appendChild(a);
        });

        item.appendChild(lessons);

        if (isAvailable) {
          item.classList.add('sidebar-encontro--expanded');
        }
      }

      nav.appendChild(item);
    });

    sidebarEl.innerHTML = '';
    sidebarEl.appendChild(header);
    sidebarEl.appendChild(btnsRow);
    sidebarEl.appendChild(nav);

    // Theme toggle at the bottom of sidebar
    if (typeof Theme !== 'undefined') {
      var themeToggle = document.createElement('div');
      themeToggle.className = 'sidebar__theme-toggle';
      themeToggle.id = 'theme-toggle';
      themeToggle.setAttribute('role', 'button');
      themeToggle.setAttribute('tabindex', '0');
      themeToggle.setAttribute('aria-label', 'Alternar tema');

      function updateThemeToggle() {
        var mode = Theme.current();
        var icon = '';
        if (mode === 'light') {
          // Sun icon
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
        } else if (mode === 'dark') {
          // Moon icon
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        } else {
          // Auto icon (monitor)
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
        }
        themeToggle.innerHTML = icon + '<span>Tema: ' + Theme.label() + '</span>';
      }

      updateThemeToggle();

      themeToggle.addEventListener('click', function() {
        Theme.toggle();
        updateThemeToggle();
      });

      themeToggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          Theme.toggle();
          updateThemeToggle();
        }
      });

      sidebarEl.appendChild(themeToggle);
    }

    // User badge at bottom (skip if no auth)
    if (typeof Auth !== 'undefined' && Auth.getUser?.()) AuthUI.renderUserBadge(sidebarEl);
  }

  function pageToRoute(pagePath) {
    if (pagePath === 'pages/home.html') return '/';
    if (pagePath === 'pages/calendario.html') return '/calendario';
    const match = pagePath.match(/pages\/e(\d+)-(.+)\.html$/);
    if (match) return `/aula/${match[1]}/${match[2]}`;
    return '/';
  }

  function setActiveByPath(path) {
    if (!sidebarEl) return;

    // Highlight lessons
    const allLessons = sidebarEl.querySelectorAll('.sidebar-lesson');
    allLessons.forEach(el => {
      const route = pageToRoute(el.dataset.page);
      el.classList.toggle('sidebar-lesson--active', route === path);

      if (route === path) {
        const enc = el.closest('.sidebar-encontro');
        if (enc) enc.classList.add('sidebar-encontro--expanded');
      }
    });

    // Highlight encontro overview
    const overviewMatch = path.match(/^\/aula\/(\d+)$/);
    const encontros = sidebarEl.querySelectorAll('.sidebar-encontro');
    encontros.forEach((el, i) => {
      const encId = i + 1;
      const isOverview = overviewMatch && parseInt(overviewMatch[1]) === encId;
      el.classList.toggle('sidebar-encontro--active-overview', isOverview);
    });

    // Highlight calendar button
    const calBtn = sidebarEl.querySelector('.sidebar-cal-btn');
    if (calBtn) {
      calBtn.classList.toggle('sidebar-cal-btn--active', path === '/calendario');
    }

    // Highlight downloads button
    const dlBtn = sidebarEl.querySelector('.sidebar-dl-btn');
    if (dlBtn) {
      dlBtn.classList.toggle('sidebar-dl-btn--active', path === '/downloads');
    }

    // Highlight psicometria button
    const psicoBtn = sidebarEl.querySelector('.sidebar-psico-btn');
    if (psicoBtn) {
      psicoBtn.classList.toggle('sidebar-psico-btn--active', path === '/psicometria');
    }

    // Highlight business button
    const bizBtnEl = sidebarEl.querySelector('.sidebar-biz-btn');
    if (bizBtnEl) {
      bizBtnEl.classList.toggle('sidebar-biz-btn--active', path === '/business');
    }

    // Highlight whatsapp button
    const waBtnEl = sidebarEl.querySelector('.sidebar-wa-btn');
    if (waBtnEl) {
      waBtnEl.classList.toggle('sidebar-wa-btn--active', path === '/whatsapp');
    }
  }

  function setupMobile() {
    const hamburger = document.getElementById('hamburger');
    const overlay = document.getElementById('overlay');
    if (hamburger) {
      hamburger.addEventListener('click', () => {
        sidebarEl.classList.toggle('app__sidebar--open');
        overlay.classList.toggle('app__overlay--visible');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', closeMobile);
    }
  }

  function closeMobile() {
    if (!sidebarEl) return;
    sidebarEl.classList.remove('app__sidebar--open');
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('app__overlay--visible');
  }

  return { init };
})();
