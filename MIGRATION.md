# Migração do Fundamentals

O código deste repositório é uma cópia pública revisada da versão publicada. Os valores de Supabase foram substituídos por placeholders. Credenciais e dados dos alunos são entregues separadamente ao responsável técnico.

## Entradas privadas

Para a migração aprovada, receber do proprietário:

- Prompt completo de migração e configurações de origem.
- `fundamentals-banco-192-alunos.zip`, snapshot de 07/10/2026.

Não colocar esses arquivos no Git. O ZIP inclui três arquivos SQL de texto para restaurar em um projeto Supabase novo, com o schema padrão de Auth existente:

1. `01-schema-fundamentals.sql`
2. `02-auth-192-alunos.sql`
3. `03-dados-fundamentals.sql`

O escopo aprovado é de 192 contas e identidades, 1.587 registros de progresso, 48 respostas de cenários, 7 perfis psicométricos, 14 vínculos de WhatsApp e 22 registros de quota. O banco original também atende outros projetos; a entrega selecionada não contém esses dados. A restauração local foi validada, mas o ambiente da Academia ainda precisa de homologação.

## Configuração do destino

1. Criar o Supabase e a Vercel na organização da Academia.
2. Restaurar os arquivos selecionados em um banco novo e vazio, usando psql, ON_ERROR_STOP e transação.
3. Conferir contagens, vínculos e políticas RLS.
4. Configurar Site URL e redirects de Auth para o domínio novo.
5. Preencher `js/config.js` com URL e chave pública do destino; atualizar também o fallback em `api/_shared/supabase-config.js`.
6. Configurar variáveis de servidor da `.env.example` na Vercel, com chaves próprias da Academia.
7. Revisar origens permitidas, analytics, links de materiais individuais excluídos e integrações opcionais.
8. Rodar testes, publicar no destino e homologar login, progresso, isolamento entre alunos e APIs.

Não executar as migrations antigas automaticamente sobre o banco restaurado. Não desativar RLS para contornar erros. Não redefinir senhas dos alunos para validar a importação. Os hashes preservados precisam ser homologados com login real no destino.

Este repositório não implica deploy, transferência de contas de nuvem ou quitação de cobranças da origem.
