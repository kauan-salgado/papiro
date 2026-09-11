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
docker compose up -d                       # Postgres + API + Adminer

cd api && cp .env.example .env
npm install && npm run prisma:generate
npm run prisma:migrate                     # cria o schema
npm run seed -- --demo                     # editais de exemplo + historico ficticio

cd ../web && npm install && npm run dev
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

> Ao adicionar uma dependencia nova na API, rebuildar a imagem nao basta: o
> volume anonimo de `node_modules` sobrevive e cobre o da imagem nova. Use
> `docker compose up -d --build --renew-anon-volumes api`.

---

## Estrutura

```text
Papiro/
├── api/                  # Express + Prisma
│   ├── prisma/
│   │   ├── data/         # editais em lote [disciplina, codigo, descricao]
│   │   ├── migrations/   # geradas pelo Prisma + uma escrita a mao
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── middlewares/  # erro terminal, 404
│       ├── routes/       # rotas por recurso
│       ├── lib/          # client do Prisma (instancia unica)
│       ├── app.ts        # composicao do Express
│       ├── env.ts        # validacao Zod das variaveis de ambiente
│       └── server.ts     # bootstrap
├── web/                  # React + Vite
│   └── src/
│       ├── components/   # organizado por feature, nao por tipo de arquivo
│       └── styles/       # tokens.css e global.css
├── db/
│   ├── schema.sql        # tabelas, enum, CHECKs e indices (leitura humana)
│   └── views.sql         # as duas views de dashboard
├── docs/
└── docker-compose.yml
```

---

## Modelo de dados

```text
Concurso (edital + banca)
└── Cargo (o perfil disputado)
    ├── Disciplina (peso na prova)
    │   └── Topico (codigo literal do edital + descricao)
    │       └── SessaoEstudo  ← fact table
    └── Simulado ──────────────┘ (agrupa sessoes de varias disciplinas)
```

Cinco decisoes de modelagem sustentam o resto do projeto:

**1. Concurso e o nivel raiz, acima de Cargo.** "Seguranca da Informacao" do
edital da PF e do edital da DATAPREV sao duas disciplinas diferentes, com
numeracao e redacao proprias. Se o Cargo fosse a raiz, os dois editais
colidiriam e o percentual de acerto de um contaminaria o do outro. O seed
demonstra isso de proposito: IDS/IPS/SIEM existe nos dois editais, com codigos
`7.5` e `3.4` e textos distintos.

**2. Sessao de Estudo e fact table, nao contador.** Uma linha por sessao
realizada, imutavel depois de gravada. Nenhuma tabela guarda "total de minutos
do topico": esse numero e `SUM(...) GROUP BY` sobre os fatos. Contador agregado
e mutavel mente na primeira exclusao de sessao — e excluir sessao e uma
funcionalidade prevista.

**3. Tempo so em minutos, inteiro.** Horas sao formatacao, nao dado. Persistir
os dois formatos cria a possibilidade de eles discordarem, e um dia discordam.

**4. As regras vivem no banco, nao so no formulario.** A regra condicional das
questoes e um `CHECK constraint`, nos dois sentidos: sessao de `Questões` exige
os tres contadores, e sessao de qualquer outro tipo exige que os tres sejam
nulos — sem a segunda metade, o banco aceitaria "Teoria com 30 acertos".
Validar so no React protegeria apenas quem entra pelo React; um `INSERT` pelo
Adminer, um script de importacao ou um bug na API passariam batido.

Prova de que a regra e do banco, e nao da aplicacao:

```text
INSERT ... tipo_estudo='Questões', contadores NULL  -> ERRO 23514 chk_questoes_obrigatorias
INSERT ... tipo_estudo='Teoria',   contadores 10/2/1 -> ERRO 23514 chk_questoes_obrigatorias
INSERT ... tempo_minutos=0                           -> ERRO 23514 chk_tempo_minutos_positivo
INSERT ... questoes_acertadas=-5                     -> ERRO 23514 chk_questoes_nao_negativas
```

