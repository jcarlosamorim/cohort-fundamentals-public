/* ==========================================================================
   Quiz & Certificate Logic — Cohort AIOS Fundamentals
   ========================================================================== */

(function () {
  'use strict';

  // ── Quiz Data: 8 perguntas, uma por encontro ──
  const QUESTIONS = [
    {
      encontro: 1,
      topic: 'Setup & Fundamentos',
      question: 'Qual arquivo garante que o Claude Code "lembra" do contexto do seu projeto entre sessoes?',
      options: [
        'package.json',
        'CLAUDE.md',
        '.gitignore',
        'config.yaml'
      ],
      correct: 1,
      feedback: 'O CLAUDE.md e a "memoria" do projeto. Sem ele, voce recomeca do zero toda vez — como a Lucy que nao lembrava do dia anterior.'
    },
    {
      encontro: 2,
      topic: 'Liberdade e Empoderamento',
      question: 'Qual e a formula de transferencia de conhecimento apresentada no Encontro 2?',
      options: [
        'Input + Output = Resultado',
        'Emissor x Canal x Receptor',
        'Dados + Modelo = Insight',
        'Prompt + Contexto = Resposta'
      ],
      correct: 1,
      feedback: 'Conhecimento transferido = Emissor x Canal x Receptor. Se qualquer fator for zero, a transferencia e zero. O AIOS maximiza os tres.'
    },
    {
      encontro: 3,
      topic: 'Squad e Vida',
      question: 'No Encontro 3, um squad de IA e comparado a qual tipo de equipe?',
      options: [
        'Time de futebol',
        'Orquestra musical',
        'Equipe de reforma de casa',
        'Equipe medica de cirurgia'
      ],
      correct: 2,
      feedback: 'Squad = Equipe de Reforma. Tem eletricista, encanador, pedreiro, pintor — cada um com suas ferramentas e seguindo um cronograma. Um squad de IA funciona exatamente assim.'
    },
    {
      encontro: 4,
      topic: 'Maker ou Thinker',
      question: 'Qual e a principal diferenca entre o perfil Maker e o Thinker no AIOS?',
      options: [
        'Maker usa Windows, Thinker usa Mac',
        'Maker abre o terminal e constroi, Thinker planeja e documenta',
        'Maker trabalha sozinho, Thinker trabalha em equipe',
        'Maker usa Python, Thinker usa JavaScript'
      ],
      correct: 1,
      feedback: 'O Maker e o Chef — abre o terminal e vai pra mao na massa. O Thinker e o Critico — planeja, desenha, documenta antes de executar. Nenhum dos dois esta errado.'
    },
    {
      encontro: 5,
      topic: 'PRD e a Alma',
      question: 'No caso Boeing 737 MAX do Encontro 5, qual foi a causa raiz dos dois desastres que mataram 346 pessoas?',
      options: [
        'Falha mecanica no motor',
        'Erro de pilotagem',
        'Documentacao omitida sobre o sistema MCAS',
        'Condicoes climaticas adversas'
      ],
      correct: 2,
      feedback: 'A Boeing escondeu o sistema MCAS dos manuais dos pilotos. Eles nao sabiam que o aviao podia empurrar o nariz pra baixo sozinho. Documentacao omitida = desastre. No software, PRD omitido = projeto que falha.'
    },
    {
      encontro: 6,
      topic: 'Transformando o Velho em Novo',
      question: 'Qual processo do AIOS e usado para mapear e profissionalizar um projeto existente de vibecoding?',
      options: [
        'Greenfield Discovery',
        'Brownfield Discovery',
        'Code Review Automatizado',
        'Sprint Planning'
      ],
      correct: 1,
      feedback: 'Brownfield Discovery e o processo que mapeia um projeto existente — identifica a stack, estrutura, debito tecnico e gera um relatorio completo. E assim que voce transforma vibecoding em producao.'
    },
    {
      encontro: 7,
      topic: 'Primeira Task AIOS',
      question: 'No Encontro 7, qual e o primeiro passo antes de criar uma task AIOS do zero?',
      options: [
        'Escrever o codigo da task',
        'Fazer deploy na Vercel',
        'Criar um mini-projeto com stories e identificar o gap',
        'Configurar o pipeline de CI/CD'
      ],
      correct: 2,
      feedback: 'Antes de criar qualquer task, voce precisa de contexto real: um mini-projeto com stories, dependencias, e a percepcao de que falta uma peca. Do gap ao funcionando.'
    },
    {
      encontro: 8,
      topic: 'A Fabrica — Projeto Final',
      question: 'Quais sao as 8 pecas que compoem a estrutura completa de um squad AIOS?',
      options: [
        'HTML, CSS, JS, API, DB, Auth, Deploy, Tests',
        'config.yaml, agents, tasks, workflows, checklists, templates, data, skills',
        'Frontend, Backend, Database, Cache, Queue, Storage, CDN, DNS',
        'PRD, Epic, Story, Task, Test, Review, Deploy, Monitor'
      ],
      correct: 1,
      feedback: 'Um squad completo tem 8 pecas: config.yaml (configuracao central), agents, tasks, workflows, checklists, templates, data e skills. Cada peca tem um papel claro na "equipe de reforma".'
    }
  ];

  const PASS_THRESHOLD = 6; // 75% = 6 de 8

  let currentQuestion = 0;
  let answers = new Array(QUESTIONS.length).fill(-1);
  let answered = new Array(QUESTIONS.length).fill(false);

  // ── Init ──
  function initQuiz() {
    const container = document.getElementById('quiz-root');
    if (!container) return;
    renderQuestion();
  }

  // ── Render Question ──
  function renderQuestion() {
    const root = document.getElementById('quiz-root');
    const q = QUESTIONS[currentQuestion];
    const letters = ['A', 'B', 'C', 'D'];

    root.innerHTML = `
      <div class="quiz-container">
        <!-- Progress -->
        <div class="quiz-progress">
          <div class="quiz-progress__bar">
            <div class="quiz-progress__fill" style="width: ${((currentQuestion + 1) / QUESTIONS.length) * 100}%"></div>
          </div>
          <div class="quiz-progress__label">${currentQuestion + 1} / ${QUESTIONS.length}</div>
        </div>

        <!-- Question Card -->
        <div class="quiz-question">
          <div class="quiz-question__badge">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Encontro ${q.encontro} &bull; ${q.topic}
          </div>
          <div class="quiz-question__text">${q.question}</div>

          <div class="quiz-options">
            ${q.options.map((opt, i) => `
              <div class="quiz-option ${answers[currentQuestion] === i ? 'quiz-option--selected' : ''} ${answered[currentQuestion] ? 'quiz-option--disabled' : ''} ${answered[currentQuestion] && i === q.correct ? 'quiz-option--correct quiz-option--highlight' : ''} ${answered[currentQuestion] && answers[currentQuestion] === i && i !== q.correct ? 'quiz-option--wrong quiz-option--highlight' : ''}"
                   onclick="window.__quizSelect(${i})">
                <div class="quiz-option__letter">${letters[i]}</div>
                <div class="quiz-option__text">${opt}</div>
              </div>
            `).join('')}
          </div>

          ${answered[currentQuestion] ? `
            <div class="quiz-feedback ${answers[currentQuestion] === q.correct ? 'quiz-feedback--correct' : 'quiz-feedback--wrong'}">
              <strong>${answers[currentQuestion] === q.correct ? 'Correto!' : 'Incorreto.'}</strong> ${q.feedback}
            </div>
          ` : ''}
        </div>

        <!-- Navigation -->
        <div class="quiz-nav">
          <button class="quiz-btn quiz-btn--secondary" onclick="window.__quizPrev()" ${currentQuestion === 0 ? 'style="visibility:hidden"' : ''}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Anterior
          </button>
          ${answered[currentQuestion] ? `
            <button class="quiz-btn quiz-btn--primary" onclick="window.__quizNext()">
              ${currentQuestion === QUESTIONS.length - 1 ? 'Ver Resultado' : 'Proxima'}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ` : `
            <button class="quiz-btn quiz-btn--primary" disabled>
              Selecione uma opcao
            </button>
          `}
        </div>
      </div>
    `;
  }

  // ── Select Option ──
  window.__quizSelect = function (idx) {
    if (answered[currentQuestion]) return;
    answers[currentQuestion] = idx;
    answered[currentQuestion] = true;
    renderQuestion();
  };

  // ── Navigation ──
  window.__quizPrev = function () {
    if (currentQuestion > 0) {
      currentQuestion--;
      renderQuestion();
    }
  };

  window.__quizNext = function () {
    if (currentQuestion < QUESTIONS.length - 1) {
      currentQuestion++;
      renderQuestion();
    } else {
      renderResults();
    }
  };

  // ── Results ──
  function renderResults() {
    const root = document.getElementById('quiz-root');
    const score = answers.reduce((acc, ans, i) => acc + (ans === QUESTIONS[i].correct ? 1 : 0), 0);
    const passed = score >= PASS_THRESHOLD;
    const pct = Math.round((score / QUESTIONS.length) * 100);

    root.innerHTML = `
      <div class="quiz-container">
        <div class="quiz-question" style="border-color: ${passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'};">
          <div class="quiz-results">
            <div class="quiz-results__score">${score}/${QUESTIONS.length}</div>
            <div class="quiz-results__label">${pct}% de acerto</div>
            <div class="quiz-results__status ${passed ? 'quiz-results__status--pass' : 'quiz-results__status--fail'}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                ${passed
                  ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                  : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
                }
              </svg>
              ${passed ? 'Aprovado! Certificado liberado.' : 'Nao atingiu a nota minima (75%). Tente novamente.'}
            </div>

            <!-- Review Grid -->
            <div class="quiz-review">
              ${QUESTIONS.map((q, i) => {
                const correct = answers[i] === q.correct;
                return `
                  <div class="quiz-review__item ${correct ? 'quiz-review__item--correct' : 'quiz-review__item--wrong'}">
                    <div class="quiz-review__icon ${correct ? 'quiz-review__icon--correct' : 'quiz-review__icon--wrong'}">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${correct ? '#22C55E' : '#EF4444'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        ${correct
                          ? '<polyline points="20 6 9 17 4 12"/>'
                          : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
                        }
                      </svg>
                    </div>
                    <div class="quiz-review__encontro">E${q.encontro}: ${q.topic}</div>
                  </div>
                `;
              }).join('')}
            </div>

            ${passed ? `
              <!-- Name Input for Certificate -->
              <div class="quiz-name-input">
                <label for="cert-name">Digite seu nome completo para o certificado:</label>
                <input type="text" id="cert-name" placeholder="Seu nome completo" maxlength="60" />
                <button class="quiz-btn quiz-btn--primary" onclick="window.__generateCert()">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Gerar Certificado
                </button>
              </div>
            ` : `
              <div style="margin-top: 1.5rem;">
                <button class="quiz-btn quiz-btn--primary" onclick="window.__retryQuiz()">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Tentar Novamente
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ── Retry ──
  window.__retryQuiz = function () {
    currentQuestion = 0;
    answers = new Array(QUESTIONS.length).fill(-1);
    answered = new Array(QUESTIONS.length).fill(false);
    renderQuestion();
  };

  // ── Generate Certificate ──
  window.__generateCert = function () {
    const nameInput = document.getElementById('cert-name');
    const name = (nameInput && nameInput.value.trim()) || 'Aluno';
    if (name.length < 3) {
      nameInput.style.borderColor = '#EF4444';
      nameInput.focus();
      return;
    }

    const score = answers.reduce((acc, ans, i) => acc + (ans === QUESTIONS[i].correct ? 1 : 0), 0);
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const certId = 'AIOS-FUND-' + today.getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const root = document.getElementById('quiz-root');
    root.innerHTML = `
      <div class="quiz-container">
        <div class="certificate-wrapper">
          <div class="certificate" id="certificate">
            <div class="certificate__corner certificate__corner--tl"></div>
            <div class="certificate__corner certificate__corner--tr"></div>
            <div class="certificate__corner certificate__corner--bl"></div>
            <div class="certificate__corner certificate__corner--br"></div>

            <div class="certificate__badge">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Certificado de Conclusao
            </div>

            <div class="certificate__title">AIOS Cohort Fundamentals</div>
            <div class="certificate__subtitle">Mentor: Jose Carlos Amorim</div>

            <div class="certificate__name">${escapeHtml(name)}</div>

            <div class="certificate__desc">
              Concluiu com exito o curso <strong>AIOS Cohort Fundamentals</strong> (Encontros E1 a E8),
              demonstrando dominio dos fundamentos de orquestracao de agentes de IA,
              com aproveitamento de <strong>${Math.round((score / QUESTIONS.length) * 100)}%</strong> no quiz de certificacao.
            </div>

            <div class="certificate__meta">
              <div class="certificate__meta-item">
                <div class="certificate__meta-label">Data</div>
                <div class="certificate__meta-value">${dateStr}</div>
              </div>
              <div class="certificate__meta-item">
                <div class="certificate__meta-label">Nota</div>
                <div class="certificate__meta-value">${score}/${QUESTIONS.length}</div>
              </div>
              <div class="certificate__meta-item">
                <div class="certificate__meta-label">ID</div>
                <div class="certificate__meta-value">${certId}</div>
              </div>
            </div>
          </div>

          <div class="certificate-actions">
            <button class="quiz-btn quiz-btn--primary" onclick="window.__downloadCert()">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Baixar como Imagem
            </button>
            <button class="quiz-btn quiz-btn--secondary" onclick="window.__retryQuiz()">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Refazer Quiz
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // ── Download Certificate as Image ──
  window.__downloadCert = function () {
    const cert = document.getElementById('certificate');
    if (!cert) return;

    // Use html2canvas if available, otherwise fallback to print
    if (typeof html2canvas === 'function') {
      html2canvas(cert, {
        backgroundColor: '#0A0A0A',
        scale: 2,
        useCORS: true
      }).then(function (canvas) {
        const link = document.createElement('a');
        link.download = 'certificado-aios-fundamentals.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    } else {
      // Fallback: open print dialog
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html><head><title>Certificado AIOS Fundamentals</title>
        <style>
          body { margin: 0; padding: 2rem; background: #0A0A0A; font-family: 'Inter', sans-serif; }
          ${document.querySelector('link[href*="tokens.css"]') ? '' : ''}
        </style>
        <link rel="stylesheet" href="${window.location.origin}/css/tokens.css">
        <link rel="stylesheet" href="${window.location.origin}/css/quiz.css">
        </head><body>${cert.outerHTML}
        <script>setTimeout(function(){ window.print(); }, 500);<\/script>
        </body></html>
      `);
      printWindow.document.close();
    }
  };

  // ── Helpers ──
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Auto-init when DOM is ready ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuiz);
  } else {
    initQuiz();
  }
})();
