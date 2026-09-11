# Papiro

**Gerenciador de edital verticalizado e metricas de estudo** para quem estuda
para varios concursos de TI ao mesmo tempo.

O problema que ele resolve: um candidato que prepara PF Perito (Area 3) e
DATAPREV (Perfil 5) em paralelo tem dois editais, duas bancas, duas numeracoes
e assuntos que se sobrepoem sem serem o mesmo item. Planilha resolve ate o mes
dois; depois disso ninguem sabe mais qual topico foi estudado em qual edital,
nem qual deles esta com o pior percentual de acerto.

Papiro modela isso como banco relacional de verdade: `Concurso -> Cargo ->
Disciplina -> Topico -> Sessao de Estudo`, com as regras de negocio impostas
pelo Postgres, nao apenas pelo formulario.

---

## Stack

| Camada | Escolha |
| --- | --- |
| Banco | PostgreSQL 16 |
| ORM | Prisma (migrations versionadas + client tipado) |
| API | Node.js 22 + Express 5 + TypeScript |
| Validacao | Zod nas bordas (env, body das requests) |
| Frontend | React + Vite + TypeScript |
| Infra local | Docker Compose (Postgres + API + Adminer) |

---

## Como rodar

Pre-requisitos: Docker Desktop e Node 22 (o frontend roda no host).

```bash
cp .env.example .env
docker compose up -d          # Postgres + API + Adminer
cd web && npm install && npm run dev
```

| Servico | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API (health) | http://localhost:3333/api/health |
| Adminer | http://localhost:8081 |
| Postgres (host) | `localhost:5433` |

O Postgres e publicado na **5433** de proposito, para nao colidir com uma
instalacao local na 5432. Dentro da rede do Compose a porta continua sendo 5432.

Para derrubar tudo, inclusive os dados:

```bash
docker compose down -v
```

---

## Estrutura

```text
Papiro/
├── api/                  # Express + Prisma
│   ├── prisma/           # schema.prisma, migrations e seed
│   └── src/
│       ├── middlewares/  # erro terminal, 404
│       ├── routes/       # rotas por recurso
│       ├── app.ts        # composicao do Express
│       ├── env.ts        # validacao Zod das variaveis de ambiente
│       └── server.ts     # bootstrap
├── web/                  # React + Vite
│   └── src/
│       ├── components/   # organizado por feature, nao por tipo de arquivo
│       └── styles/       # tokens.css e global.css
├── db/                   # schema e views em SQL legivel (documentacao)
├── docs/
└── docker-compose.yml
```

---

## Decisoes tecnicas

As decisoes de modelagem (por que `Concurso` e a raiz, por que `Simulado` e
entidade propria, por que o `CHECK constraint` e duplicado na aplicacao) estao
documentadas na secao de arquitetura, que cresce junto com as etapas.

### Por que Prisma e nao SQL puro

SQL puro daria controle total, mas o custo aparece fora do happy path:

- **Migrations versionadas de graca.** `prisma migrate dev` gera um `.sql`
  datado e imutavel por alteracao. Com SQL puro, o versionamento vira
  disciplina manual — e disciplina manual falha.
- **Schema como documentacao viva.** `schema.prisma` e um arquivo unico que
  descreve o dominio inteiro. Um leitor entende o modelo em dois minutos.
- **Client tipado.** O TypeScript quebra em tempo de compilacao se a query
  pedir uma coluna que a migration removeu.

O que o Prisma **nao** faz aqui: ele nao vira dono das regras de negocio. As
constraints (`CHECK`, `UNIQUE`, `ON DELETE CASCADE`) vivem no Postgres, e as
agregacoes dos dashboards vivem em views SQL — o Prisma so as consome. Por isso
a pasta `db/` mantem o SQL legivel a parte: ele e parte da apresentacao do
projeto, nao um detalhe gerado.

### Por que TypeScript nos dois lados

O client do Prisma e o Zod so entregam o que prometem com tipos estaticos:
sem TS, a validacao de borda vira checagem em runtime e o client tipado vira
um objeto qualquer.

---

## Etapas

- [x] **1. Infraestrutura** — Docker Compose, monorepo, health check ponta a ponta
- [ ] **2. Schema e migrations** — `schema.prisma`, views SQL, seed com editais reais
- [ ] **3. API** — CRUD do edital, `POST /api/sessoes`, rotas de dashboard
- [ ] **4. Frontend** — edital verticalizado, formulario inline, dashboards
- [ ] **5. README de portfolio** — arquitetura, decisoes, GIF do dashboard
