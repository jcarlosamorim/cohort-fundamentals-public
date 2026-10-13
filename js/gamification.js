/* ==========================================================================
   GAMIFICATION ENGINE - Interactive scenario renderer
   IIFE pattern matching Calendar/Router/Sidebar modules
   Loads data/scenarios.json, renders 5 interaction types into .scenario-slot
   ========================================================================== */

const Gamification = (() => {
  let data = null;

  function escHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  async function init() {
    try {
      let res = await fetch('data/scenarios.json');
      if (!res.ok) res = await fetch('../data/scenarios.json');
      data = await res.json();
    } catch (e) { data = {}; }
    Router.onNavigate(renderSlots);
    renderSlots();
  }

  function renderSlots() {
    const slots = document.querySelectorAll('.scenario-slot');
    slots.forEach(slot => {
      const page = slot.dataset.page;
      const scenarios = data[page];
      if (!scenarios || slot.dataset.rendered) return;
      slot.dataset.rendered = '1';
      slot.innerHTML = buildSection(scenarios);
      bindAll(slot, scenarios);
      restoreCompleted(slot, scenarios, page);
    });
  }

  function restoreCompleted(slot, scenarios, pageKey) {
    scenarios.forEach(s => {
      if (Persistence?.isScenarioCompleted?.(s.id)) {
        const el = slot.querySelector(`#${s.id}`);
        if (!el) return;
        el.classList.add('scenario--completed', 'scenario--restored');
        // Lock all interactive elements
        el.querySelectorAll('.mc-option').forEach(o => {
          o.classList.add('mc-option--locked');
          if (o.dataset.correct === 'true') o.classList.add('mc-option--correct');
        });
        el.querySelectorAll('.ms-item').forEach(o => {
          o.classList.add('ms-item--locked');
          if (o.dataset.correct === 'true') o.classList.add('ms-item--correct');
        });
        el.querySelectorAll('.seq-item').forEach(o => o.classList.add('seq-item--locked'));
        const input = el.querySelector('.term-sim__input');
        if (input) input.disabled = true;
        // Hide squad-builder interactive elements
        const sbDeck = el.querySelector('.sb-deck');
        if (sbDeck) sbDeck.style.display = 'none';
        const sbSlots = el.querySelector('.sb-slots');
        if (sbSlots) sbSlots.style.display = 'none';
        const sbScenario = el.querySelector('.sb-scenario');
        if (sbScenario) sbScenario.style.display = 'none';
        const sbProgress = el.querySelector('.sb-progress');
        if (sbProgress) {
          sbProgress.querySelectorAll('.sb-step').forEach(step => {
            step.classList.remove('sb-step--active');
            step.classList.add('sb-step--done');
          });
          sbProgress.querySelectorAll('.sb-connector').forEach(c => c.classList.add('sb-connector--done'));
        }
        const sbPool = el.querySelector('.sb-pool-counter');
        if (sbPool) sbPool.style.display = 'none';
        // Show restored feedback
        const fb = el.querySelector('.scenario__feedback-slot');
        if (fb) {
          fb.innerHTML = `<div class="scenario__feedback scenario__feedback--correct">
            <strong>Completado!</strong> ${escHtml(s.explanation || '')}
          </div>`;
        }
      }
    });
  }

  function buildSection(scenarios) {
    const cards = scenarios.map((s, i) => {
      const badgeType = { 'terminal': 'terminal', 'sequence': 'sequence', 'multiple-choice': 'mc', 'multi-select': 'multiselect', 'branching': 'branching', 'squad-builder': 'squadbuilder' }[s.type];
      const badgeLabel = { 'terminal': 'Terminal', 'sequence': 'Sequência', 'multiple-choice': 'Quiz', 'multi-select': 'Multi-seleção', 'branching': 'Cenário', 'squad-builder': 'Monte o Squad' }[s.type];
      return `<div class="scenario" id="${escHtml(s.id)}">
        <div class="scenario__header">
          <span class="scenario__badge scenario__badge--${badgeType}">${badgeLabel}</span>
          <span class="scenario__num">${i + 1} / ${scenarios.length}</span>
        </div>
        <h3 class="scenario__title">${escHtml(s.title)}</h3>
        <p class="scenario__desc">${escHtml(s.description)}</p>
        <div class="scenario__body">${buildBody(s)}</div>
        <div class="scenario__feedback-slot"></div>
      </div>`;
    }).join('');

    return `<section class="gamification-section">
      <div class="section-label">Teste seu Conhecimento</div>
      <h2 class="section-title">Cenários Interativos</h2>
      <p class="section-desc">Resolva os cenários abaixo para consolidar o aprendizado desta aula.</p>
      <div class="scenario-list">${cards}</div>
    </section>`;
  }

  // ── Body builders per type ──────────────────────────────────────────

  function buildBody(s) {
    switch (s.type) {
      case 'multiple-choice': return buildMC(s);
      case 'multi-select': return buildMS(s);
      case 'sequence': return buildSeq(s);
      case 'terminal': return buildTerm(s);
      case 'branching': return buildBranch(s);
      case 'squad-builder': return buildSB(s);
      default: return '';
    }
  }

  function buildMC(s) {
    const letters = ['a', 'b', 'c', 'd'];
    return `<div class="mc-grid">${s.options.map((o, i) =>
      `<div class="mc-option" data-id="${o.id}" data-correct="${o.correct}">
        <span class="mc-option__letter">${letters[i]}</span>
        <span>${o.label}</span>
      </div>`
    ).join('')}</div>`;
  }

  function buildMS(s) {
    const sub = (item) => item.subtitle ? `<div class="ms-item__sub">${item.subtitle}</div>` : '';
    return `<div class="ms-counter"><span>0</span> / ${s.requiredCount} selecionados</div>
      <div class="ms-grid">${s.items.map(item =>
        `<div class="ms-item" data-id="${item.id}" data-correct="${item.correct}">
          <div class="ms-item__label">${item.label}</div>${sub(item)}
        </div>`
      ).join('')}</div>
      <button class="gam-btn" data-action="ms-check" disabled>Verificar</button>`;
  }

  function buildSeq(s) {
    const shuffled = shuffleArray(s.items);
    return `<div class="seq-list">${shuffled.map(item =>
      `<div class="seq-item" data-id="${item.id}" data-correct-order="${item.correctOrder}">
        <span class="seq-num">-</span>
        <div class="seq-content">
          <div class="seq-content__label">${item.label}</div>
          ${item.desc ? `<div class="seq-content__desc">${item.desc}</div>` : ''}
        </div>
      </div>`
    ).join('')}</div>
    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
      <button class="gam-btn" data-action="seq-check" disabled>Verificar</button>
      <button class="gam-btn gam-btn--reset" data-action="seq-reset">Limpar</button>
    </div>`;
  }

  function buildTerm(s) {
    return `<div class="term-sim">
      <div class="term-sim__bar">
        <div class="term-sim__dot term-sim__dot--r"></div>
        <div class="term-sim__dot term-sim__dot--y"></div>
        <div class="term-sim__dot term-sim__dot--g"></div>
        <span class="term-sim__title">${s.prompt.split('$')[0].trim()}</span>
      </div>
      <div class="term-sim__body">
        <div class="term-sim__input-row">
          <span class="term-sim__prompt">$</span>
          <input class="term-sim__input" type="text" placeholder="Digite o comando..." autocomplete="off" spellcheck="false">
        </div>
        <div class="term-sim__output" style="display:none"></div>
      </div>
    </div>`;
  }

  function buildBranch(s) {
    const progress = s.steps.map((st, i) =>
      `<span class="branch-step ${i === 0 ? 'branch-step--active' : ''}" data-step="${i}">${i + 1}</span>` +
      (i < s.steps.length - 1 ? '<span class="branch-connector"></span>' : '')
    ).join('');
    const letters = ['a', 'b', 'c', 'd'];
    const firstStep = s.steps[0];
    const opts = firstStep.options.map((o, i) =>
      `<div class="mc-option" data-id="${escHtml(o.id)}" data-correct="${o.correct}" data-feedback="${escHtml(o.feedback)}">
        <span class="mc-option__letter">${letters[i]}</span>
        <span>${escHtml(o.label)}</span>
      </div>`
    ).join('');
    return `<div class="branch-progress">${progress}</div>
      <div class="branch-desc">${firstStep.description}</div>
      <div class="mc-grid branch-options">${opts}</div>
      <div class="branch-feedback-slot"></div>`;
  }

  // ── Event binding ───────────────────────────────────────────────────

  function bindAll(slot, scenarios) {
    scenarios.forEach(s => {
      const el = slot.querySelector(`#${s.id}`);
      if (!el) return;
      switch (s.type) {
        case 'multiple-choice': bindMC(el, s); break;
        case 'multi-select': bindMS(el, s); break;
        case 'sequence': bindSeq(el, s); break;
        case 'terminal': bindTerm(el, s); break;
        case 'branching': bindBranch(el, s); break;
        case 'squad-builder': bindSB(el, s); break;
      }
    });
  }

  function bindMC(el, s) {
    el.querySelectorAll('.mc-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (opt.classList.contains('mc-option--locked')) return;
        const correct = opt.dataset.correct === 'true';
        el.querySelectorAll('.mc-option').forEach(o => {
          o.classList.add('mc-option--locked');
          if (o.dataset.correct === 'true') o.classList.add('mc-option--correct');
        });
        if (!correct) { opt.classList.add('mc-option--wrong', 'shake'); }
        showFeedback(el, correct, s.explanation);
        if (correct) completeScenario(s, el);
      });
    });
  }

  function bindMS(el, s) {
    let selected = new Set();
    const counter = el.querySelector('.ms-counter span');
    const btn = el.querySelector('[data-action="ms-check"]');
    el.querySelectorAll('.ms-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.classList.contains('ms-item--locked')) return;
        const id = item.dataset.id;
        if (selected.has(id)) { selected.delete(id); item.classList.remove('ms-item--selected'); }
        else { selected.add(id); item.classList.add('ms-item--selected'); }
        counter.textContent = selected.size;
        btn.disabled = selected.size !== s.requiredCount;
      });
    });
    btn.addEventListener('click', () => {
      let allCorrect = true;
      el.querySelectorAll('.ms-item').forEach(item => {
        item.classList.add('ms-item--locked');
        const isCorrect = item.dataset.correct === 'true';
        const isSelected = selected.has(item.dataset.id);
        if (isSelected && isCorrect) item.classList.add('ms-item--correct');
        else if (isSelected && !isCorrect) { item.classList.add('ms-item--wrong'); allCorrect = false; }
        else if (!isSelected && isCorrect) { item.classList.add('ms-item--missed'); allCorrect = false; }
      });
      btn.disabled = true;
      showFeedback(el, allCorrect, s.explanation);
      if (allCorrect) completeScenario(s, el);
    });
  }

  function bindSeq(el, s) {
    let order = [];
    const btn = el.querySelector('[data-action="seq-check"]');
    const resetBtn = el.querySelector('[data-action="seq-reset"]');
    const items = el.querySelectorAll('.seq-item');

    items.forEach(item => {
      item.addEventListener('click', () => {
        if (item.classList.contains('seq-item--locked')) return;
        const id = item.dataset.id;
        const idx = order.indexOf(id);
        if (idx !== -1) {
          order.splice(idx, 1);
          item.classList.remove('seq-item--selected');
          refreshSeqNums(el, order, items);
        } else {
          order.push(id);
          item.classList.add('seq-item--selected');
          refreshSeqNums(el, order, items);
        }
        btn.disabled = order.length !== s.items.length;
      });
    });

    btn.addEventListener('click', () => {
      let allCorrect = true;
      items.forEach(item => {
        item.classList.add('seq-item--locked');
        const correctOrder = parseInt(item.dataset.correctOrder);
        const userOrder = order.indexOf(item.dataset.id) + 1;
        const numEl = item.querySelector('.seq-num');
        if (userOrder === correctOrder) {
          item.classList.add('seq-item--correct');
        } else {
          item.classList.add('seq-item--wrong');
          numEl.textContent = correctOrder;
          allCorrect = false;
        }
      });
      btn.disabled = true;
      resetBtn.style.display = 'none';
      showFeedback(el, allCorrect, s.explanation);
      if (allCorrect) completeScenario(s, el);
    });

    resetBtn.addEventListener('click', () => {
      order = [];
      items.forEach(item => {
        item.classList.remove('seq-item--selected', 'seq-item--correct', 'seq-item--wrong', 'seq-item--locked');
        item.querySelector('.seq-num').textContent = '-';
      });
      btn.disabled = true;
      el.querySelector('.scenario__feedback-slot').innerHTML = '';
    });
  }

  function refreshSeqNums(el, order, items) {
    items.forEach(item => {
      const idx = order.indexOf(item.dataset.id);
      item.querySelector('.seq-num').textContent = idx !== -1 ? idx + 1 : '-';
    });
  }

  function bindTerm(el, s) {
    const input = el.querySelector('.term-sim__input');
    const outputEl = el.querySelector('.term-sim__output');
    let answered = false;
    let attempts = 0;
    const maxAttempts = s.maxAttempts || Infinity;

    function check() {
      if (answered) return;
      const val = input.value.trim().toLowerCase();
      const correct = val === s.answer.toLowerCase() ||
        (s.alternateAnswers && s.alternateAnswers.some(a => val === a.toLowerCase()));
      if (correct) {
        answered = true;
        input.disabled = true;
        outputEl.style.display = 'block';
        outputEl.innerHTML = s.successOutput.map(line =>
          `<div class="term-sim__output-line">${line}</div>`
        ).join('');
        showFeedback(el, true, s.explanation);
        completeScenario(s, el);
      } else {
        attempts++;
        input.value = '';
        outputEl.style.display = 'block';
        if (attempts >= maxAttempts) {
          answered = true;
          input.disabled = true;
          outputEl.innerHTML = `<div class="term-sim__error">Tentativas esgotadas (${maxAttempts}/${maxAttempts})</div>
            <div class="term-sim__output-line" style="margin-top:0.5rem;">Resposta: <strong style="color:#4ADE80;">${escHtml(s.answer)}</strong></div>`;
          showFeedback(el, false, s.explanation);
        } else {
          const remaining = maxAttempts - attempts;
          outputEl.innerHTML = `<div class="term-sim__error">Comando não reconhecido. ${remaining} tentativa${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.</div>
            <div class="term-sim__hint">Dica: ${escHtml(s.hint)}</div>`;
          input.classList.add('shake');
          setTimeout(() => input.classList.remove('shake'), 400);
        }
      }
    }

    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  }

  function bindBranch(el, s) {
    let currentStep = 0;

    function bindStepOptions() {
      el.querySelectorAll('.branch-options .mc-option').forEach(opt => {
        opt.addEventListener('click', () => {
          if (opt.classList.contains('mc-option--locked')) return;
          const correct = opt.dataset.correct === 'true';
          const feedback = opt.dataset.feedback;

          el.querySelectorAll('.branch-options .mc-option').forEach(o => {
            o.classList.add('mc-option--locked');
            if (o.dataset.correct === 'true') o.classList.add('mc-option--correct');
          });
          if (!correct) opt.classList.add('mc-option--wrong', 'shake');

          const fbSlot = el.querySelector('.branch-feedback-slot');
          fbSlot.innerHTML = `<div class="branch-feedback branch-feedback--${correct ? 'correct' : 'wrong'}">${escHtml(feedback)}</div>`;

          // Update progress
          const steps = el.querySelectorAll('.branch-step');
          steps[currentStep].classList.remove('branch-step--active');
          steps[currentStep].classList.add('branch-step--done');
          const connectors = el.querySelectorAll('.branch-connector');
          if (connectors[currentStep]) connectors[currentStep].classList.add('branch-connector--done');

          if (correct && currentStep < s.steps.length - 1) {
            setTimeout(() => advanceStep(el, s, currentStep + 1), 1200);
          } else if (correct && currentStep === s.steps.length - 1) {
            showFeedback(el, true, s.explanation);
            completeScenario(s, el);
          } else {
            // Wrong answer: show retry after delay
            setTimeout(() => {
              const retryBtn = document.createElement('button');
              retryBtn.className = 'gam-btn gam-btn--reset';
              retryBtn.textContent = 'Tentar novamente';
              retryBtn.addEventListener('click', () => {
                const scenario = retryBtn.closest('.scenario');
                scenario.querySelector('.branch-feedback-slot').innerHTML = '';
                if (scenario._retryStep) scenario._retryStep();
              });
              fbSlot.appendChild(retryBtn);
            }, 800);
          }
        });
      });
    }

    function advanceStep(el, s, stepIdx) {
      currentStep = stepIdx;
      const step = s.steps[stepIdx];
      const steps = el.querySelectorAll('.branch-step');
      steps[stepIdx].classList.add('branch-step--active');

      el.querySelector('.branch-desc').textContent = step.description;
      el.querySelector('.branch-feedback-slot').innerHTML = '';

      const letters = ['a', 'b', 'c', 'd'];
      el.querySelector('.branch-options').innerHTML = step.options.map((o, i) =>
        `<div class="mc-option" data-id="${o.id}" data-correct="${o.correct}" data-feedback="${o.feedback}">
          <span class="mc-option__letter">${letters[i]}</span>
          <span>${o.label}</span>
        </div>`
      ).join('');

      bindStepOptions();
    }

    // Store retry handler accessible from onclick
    el._retryStep = () => {
      const step = s.steps[currentStep];
      const letters = ['a', 'b', 'c', 'd'];
      const steps = el.querySelectorAll('.branch-step');
      steps[currentStep].classList.add('branch-step--active');
      steps[currentStep].classList.remove('branch-step--done');
      el.querySelector('.branch-options').innerHTML = step.options.map((o, i) =>
        `<div class="mc-option" data-id="${o.id}" data-correct="${o.correct}" data-feedback="${o.feedback}">
          <span class="mc-option__letter">${letters[i]}</span>
          <span>${o.label}</span>
        </div>`
      ).join('');
      bindStepOptions();
    };

    bindStepOptions();
  }

  // ── Squad Builder ──────────────────────────────────────────────────

  function typeIcon(type) {
    const svg = (d, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sb-icon">${d}</svg>`;
    const icons = {
      config:     svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
      agents:     svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
      tasks:      svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
      workflows:  svg('<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>'),
      checklists: svg('<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
      templates:  svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
      data:       svg('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
      skills:     svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>')
    };
    return icons[type] || '?';
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildSB(s) {
    const progress = s.scenarios.map((sc, i) =>
      `<span class="sb-step ${i === 0 ? 'sb-step--active' : ''}" data-step="${i}">${i + 1}</span>` +
      (i < s.scenarios.length - 1 ? '<span class="sb-connector"></span>' : '')
    ).join('');

    const totalCards = s.scenarios.length * 8;
    const first = s.scenarios[0];

    const allCards = [];
    s.scenarios.forEach(sc => {
      sc.components.forEach(comp => {
        allCards.push({ scenarioId: sc.id, type: comp.type, label: comp.label, desc: comp.desc, id: `${sc.id}--${comp.type}` });
      });
    });

    const shuffled = shuffleArray(allCards);
    const deckHTML = shuffled.map(card =>
      `<div class="sb-card" data-card-id="${card.id}" data-type="${card.type}" data-scenario="${card.scenarioId}">
        <div class="sb-card__type sb-card__type--${card.type}">${typeIcon(card.type)}</div>
        <div class="sb-card__label">${card.label}</div>
        <div class="sb-card__desc">${card.desc}</div>
      </div>`
    ).join('');

    const types = ['config','agents','tasks','workflows','checklists','templates','data','skills'];
    const typeLabels = { config:'config.yaml', agents:'agents/', tasks:'tasks/', workflows:'workflows/', checklists:'checklists/', templates:'templates/', data:'data/', skills:'skills/' };
    const slotsHTML = types.map(t =>
      `<div class="sb-slot" data-slot-type="${t}">
        <div class="sb-slot__icon sb-slot__icon--${t}">${typeIcon(t)}</div>
        <div class="sb-slot__label">${typeLabels[t]}</div>
      </div>`
    ).join('');

    return `
      <div class="sb-progress">${progress}</div>
      <div class="sb-pool-counter"><span>${totalCards}</span> cartas restantes</div>
      <div class="sb-scenario">
        <div class="sb-scenario__client">${first.client}</div>
        <div class="sb-scenario__request">"${first.request}"</div>
        <div class="sb-scenario__squad">Squad: <strong>${first.squadName}</strong></div>
      </div>
      <div class="sb-slots">${slotsHTML}</div>
      <div class="sb-deck">${deckHTML}</div>
      <div class="sb-result-slot"></div>`;
  }

  function updateSlotGuide(el, filledSlots) {
    const slots = el.querySelectorAll('.sb-slot');
    let step = 1;
    slots.forEach(slot => {
      const type = slot.dataset.slotType;
      const badge = slot.querySelector('.sb-slot__step');
      if (filledSlots.has(type)) {
        slot.classList.remove('sb-slot--next');
        if (badge) badge.remove();
      } else {
        if (!badge) {
          const b = document.createElement('span');
          b.className = 'sb-slot__step';
          b.textContent = step;
          slot.appendChild(b);
        } else {
          badge.textContent = step;
        }
        if (step === 1) {
          slot.classList.add('sb-slot--next');
        } else {
          slot.classList.remove('sb-slot--next');
        }
        step++;
      }
    });
  }

  function bindSB(el, s) {
    let currentScenario = 0;
    let filledSlots = new Set();
    let removedCards = new Set();

    // Init slot guide
    updateSlotGuide(el, filledSlots);

    function updatePool() {
      const counter = el.querySelector('.sb-pool-counter span');
      const total = s.scenarios.length * 8;
      counter.textContent = total - removedCards.size;
    }

    function updateCardStates() {
      el.querySelectorAll('.sb-card').forEach(card => {
        const cardId = card.dataset.cardId;
        if (removedCards.has(cardId)) {
          card.classList.add('sb-card--removed');
        }
      });
    }

    function advanceScenario() {
      const steps = el.querySelectorAll('.sb-step');
      const connectors = el.querySelectorAll('.sb-connector');
      steps[currentScenario].classList.remove('sb-step--active');
      steps[currentScenario].classList.add('sb-step--done');
      if (connectors[currentScenario]) connectors[currentScenario].classList.add('sb-connector--done');

      currentScenario++;
      if (currentScenario >= s.scenarios.length) {
        showFeedback(el, true, 'Parabéns! Você montou todos os 5 squads corretamente. Cada squad tem seus 8 componentes — config, agents, tasks, workflows, checklists, templates, data e skills — trabalhando juntos como uma equipe completa.');
        completeScenario(s, el);
        return;
      }

      steps[currentScenario].classList.add('sb-step--active');
      filledSlots = new Set();

      // Reset slots
      el.querySelectorAll('.sb-slot').forEach(slot => {
        slot.classList.remove('sb-slot--filled');
        slot.querySelector('.sb-slot__filled-label')?.remove();
      });

      // Update scenario display
      const sc = s.scenarios[currentScenario];
      el.querySelector('.sb-scenario__client').textContent = sc.client;
      el.querySelector('.sb-scenario__request').textContent = `"${sc.request}"`;
      el.querySelector('.sb-scenario__squad').innerHTML = `Squad: <strong>${escHtml(sc.squadName)}</strong>`;

      // Clear result slot
      el.querySelector('.sb-result-slot').innerHTML = '';

      updateSlotGuide(el, filledSlots);
      updateCardStates();
    }

    // Bind card clicks
    el.querySelectorAll('.sb-card').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('sb-card--removed')) return;

        const cardId = card.dataset.cardId;
        const cardType = card.dataset.type;
        const cardScenario = card.dataset.scenario;
        const currentId = s.scenarios[currentScenario].id;

        // Wrong card (wrong scenario or slot already filled)
        if (cardScenario !== currentId || filledSlots.has(cardType)) {
          card.classList.add('sb-card--wrong');
          setTimeout(() => card.classList.remove('sb-card--wrong'), 400);
          return;
        }

        // Correct card
        filledSlots.add(cardType);
        removedCards.add(cardId);
        card.classList.add('sb-card--removed');

        // Fill slot
        const slot = el.querySelector(`.sb-slot[data-slot-type="${cardType}"]`);
        slot.classList.add('sb-slot--filled');
        const filledLabel = document.createElement('div');
        filledLabel.className = 'sb-slot__filled-label';
        filledLabel.textContent = card.querySelector('.sb-card__label').textContent;
        slot.appendChild(filledLabel);

        updatePool();
        updateSlotGuide(el, filledSlots);

        // Check if all 8 filled
        if (filledSlots.size === 8) {
          const resultSlot = el.querySelector('.sb-result-slot');
          resultSlot.innerHTML = `<div class="sb-round-complete">Squad <strong>${escHtml(s.scenarios[currentScenario].squadName)}</strong> montado!</div>`;
          setTimeout(() => advanceScenario(), 1500);
        }
      });
    });

    updateCardStates();
  }

  // ── XP helper ──────────────────────────────────────────────────────

  function completeScenario(s, el) {
    el.classList.add('scenario--completed');
    const page = el.closest('.scenario-slot')?.dataset.page || '';
    const existing = Persistence?.isScenarioCompleted?.(s.id);
    const attempts = existing ? 1 : 0; // 0 = first attempt
    const pts = Leaderboard?.calculatePoints?.(s, attempts) || 0;
    Persistence?.saveScenarioResult?.(s.id, page, true, pts);
    if (pts > 0) Leaderboard?.showXPToast?.(pts);
    Leaderboard?.refresh?.();
  }

  // ── Shared feedback ─────────────────────────────────────────────────

  function showFeedback(scenarioEl, correct, explanation) {
    const slot = scenarioEl.querySelector('.scenario__feedback-slot');
    slot.innerHTML = `<div class="scenario__feedback scenario__feedback--${correct ? 'correct' : 'wrong'}">
      <strong>${correct ? 'Correto!' : 'Incorreto.'}</strong> ${escHtml(explanation)}
    </div>`;
  }

  return { init, renderSlots };
})();
