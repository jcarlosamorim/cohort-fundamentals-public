# Course Outline - Cohort AIOS Advanced

## Visão Macro

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COHORT AIOS ADVANCED                                  │
│                    De Usuário para Arquiteto de IA                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  FUNDAMENTOS (E1-E2)  │  BUILDING BLOCKS (E3-E4)  │  COMPOSIÇÃO (E5-E6)     │
│  Ver + Estruturar     │  Tasks + Agents           │  Workflows + Squads     │
├─────────────────────────────────────────────────────────────────────────────┤
│                        ESCALA + PRODUÇÃO (E7-E8)                            │
│                        140+ Agents + Deploy Profissional                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Encontro 1: Cases Reais - Sistemas em Produção

**Big Idea:** "Primeiro você vê funcionando. Depois você aprende como."

### Por que este encontro existe:
- Mostrar o destino antes da jornada
- Provar que não é teoria - são sistemas reais gerando receita
- Criar desejo genuíno pelo conhecimento técnico

### Estrutura:

| Bloco | Duração | Conteúdo |
|-------|---------|----------|
| Abertura | 15min | O que é AIOS? (1 slide, não 50) |
| Case 1 | 25min | MMOS Mind Mapper - 94% fidelity, 2.2M palavras |
| Case 2 | 25min | Creator-OS - Geração de cursos e conteúdo |
| Case 3 | 20min | Expansion Packs em Produção (exclusivo cohort) |
| Q&A Técnico | 20min | Perguntas sobre o que viram |
| Homework | 5min | Clonar repo base do cohort |

**Entregável:** Nenhum código ainda. Apenas setup do ambiente e repo clonado.

---

## Encontro 2: A Planta do Sistema - Estrutura que Escala

**Big Idea:** "Arquiteto desenha antes de construir. Engenheiro pensa antes de codar."

### Por que este encontro existe:
- Sem estrutura = spaghetti code
- Design tokens = consistência visual
- Modelo mental = documentação viva

### Estrutura:

| Bloco | Duração | Conteúdo |
|-------|---------|----------|
| Estrutura AIOS | 30min | .aios-core/, expansion-packs/, outputs/, docs/ |
| Design Tokens | 25min | Sistema de cores, tipografia, spacing |
| Modelo Semântico | 25min | Como dados se relacionam |
| Config.yaml | 25min | O coração do sistema |
| Exercício | 15min | Criar estrutura de um projeto do zero |

### Conteúdo Técnico:

```
AIOS Architecture (real):
.aios-core/           # Framework (NUNCA edita)
├── agents/           # 13 agents core
├── tasks/            # 44 tasks executáveis
├── workflows/        # 6 workflows (greenfield/brownfield)
├── templates/        # 20 templates
├── checklists/       # 8 checklists
├── core/             # Runtime (orchestrator, quality-gates)
└── utils/            # 61 utilities

expansion-packs/      # SEU código vai aqui
├── {seu-pack}/
│   ├── config.yaml   # Manifest do pack
│   ├── agents/       # Seus agents
│   ├── tasks/        # Suas tasks
│   └── workflows/    # Seus workflows
```

**Entregável:** Estrutura completa de projeto + config.yaml funcional

---

## Encontro 3: Tasks e Quality Gates - O Filtro Profissional

**Big Idea:** "Amador entrega. Profissional valida antes de entregar."

### Por que este encontro existe:
- Tasks são unidades atômicas de trabalho
- Quality Gates bloqueiam código ruim ANTES de ir pro ar
- Elicitation garante que você não assume nada

### Estrutura:

| Bloco | Duração | Conteúdo |
|-------|---------|----------|
| Anatomia de uma Task | 30min | Estrutura, elicitation, steps |
| Criando Tasks | 25min | Do zero, com elicit: true |
| Quality Gates | 30min | 3 camadas de proteção |
| Checklists | 20min | Validação automática |
| Exercício | 15min | Criar task + checklist próprios |

### Conteúdo Técnico - Task Anatomy:

```yaml
---
task:
  name: create-next-story
  description: Cria próxima story do backlog
  elicit: true                    # OBRIGA interação
  agent: sm                       # Agent responsável
---

## Mandatory Elicitation
- Story scope (small/medium/large)
- Acceptance criteria count
- Dependencies

## Steps
1. Analyze backlog
2. Select next story
3. Generate story document
4. Validate against checklist
```

### 3 Camadas de Quality Gates:

```
Layer 1: Pre-Commit Gate
├── YAML validation
├── File structure checks
├── Linting verification
└── Pattern compliance

Layer 2: PR Automation
├── Automated checks
├── Dependency validation
├── Breaking change detection
└── Status checks

Layer 3: Human Review
├── Code review requirements
├── Architectural review
├── Performance assessment
└── Security review
```

**Entregável:** 1 Task funcional + 1 Checklist que bloqueia erros reais

---

## Encontro 4: Criando Agents - De Usuário para Arquiteto

**Big Idea:** "Você não USA agents. Você CRIA. Quem domina isso projeta times inteiros de IA."

