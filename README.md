# Cohort Fundamentals

Código público da plataforma educacional Cohort Fundamentals, preparado para migração à infraestrutura da Academia.

Frontend em HTML, CSS e JavaScript. Funções Node.js na Vercel. Banco e autenticação Supabase. Recursos de IA via Anthropic. O código foi recuperado da versão publicada em `fundamentals-theta.vercel.app` em 13/10/2026.

## Começar

```sh
git clone https://github.com/jcarlosamorim/cohort-fundamentals-public.git
cd cohort-fundamentals-public
npm ci --ignore-scripts
npm test
```

Configure seu próprio projeto Supabase e as variáveis de ambiente da Vercel conforme `.env.example`. Substitua os placeholders públicos em `js/config.js` e o fallback de URL em `api/_shared/supabase-config.js`. O frontend atual não lê variáveis da Vercel em tempo de execução. Chaves privadas devem permanecer somente no servidor.

Para desenvolvimento com as funções, use `vercel dev` após vincular o projeto ao seu ambiente. O aplicativo não tem compilação de frontend; `vercel.json` contém a configuração de deploy e os crons. Os testes existentes cobrem configuração, roteamento e privacidade do leaderboard.

## Migração à Academia

Veja [MIGRATION.md](MIGRATION.md). O banco selecionado de 192 alunos e o prompt completo com credenciais são entregues ao responsável técnico por canal privado. Esses arquivos não fazem parte deste repositório.

As migrations de `supabase/migrations/` são histórico de referência. Não reaplicá-las automaticamente depois de restaurar o snapshot privado.

## Estrutura

- `js/`: autenticação, roteamento, persistência e funcionalidades do aluno.
- `api/`: funções servidor, autenticação, quotas e integração com IA.
- `pages/`, `css/`, `data/`: aulas, interface e configuração pública do curso.
- `downloads/`, `img/`: materiais gerais e ilustrações.
- `supabase/migrations/`: histórico de banco.
- `tests/`: testes Vitest.

O repositório contém placeholders de configuração. Ele precisa das configurações do seu ambiente antes de funcionar. Foram excluídos segredos, exportações de conversas e documentos individuais. Veja [ARQUIVOS-EXCLUIDOS.md](ARQUIVOS-EXCLUIDOS.md).
