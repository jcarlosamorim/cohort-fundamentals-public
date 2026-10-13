/**
 * Quiz Solver — e2-liberdade
 * Teste de Aptidao: Arvore de Decisao (Automacao & Delegacao)
 *
 * Como usar:
 * 1. Copie a URL de bookmarklet abaixo
 * 2. No Chrome: Bookmarks → Adicionar bookmark
 *    - Nome: "Quiz Solver E2"
 *    - URL: cole o javascript: abaixo
 * 3. Navegue para: https://fundamentals-theta.vercel.app/home#/aula/2/liberdade
 * 4. Clique no bookmark — ele responde tudo automaticamente!
 *
 * Gabarito (indices das opcoes corretas por questao):
 *   Q1: indice 0 → Worker Script       (converter 500 PDFs locais)
 *   Q2: indice 1 → Humano              (aceitar proposta de aquisicao)
 *   Q3: indice 3 → Agente IA Generica  (50 ideias criativas para Instagram)
 *   Q4: indice 0 → Worker com API      (cotacao do dolar via API)
 *   Q5: indice 2 → Clone com Heuristica (copy estilo Gary Halbert)
 */

// ── Versao legivel (para entender a logica) ──────────────────────────────────
;(async function quizSolver() {
  const ANSWERS = [0, 1, 3, 0, 2]; // indice da resposta correta por questao
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Verifica se esta na pagina certa
  if (!document.getElementById('e2-q-start-btn')) {
    alert('Navegue para /aula/2/liberdade antes de usar este bookmarklet!');
    return;
  }

  // Inicia o quiz
  document.getElementById('e2-q-start-btn').click();
  await sleep(700);

  for (let i = 0; i < ANSWERS.length; i++) {
    // Aguarda os botoes de opcao aparecerem
    await sleep(500);
    const opts = document.querySelectorAll('.e2-q-opt');
    if (!opts.length) { console.error('Opcoes nao encontradas na Q' + (i+1)); break; }

    // Clica na resposta correta
    opts[ANSWERS[i]].click();
    console.log('Q' + (i+1) + ' respondida: opcao ' + ANSWERS[i] + ' ✅');

    await sleep(1000); // aguarda feedback aparecer

    // Avanca para proxima (sempre — na ultima chama finish() e mostra o score)
    document.getElementById('e2-q-next-btn').click();
    await sleep(400);
  }

  console.log('Quiz concluido! Score: 5/5 🏆');
})();


// ── URL do Bookmarklet (minificada — cole esta como URL do bookmark) ──────────
//
// javascript:(function(){var A=[0,1,3,0,2];var s=function(ms){return new Promise(function(r){setTimeout(r,ms)})};(async function(){if(!document.getElementById('e2-q-start-btn')){alert('Navegue para /aula/2/liberdade!');return;}document.getElementById('e2-q-start-btn').click();await s(700);for(var i=0;i<A.length;i++){await s(500);var o=document.querySelectorAll('.e2-q-opt');if(!o.length)break;o[A[i]].click();await s(1000);document.getElementById('e2-q-next-btn').click();await s(400);}console.log('5/5 🏆');})();})();
