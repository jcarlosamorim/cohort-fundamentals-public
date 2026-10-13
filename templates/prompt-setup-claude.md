# Prompt de Setup Rapido

> Instrucao para alunos: Abra o Claude Code na pasta do seu projeto e cole o prompt abaixo.
> Troque apenas o que esta entre [COLCHETES] pelas suas informacoes.

---

```
Configure meu ambiente de trabalho. Eu sou iniciante total, nunca programei.

Meu nome: [SEU NOME]
Meu projeto: [DESCREVA EM 1 FRASE O QUE QUER CONSTRUIR]

Faca o seguinte:
1. Detecte meu sistema operacional automaticamente
2. Crie a pasta .claude/ se nao existir
3. Crie o arquivo .claude/CLAUDE.md com as instrucoes abaixo preenchidas com meus dados

O CLAUDE.md deve conter exatamente isto (preencha os campos com as infos que dei acima):

---

# Meu Projeto AIOS

> Este arquivo e a memoria do meu projeto.
> Claude le este arquivo toda vez que eu abro uma sessao.
> Sem ele, Claude comeca do zero. Com ele, Claude lembra de tudo.

## Quem Sou Eu

- **Nome:** {meu nome}
- **Projeto:** {descricao do meu projeto}
- **Sistema Operacional:** {detectado automaticamente}
- **Nivel:** Iniciante - Cohort AIOS Fundamentals 2026

## Como o Claude Deve Me Ajudar

- Sempre responda em portugues do Brasil
- Eu sou iniciante. Explique tudo de forma simples, como se fosse para alguem que nunca programou
- Quando eu errar um comando, mostre o correto e explique por que deu errado
- Use analogias do dia a dia para conceitos tecnicos
- Antes de executar qualquer comando que modifique ou delete arquivos, me explique o que vai acontecer
- Se eu pedir algo arriscado, me avise antes de fazer
- Quando mostrar comandos de terminal, mostre a versao do meu sistema operacional
- Nao use termos tecnicos sem explicar primeiro
- Quando eu travar, sugira o proximo passo

## Meu Progresso

### E1 - Fundacao
- [ ] Claude Code instalado
- [ ] Sei navegar pelo terminal (pwd, ls, cd, mkdir)
- [ ] Sei usar /help, /status, /clear
- [ ] CLAUDE.md criado

### E2 - Organizacao
- [ ] Entendo os agentes do AIOS
- [ ] Sei ativar agente com @nome
- [ ] Rodei *environment-bootstrap com @devops
- [ ] Ambiente configurado

## Comandos Que Ja Aprendi

### Terminal
| Comando | O que faz |
|---------|-----------|
| pwd | Mostra onde estou |
| ls | Lista arquivos |
| cd pasta | Entra na pasta |
| cd .. | Volta um nivel |
| mkdir nome | Cria pasta |

### Claude Code
| Comando | O que faz |
|---------|-----------|
| /help | Lista comandos |
| /init | Cria CLAUDE.md |
| /status | Info da sessao |
| /clear | Limpa conversa |
| /exit | Sai do Claude |

## Anotacoes

(espaco para eu ir anotando o que aprendo)

---

Depois de criar, me confirme mostrando o conteudo do arquivo.
```
