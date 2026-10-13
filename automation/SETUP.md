# Cohort Fundamentals — Setup Completo

Este documento cobre a configuracao completa do projeto Cohort Fundamentals:
deploy na Vercel, daemon PM2 de auto-fix e publicacao de squads.

---

## Indice

1. [Fresh Deploy (do zero)](#fresh-deploy-do-zero)
2. [Gestao de Credenciais](#gestao-de-credenciais)
3. [Publish Squad](#publish-squad)
4. [FAQ](#faq)

---

## Fresh Deploy (do zero)

### Pre-requisitos

| Ferramenta | Versao minima | Como instalar |
|-----------|--------------|---------------|
| **Node.js** | v18+ | `brew install node` ou [nodejs.org](https://nodejs.org) |
| **Vercel CLI** | qualquer | `npm i -g vercel` |
| **PM2** | qualquer | `npm i -g pm2` |
| **GitHub CLI** | qualquer | `brew install gh` |

Voce tambem precisa de contas nestes servicos:

| Servico | Para que serve | Onde criar |
|---------|---------------|-----------|
| **Vercel** | Hospedagem do site + serverless functions | [vercel.com](https://vercel.com) |
| **Supabase** | Banco de dados (erros, logs, auth) | [supabase.com](https://supabase.com) |
| **Anthropic** | API do Claude (auto-fix daemon) | [console.anthropic.com](https://console.anthropic.com) |

### Passo 1 — Deploy na Vercel

```bash
# Na pasta do projeto
cd outputs/cohort/fundamentals

# Conectar com a Vercel (primeira vez, vai pedir login)
vercel

# Siga as instrucoes:
#   - Link to existing project? No → Create new
#   - Project name: cohort-fundamentals (ou o que preferir)
#   - Framework preset: Other
#   - Build command: (deixar vazio, nao tem build)
#   - Output directory: . (ponto — serve a pasta inteira)
```

O `vercel.json` ja esta configurado com:
- **Serverless functions** em `api/` (analyze, aurora, error-diagnose, cron)
- **Cron job** diario as 8h: `/api/cron/diagnose-errors`
- **Rewrites** SPA: todas as rotas apontam para `index.html`
- **Headers de seguranca**: CSP, HSTS, X-Frame-Options, etc.

### Passo 2 — Configurar variaveis de ambiente na Vercel

```bash
# Adicionar cada variavel (a CLI vai pedir o valor)
vercel env add ANTHROPIC_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Opcionais (para notificacoes WhatsApp)
vercel env add UAZAPI_BASE_URL
vercel env add UAZAPI_TOKEN
vercel env add WHATSAPP_NOTIFICATION_NUMBER
```

Apos adicionar, faca um redeploy para aplicar:

```bash
vercel --prod
```

### Passo 3 — Configurar o daemon PM2 (auto-fix)

O daemon roda localmente (ou em um VPS) e monitora erros no Supabase,
gerando fixes automaticos via Claude API.

```bash
# 1. Copiar o arquivo de exemplo
cp .env.daemon.example .env.daemon

# 2. Editar com seus valores reais
nano .env.daemon
# Preencha: SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, etc.

# 3. Criar pasta de logs
mkdir -p logs

# 4. Iniciar o daemon
pm2 start ecosystem.config.js

# 5. Verificar se esta rodando
pm2 status

# 6. Persistir para sobreviver a reboots
pm2 save
pm2 startup
# Execute o comando que o PM2 imprimir na tela
```

**Modos disponiveis do daemon:**

| Comando | Modo | O que faz |
|---------|------|-----------|
| `pm2 start ecosystem.config.js` | Producao | Aplica fixes de verdade |
| `pm2 start ecosystem.config.js --only auto-fix-daemon-dry` | Dry-run | Simula fixes sem aplicar |
| `pm2 start ecosystem.config.js --only auto-fix-daemon-dev` | Dev | Watch mode, reinicia ao editar |

### Passo 4 — Verificar que tudo funciona

```bash
# 1. Site acessivel?
curl -s -o /dev/null -w "%{http_code}" https://SEU-PROJETO.vercel.app
# Esperado: 200

# 2. API serverless respondendo?
curl -s https://SEU-PROJETO.vercel.app/api/error-diagnose | head -c 200
# Esperado: resposta JSON

# 3. Daemon PM2 rodando?
pm2 status
# Esperado: auto-fix-daemon com status "online"

# 4. Logs do daemon sem erros?
pm2 logs auto-fix-daemon --lines 20
# Esperado: logs de heartbeat sem erros de autenticacao
```

---

## Gestao de Credenciais

O projeto usa API keys em dois lugares diferentes. E importante manter
as chaves sincronizadas para evitar erros.

### Onde cada variavel fica

| Variavel | Vercel (serverless) | .env.daemon (PM2) | Notas |
|----------|:-------------------:|:-----------------:|-------|
| `ANTHROPIC_API_KEY` | SIM | SIM | **Manter sincronizada nos dois lugares** |
| `SUPABASE_URL` | SIM | NAO (*) | O daemon usa URL hardcoded no script |
| `SUPABASE_SERVICE_ROLE_KEY` | SIM | SIM | **Manter sincronizada nos dois lugares** |
| `UAZAPI_BASE_URL` | SIM | SIM (opcional) | Para notificacoes WhatsApp |
| `UAZAPI_TOKEN` | SIM | SIM (opcional) | Token da instancia Uazapi |
| `WHATSAPP_NOTIFICATION_NUMBER` | SIM | Como `NOTIFICATION_NUMBER` | Nome diferente em cada lugar |
| `CLAUDE_MODEL` | NAO | SIM | Modelo para auto-fix (haiku/sonnet/opus) |
| `AUTO_FIX_PORT` | NAO | SIM | Porta do daemon (default: 7777) |
| `POLL_INTERVAL` | NAO | SIM | Intervalo de polling em segundos |

(*) O SUPABASE_URL pode estar embutido no codigo do daemon. Verifique `scripts/auto-fix-daemon.js`.

### Variaveis exclusivas do Vercel

Estas so fazem sentido nas serverless functions:

- `ANTHROPIC_API_KEY` — usada por `api/analyze.js` e `api/aurora.js`
- `SUPABASE_URL` — conexao com banco de dados
- `SUPABASE_SERVICE_ROLE_KEY` — acesso admin ao Supabase (bypassa RLS)

### Variaveis exclusivas do daemon (.env.daemon)

Estas so fazem sentido no daemon PM2:

- `CLAUDE_MODEL` — qual modelo Claude usar (haiku e mais barato, opus e mais capaz)
- `AUTO_FIX_PORT` — porta HTTP do daemon para health checks
- `POLL_INTERVAL` — frequencia de verificacao de novos erros (segundos)
- `MIN_CONFIDENCE` — confianca minima para aplicar fix automaticamente (0.0 a 1.0)
- `MAX_FIXES_PER_HOUR` — limite de seguranca para nao gastar demais na API
- `HEARTBEAT_ENABLED` — ativar/desativar heartbeat
- `WA_HOURLY_REPORT_ENABLED` — relatorio horario via WhatsApp

### Recomendacao: manter sincronizado

As chaves `ANTHROPIC_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` existem nos dois
lugares (Vercel e .env.daemon). Quando rotacionar uma chave:

1. Atualize na Vercel: `vercel env rm ANTHROPIC_API_KEY && vercel env add ANTHROPIC_API_KEY`
2. Atualize no `.env.daemon`: edite o arquivo local
3. Redeploy na Vercel: `vercel --prod`
4. Reinicie o daemon: `pm2 restart auto-fix-daemon`

> **Dica:** idealmente, use um arquivo `.env` unico na raiz do projeto e configure
> tanto a Vercel (via `vercel env pull`) quanto o daemon para lerem dele.
> Isso evita dessincronia de chaves.

### Seguranca

- **NUNCA** commite `.env.daemon` ou `.env.local` no Git
- O arquivo `.env.daemon.example` existe com valores placeholder para referencia
- Rotacione chaves a cada 90 dias (boa pratica)
- Use `SUPABASE_SERVICE_ROLE_KEY` apenas em server-side (nunca no frontend)

---

## Publish Squad

### Pre-requisitos

1. **GitHub CLI** instalado e autenticado
2. **AIOS** com pelo menos 1 squad criado em `squads/`

### Verificar GitHub CLI

```bash
gh auth status
```

Se nao estiver instalado: `brew install gh` (Mac) ou [cli.github.com](https://cli.github.com)

Se nao estiver autenticado: `gh auth login`

### Instalacao (1 minuto)

Copie o arquivo `publish-squad.md` para sua pasta de tasks:

```bash
cp publish-squad.md .aios-core/tasks/publish-squad.md
```

Pronto. Agora voce pode publicar squads.

### Uso

No Claude Code, com qualquer agente ativo:

```
*publish-squad meu-squad
```

O que acontece:
1. Claude le seu squad em `squads/meu-squad/`
2. Analisa e gera o score do card FIFA (rating, stats, rarity)
3. Mostra o card para voce aprovar
4. Zipa o squad
5. Cria um PR automatico no repo do cohort
6. Apos merge, o card aparece em https://fundamentals-theta.vercel.app/#/downloads

### Exemplo

```
> *publish-squad dopamine-learning

Analisando squad dopamine-learning...

Encontrado:
- 6 agents
- 8 tasks
- 3 workflows
- 2 templates

Card gerado:
  Title: Dopamine Learning
  Rating: 85 (EPIC)
  Color: purple
  Stats: AGT 6 | TSK 8 | WKF 3 | CMD 12

Aprovar e criar PR? (s/n)

> s

PR criado: https://github.com/jcarlosamorim/mmos/pull/42
Seu squad aparecera no site apos o merge.
```

---

## FAQ

**P: Preciso ter conta no GitHub?**
R: Sim. O `gh auth login` cria a conexao.

**P: E se meu squad nao tiver score alto?**
R: O score e calculado automaticamente com base na estrutura do squad. Mais agentes, tasks, workflows e documentacao = score mais alto.

**P: Posso atualizar um squad ja publicado?**
R: Sim. Rode `*publish-squad` novamente com o mesmo nome. O PR vai atualizar a entrada existente.

**P: Quanto tempo leva?**
R: ~30 segundos do comando ao PR criado.

**P: Como rotacionar as chaves de API?**
R: Veja a secao [Gestao de Credenciais](#gestao-de-credenciais) acima. Atualize nos dois lugares (Vercel + .env.daemon) e faca redeploy/restart.

**P: O daemon PM2 precisa rodar 24/7?**
R: Idealmente sim, para capturar erros. Use `pm2 startup` para persistir entre reboots. O daemon reinicia automaticamente as 4h da manha (cron_restart configurado).

**P: Posso rodar o daemon em dry-run primeiro?**
R: Sim. Use `pm2 start ecosystem.config.js --only auto-fix-daemon-dry` para simular sem aplicar fixes.