### Por que este encontro existe:
- Agents são personas especializadas
- Cada agent tem comandos específicos
- Dependencies controlam o que o agent acessa

### Estrutura:

| Bloco | Duração | Conteúdo |
|-------|---------|----------|
| Como Agents Funcionam | 25min | Ativação, persona, commands |
| Anatomia de um Agent | 30min | YAML completo explicado |
| Criando Agent do Zero | 30min | Hands-on ao vivo |
| Dependencies & Knowledge | 20min | O que o agent sabe |
| Exercício | 15min | Criar agent especialista |

### Agent Activation Flow (10 passos):

```
1. Load Agent Definition
2. Extract YAML
3. Activate Persona
4. Greet User
5. HALT (espera comando!)
6. Process Command
7. Load Dependencies
8. Execute Task
9. Stay in Character
10. Exit quando *exit
```

### 13 Agents Core do AIOS:

| Agent | Papel | Key Commands |
|-------|-------|--------------|
| aios-master | Orquestrador | *kb, *task |
| dev | Developer | *run-tests, *develop-story |
| pm | Product Manager | *create-prd |
| po | Product Owner | *execute-checklist |
| architect | Arquiteto | *create-architecture |
| qa | QA Engineer | *review-story, *test |
| sm | Scrum Master | *create-story |
| analyst | Analista | *brainstorm, *market-research |
| ux-expert | UX Expert | *create-front-end-spec |

**Entregável:** 1 Agent funcional com persona, commands e dependencies

---

## Encontro 5: Workflows - A Planta da Fábrica

**Big Idea:** "Workflow é a planta da fábrica. Desenha uma vez, executa infinitas vezes."

### Por que este encontro existe:
- Workflows orquestram agents em sequência
- Greenfield vs Brownfield = contextos diferentes
- Checkpoints garantem qualidade em cada fase

### Estrutura:

| Bloco | Duração | Conteúdo |
|-------|---------|----------|
| O que é Workflow | 20min | Diferença de task vs workflow |
| Greenfield Workflow | 30min | Do zero ao deploy |
| Brownfield Workflow | 25min | Sistema existente |
| Phases & Checkpoints | 25min | Validação em cada etapa |
| Exercício | 20min | Criar workflow customizado |

### Greenfield Workflow (real):

```
Phase 1: Planning
  → analyst: Create project-brief
  → pm: Create PRD
  → ux-expert: Create front-end-spec
  → architect: Create fullstack-architecture
  → po: Validate all artifacts

Phase 2: Document Sharding
  → po: Shard documents for IDE use

Phase 3: Development Cycle (loop)
  → sm: Create story
  → dev: Implement story
  → qa: Review implementation
  → dev: Address feedback

Phase 4: Completion
  → po: Epic retrospective
  → Project complete
```

### Brownfield Workflow (real):

```
Phase 1: Classification
  → analyst: Classify enhancement scope
  Routes to:
    - single-story (pequeno)
    - small-feature (médio)
    - major-enhancement (grande)

Phase 2: Documentation
  → architect: Check existing docs
  → architect: document-project (if inadequate)

Phase 3: Planning
  → pm: Create brownfield PRD
  → architect: Create architecture (if changes needed)
  → po: Validate artifacts

Phase 4: Development (same as greenfield)
```

**Entregável:** 1 Workflow funcional com 3+ phases e checkpoints

---

## Encontro 6: Transformando o Velho em Novo — Brownfield Discovery

**Big Idea:** "Qualquer projeto feito no vibecoding pode virar profissional. O segredo é o processo."

### Por que este encontro existe:
- Projetos de vibecoding (Bolt, v0, Lovable) são ótimos para prototipar
- Mas precisam de estrutura profissional para escalar
- Brownfield discovery mapeia o que existe antes de melhorar
- Deploy profissional fecha o ciclo completo

### Estrutura:

| Bloco | Duração | Conteúdo |
|-------|---------|----------|
| Do Vibecoding ao GitHub | 20min | Exportar projeto para repositório GitHub |
| Git Clone — Trazendo pro Terminal | 20min | Clonar e abrir no Claude Code |
| Configurando Supabase e Vercel | 25min | Criar .env com credenciais seguras |
| Brownfield Discovery | 30min | Executar discovery e analisar relatório |
| Commit e Deploy na Vercel | 25min | Commit profissional + deploy automatizado |

### Fluxo Completo:

```
Vibecoding (Bolt/v0/Lovable)
    ↓ Export to GitHub
GitHub Repository
    ↓ git clone
Terminal / Claude Code
    ↓ Configurar .env (Supabase + Vercel)
Projeto com credenciais
    ↓ Brownfield Discovery
Relatório completo do projeto
    ↓ git commit + deploy
Vercel (produção)
```

### Bloco 3 — Passo a Passo: Credenciais Supabase

**1. Project URL**
- Settings > Data API > copie a Project URL

**2. Anon Key**
- Settings > API Keys > copie a Legacy Anon Key

**3. Service Role Key**
- Settings > API Keys > copie a Legacy Service Role Key

