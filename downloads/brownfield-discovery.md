# Brownfield Discovery — Auditoria Técnica Multi-Fase

## Purpose

Executa uma auditoria técnica completa em projetos existentes (brownfield) usando 3 agentes especializados em pipeline. Gera relatório consolidado com débitos priorizados e roadmap de correção.

## Usage

```
/AIOS:tasks:brownfield-discovery <caminho-do-projeto>
```

**Exemplo:** `/AIOS:tasks:brownfield-discovery /Users/jose/Downloads/meu-app`

## Task Instructions

### Pré-requisito: Receber o caminho do projeto

Se o usuário não informou o caminho do projeto como argumento:

```
Qual o caminho absoluto do projeto que deseja auditar?
Exemplo: /Users/nome/projects/meu-app
```

### Fase 0: Discovery do Projeto

**CRÍTICO:** Antes de qualquer análise, mapear TODO o projeto.

1. **Estrutura completa** — `ls -R` ou tree de todos os diretórios
2. **Stack detection** — package.json, requirements.txt, Cargo.toml, go.mod, etc.
3. **Ler TODOS os arquivos de configuração** — tsconfig, vite.config, next.config, etc.
4. **Ler TODOS os componentes/módulos** — Para projetos pequenos (<50 arquivos), ler tudo
5. **Identificar banco de dados** — migrations, schemas, ORMs, .env com connection strings

Armazenar mapa completo para uso nas 3 fases seguintes.

### Fase 1: @architect — Arquitetura do Sistema

Executar análise como **Arquiteto de Software**. Cobrir:

| Área | O que analisar |
|------|---------------|
| **Stack** | Framework, linguagem, build tools, versões |
| **Estrutura** | Organização de pastas, separação de responsabilidades |
| **Dependências** | Produção vs dev, CDN vs bundle, versões fixas vs flutuantes |
| **Padrões** | Patterns observados (positivos e negativos) |
| **Testes** | Infraestrutura de testes, cobertura, CI/CD |
| **Build** | Pipeline de build, otimizações, deploy |

**Output:** Tabela de débitos arquiteturais com severidade (P0-P3).

### Fase 2: @data-engineer — Auditoria de Dados

Executar análise como **Engenheiro de Dados**. Cobrir:

| Área | O que analisar |
|------|---------------|
| **Schema** | Tabelas, tipos, constraints, naming conventions |
| **Segurança** | RLS, auth, secrets expostos, CORS, input validation |
| **Performance** | Índices, N+1, paginação, cache, connection pool |
| **Persistência** | Se não tem DB: gap analysis, fluxo de dados atual |
| **State** | Gerenciamento de estado, volatilidade, persistência |

**Se o projeto NÃO tem banco de dados:** Documentar como achado crítico, analisar fluxo de dados atual e recomendar camada de persistência.

**Output:** Tabela de débitos de dados com severidade (P0-P3).

### Fase 3: @ux-design-expert — Frontend & UX

Executar análise como **Especialista UX/UI**. Cobrir:

| Área | O que analisar |
|------|---------------|
| **Componentes** | Inventário, linhas, responsabilidades, reutilização |
| **Acessibilidade** | WCAG compliance (contraste, keyboard, screen reader, focus, motion) |
| **Responsividade** | Breakpoints, adaptação, comportamento mobile |
| **Design System** | Tokens, componentes reutilizáveis, consistência |
| **Paleta** | Cores, contraste com branco, uso |
| **Tipografia** | Fonts, type scale, hierarquia |

**Output:** Tabela de débitos frontend com severidade (P0-P3).

### Fase 4: Consolidação

Mesclar outputs das 3 fases em relatório único:

```markdown
# {Projeto} — Relatório de Auditoria Técnica Consolidado

## Sumário Executivo
| Fase | Score (1-10) | Principal achado |

## Fase 1: Arquitetura
[Análise completa + tabela de débitos]

## Fase 2: Dados
[Análise completa + tabela de débitos]

## Fase 3: Frontend/UX
[Análise completa + tabela de débitos]

## Consolidado: Débitos Priorizados
### P0 — Corrigir Imediatamente
### P1 — Corrigir Neste Sprint
### P2 — Próximo Sprint
### P3 — Backlog

## Roadmap Sugerido
### Sprint 1: [ações]
### Sprint 2: [ações]
### Sprint 3: [ações]

## Métricas do Projeto
| Total de arquivos | X |
| Total de débitos | Y |
```

### Fase 5: Salvar Relatório

Salvar em: `docs/logs/YYYY-MM-DD_{slug-do-projeto}-audit.md`

Informar o usuário:
```
Auditoria completa. Relatório salvo em docs/logs/YYYY-MM-DD_{slug}-audit.md

Score consolidado: X/10
Débitos: N P0 | N P1 | N P2 | N P3

Quer executar alguma correção? Opções:
1. Executar Sprint 1 (corrigir P0/P1)
2. Criar stories para cada débito
3. Focar em um débito específico
```

## Severity Classification

| Severidade | Definição | SLA |
|------------|----------|-----|
| **P0** | Vulnerabilidade de segurança, exclusão de usuários, perda de dados | Corrigir imediatamente |
| **P1** | Performance degradada, CDN frágeis, sem testes, mobile quebrado | Corrigir neste sprint |
| **P2** | Best practices violadas, tech debt, componentes monolíticos | Próximo sprint |
| **P3** | Nice-to-have, dark mode, SEO, favicon | Backlog |

## Success Criteria

- Projeto 100% mapeado antes de qualquer análise
- Todas as 3 fases executadas com análise profunda
- Relatório consolidado com débitos priorizados
- Roadmap de correção com sprints claros
- Relatório salvo em docs/logs/
