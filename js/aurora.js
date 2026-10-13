/**
 * Aurora — AI Chat Assistant powered by psychometric profile data
 * Floating chat panel that gives personalized advice based on all 7 frameworks
 */
var Aurora = (function() {
  'use strict';

  var LS_DATA_BASE = 'psicometria_data_v2';
  var LS_SRC_BASE = 'psicometria_source_v2';
  var messages = [];
  var isSending = false;
  var isOpen = false;

  function _uid() {
    var user = typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser() : null;
    return user ? user.id : null;
  }

  function getProfileData() {
    var id = _uid();
    var key = id ? LS_DATA_BASE + '_' + id : null;
    if (!key) return null;
    try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
  }

  function init() {
    if (document.getElementById('aurora-fab')) return;
    var data = getProfileData();
    if (!data || !data.profile) return;
    renderFab();
  }

  function renderFab() {
    var fab = document.createElement('button');
    fab.className = 'aurora-fab';
    fab.id = 'aurora-fab';
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    fab.setAttribute('aria-label', 'Abrir Aurora');
    fab.addEventListener('click', toggle);
    document.body.appendChild(fab);
  }

  function renderPanel() {
    if (document.getElementById('aurora-panel')) return;
    var data = getProfileData();
    var profile = (data && data.profile) ? data.profile : {};
    var firstName = (profile.name || 'aluno').split(' ')[0];

    var panel = document.createElement('div');
    panel.className = 'aurora-panel';
    panel.id = 'aurora-panel';
    panel.innerHTML =
      '<div class="aurora-panel__header">' +
        '<div class="aurora-panel__title">' +
          '<div class="aurora-panel__avatar">\u2726</div>' +
          '<div><div class="aurora-panel__name">Aurora</div>' +
          '<div class="aurora-panel__status">Sua mentora pessoal</div></div>' +
        '</div>' +
        '<button class="aurora-panel__close" id="aurora-close">\u00d7</button>' +
      '</div>' +
      '<div class="aurora-panel__messages" id="aurora-messages">' +
        '<div class="aurora-msg aurora-msg--assistant">' +
          '<div class="aurora-msg__content"><p>Ola, ' + esc(firstName) + '! Sou a <strong>Aurora</strong>, sua mentora pessoal de autoconhecimento. Conheco todo o seu perfil psicometrico — seus talentos, zonas, instintos e potenciais. Me pergunte qualquer coisa!</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="aurora-panel__input-wrap">' +
        '<input type="text" class="aurora-panel__input" id="aurora-input" placeholder="Pergunte sobre seu perfil..." autocomplete="off">' +
        '<button class="aurora-panel__send" id="aurora-send">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        '</button>' +
      '</div>';

    document.body.appendChild(panel);
    document.getElementById('aurora-close').addEventListener('click', toggle);
    document.getElementById('aurora-send').addEventListener('click', handleSend);
    document.getElementById('aurora-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
  }

  function toggle() {
    isOpen = !isOpen;
    var fab = document.getElementById('aurora-fab');
    if (isOpen) {
      renderPanel();
      document.getElementById('aurora-panel').classList.add('aurora-panel--open');
      fab.classList.add('aurora-fab--hidden');
      setTimeout(function() { document.getElementById('aurora-input').focus(); }, 300);
    } else {
      var panel = document.getElementById('aurora-panel');
      if (panel) panel.classList.remove('aurora-panel--open');
      fab.classList.remove('aurora-fab--hidden');
    }
  }

  function handleSend() {
    if (isSending) return;
    var input = document.getElementById('aurora-input');
    var text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage('user', text);
    messages.push({ role: 'user', content: text });
    isSending = true;
    showTyping();

    var fetchHeaders = { 'Content-Type': 'application/json' };
    var authH = typeof Auth !== 'undefined' && Auth.authHeaders ? Auth.authHeaders() : {};
    if (authH.Authorization) fetchHeaders.Authorization = authH.Authorization;

    fetch('/api/aurora', {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({
        messages: messages,
        profileData: getProfileData(),
        originalText: (function() { var id = _uid(); var k = id ? LS_SRC_BASE + '_' + id : null; return k ? (localStorage.getItem(k) || '') : ''; })().slice(0, 50000)
      })
    })
    .then(function(r) {
      if (r.status === 429) {
        return r.json().then(function(data) {
          var resetDate = data.quota && data.quota.resetAt ? new Date(data.quota.resetAt) : null;
          var resetStr = resetDate ? resetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'em breve';
          throw new Error('Voc\u00ea atingiu o limite de ' + (data.quota ? data.quota.limit : 20) + ' mensagens por dia. Volte amanh\u00e3 \u00e0s ' + resetStr + '.');
        });
      }
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Erro'); });
      return r.json();
    })
    .then(function(data) {
      hideTyping();
      isSending = false;
      messages.push({ role: 'assistant', content: data.response });
      addMessage('assistant', data.response);
    })
    .catch(function(err) {
      hideTyping();
      isSending = false;
      addMessage('assistant', err.message || 'Desculpe, tive um problema ao processar. Tente novamente.');
    });
  }

  function addMessage(role, text) {
    var container = document.getElementById('aurora-messages');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'aurora-msg aurora-msg--' + role;
    div.innerHTML = '<div class="aurora-msg__content">' + formatText(text) + '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    var container = document.getElementById('aurora-messages');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'aurora-msg aurora-msg--assistant';
    div.id = 'aurora-typing';
    div.innerHTML = '<div class="aurora-msg__content"><span class="aurora-typing"><span></span><span></span><span></span></span></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('aurora-typing');
    if (el) el.remove();
  }

  function formatText(text) {
    var safe = esc(text);
    // Restore whitelisted HTML tags
    safe = safe.replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>');
    safe = safe.replace(/&lt;em&gt;/g, '<em>').replace(/&lt;\/em&gt;/g, '</em>');

    var lines = safe.split('\n');
    var html = '';
    var inList = false;
    var lt = '';
    var inTable = false;
    var tableHeaderDone = false;

    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();

      // Empty line — close open blocks
      if (!t) {
        closeList(); closeTable();
        continue;
      }

      // Horizontal rule (---, ___, ***)
      if (/^[-_*]{3,}$/.test(t) && !inTable) { closeList(); html += '<hr class="aurora-hr">'; continue; }

      // Table: detect pipe-delimited lines
      if (/^\|(.+)\|$/.test(t)) {
        closeList();
        // Skip separator row (|---|---|)
        if (/^\|[\s\-:|]+\|$/.test(t)) {
          tableHeaderDone = true;
          continue;
        }
        var cells = t.slice(1, -1).split('|');
        if (!inTable) {
          html += '<table class="aurora-table"><thead><tr>';
          for (var c = 0; c < cells.length; c++) html += '<th>' + inl(cells[c].trim()) + '</th>';
          html += '</tr></thead><tbody>';
          inTable = true;
          tableHeaderDone = false;
          continue;
        }
        html += '<tr>';
        for (var c = 0; c < cells.length; c++) html += '<td>' + inl(cells[c].trim()) + '</td>';
        html += '</tr>';
        continue;
      }

      // Non-table line — close table if open
      closeTable();

      // Headings
      if (/^### /.test(t)) { closeList(); html += '<h6 class="aurora-md-h">' + inl(t.slice(4)) + '</h6>'; continue; }
      if (/^## /.test(t))  { closeList(); html += '<h5 class="aurora-md-h">' + inl(t.slice(3)) + '</h5>'; continue; }
      if (/^# /.test(t))   { closeList(); html += '<h4 class="aurora-md-h">' + inl(t.slice(2)) + '</h4>'; continue; }
      // Unordered list
      if (/^[-*] /.test(t)) { openList('ul'); html += '<li>' + inl(t.slice(2)) + '</li>'; continue; }
      // Ordered list
      if (/^\d+\.\s/.test(t)) { openList('ol'); html += '<li>' + inl(t.replace(/^\d+\.\s*/, '')) + '</li>'; continue; }
      // Paragraph
      closeList();
      html += '<p>' + inl(t) + '</p>';
    }
    closeList(); closeTable();
    return html;

    function closeList() { if (inList) { html += '</' + lt + '>'; inList = false; } }
    function openList(type) {
      if (!inList || lt !== type) { closeList(); html += '<' + type + '>'; inList = true; lt = type; }
    }
    function closeTable() { if (inTable) { html += '</tbody></table>'; inTable = false; tableHeaderDone = false; } }
  }

  function inl(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="aurora-code">$1</code>');
  }

  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  return { init: init };
})();
