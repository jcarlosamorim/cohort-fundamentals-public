/* ==========================================================================
   CALENDAR - Full page calendar with month grids
   Auto-unlock by date. Single source of truth: schedule.json
   Renders into #calendar-page when navigating to /calendario
   Supports T1 and T2 turmas with visual differentiation
   ========================================================================== */

const Calendar = (() => {
  let scheduleData = null;

  const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DAY_NAMES = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

  function getToday() {
    return new Date().toISOString().split('T')[0];
  }

  function computeStatus(dateStr) {
    const today = getToday();
    if (!dateStr) return 'locked';
    if (dateStr === today) return 'current';
    if (dateStr < today) return 'available';
    return 'locked';
  }

  async function init() {
    try {
      const res = await fetch('data/schedule.json');
      scheduleData = await res.json();
    } catch (err) {
      console.error('Failed to load schedule:', err);
    }
  }

  function render() {
    const slot = document.getElementById('calendar-page');
    if (!slot || !scheduleData) return;

    // Build event lookup maps — support multiple encontros per date
    const encontroMap = {};
    const psMap = {};

    scheduleData.encontros
      .filter(enc => enc && enc.date)
      .forEach(enc => {
        if (!encontroMap[enc.date]) encontroMap[enc.date] = [];
        encontroMap[enc.date].push(enc);
      });

    if (scheduleData.prontoSocorros) {
      scheduleData.prontoSocorros.forEach(ps => {
        ps.sessions.forEach(s => {
          psMap[s.date] = { encontroId: ps.encontroId, turma: ps.turma || 'T1' };
        });
      });
    }

    slot.innerHTML = '';

    // Month grids container
    const grids = document.createElement('div');
    grids.className = 'cal-months';

    const allDates = [...Object.keys(encontroMap), ...Object.keys(psMap)].sort();
    if (allDates.length === 0) return;

    const first = new Date(allDates[0] + 'T12:00:00');
    const last = new Date(allDates[allDates.length - 1] + 'T12:00:00');

    let y = first.getFullYear();
    let m = first.getMonth();
    const endY = last.getFullYear();
    const endM = last.getMonth();

    while (y < endY || (y === endY && m <= endM)) {
      renderMonth(grids, y, m, encontroMap, psMap);
      m++;
      if (m > 11) { m = 0; y++; }
    }

    slot.appendChild(grids);

    // Legend
    renderLegend(slot);

    // Upcoming events list
    renderUpcoming(slot, encontroMap, psMap);
  }

  function renderMonth(container, year, month, encontroMap, psMap) {
    const today = getToday();

    const wrapper = document.createElement('div');
    wrapper.className = 'cal-month';

    const header = document.createElement('div');
    header.className = 'cal-month__header';
    header.textContent = `${MONTH_NAMES[month]} ${year}`;
    wrapper.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'cal-grid';

    DAY_NAMES.forEach(d => {
      const hdr = document.createElement('div');
      hdr.className = 'cal-grid__hdr';
      hdr.textContent = d;
      grid.appendChild(hdr);
    });

    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-grid__empty';
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = 'cal-grid__day';

      const isToday = dateStr === today;
      const encs = encontroMap[dateStr] || [];
      const ps = psMap[dateStr];

      if (isToday) cell.classList.add('cal-grid__day--today');

      // Apply encontro styling based on turma
      if (encs.length > 0) {
        const turmas = [...new Set(encs.map(e => e.turma || 'T1'))];
        const hasT1 = turmas.includes('T1');
        const hasT2 = turmas.includes('T2');

        if (hasT1 && hasT2) {
          cell.classList.add('cal-grid__day--encontro-both');
        } else if (hasT2) {
          cell.classList.add('cal-grid__day--encontro-t2');
        } else {
          cell.classList.add('cal-grid__day--encontro');
        }

        const status = computeStatus(dateStr);
        if (status === 'current') cell.classList.add('cal-grid__day--current');
        if (status === 'locked') cell.classList.add('cal-grid__day--future');
        if (status === 'available' || status === 'current') {
          cell.style.cursor = 'pointer';
          cell.addEventListener('click', () => {
            Router.navigate(`/aula/${encs[0].id}`);
          });
        }
      }

      if (ps) {
        cell.classList.add('cal-grid__day--ps');
      }

      // Day number
      const num = document.createElement('span');
      num.className = 'cal-grid__num';
      num.textContent = d;
      cell.appendChild(num);

      // Event labels — show turma-aware labels
      encs.forEach(enc => {
        const turma = enc.turma || 'T1';
        const displayNum = enc.encontroNum || enc.id;
        const label = document.createElement('span');
        label.className = `cal-grid__label cal-grid__label--${turma.toLowerCase()}`;
        label.textContent = `${turma} E${displayNum}`;
        cell.appendChild(label);
      });

      if (ps) {
        const label = document.createElement('span');
        label.className = 'cal-grid__label cal-grid__label--ps';
        label.textContent = 'PS';
        cell.appendChild(label);
      }

      grid.appendChild(cell);
    }

    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  }

  function renderLegend(container) {
    const legend = document.createElement('div');
    legend.className = 'cal-legend';
    legend.innerHTML = `
      <span class="cal-legend__item">
        <span class="cal-legend__dot cal-legend__dot--t1"></span>
        T1 — Seg/Qui 18h
      </span>
      <span class="cal-legend__item">
        <span class="cal-legend__dot cal-legend__dot--t2"></span>
        T2 — Sab 09h/14h
      </span>
      <span class="cal-legend__item">
        <span class="cal-legend__dot cal-legend__dot--ps"></span>
        Pronto-Socorro (T1)
      </span>
      <span class="cal-legend__item">
        <span class="cal-legend__dot cal-legend__dot--today"></span>
        Hoje
      </span>`;
    container.appendChild(legend);
  }

  function renderUpcoming(container, encontroMap, psMap) {
    if (!scheduleData || !scheduleData.salas) return;

    const section = document.createElement('div');
    section.className = 'cal-upcoming';

    // Salas info
    section.innerHTML = `
      <div class="cal-upcoming__title">Salas do Pronto-Socorro</div>
      <div class="cal-upcoming__salas">
        ${scheduleData.salas.map(s => `
          <div class="cal-upcoming__sala">
            <span class="cal-upcoming__sala-name">${s.name}</span>
            <span class="cal-upcoming__sala-desc">${s.desc}</span>
          </div>`).join('')}
      </div>`;

    container.appendChild(section);
  }

  function getData() {
    return scheduleData;
  }

  function getEncontroStatus(encontroId) {
    if (!scheduleData) return 'locked';
    const enc = scheduleData.encontros.find(e => e.id === encontroId);
    if (!enc) return 'locked';
    return computeStatus(enc.date);
  }

  return { init, render, getData, getEncontroStatus, computeStatus };
})();
