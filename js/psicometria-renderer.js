/**
 * PsicoRenderer — Renders psychometric data into dashboard DOM
 * All render functions are defensive against missing/undefined data
 */
var PsicoRenderer = (function() {
  'use strict';

  var ACTION_COLORS = ['pink', 'purple', 'gold', 'green', 'info'];
  var COLOR_MAP = {
    pink: 'var(--color-pink)', gold: 'var(--color-accent-gold)',
    purple: 'var(--color-accent-purple)', green: 'var(--color-accent-green)'
  };

  function render(data) {
    if (!data || !data.profile) { console.warn('PsicoRenderer: dados ausentes ou sem profile'); return; }
    // Show dashboard FIRST so chart canvases have real dimensions
    showDashboard(data);
    try { renderProfile(data); } catch(e) { console.warn('render profile:', e); }
    try { renderZones(data); } catch(e) { console.warn('render zones:', e); }
    try { renderTalents(data); } catch(e) { console.warn('render talents:', e); }
    try { renderKolbe(data); } catch(e) { console.warn('render kolbe:', e); }
    try { renderHormozi(data); } catch(e) { console.warn('render hormozi:', e); }
    try { renderProfiles(data); } catch(e) { console.warn('render profiles:', e); }
    try { renderSullivan(data); } catch(e) { console.warn('render sullivan:', e); }
    try { renderConvergence(data); } catch(e) { console.warn('render convergence:', e); }
    try { renderTime(data); } catch(e) { console.warn('render time:', e); }
    try { renderRecommendation(data); } catch(e) { console.warn('render recommendation:', e); }
    try { renderActionPlan(data); } catch(e) { console.warn('render actionPlan:', e); }
    try { renderSquad(data); } catch(e) { console.warn('render squad:', e); }
  }

  function renderProfile(d) {
    var p = d.profile || {};
    setText('psico-profile-initials', p.initials || '');
    setText('psico-profile-name', p.name || '');
    setHtml('psico-profile-zone', 'Zona Atual: <strong style="color:var(--color-accent-gold)">' + esc(p.currentZone || '') + '</strong>' + (p.zoneTransition ? ' (' + esc(p.zoneTransition) + ')' : ''));
    var tags = document.getElementById('psico-profile-tags');
    if (tags && p.tags && p.tags.length) {
      var colors = ['pink', 'purple', 'gold', 'green'];
      tags.innerHTML = p.tags.map(function(t, i) {
        return '<span class="psico-tag psico-tag--' + colors[i % 4] + '">' + esc(t) + '</span>';
      }).join('');
    }
  }

  function renderZones(d) {
    var z = d.zones || {};
    setBar('genialidade', z.genialidade || 0, '--color-pink');
    setBar('excelencia', z.excelencia || 0, '--color-accent-gold');
    setBar('competencia', z.competencia || 0, '--color-accent-purple');
    setBar('incompetencia', z.incompetencia || 0, '--color-text-muted');
    if (d.zonesReading) setHtml('psico-reading-zones', d.zonesReading);
  }

  function renderTalents(d) {
    var t = d.talents || {};
    if (t.reading) setHtml('psico-reading-talents', t.reading);
    if (t.labels && t.scores) {
      initChartWhenReady(function() {
        makeRadar('chart-talentos', t.labels, t.scores, '#EC4899');
      });
    }
  }

  function renderKolbe(d) {
    var k = d.kolbe || {};
    var items = [
      { id: 'investigador', val: k.investigador || 0, color: '--color-pink' },
      { id: 'seguimento', val: k.seguimento || 0, color: '--color-accent-purple-light' },
      { id: 'iniciorapido', val: k.inicioRapido || 0, color: '--color-accent-gold' },
      { id: 'implementador', val: k.implementador || 0, color: '--color-accent-green' }
    ];
    items.forEach(function(it) {
      var el = document.getElementById('psico-kolbe-' + it.id);
      if (el) el.textContent = it.val;
      setBar('kolbe-' + it.id, it.val * 10, it.color, '/10');
    });
    if (k.reading) setHtml('psico-reading-kolbe', k.reading);
  }

  function renderHormozi(d) {
    var h = d.hormozi || {};
    setText('psico-hormozi-score', h.score != null ? h.score.toFixed(1) : '—');
    setBar('hormozi-resultado', (h.resultadoSonhado || 0) * 10, '--color-accent-green', '/10');
    setBar('hormozi-probabilidade', (h.probabilidade || 0) * 10, '--color-accent-gold', '/10');
    setBar('hormozi-tempo', (h.tempoEspera || 0) * 10, '--color-danger', '/10');
    setBar('hormozi-esforco', (h.esforco || 0) * 10, '--color-warning', '/10');
    if (h.reading) setHtml('psico-reading-hormozi', h.reading);
  }

  function renderProfiles(d) {
    var w = d.wealthProfile || {};
    var f = d.fascinationProfile || {};
    setText('psico-wealth-name', w.name || '');
    setText('psico-wealth-desc', w.description || '');
    setText('psico-fascination-name', f.name || '');
    setText('psico-fascination-archetype', f.archetype || '');
    setText('psico-fascination-desc', f.description || '');
    if (d.profilesReading) setHtml('psico-reading-profiles', d.profilesReading);
  }

  function renderSullivan(d) {
    var u = d.uniqueAbility || {};
    if (u.description) setHtml('psico-sullivan-desc', u.description);
    setText('psico-sullivan-alignment', (u.alignment != null ? u.alignment : '—') + '%');
    setText('psico-sullivan-time', (u.timeInZone != null ? u.timeInZone : '—') + '%');
    setText('psico-sullivan-potential', (u.potential != null ? u.potential : '—') + '%');
    if (u.reading) setHtml('psico-reading-sullivan', u.reading);
  }

  function renderConvergence(d) {
    var c = d.convergence || {};
    var list = document.getElementById('psico-convergence-list');
    if (list && c.insights && c.insights.length) {
      list.innerHTML = c.insights.map(function(ins) {
        return '<li><span class="psico-converge__dot" style="background:' + (COLOR_MAP[ins.color] || 'var(--color-pink)') + '"></span><span>' + (ins.text || '') + '</span></li>';
      }).join('');
    }
    if (c.reading) setHtml('psico-reading-convergence', c.reading);
    if (c.labels && c.current && c.potential) {
      initChartWhenReady(function() {
        makeConvergenceRadar('chart-convergencia', c.labels, c.current, c.potential);
      });
    }
  }

  function renderTime(d) {
    var t = d.timeDistribution || {};
    if (t.reading) setHtml('psico-reading-tempo', t.reading);
    if (t.current && t.target) {
      initChartWhenReady(function() {
        makeTimeBar('chart-tempo', t.current, t.target);
      });
    }
  }

  function renderRecommendation(d) { if (d.recommendation) setHtml('psico-recommendation', d.recommendation); }

  function renderActionPlan(d) {
    var ap = d.actionPlan;
    if (!ap) return;
    var container = document.getElementById('psico-action-plan-body');
    if (!container) return;
    var html = '';
    var groups = [
      { label: 'Esta semana', items: ap.thisWeek, cls: 'pink' },
      { label: 'Pr\u00f3ximas 2 semanas', items: ap.nextTwoWeeks, cls: 'gold' },
      { label: 'Pr\u00f3ximo m\u00eas', items: ap.nextMonth, cls: 'purple' }
    ];
    groups.forEach(function(g) {
      if (!g.items || !g.items.length) return;
      g.items.forEach(function(item, i) {
        html += '<tr class="psico-ap-row">';
        if (i === 0) html += '<td class="psico-ap-timeframe psico-ap-timeframe--' + g.cls + '" rowspan="' + g.items.length + '">' + esc(g.label) + '</td>';
        html += '<td class="psico-ap-check"><input type="checkbox" class="psico-ap-checkbox"></td>';
        html += '<td class="psico-ap-action">' + esc(item) + '</td>';
        html += '</tr>';
      });
    });
    container.innerHTML = html;
    var doNotEl = document.getElementById('psico-donot-list');
    if (doNotEl && ap.doNot && ap.doNot.length) {
      doNotEl.innerHTML = ap.doNot.map(function(item) {
        return '<li>' + esc(item) + '</li>';
      }).join('');
    }
  }

  function renderSquad(d) {
    var sq = d.recommendedSquad;
    if (!sq) return;
    var fields = [
      { id: 'psico-squad-domain-name', val: sq.domain && sq.domain.name },
      { id: 'psico-squad-domain-desc', val: sq.domain && sq.domain.description },
      { id: 'psico-squad-purpose-name', val: sq.purpose && sq.purpose.name },
      { id: 'psico-squad-purpose-desc', val: sq.purpose && sq.purpose.description },
      { id: 'psico-squad-target-name', val: sq.targetUser && sq.targetUser.name },
      { id: 'psico-squad-target-desc', val: sq.targetUser && sq.targetUser.description },
      { id: 'psico-squad-mode', val: sq.executionMode }
    ];
    fields.forEach(function(f) { setText(f.id, f.val || ''); });
  }

  function showDashboard(d) {
    var up = document.getElementById('psico-upload');
    var db = document.getElementById('psico-dashboard');
    if (up) up.style.display = 'none';
    if (db) db.style.display = '';
    var fname = document.getElementById('psico-done-file');
    if (fname && d.profile) fname.textContent = (d.profile.name || 'Analise') + ' \u00b7 Claude Sonnet 4.6';
  }

  /* --- Chart helpers --- */
  var _chartCallbacks = [];
  var _chartLoading = false;

  function initChartWhenReady(fn) {
    if (typeof Chart !== 'undefined') {
      // Defer to next frame so browser has time to layout the dashboard
      // after showDashboard() sets display:'' — avoids 0-height chart containers
      requestAnimationFrame(fn);
      return;
    }
    _chartCallbacks.push(fn);
    if (_chartLoading) return; // already loading, fn queued
    _chartLoading = true;
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
    s.onload = function() {
      _chartLoading = false;
      var cbs = _chartCallbacks.slice();
      _chartCallbacks = [];
      cbs.forEach(function(cb) { try { cb(); } catch(e) { console.warn('Chart cb error:', e); } });
    };
    s.onerror = function() { _chartLoading = false; console.warn('Failed to load Chart.js'); };
    document.head.appendChild(s);
  }

  function destroyOld(id) {
    var cv = document.getElementById(id);
    if (cv && cv._chart) { cv._chart.destroy(); cv._chart = null; }
    return cv;
  }

  function makeRadar(id, labels, data, color) {
    var cv = destroyOld(id); if (!cv) return;
    cv._chart = new Chart(cv.getContext('2d'), {
      type: 'radar',
      data: { labels: labels, datasets: [{ label: 'Intensidade', data: data, backgroundColor: 'rgba(236,72,153,0.15)', borderColor: color, borderWidth: 2, pointBackgroundColor: color, pointRadius: 4 }] },
      options: radarOpts(false)
    });
  }

  function makeConvergenceRadar(id, labels, current, potential) {
    var cv = destroyOld(id); if (!cv) return;
    cv._chart = new Chart(cv.getContext('2d'), {
      type: 'radar',
      data: { labels: labels, datasets: [
        { label: 'Atual', data: current, backgroundColor: 'rgba(236,72,153,0.12)', borderColor: '#EC4899', borderWidth: 2, pointBackgroundColor: '#EC4899', pointRadius: 3 },
        { label: 'Potencial', data: potential, backgroundColor: 'rgba(209,255,0,0.08)', borderColor: '#D1FF00', borderWidth: 1.5, borderDash: [4,4], pointBackgroundColor: '#D1FF00', pointRadius: 3 }
      ]},
      options: radarOpts(true)
    });
  }

  function makeTimeBar(id, current, target) {
    var cv = destroyOld(id); if (!cv) return;
    var cur = current || {}; var tgt = target || {};
    cv._chart = new Chart(cv.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Atual', 'Meta 90 dias'],
        datasets: [
          { label: 'Genialidade', data: [cur.genialidade || 0, tgt.genialidade || 0], backgroundColor: '#EC4899' },
          { label: 'Excel\u00eancia', data: [cur.excelencia || 0, tgt.excelencia || 0], backgroundColor: '#D1FF00' },
          { label: 'Compet\u00eancia', data: [cur.competencia || 0, tgt.competencia || 0], backgroundColor: '#0099FF' },
          { label: 'Incompet\u00eancia', data: [cur.incompetencia || 0, tgt.incompetencia || 0], backgroundColor: '#6B7280' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { labels: { color: '#A3A3A3', font: { size: 10, family: 'Inter' }, boxWidth: 10 } } },
        scales: {
          x: { stacked: true, max: 100, ticks: { color: '#6B7280', callback: function(v) { return v + '%'; } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { stacked: true, ticks: { color: '#A3A3A3', font: { size: 11, family: 'Inter', weight: 600 } }, grid: { display: false } }
        }
      }
    });
  }

  function radarOpts(legend) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: legend ? { labels: { color: '#A3A3A3', font: { size: 10, family: 'Inter' }, boxWidth: 12 } } : { display: false } },
      scales: { r: { beginAtZero: true, max: 10, ticks: { display: false, stepSize: 2 }, grid: { color: 'rgba(255,255,255,0.06)' }, angleLines: { color: 'rgba(255,255,255,0.06)' }, pointLabels: { color: '#A3A3A3', font: { size: 11, family: 'Inter' } } } }
    };
  }

  /* --- DOM helpers --- */
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val != null ? val : ''; }
  function setHtml(id, val) {
    var el = document.getElementById(id);
    if (!el || !val) return;
    // Escape all HTML first, then restore only whitelisted tags
    var tmp = document.createElement('div');
    tmp.textContent = val;
    var escaped = tmp.innerHTML;
    var html = escaped
      .replace(/&amp;lt;strong&amp;gt;/g, '<strong>').replace(/&amp;lt;\/strong&amp;gt;/g, '</strong>')
      .replace(/&amp;lt;em&amp;gt;/g, '<em>').replace(/&amp;lt;\/em&amp;gt;/g, '</em>')
      .replace(/&amp;lt;br\s*\/?&amp;gt;/g, '<br>')
      .replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>')
      .replace(/&lt;em&gt;/g, '<em>').replace(/&lt;\/em&gt;/g, '</em>')
      .replace(/&lt;br\s*\/?&gt;/g, '<br>');
    el.innerHTML = html;
  }
  function setBar(name, pct, colorVar, unit) {
    var p = pct || 0;
    var valEl = document.getElementById('p-zone-' + name + '-val');
    var barEl = document.getElementById('p-zone-' + name + '-bar');
    if (valEl) {
      if (unit === '/10') valEl.textContent = Math.round(p / 10) + '/10';
      else valEl.textContent = Math.round(p) + '%';
    }
    if (barEl) barEl.style.width = p + '%';
  }
  function esc(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  return { render: render };
})();