**Prompt para colar no Claude Code:**

```
Crie um arquivo .env na raiz do projeto com estas credenciais do Supabase:

SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=COLE_A_ANON_KEY_AQUI
SUPABASE_SERVICE_ROLE_KEY=COLE_A_SERVICE_ROLE_KEY_AQUI

Verifique se o .gitignore ja tem .env listado. Se nao tiver, adicione.
```

### Bloco 3 — Passo a Passo: Token Vercel

1. Abra https://vercel.com/account/tokens
2. Clique em **Create Token**
3. Preencha:
   - **Name:** claude-code (ou o nome que quiser)
   - **Scope:** selecione o escopo (Full Account ou um time específico)
   - **Expiration:** escolha a validade (recomendo 90 dias ou No Expiration)
4. Clique em **Create**
5. Copie o token imediatamente — ele só aparece uma vez!

**Prompt para colar no Claude Code:**

```
Adicione no .env esta credencial da Vercel:

VERCEL_TOKEN=COLE_O_TOKEN_AQUI

Verifique se o .gitignore ja tem .env listado.
```

### Bloco 4 — Brownfield Discovery

Após configurar as credenciais, executar no Claude Code:

```
Execute o brownfield discovery neste projeto para mapear toda a estrutura existente.
```

### Bloco 5 — Commit e Deploy

Após o brownfield discovery, fazer commit e deploy:

```
Faça commit de todas as mudanças e deploy na Vercel.
```

**Entregável:** Projeto importado do vibecoding com brownfield discovery completo e deploy na Vercel funcionando

---

## Encontro 7: Escala Massiva - 140+ Agents

**Big Idea:** "140 agents trabalhando pra você. Enquanto você dorme, a fábrica roda."

### Por que este encontro existe:
- Multi-terminal = paralelismo real
- AIOS Master orquestra tudo
- Monitoramento = visibilidade total

### Estrutura:

| Bloco | Duração | Conteúdo |
|-------|---------|----------|
| AIOS Master Deep Dive | 30min | Orquestrador central |
| Multi-Terminal | 25min | 4+ terminais simultâneos |
| Parallel Workflows | 25min | Workflows concorrentes |
| Monitoring & Observability | 20min | Dashboards e logs |
| Exercício | 20min | Setup multi-terminal |

### Multi-Terminal Pattern:

```
Terminal 1: AIOS Master
  └── Orquestra workflows, monitora progresso

Terminal 2: Dev Agent
  └── Implementa stories em paralelo

Terminal 3: QA Agent
  └── Revisa implementações em tempo real

Terminal 4: Analyst Agent
  └── Research e documentação contínua
```

### Monitoring Stack:

```
┌─────────────────────────────────────┐
│         AIOS Dashboard              │
├─────────────────────────────────────┤
│ Workflows: 3 running, 2 queued      │
│ Agents: 12 active, 128 idle         │
│ Tasks: 47 completed, 8 in progress  │
│ Quality Gates: 2 pending review     │
├─────────────────────────────────────┤
│ Logs: docs/logs/                    │
│ Metrics: .aios/metrics/             │
└─────────────────────────────────────┘
```

**Entregável:** Setup multi-terminal funcional + dashboard de monitoramento

---

## Encontro 8: Deploy Profissional - Do Código ao Ar

**Big Idea:** "No ar. Funcionando. Profissional. Pipeline configurado. Quality gates passando."

### Por que este encontro existe:
- Supabase = banco seguro (RLS, policies)
- Vercel = deploy automático
- CI/CD = pipeline completo

### Estrutura:

| Bloco | Duração | Conteúdo |
|-------|---------|----------|
| Supabase Security | 30min | RLS, policies, auth |
| Vercel Deploy | 20min | Deploy automático |
| CI/CD Pipeline | 30min | GitHub Actions completo |
| Auto-Rollback | 15min | Quando algo quebra |
| Exercício Final | 25min | Deploy projeto completo |

### Supabase Security (de vibecoding para engenharia):

```sql
-- RLS (Row Level Security) - OBRIGATÓRIO
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: usuário só vê seus próprios dados
CREATE POLICY "Users see own projects" ON projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: admin vê tudo
CREATE POLICY "Admins see all" ON projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

### CI/CD Pipeline (GitHub Actions):

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test

  deploy:
    needs: quality-gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  rollback:
    needs: deploy
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - run: vercel rollback --token=${{ secrets.VERCEL_TOKEN }}
```

**Entregável:** Projeto completo deployado com Supabase seguro + CI/CD funcionando

---

## Resumo de Entregáveis

| Encontro | Entregável |
|----------|------------|
| E1 | Setup ambiente + repo clonado |
| E2 | Estrutura de projeto + config.yaml |
| E3 | 1 Task + 1 Checklist |
| E4 | 1 Agent funcional |
| E5 | 1 Workflow (3+ phases) |
| E6 | 1 Squad (Curator + 2 Specialists) |
| E7 | Multi-terminal + dashboard |
| E8 | Deploy completo em produção |

---

*Gerado por CreatorOS - Course Architect*
