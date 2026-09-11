# Publicar o Papiro na Vercel + Neon

> **Ja publicado**: [papiro-web-omega.vercel.app](https://papiro-web-omega.vercel.app)
> · API em [papiro-api.vercel.app](https://papiro-api.vercel.app/api/health)
> · banco no Neon (Sao Paulo, PostgreSQL 16.15).
>
> O que segue e o roteiro para repetir o processo — do zero ou em outra conta.

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

1. Em [neon.tech](https://neon.tech), **crie um projeto novo** chamado `papiro`.

   Nao reaproveite um projeto existente: o Papiro aplica as proprias migrations
   no schema `public` e o seed apaga e recria os registros dele. Dividir o banco
   com outro sistema mistura tabelas e faz o `migrate` brigar por drift, sem
   ganho nenhum — o plano gratuito permite varios projetos na mesma conta.

2. **Escolha a regiao pensando em onde a API vai rodar.** Elas precisam ficar
   juntas: cada tela faz varias consultas por requisicao, e um oceano no meio
   multiplica isso por uns 100 ms cada. Este repositorio fixa a funcao em
   `gru1` (Sao Paulo) no `api/vercel.json` — entao crie o projeto Neon em
   **AWS South America East 1 (Sao Paulo)**. Se preferir outra regiao, troque a
   chave `regions` para a equivalente da Vercel.

3. Guarde as **duas** connection strings que o Neon oferece:
   - **Pooled** (tem `-pooler` no host) → vai para `DATABASE_URL`
   - **Direct** (sem `-pooler`) → vai para `DIRECT_DATABASE_URL`

   Por que duas: cada requisicao serverless abre a propria conexao, e o pooler
   existe para isso. As migrations, ao contrario, precisam de conexao direta — o
   `prisma.config.ts` usa `DIRECT_DATABASE_URL` quando ela existe.

> A cota do plano gratuito e somada por organizacao, nao por projeto: se voce ja
> tem outro projeto ativo na mesma conta, os dois dividem o mesmo limite de
> compute e armazenamento. Para um portfolio isso e irrelevante — o Papiro com
> os editais de exemplo ocupa poucos KB e o compute escala a zero quando
> ninguem esta olhando. Confira em **Billing** se quiser acompanhar.

## 2. Projeto da API

Importe o repositorio na Vercel e configure:

| Campo | Valor |
| --- | --- |
| Project Name | `papiro-api` |
| Root Directory | `api` |
| Build Command | (ja vem do `api/vercel.json`) |
| Regiao da funcao | `gru1` — ja fixada no `api/vercel.json` |

Pelo terminal, sem passar credencial por formulario:

```bash
cd api
npx vercel link --yes --project papiro-api

# le do .env.neon e envia sem imprimir na tela
for VAR in DATABASE_URL DIRECT_DATABASE_URL; do
  grep "^${VAR}=" .env.neon | cut -d= -f2- | tr -d '"' \
    | npx vercel env add "$VAR" production --force
done
printf 'true'       | npx vercel env add MODO_DEMO production --force
printf 'production' | npx vercel env add NODE_ENV production --force

npx vercel deploy --prod --yes
```

**Por que existe um `public/index.html` na API**: a Vercel exige um diretorio de
saida mesmo em projeto que so tem funcoes — sem ele o deploy falha com
*"No Output Directory named public"*. Em vez de uma pasta vazia, ali mora uma
pagina que explica o que e aquele dominio e aponta para `/api/health`.

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
| Tudo funciona, mas cada tela demora | funcao e banco em regioes diferentes: confira `regions` no `api/vercel.json` contra a regiao do projeto Neon |
| Tudo funciona e o visitante toma 403 ao apagar | e o modo demonstracao fazendo o trabalho dele |
