# Publicar o Papiro na Vercel + Neon

Arquitetura do ambiente hospedado:

```text
papiro-web (Vercel)          papiro-api (Vercel)            Neon
  build do Vite      ──/api──▶  Express serverless  ──SQL──▶  PostgreSQL 16
  (estatico)            rewrite    (api/api/index.ts)          (pooler)
```

O navegador so conhece **uma origem**: o `rewrite` do `web/vercel.json`
encaminha `/api/*` ao projeto da API do lado do servidor. Por isso nao ha CORS,
nem URL de API embutida no bundle — o mesmo pacote estatico funciona local e
hospedado.

---

## 1. Banco no Neon

1. Crie um projeto em [neon.tech](https://neon.tech) (plano gratuito, Postgres 16).
2. Guarde as **duas** connection strings que o Neon oferece:
   - **Pooled** (tem `-pooler` no host) → vai para `DATABASE_URL`
   - **Direct** (sem `-pooler`) → vai para `DIRECT_DATABASE_URL`

Por que duas: cada requisicao serverless abre a propria conexao, e o pooler
existe para isso. As migrations, ao contrario, precisam de conexao direta — o
`prisma.config.ts` usa `DIRECT_DATABASE_URL` quando ela existe.

## 2. Projeto da API

Importe o repositorio na Vercel e configure:

| Campo | Valor |
| --- | --- |
| Project Name | `papiro-api` |
| Root Directory | `api` |
| Build Command | (ja vem do `api/vercel.json`) |

Variaveis de ambiente:

```text
DATABASE_URL         = <string pooled do Neon>
DIRECT_DATABASE_URL  = <string direct do Neon>
NODE_ENV             = production
MODO_DEMO            = true
WEB_ORIGIN           = https://papiro-web.vercel.app
```

O build roda `prisma generate && prisma migrate deploy`: o schema sobe junto com
o primeiro deploy, sem passo manual.

**Confira**: `https://papiro-api.vercel.app/api/health` deve responder
`"banco": { "conectado": true }` e `"modoDemonstracao": true`.

## 3. Projeto do frontend

| Campo | Valor |
| --- | --- |
| Project Name | `papiro-web` |
| Root Directory | `web` |
| Framework | Vite (detectado) |

Antes do primeiro deploy, ajuste o destino do rewrite em `web/vercel.json` para
o dominio real da API, caso ele nao seja `papiro-api.vercel.app`.

## 4. Dados de demonstracao

Com as variaveis do Neon no seu `.env` local:

```bash
cd api
DIRECT_DATABASE_URL="<string direct>" npm run seed -- --demo
```

Isso popula os dois editais de exemplo e o historico ficticio. O seed e
idempotente: rodar de novo restaura o estado inicial — util se a vitrine
acumular lixo.

---

## Modo demonstracao

`MODO_DEMO=true` liga um middleware que recusa, com **403**, as acoes que
destroem trabalho:

| Bloqueado | Liberado |
| --- | --- |
| `DELETE` de concurso, cargo, disciplina e topico | registrar e excluir sessoes |
| importacao com `substituir: true` | criar editais e importar itens novos |

O front consulta `/api/health` e mostra um aviso no topo, para o visitante saber
do limite antes de esbarrar nele.

Isto **nao e autenticacao** — e um limitador de dano enquanto ela nao existe.
Quem roda o projeto localmente nao liga a variavel e continua dono dos proprios
dados.

---

## O que esperar do plano gratuito do Neon

- 0,5 GB de armazenamento — folgado: os dois editais de exemplo com 120 sessoes
  ocupam poucos KB.
- O compute **escala a zero** quando ocioso e retoma na primeira consulta. A
  primeira visita depois de um periodo parado paga alguns segundos a mais.

## Problemas comuns

| Sintoma | Causa provavel |
| --- | --- |
| `/api/health` responde, mas `banco.conectado: false` | `DATABASE_URL` sem `?sslmode=require` |
| Deploy da API falha em `migrate deploy` | `DIRECT_DATABASE_URL` ausente: o pooler nao aceita os comandos do migrate |
| Front carrega mas as telas ficam vazias | destino do rewrite em `web/vercel.json` apontando para um dominio que nao existe |
| Tudo funciona e o visitante toma 403 ao apagar | e o modo demonstracao fazendo o trabalho dele |
