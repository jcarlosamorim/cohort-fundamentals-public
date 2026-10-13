# Story: Adicionar Favicon para Eliminar Erros 404

## Metadata
- **Story ID:** FUNDAMENTALS-FIX-01
- **Epic:** Qualidade e Estabilidade da Plataforma
- **Status:** Ready
- **Priority:** P1 — Causa ruído no error-logger + WhatsApp alerts falsos
- **Estimativa:** XS (< 30 min)
- **Dependencies:** Nenhuma

---

## Contexto do Problema

O browser requisita automaticamente `/favicon.ico` ao carregar qualquer página. A plataforma Cohort Fundamentals (`fundamentals-theta.vercel.app`) não possui nenhum arquivo de favicon, causando:

1. **404 no browser console:** `favicon.ico:1 Failed to load resource: the server responded with a status of 404 ()`
2. **Ruído visual na devtools** — todo usuário vê o erro ao abrir o console
3. **Potencial trigger do error-logger** — o `unhandledrejection` handler em `js/error-logger.js` pode capturar erros de fetch relacionados

**Root Cause:**
- Nenhum arquivo `favicon.ico` ou `favicon.png` existe no projeto
- O `<head>` do `index.html` não possui tag `<link rel="icon">`
- O rewrite rule do `vercel.json` não captura arquivos com extensão (correto — mas sem o arquivo, resulta em 404)

---

## User Story

**Como** aluno ou visitante da plataforma Cohort Fundamentals,
**Quero** que a página carregue sem erros no console,
**Para que** a experiência de desenvolvimento/debug não seja poluída por erros desnecessários.

---

## Acceptance Criteria

### AC1: Favicon SVG criado
- [ ] Arquivo `favicon.svg` criado na raiz do projeto com ícone coerente com o branding (dark theme, dourado/AIOS)
- [ ] Alternativa: `favicon.ico` gerado a partir do SVG (16x16 e 32x32)

### AC2: HTML atualizado
- [ ] `index.html` `<head>` possui `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`
- [ ] Fallback `<link rel="icon" href="/favicon.ico">` opcional para compatibilidade com browsers antigos

### AC3: Zero erros 404 para favicon
- [ ] Após deploy no Vercel, `GET /favicon.ico` retorna 200 (ou 200 para favicon.svg)
- [ ] Nenhum erro de favicon no console do browser ao acessar qualquer rota da SPA

### AC4: Error-logger silencioso
- [ ] Nenhum WhatsApp alert gerado por erro de favicon

---

## Scope

**IN:**
- Criação do arquivo favicon (SVG preferido — sem dependências externas)
- Adição da tag `<link rel="icon">` no `index.html`

**OUT:**
- apple-touch-icon, manifest.json, favicon multi-tamanho
- Redesign de branding/logo
- Qualquer mudança em vercel.json (não necessária — arquivo com extensão serve direto)

---

## Technical Design

### Solução preferida: SVG inline (sem ferramentas externas)

Criar `favicon.svg` com o símbolo "∞" (infinito) ou "A" (AIOS) em dourado sobre fundo escuro — coerente com o design system da plataforma.

```svg
<!-- favicon.svg na raiz do projeto -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0A0A0A"/>
  <text x="16" y="22" font-family="Inter, sans-serif" font-size="18"
        font-weight="700" fill="#C9A227" text-anchor="middle">A</text>
</svg>
```

### Adição ao `index.html`:
```html
<!-- Após <meta name="keywords"> -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any"><!-- fallback -->
```

### Por que SVG?
- Funciona em todos os browsers modernos (Chrome 80+, Firefox 41+, Safari 12+)
- Nenhuma ferramenta externa necessária (sem imagemagick, sem npm packages)
- Escala perfeitamente (vetorial)
- Dark mode support nativo via `@media (prefers-color-scheme)`

---

## Tasks

- [ ] 1. Criar `favicon.svg` na raiz de `outputs/cohort/fundamentals/`
- [ ] 2. Adicionar `<link rel="icon">` no `index.html`
- [ ] 3. Commit + PR + merge no Vercel
- [ ] 4. Verificar no browser que o erro sumiu

---

## Definition of Done

- Nenhum erro `favicon.ico: 404` no console do browser
- Deploy no Vercel bem-sucedido
- Ícone visível na aba do browser (pode ser simples)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-02-20 | Pax (PO) | Story criada — Status: Ready |
