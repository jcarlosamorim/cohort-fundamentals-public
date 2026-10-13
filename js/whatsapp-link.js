/* ==========================================================================
   WHATSAPP LINK — Student email <-> WhatsApp phone mapping
   Each student logs in, sees their email and registers their WhatsApp number.
   Data stored in student_whatsapp table for timeline matching.
   ========================================================================== */

const WhatsappLink = (() => {
  let container = null;
  let savedPhone = null;

  // ── Countries ───────────────────────────────────────────────────────
  var countries = [
    { dial:'55',  flag:'\u{1F1E7}\u{1F1F7}', name:'Brasil' },
    { dial:'1',   flag:'\u{1F1FA}\u{1F1F8}', name:'Estados Unidos' },
    { dial:'351', flag:'\u{1F1F5}\u{1F1F9}', name:'Portugal' },
    { dial:'54',  flag:'\u{1F1E6}\u{1F1F7}', name:'Argentina' },
    { dial:'57',  flag:'\u{1F1E8}\u{1F1F4}', name:'Col\u00f4mbia' },
    { dial:'52',  flag:'\u{1F1F2}\u{1F1FD}', name:'M\u00e9xico' },
    { dial:'56',  flag:'\u{1F1E8}\u{1F1F1}', name:'Chile' },
    { dial:'51',  flag:'\u{1F1F5}\u{1F1EA}', name:'Peru' },
    { dial:'598', flag:'\u{1F1FA}\u{1F1FE}', name:'Uruguai' },
    { dial:'595', flag:'\u{1F1F5}\u{1F1FE}', name:'Paraguai' },
    { dial:'593', flag:'\u{1F1EA}\u{1F1E8}', name:'Equador' },
    { dial:'591', flag:'\u{1F1E7}\u{1F1F4}', name:'Bol\u00edvia' },
    { dial:'58',  flag:'\u{1F1FB}\u{1F1EA}', name:'Venezuela' },
    { dial:'44',  flag:'\u{1F1EC}\u{1F1E7}', name:'Reino Unido' },
    { dial:'34',  flag:'\u{1F1EA}\u{1F1F8}', name:'Espanha' },
    { dial:'33',  flag:'\u{1F1EB}\u{1F1F7}', name:'Fran\u00e7a' },
    { dial:'49',  flag:'\u{1F1E9}\u{1F1EA}', name:'Alemanha' },
    { dial:'39',  flag:'\u{1F1EE}\u{1F1F9}', name:'It\u00e1lia' },
    { dial:'1',   flag:'\u{1F1E8}\u{1F1E6}', name:'Canad\u00e1' },
    { dial:'61',  flag:'\u{1F1E6}\u{1F1FA}', name:'Austr\u00e1lia' },
    { dial:'81',  flag:'\u{1F1EF}\u{1F1F5}', name:'Jap\u00e3o' },
    { dial:'91',  flag:'\u{1F1EE}\u{1F1F3}', name:'\u00cdndia' },
    { dial:'972', flag:'\u{1F1EE}\u{1F1F1}', name:'Israel' },
    { dial:'971', flag:'\u{1F1E6}\u{1F1EA}', name:'Emirados \u00c1rabes' },
    { dial:'27',  flag:'\u{1F1FF}\u{1F1E6}', name:'\u00c1frica do Sul' },
    { dial:'244', flag:'\u{1F1E6}\u{1F1F4}', name:'Angola' },
    { dial:'258', flag:'\u{1F1F2}\u{1F1FF}', name:'Mo\u00e7ambique' },
    { dial:'506', flag:'\u{1F1E8}\u{1F1F7}', name:'Costa Rica' },
    { dial:'507', flag:'\u{1F1F5}\u{1F1E6}', name:'Panam\u00e1' },
    { dial:'1',   flag:'\u{1F1E9}\u{1F1F4}', name:'Rep. Dominicana' },
    { dial:'41',  flag:'\u{1F1E8}\u{1F1ED}', name:'Su\u00ed\u00e7a' },
    { dial:'31',  flag:'\u{1F1F3}\u{1F1F1}', name:'Holanda' },
    { dial:'353', flag:'\u{1F1EE}\u{1F1EA}', name:'Irlanda' },
    { dial:'46',  flag:'\u{1F1F8}\u{1F1EA}', name:'Su\u00e9cia' },
    { dial:'64',  flag:'\u{1F1F3}\u{1F1FF}', name:'Nova Zel\u00e2ndia' },
    { dial:'82',  flag:'\u{1F1F0}\u{1F1F7}', name:'Coreia do Sul' }
  ];

  var defaultCountry = countries[0];

  function detectCountry(phone) {
    if (!phone) return defaultCountry;
    var sorted = countries.slice().sort(function(a, b) { return b.dial.length - a.dial.length; });
    for (var i = 0; i < sorted.length; i++) {
      if (phone.indexOf(sorted[i].dial) === 0) return sorted[i];
    }
    return defaultCountry;
  }

  // ── Dropdown helpers ────────────────────────────────────────────────
  var dropdownEl = null;

  function ensureDropdown() {
    if (dropdownEl) return;
    dropdownEl = document.createElement('div');
    dropdownEl.className = 'wa-country-dropdown';
    dropdownEl.innerHTML = '<input class="wa-country-search" type="text" placeholder="Buscar pa\u00eds...">'
      + '<div class="wa-country-list"></div>';
  }

  function openDropdown(anchorEl, onSelect) {
    ensureDropdown();
    var parent = anchorEl.closest('.wa-phone-group');
    if (!parent.contains(dropdownEl)) parent.appendChild(dropdownEl);

    var searchInput = dropdownEl.querySelector('.wa-country-search');
    var listEl = dropdownEl.querySelector('.wa-country-list');

    function fill(filter) {
      var f = (filter || '').toLowerCase();
      listEl.innerHTML = '';
      countries.forEach(function(c) {
        if (f && c.name.toLowerCase().indexOf(f) === -1 && c.dial.indexOf(f) === -1) return;
        var opt = document.createElement('div');
        opt.className = 'wa-country-opt';
        opt.innerHTML = '<span class="wa-flag">' + c.flag + '</span>'
          + '<span class="wa-cname">' + c.name + '</span>'
          + '<span class="wa-cdial">+' + c.dial + '</span>';
        opt.addEventListener('click', function() {
          onSelect(c);
          closeDropdown();
        });
        listEl.appendChild(opt);
      });
    }

    searchInput.value = '';
    fill('');
    dropdownEl.classList.add('open');
    setTimeout(function() { searchInput.focus(); }, 50);

    searchInput.oninput = function() { fill(this.value); };
  }

  function closeDropdown() {
    if (dropdownEl) dropdownEl.classList.remove('open');
  }

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (dropdownEl && !dropdownEl.contains(e.target) && (!e.target.closest || !e.target.closest('.wa-country-btn'))) {
      closeDropdown();
    }
  });

  // ── Init ────────────────────────────────────────────────────────────
  async function init(el) {
    container = el;
    if (!container) return;

    var user = Auth.getUser();
    if (!user) {
      container.innerHTML = '<p style="color:var(--color-text-muted);padding:2rem;">Faca login para continuar.</p>';
      return;
    }

    savedPhone = await loadPhone();
    render(user);
  }

  function render(user) {
    var email = user.email || '-';

    if (savedPhone) {
      renderSaved(email);
    } else {
      renderForm(email);
    }
  }

  function renderForm(email) {
    var c = defaultCountry;

    container.innerHTML = ''
      + '<header class="wa-hero">'
      + '  <h1>Vincular WhatsApp</h1>'
      + '  <p>Informe seu numero do WhatsApp para que possamos conectar suas mensagens do grupo ao seu perfil na plataforma.</p>'
      + '</header>'
      + '<div class="wa-card">'
      + '  <div class="wa-card__row">'
      + '    <div class="wa-field">'
      + '      <span class="wa-field__label">Seu email</span>'
      + '      <div class="wa-field__value">' + escHtml(email) + '</div>'
      + '    </div>'
      + '    <div class="wa-field">'
      + '      <span class="wa-field__label">Seu WhatsApp</span>'
      + '      <div class="wa-phone-group">'
      + '        <button class="wa-country-btn" id="wa-country-btn" type="button" data-dial="' + c.dial + '">'
      + '          <span class="wa-flag">' + c.flag + '</span>'
      + '          <span class="wa-dial">+' + c.dial + '</span>'
      + '          <span class="wa-chevron"></span>'
      + '        </button>'
      + '        <input class="wa-field__input" id="wa-phone" type="tel" placeholder="11999999999" autocomplete="tel" maxlength="15">'
      + '      </div>'
      + '      <span class="wa-field__hint">Selecione o pais na bandeira e informe DDD + numero</span>'
      + '    </div>'
      + '  </div>'
      + '  <div class="wa-actions">'
      + '    <button class="wa-btn wa-btn--primary" id="wa-save">'
      + '      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      + '      Salvar'
      + '    </button>'
      + '    <span class="wa-status" id="wa-status"></span>'
      + '  </div>'
      + '</div>'
      + '<div class="wa-info">'
      + '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      + '  <div class="wa-info__text">Usaremos esse numero para identificar suas mensagens no grupo do WhatsApp e criar sua timeline personalizada de participacao no Cohort.</div>'
      + '</div>';

    var phoneInput = document.getElementById('wa-phone');
    var saveBtn = document.getElementById('wa-save');
    var countryBtn = document.getElementById('wa-country-btn');

    phoneInput.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
    });

    countryBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (dropdownEl && dropdownEl.classList.contains('open')) {
        closeDropdown();
      } else {
        openDropdown(countryBtn, function(selected) {
          countryBtn.querySelector('.wa-flag').textContent = selected.flag;
          countryBtn.querySelector('.wa-dial').textContent = '+' + selected.dial;
          countryBtn.dataset.dial = selected.dial;
          phoneInput.focus();
        });
      }
    });

    saveBtn.addEventListener('click', function() {
      handleSave(email);
    });

    phoneInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleSave(email);
    });
  }

  function renderSaved(email) {
    var detected = detectCountry(savedPhone);
    var localPart = savedPhone;
    if (savedPhone.indexOf(detected.dial) === 0) {
      localPart = savedPhone.substring(detected.dial.length);
    }
    var displayPhone = '+' + detected.dial + ' ' + localPart;

    container.innerHTML = ''
      + '<header class="wa-hero">'
      + '  <h1>Vincular WhatsApp</h1>'
      + '  <p>Seu numero esta vinculado. Vamos usar ele para conectar suas mensagens do grupo ao seu perfil.</p>'
      + '</header>'
      + '<div class="wa-card">'
      + '  <div class="wa-card__row">'
      + '    <div class="wa-field">'
      + '      <span class="wa-field__label">Seu email</span>'
      + '      <div class="wa-field__value">' + escHtml(email) + '</div>'
      + '    </div>'
      + '    <div class="wa-field">'
      + '      <span class="wa-field__label">Seu WhatsApp</span>'
      + '      <div class="wa-field__value"><span class="wa-saved-flag">' + detected.flag + '</span> ' + escHtml(displayPhone) + '</div>'
      + '    </div>'
      + '  </div>'
      + '  <div class="wa-saved">'
      + '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      + '    <span class="wa-saved__text">Numero vinculado: <span class="wa-saved-flag">' + detected.flag + '</span> <span class="wa-saved__phone">' + escHtml(displayPhone) + '</span></span>'
      + '  </div>'
      + '  <div class="wa-actions">'
      + '    <button class="wa-btn wa-btn--edit" id="wa-edit">'
      + '      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
      + '      Alterar numero'
      + '    </button>'
      + '  </div>'
      + '</div>'
      + '<div class="wa-info">'
      + '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      + '  <div class="wa-info__text">Usaremos esse numero para identificar suas mensagens no grupo do WhatsApp e criar sua timeline personalizada de participacao no Cohort.</div>'
      + '</div>';

    document.getElementById('wa-edit').addEventListener('click', function() {
      savedPhone = null;
      renderForm(email);
    });
  }

  async function handleSave(email) {
    var phoneInput = document.getElementById('wa-phone');
    var statusEl = document.getElementById('wa-status');
    var saveBtn = document.getElementById('wa-save');
    var countryBtn = document.getElementById('wa-country-btn');
    var localPhone = (phoneInput.value || '').trim();
    var dialCode = countryBtn ? countryBtn.dataset.dial : '55';
    var fullPhone = dialCode + localPhone;

    if (localPhone.length < 8 || localPhone.length > 13) {
      statusEl.className = 'wa-status wa-status--err';
      statusEl.textContent = 'Numero invalido (8-13 digitos)';
      return;
    }

    saveBtn.disabled = true;
    statusEl.className = 'wa-status';
    statusEl.textContent = 'Salvando...';

    var ok = await savePhone(fullPhone);

    if (ok) {
      savedPhone = fullPhone;
      renderSaved(email);
    } else {
      saveBtn.disabled = false;
      statusEl.className = 'wa-status wa-status--err';
      statusEl.textContent = 'Erro ao salvar. Tente novamente.';
    }
  }

  // ── Supabase CRUD ───────────────────────────────────────────────────

  async function loadPhone() {
    var userId = Auth.getUser() ? Auth.getUser().id : null;
    if (!userId) return null;
    var result = await Auth.getClient()
      .from('student_whatsapp')
      .select('whatsapp_phone')
      .eq('user_id', userId)
      .single();
    if (result.error || !result.data) return null;
    return result.data.whatsapp_phone;
  }

  async function savePhone(phone) {
    var userId = Auth.getUser() ? Auth.getUser().id : null;
    if (!userId) return false;
    var result = await Auth.getClient()
      .from('student_whatsapp')
      .upsert({
        user_id: userId,
        whatsapp_phone: phone,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();
    return !result.error;
  }

  function escHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  return { init: init };
})();
