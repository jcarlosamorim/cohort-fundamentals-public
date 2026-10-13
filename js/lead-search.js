/* ==========================================================================
   LEAD-SEARCH - Replaced with Apify instruction card
   No longer uses api/leads.js. Shows manual instructions instead.
   IIFE pattern matching Sidebar/Router/Persistence modules
   ========================================================================== */

const LeadSearch = (() => {
  let containerEl = null;

  function init(el) {
    containerEl = el;
    if (!containerEl) return;
    render();
  }

  function render() {
    if (!containerEl) return;

    containerEl.innerHTML = ''
      + '<div class="section-label">'
      + '  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
      + '  Como Encontrar Leads'
      + '</div>'
      + '<div class="biz-apify-card">'
      + '  <div class="biz-apify-card__header">'
      + '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l7-7"/><circle cx="12" cy="12" r="3"/></svg>'
      + '    <div>'
      + '      <strong>Apify — Scraping de Leads</strong>'
      + '      <span class="biz-apify-card__subtitle">Ferramenta gratuita para buscar perfis</span>'
      + '    </div>'
      + '  </div>'
      + '  <div class="biz-apify-card__steps">'
      + '    <div class="biz-apify-step">'
      + '      <span class="biz-apify-step__num">1</span>'
      + '      <div>'
      + '        <strong>Crie uma conta gratuita</strong>'
      + '        <p>Acesse <code>apify.com</code> e crie sua conta. O plano gratuito permite ate 30 scrapes/mes.</p>'
      + '      </div>'
      + '    </div>'
      + '    <div class="biz-apify-step">'
      + '      <span class="biz-apify-step__num">2</span>'
      + '      <div>'
      + '        <strong>Escolha o Actor certo</strong>'
      + '        <p>Busque no Apify Store:</p>'
      + '        <ul>'
      + '          <li><code>Instagram Profile Scraper</code> — busca por hashtag, localizacao ou perfil</li>'
      + '          <li><code>LinkedIn Profile Scraper</code> — busca por cargo, empresa ou palavra-chave</li>'
      + '          <li><code>Google Maps Scraper</code> — busca negocios locais por nicho + cidade</li>'
      + '        </ul>'
      + '      </div>'
      + '    </div>'
      + '    <div class="biz-apify-step">'
      + '      <span class="biz-apify-step__num">3</span>'
      + '      <div>'
      + '        <strong>Configure e execute</strong>'
      + '        <p>Defina os filtros (nicho, cidade, quantidade) e clique em "Start". O Apify retorna nomes, handles, bios e seguidores.</p>'
      + '      </div>'
      + '    </div>'
      + '    <div class="biz-apify-step">'
      + '      <span class="biz-apify-step__num">4</span>'
      + '      <div>'
      + '        <strong>Adicione ao seu Pipeline</strong>'
      + '        <p>Use o botao <strong>"Adicionar Lead"</strong> acima para cadastrar manualmente os melhores leads encontrados.</p>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '  <div class="biz-apify-card__tip">'
      + '    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5C8.35 12.26 8.82 13.02 9 14"/></svg>'
      + '    <span>Dica: Comece pelo <strong>Google Maps Scraper</strong> para encontrar negocios locais no seu nicho. E gratuito e nao precisa de login social.</span>'
      + '  </div>'
      + '</div>';
  }

  return { init };
})();
