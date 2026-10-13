# Exclusoes da entrega de codigo

O pacote foi recuperado do deploy publicado, com estas exclusoes:

- `.env.production`: arquivo de credenciais e configuracao privada da origem.
- `mentorados/**`: documentos pessoais de mentorados.
- `data/whatsapp-export/**`: exportacoes de conversas, que nao sao necessarias para o aplicativo.
- `downloads/genius-zone/**`: analises e materiais individuais de mentoria.
- `README.md` original: substituido por instrucoes de migracao, pois documentava um banco antigo compartilhado.

As demais aulas, imagens, fontes, materiais de download, funcoes da API, migrations e testes foram preservados a partir do deploy. A Academia deve revisar os links de paginas e downloads que apontam para materiais individuais excluidos.

Para a publicacao, tambem foi excluido `data/complementaridade-virtuoni.md`, por conter analises e contatos individuais. As chaves e URLs de Supabase foram substituidas por placeholders de configuracao.