**5. Simulado e entidade, nao um valor de `tipo_estudo`.** Um simulado cobre
varias disciplinas de uma vez. Como entidade, ele agrupa as sessoes geradas por
aquela prova (`simulado_id` opcional em `sessoes_estudo`), e o mesmo dado serve
para duas leituras: o desempenho por topico e o resultado consolidado do
simulado. Como valor de enum, o simulado seria uma sessao unica grudada em um
topico so, e a informacao de quais assuntos ele cobriu se perderia.

### Agregacao mora em views

`vw_desempenho_disciplina` e `vw_desempenho_topico` fazem o `SUM`/`GROUP BY` e
o calculo de percentual de acerto. A aplicacao le e desenha; ela nao recalcula
estatistica em JavaScript. O `LEFT JOIN` garante que disciplina sem nenhuma
sessao apareca zerada no dashboard em vez de sumir da lista, e o `NULLIF`
protege a divisao enquanto nenhuma questao foi resolvida.

---

## Banco de dados: comandos

```bash
cd api
cp .env.example .env               # DATABASE_URL para a CLI rodando no host
npm run prisma:migrate             # aplica as migrations
npm run prisma:generate            # regenera o Prisma Client
npm run seed                       # importa os dois editais de exemplo
npm run seed -- --demo             # importa e gera historico ficticio de estudo
```

O seed e **idempotente**: ele remove a importacao anterior daquele concurso (o
`ON DELETE CASCADE` limpa cargos, disciplinas, topicos e sessoes) antes de
recriar. Rodar duas vezes nao duplica nada.

> Os editais em `api/prisma/data/` sao **dados de exemplo**, aproximacoes
> escritas para exercitar o modelo. Para usar os itens reais, basta substituir o
> array `itens` de cada arquivo — o formato e exatamente
> `[disciplina, codigoEdital, descricao]`.


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

### Prisma 7: o que muda na pratica

A versao 7 do Prisma removeu a engine binaria. Tres consequencias visiveis
neste repo, todas documentadas para quem for ler o codigo:

- **Driver adapter obrigatorio.** A conexao passa por `@prisma/adapter-pg` sobre
  o `pg`. Ver `api/src/lib/prisma.ts`.
- **`prisma.config.ts` no lugar da chave `prisma` do package.json.** E la que
  ficam o caminho do schema, o das migrations e o comando de seed. O `.env` nao
  e mais lido automaticamente: o proprio config faz `import 'dotenv/config'`.
- **Enum com `@map` troca de nome no client.** No banco os valores sao
  `Revisão` e `Questões`; no Prisma Client eles chegam como `Revisao` e
  `Questoes`. A API expoe os nomes do client e a interface cuida dos acentos.

### O que o Prisma nao faz aqui

`CHECK constraint` e `VIEW` nao existem no Prisma Schema Language. Em vez de
abandonar as duas coisas — que e onde as regras de negocio deste projeto moram —
elas vivem em uma migration escrita a mao
(`api/prisma/migrations/*_constraints_e_views/`), aplicada e versionada junto
com as demais. O historico de migrations fica dividido de proposito:

| Migration | Origem |
| --- | --- |
| `..._init` | gerada pelo Prisma (tabelas, enum, FKs, indices) |
| `..._constraints_e_views` | escrita a mao (CHECKs e as duas views) |

Um detalhe que so aparece ao rodar: `@default(now())` em coluna `DATE` vira
`DEFAULT CURRENT_TIMESTAMP` no SQL gerado. Como o schema de referencia pede
`CURRENT_DATE`, os campos usam `@default(dbgenerated("CURRENT_DATE"))` — assim o
banco e o `schema.prisma` concordam e `prisma migrate diff` acusa zero drift.


### Por que TypeScript nos dois lados

O client do Prisma e o Zod so entregam o que prometem com tipos estaticos:
sem TS, a validacao de borda vira checagem em runtime e o client tipado vira
um objeto qualquer.

---

## Etapas

- [x] **1. Infraestrutura** — Docker Compose, monorepo, health check ponta a ponta
- [x] **2. Schema e migrations** — `schema.prisma`, CHECKs, views SQL e seed em lote
- [ ] **3. API** — CRUD do edital, `POST /api/sessoes`, rotas de dashboard
- [ ] **4. Frontend** — edital verticalizado, formulario inline, dashboards
- [ ] **5. README de portfolio** — arquitetura, decisoes, GIF do dashboard
