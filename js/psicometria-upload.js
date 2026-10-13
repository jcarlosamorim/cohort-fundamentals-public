/**
 * PsicoUpload — Upload handler for Psicometria dashboard
 * Handles PDF/MD/TXT file upload, text extraction, and API call
 */
var PsicoUpload = (function() {
  'use strict';

  var ACCEPTED = '.pdf,.md,.txt';
  var MAX_CHARS = 100000;
  var LS_KEY_BASE = 'psicometria_data_v2';
  var LS_SRC_BASE = 'psicometria_source_v2';
  var _curiosityTimer = null;

  function _uid() {
    var user = typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser() : null;
    return user ? user.id : null;
  }
  function lsKey() { var id = _uid(); return id ? LS_KEY_BASE + '_' + id : null; }
  function lsSrcKey() { var id = _uid(); return id ? LS_SRC_BASE + '_' + id : null; }

  var CURIOSITIES = [
    'Gay Hendricks descobriu que 70% dos profissionais operam na Zona de Compet\u00eancia \u2014 fazem bem, mas n\u00e3o \u00e9 genialidade.',
    'O CliftonStrengths identificou 34 talentos humanos. A chance de algu\u00e9m ter o mesmo Top 5 que voc\u00ea \u00e9 de 1 em 33 milh\u00f5es.',
    'Kathy Kolbe provou que o instinto conativo (como agimos) \u00e9 independente do QI e da personalidade.',
    'Alex Hormozi calcula que cada 10% migrado para a Zona de Genialidade pode gerar retorno exponencial no faturamento.',
    'Dan Sullivan criou o conceito de "Unique Ability" ao perceber que empreendedores de sucesso delegam 80% do seu trabalho.',
    'Roger Hamilton identificou 8 perfis de riqueza \u2014 cada pessoa gera valor de forma naturalmente diferente.',
    'Sally Hogshead descobriu que voc\u00ea n\u00e3o precisa mudar quem \u00e9 para fascinar \u2014 precisa amplificar o que j\u00e1 faz bem.',
    'Pessoas que investem nos seus Top 5 talentos t\u00eam 6x mais engajamento no trabalho, segundo a Gallup.',
    'O Kolbe A \u00e9 o \u00fanico teste que mede a\u00e7\u00e3o instintiva \u2014 n\u00e3o o que voc\u00ea sabe ou sente, mas como age sob press\u00e3o.',
    'A Equa\u00e7\u00e3o de Valor de Hormozi: se o esfor\u00e7o e tempo forem zero, o valor percebido tende ao infinito.',
    'Hendricks chama de "Upper Limit Problem" o autossabotamento que ocorre quando alcan\u00e7amos a Zona de Genialidade.',
    'Apenas 2% das pessoas operam consistentemente na Zona de Genialidade, segundo pesquisas de Hendricks.',
    'O conceito de Flow (Csikszentmihalyi) \u00e9 o estado neurol\u00f3gico da Zona de Genialidade \u2014 foco total, tempo distorcido.',
    'Investidores como Warren Buffett passam 80% do tempo lendo \u2014 Investigador alto no Kolbe A.',
    'O "10x Multiplier" de Dan Sullivan diz: foque no que s\u00f3 voc\u00ea faz e delegue o resto para crescer 10x.',
    'O Fascination Advantage de Hogshead tem 49 arqu\u00e9tipos \u2014 cada um \u00e9 uma combina\u00e7\u00e3o \u00fanica de 2 vantagens.',
    'Empreendedores com perfil "Dynamo" (Hamilton) s\u00e3o melhores em iniciar projetos, mas precisam de "Steel" para manter.',
    'Estudos mostram que pessoas na Zona de Genialidade produzem 3-5x mais que na Zona de Compet\u00eancia.',
    'A converg\u00eancia de m\u00faltiplos frameworks revela padr\u00f5es invis\u00edveis em an\u00e1lises isoladas.',
    'Este dashboard cruza 7 frameworks cient\u00edficos para criar seu blueprint cognitivo personalizado.'
  ];

  function init() {
    var dropzone = document.getElementById('psico-dropzone');
    var fileInput = document.getElementById('psico-file-input');
    var reBtn = document.getElementById('psico-reanalyze-btn');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', function() { fileInput.click(); });
    dropzone.addEventListener('dragover', function(e) {
      e.preventDefault(); dropzone.classList.add('psico-dropzone--hover');
    });
    dropzone.addEventListener('dragleave', function() {
      dropzone.classList.remove('psico-dropzone--hover');
    });
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault(); dropzone.classList.remove('psico-dropzone--hover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function() {
      if (fileInput.files.length) handleFile(fileInput.files[0]);
    });
    if (reBtn) {
      reBtn.addEventListener('click', function() {
        var k = lsKey(); if (k) localStorage.removeItem(k);
        var sk = lsSrcKey(); if (sk) localStorage.removeItem(sk);
        showUpload();
      });
    }
  }

  function handleFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (['pdf', 'md', 'txt'].indexOf(ext) === -1) {
      showError('Formato n\u00e3o suportado. Use .pdf, .md ou .txt');
      return;
    }
    showLoading(file.name);
    if (ext === 'pdf') {
      extractPdf(file);
    } else {
      var reader = new FileReader();
      reader.onload = function() { sendToApi(reader.result, file.name); };
      reader.onerror = function() { showError('Erro ao ler o arquivo'); };
      reader.readAsText(file);
    }
  }

  function extractPdf(file) {
    loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', function() {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      var reader = new FileReader();
      reader.onload = function() {
        var arr = new Uint8Array(reader.result);
        pdfjsLib.getDocument({ data: arr }).promise.then(function(pdf) {
          var pages = []; var total = pdf.numPages;
          function next(i) {
            if (i > total) {
              sendToApi(pages.join('\n\n'), file.name);
              return;
            }
            pdf.getPage(i).then(function(page) {
              page.getTextContent().then(function(tc) {
                pages.push(tc.items.map(function(it) { return it.str; }).join(' '));
                next(i + 1);
              });
            });
          }
          next(1);
        }).catch(function() { showError('Erro ao processar PDF'); });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function sendToApi(text, fileName) {
    if (text.length < 50) { showError('Texto muito curto para an\u00e1lise'); return; }
    // Save original text for Aurora assistant (user-scoped)
    var srcK = lsSrcKey();
    if (srcK) try { localStorage.setItem(srcK, text.slice(0, MAX_CHARS)); } catch(e) {}
    var fetchHeaders = { 'Content-Type': 'application/json' };
    var authH = typeof Auth !== 'undefined' && Auth.authHeaders ? Auth.authHeaders() : {};
    if (authH.Authorization) fetchHeaders.Authorization = authH.Authorization;

    fetch('/api/analyze', {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({ text: text.slice(0, MAX_CHARS), fileName: fileName })
    })
    .then(function(r) {
      if (r.status === 429) {
        return r.json().then(function(data) {
          var resetDate = data.quota && data.quota.resetAt ? new Date(data.quota.resetAt) : null;
          var resetStr = resetDate ? resetDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'em breve';
          throw new Error('Voc\u00ea j\u00e1 usou suas ' + (data.quota ? data.quota.limit : 3) + ' an\u00e1lises desta semana. Pr\u00f3ximo reset: ' + resetStr + '.');
        });
      }
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Erro ' + r.status); });
      return r.json();
    })
    .then(function(data) {
      stopCuriosityRotation();
      // L1: localStorage user-scoped (instant next load)
      var k = lsKey();
      if (k) localStorage.setItem(k, JSON.stringify(data));
      // L2: Supabase (persistent, cross-device)
      if (typeof Persistence !== 'undefined') {
        Persistence.savePsicometria(data, text.slice(0, MAX_CHARS), fileName);
      }
      if (typeof PsicoRenderer !== 'undefined') PsicoRenderer.render(data);
      if (typeof Aurora !== 'undefined') Aurora.init();
    })
    .catch(function(err) { stopCuriosityRotation(); showError(err.message || 'Erro na an\u00e1lise'); });
  }

  function showUpload() {
    var up = document.getElementById('psico-upload');
    var db = document.getElementById('psico-dashboard');
    if (up) up.style.display = '';
    if (db) db.style.display = 'none';
    var dz = document.getElementById('psico-dropzone');
    if (dz) dz.className = 'psico-dropzone';
    var err = document.getElementById('psico-upload-error');
    if (err) err.style.display = 'none';
  }

  function showLoading(name) {
    var dz = document.getElementById('psico-dropzone');
    if (dz) dz.className = 'psico-dropzone psico-dropzone--loading';
    var label = document.getElementById('psico-dropzone-label');
    if (label) {
      label.innerHTML = '<div class="psico-spinner"></div>Analisando <strong>' + escHtml(name) + '</strong>...'
        + '<br><span class="psico-curiosity" id="psico-curiosity"></span>'
        + '<br><span style="font-size:0.65rem;color:var(--color-text-muted)">Isso vai demorar de 3 a 5 minutos, transformar sua vida toda em uma p\u00e1gina, nuuuu... num \u00e9 tarefa f\u00e1cil.</span>';
      startCuriosityRotation();
    }
    var err = document.getElementById('psico-upload-error');
    if (err) err.style.display = 'none';
  }

  function startCuriosityRotation() {
    stopCuriosityRotation();
    showRandomCuriosity();
    _curiosityTimer = setInterval(showRandomCuriosity, 5000);
  }

  function stopCuriosityRotation() {
    if (_curiosityTimer) { clearInterval(_curiosityTimer); _curiosityTimer = null; }
  }

  function showRandomCuriosity() {
    var el = document.getElementById('psico-curiosity');
    if (!el) return;
    var idx = Math.floor(Math.random() * CURIOSITIES.length);
    el.style.opacity = '0';
    setTimeout(function() {
      el.textContent = CURIOSITIES[idx];
      el.style.opacity = '1';
    }, 300);
  }

  function showError(msg) {
    var dz = document.getElementById('psico-dropzone');
    if (dz) dz.className = 'psico-dropzone';
    var label = document.getElementById('psico-dropzone-label');
    if (label) label.innerHTML = 'Arraste seu arquivo aqui ou <strong>clique para selecionar</strong><br><span style="font-size:0.7rem;color:var(--color-text-muted)">.pdf, .md ou .txt</span>';
    var err = document.getElementById('psico-upload-error');
    if (err) { err.textContent = msg; err.style.display = 'block'; }
  }

  function loadScript(src, cb) {
    if (document.querySelector('script[src="' + src + '"]')) { cb(); return; }
    var s = document.createElement('script');
    s.src = src; s.onload = cb;
    s.onerror = function() { showError('Erro ao carregar depend\u00eancia'); };
    document.head.appendChild(s);
  }

  function escHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  return { init: init, showUpload: showUpload };
})();
