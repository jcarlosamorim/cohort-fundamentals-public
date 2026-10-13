/* ==========================================================================
   PIPELINE - Mini Kanban for lead prospecting
   5 fixed columns: Seeds, Nets, Spears, Calls, Deals
   HTML5 Drag & Drop API for card movement
   Manual add/edit lead via inline form
   CRUD via Persistence (Supabase student_pipeline)
   IIFE pattern matching Sidebar/Router/Persistence modules
   ========================================================================== */

const Pipeline = (() => {
  let containerEl = null;
  let leads = [];
  let editingId = null; // ID of lead being edited (null = add mode)

  const COLUMNS = [
    { id: 'seeds',  label: 'Seeds',  icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', desc: 'Contatos iniciais' },
    { id: 'nets',   label: 'Nets',   icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75', desc: 'Networking ativo' },
    { id: 'spears', label: 'Spears', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z|M22 6l-10 7L2 6', desc: 'Prospeccao direta' },
    { id: 'calls',  label: 'Calls',  icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z', desc: 'Calls agendadas' },
    { id: 'deals',  label: 'Deals',  icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', desc: 'Fechamentos' }
  ];

  // ── Init ─────────────────────────────────────────────────────────────

  async function init(el) {
    containerEl = el;
    if (!containerEl) return;

    leads = await Persistence.loadPipeline();
    render();
  }

  // ── Render ───────────────────────────────────────────────────────────

  function render() {
    if (!containerEl) return;

    var html = '<div class="biz-pipeline-header">'
      + '  <div class="section-label">'
      + '    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
      + '    Pipeline de Prospeccao'
      + '  </div>'
      + '  <button class="biz-pipeline-add-btn" id="biz-pipeline-add">'
      + '    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      + '    Adicionar Lead'
      + '  </button>'
      + '</div>';

    // Add/Edit form (hidden by default)
    html += renderForm();

    // Kanban columns
    html += '<div class="biz-kanban">';

    COLUMNS.forEach(function(col) {
      var colLeads = leads.filter(function(l) { return l.column_id === col.id; });
      colLeads.sort(function(a, b) { return (a.position || 0) - (b.position || 0); });

      var paths = col.icon.split('|').map(function(d) {
        return '<path d="' + d.trim() + '"/>';
      }).join('');

      html += '<div class="biz-kanban-col" data-col="' + col.id + '"'
        + ' ondragover="event.preventDefault();this.classList.add(\'biz-kanban-col--dragover\')"'
        + ' ondragleave="this.classList.remove(\'biz-kanban-col--dragover\')"'
        + '>'
        + '  <div class="biz-kanban-col__header">'
        + '    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>'
        + '    <span>' + col.label + '</span>'
        + '    <span class="biz-kanban-col__count">' + colLeads.length + '</span>'
        + '  </div>'
        + '  <div class="biz-kanban-col__cards">';

      colLeads.forEach(function(lead) {
        html += renderCard(lead);
      });

      html += '  </div>'
        + '</div>';
    });

    html += '</div>';
    containerEl.innerHTML = html;

    bindEvents();
  }

  // ── Form (Add/Edit) ────────────────────────────────────────────────

  function renderForm() {
    var lead = editingId ? leads.find(function(l) { return l.id === editingId; }) : null;
    var isEdit = !!lead;
    var title = isEdit ? 'Editar Lead' : 'Novo Lead';

    return '<div class="biz-pipeline-form" id="biz-pipeline-form" style="display:none;">'
      + '  <div class="biz-pipeline-form__header">'
      + '    <span>' + title + '</span>'
      + '    <button class="biz-pipeline-form__close" id="biz-form-close">'
      + '      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      + '    </button>'
      + '  </div>'
      + '  <div class="biz-pipeline-form__body">'
      + '    <div class="biz-pipeline-form__row">'
      + '      <div class="biz-pipeline-form__field">'
      + '        <label>Nome *</label>'
      + '        <input type="text" id="biz-form-name" value="' + escapeAttr(lead ? lead.lead_name : '') + '" placeholder="Nome do lead" />'
      + '      </div>'
      + '      <div class="biz-pipeline-form__field">'
      + '        <label>Handle</label>'
      + '        <input type="text" id="biz-form-handle" value="' + escapeAttr(lead ? lead.lead_handle || '' : '') + '" placeholder="@usuario" />'
      + '      </div>'
      + '    </div>'
      + '    <div class="biz-pipeline-form__row">'
      + '      <div class="biz-pipeline-form__field">'
      + '        <label>Plataforma</label>'
      + '        <select id="biz-form-platform">'
      + '          <option value="instagram"' + (lead && lead.lead_platform === 'instagram' ? ' selected' : (!lead ? ' selected' : '')) + '>Instagram</option>'
      + '          <option value="linkedin"' + (lead && lead.lead_platform === 'linkedin' ? ' selected' : '') + '>LinkedIn</option>'
      + '          <option value="whatsapp"' + (lead && lead.lead_platform === 'whatsapp' ? ' selected' : '') + '>WhatsApp</option>'
      + '          <option value="outro"' + (lead && lead.lead_platform === 'outro' ? ' selected' : '') + '>Outro</option>'
      + '        </select>'
      + '      </div>'
      + '      <div class="biz-pipeline-form__field">'
      + '        <label>Coluna</label>'
      + '        <select id="biz-form-column">'
      + COLUMNS.map(function(c) {
          var sel = lead && lead.column_id === c.id ? ' selected' : (!lead && c.id === 'seeds' ? ' selected' : '');
          return '<option value="' + c.id + '"' + sel + '>' + c.label + '</option>';
        }).join('')
      + '        </select>'
      + '      </div>'
      + '    </div>'
      + '    <div class="biz-pipeline-form__field">'
      + '      <label>Bio / Descricao</label>'
      + '      <textarea id="biz-form-bio" rows="2" placeholder="Breve descricao do lead">' + escapeHtml(lead ? lead.lead_bio || '' : '') + '</textarea>'
      + '    </div>'
      + '    <div class="biz-pipeline-form__row">'
      + '      <div class="biz-pipeline-form__field">'
      + '        <label>Seguidores</label>'
      + '        <input type="number" id="biz-form-followers" value="' + (lead ? lead.lead_followers || 0 : 0) + '" min="0" />'
      + '      </div>'
      + '    </div>'
      + '    <div class="biz-pipeline-form__field">'
      + '      <label>Mensagem / Notas</label>'
      + '      <textarea id="biz-form-message" rows="3" placeholder="Mensagem de prospeccao ou notas sobre o lead">' + escapeHtml(lead ? lead.suggested_message || '' : '') + '</textarea>'
      + '    </div>'
      + '  </div>'
      + '  <div class="biz-pipeline-form__actions">'
      + '    <button class="biz-pipeline-form__cancel" id="biz-form-cancel">Cancelar</button>'
      + '    <button class="biz-pipeline-form__save" id="biz-form-save">'
      + (isEdit ? 'Salvar' : 'Adicionar')
      + '    </button>'
      + '  </div>'
      + '</div>';
  }

  // ── Card ─────────────────────────────────────────────────────────────

  function renderCard(lead) {
    var platformIcon = lead.lead_platform === 'linkedin'
      ? '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>'
      : lead.lead_platform === 'whatsapp'
      ? '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'
      : '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>';

    return '<div class="biz-kanban-card" draggable="true" data-id="' + lead.id + '">'
      + '  <div class="biz-kanban-card__header">'
      + '    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + platformIcon + '</svg>'
      + '    <strong>' + escapeHtml(lead.lead_name) + '</strong>'
      + '    <button class="biz-kanban-card__edit" data-id="' + lead.id + '" title="Editar lead">'
      + '      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
      + '    </button>'
      + '    <button class="biz-kanban-card__delete" data-id="' + lead.id + '" title="Remover lead">'
      + '      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      + '    </button>'
      + '  </div>'
      + (lead.lead_handle ? '<div class="biz-kanban-card__handle">@' + escapeHtml(lead.lead_handle) + '</div>' : '')
      + (lead.lead_bio ? '<div class="biz-kanban-card__bio">' + escapeHtml(lead.lead_bio).slice(0, 80) + '</div>' : '')
      + (lead.lead_followers ? '<div class="biz-kanban-card__followers">' + formatNumber(lead.lead_followers) + ' seguidores</div>' : '')
      + (lead.suggested_message ? '<div class="biz-kanban-card__msg-badge">Mensagem/notas</div>' : '')
      + '</div>';
  }

  // ── Events ──────────────────────────────────────────────────────────

  function bindEvents() {
    // Add button
    var addBtn = document.getElementById('biz-pipeline-add');
    if (addBtn) addBtn.addEventListener('click', function() { openForm(null); });

    // Close/cancel form
    var closeBtn = document.getElementById('biz-form-close');
    var cancelBtn = document.getElementById('biz-form-cancel');
    if (closeBtn) closeBtn.addEventListener('click', closeForm);
    if (cancelBtn) cancelBtn.addEventListener('click', closeForm);

    // Save form
    var saveBtn = document.getElementById('biz-form-save');
    if (saveBtn) saveBtn.addEventListener('click', saveForm);

    // Card click → edit
    containerEl.querySelectorAll('.biz-kanban-card__edit').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        openForm(btn.dataset.id);
      });
    });

    // Delete
    containerEl.querySelectorAll('.biz-kanban-card__delete').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeLead(btn.dataset.id);
      });
    });

    // Drag & Drop
    bindDragDrop();
  }

  function openForm(leadId) {
    editingId = leadId || null;
    // Re-render to update form content
    render();
    var formEl = document.getElementById('biz-pipeline-form');
    if (formEl) {
      formEl.style.display = 'block';
      var nameInput = document.getElementById('biz-form-name');
      if (nameInput) nameInput.focus();
    }
  }

  function closeForm() {
    editingId = null;
    var formEl = document.getElementById('biz-pipeline-form');
    if (formEl) formEl.style.display = 'none';
  }

  async function saveForm() {
    var name = (document.getElementById('biz-form-name') || {}).value || '';
    if (!name.trim()) {
      var nameInput = document.getElementById('biz-form-name');
      if (nameInput) { nameInput.style.borderColor = 'var(--color-danger)'; nameInput.focus(); }
      return;
    }

    var data = {
      lead_name: name.trim(),
      lead_handle: ((document.getElementById('biz-form-handle') || {}).value || '').trim().replace(/^@/, '') || null,
      lead_platform: (document.getElementById('biz-form-platform') || {}).value || 'instagram',
      lead_bio: ((document.getElementById('biz-form-bio') || {}).value || '').trim() || null,
      lead_followers: parseInt((document.getElementById('biz-form-followers') || {}).value) || 0,
      suggested_message: ((document.getElementById('biz-form-message') || {}).value || '').trim() || null,
      column_id: (document.getElementById('biz-form-column') || {}).value || 'seeds'
    };

    if (editingId) {
      // Update existing lead
      var result = await Persistence.updatePipelineLead(editingId, data);
      if (result) {
        var lead = leads.find(function(l) { return l.id === editingId; });
        if (lead) Object.assign(lead, data);
      }
    } else {
      // Add new lead
      var result = await Persistence.addPipelineLead(data);
      if (result) leads.push(result);
    }

    editingId = null;
    render();
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────

  function bindDragDrop() {
    var cards = containerEl.querySelectorAll('.biz-kanban-card');
    var cols = containerEl.querySelectorAll('.biz-kanban-col');

    cards.forEach(function(card) {
      card.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        card.classList.add('biz-kanban-card--dragging');
      });
      card.addEventListener('dragend', function() {
        card.classList.remove('biz-kanban-card--dragging');
        cols.forEach(function(col) { col.classList.remove('biz-kanban-col--dragover'); });
      });
    });

    cols.forEach(function(col) {
      col.addEventListener('drop', function(e) {
        e.preventDefault();
        col.classList.remove('biz-kanban-col--dragover');
        var leadId = e.dataTransfer.getData('text/plain');
        var newColId = col.dataset.col;
        if (leadId && newColId) moveLead(leadId, newColId);
      });
    });
  }

  // ── CRUD ─────────────────────────────────────────────────────────────

  async function addLead(leadData) {
    var result = await Persistence.addPipelineLead(leadData);
    if (result) {
      leads.push(result);
      render();
    }
    return result;
  }

  async function moveLead(leadId, newColumnId) {
    var lead = leads.find(function(l) { return l.id === leadId; });
    if (!lead || lead.column_id === newColumnId) return;

    var result = await Persistence.updatePipelineLead(leadId, { column_id: newColumnId });
    if (result) {
      lead.column_id = newColumnId;
      render();
    }
  }

  async function removeLead(leadId) {
    var ok = await Persistence.deletePipelineLead(leadId);
    if (ok) {
      leads = leads.filter(function(l) { return l.id !== leadId; });
      render();
    }
  }

  async function updateLeadMessage(leadId, message) {
    var result = await Persistence.updatePipelineLead(leadId, { suggested_message: message });
    if (result) {
      var lead = leads.find(function(l) { return l.id === leadId; });
      if (lead) lead.suggested_message = message;
      render();
    }
  }

  // ── Utils ───────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function getLeads() { return leads; }

  return { init, addLead, moveLead, removeLead, updateLeadMessage, getLeads, render };
})();
