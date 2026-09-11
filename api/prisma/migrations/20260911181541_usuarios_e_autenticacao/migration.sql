-- ---------------------------------------------------------------------------
-- Contas de usuario.
--
-- A tabela `concursos` ja tem dados, e `usuario_id` e obrigatorio: a coluna
-- nao pode nascer NOT NULL. A transicao acontece em quatro tempos — cria as
-- tabelas, adiciona a coluna aceitando nulo, da um dono aos registros orfaos,
-- e so entao aperta a restricao.
-- ---------------------------------------------------------------------------

-- 1. Identidade -------------------------------------------------------------

CREATE TABLE "usuarios" (
    "id"         SERIAL PRIMARY KEY,
    -- Id numerico do GitHub: imutavel, ao contrario do login, que a pessoa
    -- pode trocar a qualquer momento.
    "github_id"  VARCHAR(40) NOT NULL,
    "login"      VARCHAR(80) NOT NULL,
    "nome"       VARCHAR(120),
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "usuarios_github_id_key" ON "usuarios"("github_id");

-- Sessao de login no banco, e nao em JWT: sair de verdade exige poder
-- invalidar o que ja foi emitido.
CREATE TABLE "sessoes_auth" (
    "token"      VARCHAR(64) PRIMARY KEY,
    "usuario_id" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "expira_em"  TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "idx_sessoes_auth_usuario"   ON "sessoes_auth"("usuario_id");
CREATE INDEX "idx_sessoes_auth_expiracao" ON "sessoes_auth"("expira_em");

-- 2. Coluna aceitando nulo --------------------------------------------------

ALTER TABLE "concursos" ADD COLUMN "usuario_id" INTEGER;

-- 3. Dono para o que ja existe ----------------------------------------------
--
-- Os editais gravados antes das contas viram da conta de demonstracao. O
-- github_id sintetico ('demonstracao') nunca colide com um id do GitHub, que
-- e sempre numerico.
INSERT INTO "usuarios" ("github_id", "login", "nome")
SELECT 'demonstracao', 'demonstracao', 'Conta de demonstração'
WHERE EXISTS (SELECT 1 FROM "concursos" WHERE "usuario_id" IS NULL);

UPDATE "concursos"
   SET "usuario_id" = (SELECT "id" FROM "usuarios" WHERE "github_id" = 'demonstracao')
 WHERE "usuario_id" IS NULL;

-- 4. Agora sim, obrigatoria --------------------------------------------------

ALTER TABLE "concursos" ALTER COLUMN "usuario_id" SET NOT NULL;

ALTER TABLE "concursos"
  ADD CONSTRAINT "concursos_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_concursos_usuario" ON "concursos"("usuario_id");

-- 5. Views passam a carregar o dono ------------------------------------------
--
-- Sem isto o dashboard nao teria como filtrar: ele le das views, e elas
-- agregavam sobre todos os editais do banco.

DROP VIEW IF EXISTS vw_desempenho_disciplina;
DROP VIEW IF EXISTS vw_desempenho_topico;

CREATE VIEW vw_desempenho_disciplina AS
SELECT
    d.id        AS disciplina_id,
    d.nome      AS disciplina,
    d.peso      AS peso,
    c.id        AS cargo_id,
    c.nome      AS cargo,
    co.id       AS concurso_id,
    co.nome     AS concurso,
    co.usuario_id AS usuario_id,
    COUNT(s.id)                            AS total_sessoes,
    COALESCE(SUM(s.tempo_minutos), 0)      AS total_minutos,
    COALESCE(SUM(s.questoes_acertadas), 0) AS acertos,
    COALESCE(SUM(s.questoes_erradas), 0)   AS erros,
    COALESCE(SUM(s.questoes_brancas), 0)   AS brancos,
    ROUND(
        100.0 * COALESCE(SUM(s.questoes_acertadas), 0) /
        NULLIF(
            COALESCE(SUM(s.questoes_acertadas), 0)
          + COALESCE(SUM(s.questoes_erradas), 0)
          + COALESCE(SUM(s.questoes_brancas), 0), 0
        ), 1
    ) AS percentual_acerto
FROM disciplinas d
JOIN cargos c        ON c.id  = d.cargo_id
JOIN concursos co    ON co.id = c.concurso_id
LEFT JOIN topicos t          ON t.disciplina_id = d.id
LEFT JOIN sessoes_estudo s   ON s.topico_id     = t.id
GROUP BY d.id, d.nome, d.peso, c.id, c.nome, co.id, co.nome, co.usuario_id;

CREATE VIEW vw_desempenho_topico AS
SELECT
    t.id            AS topico_id,
    t.codigo_edital AS codigo_edital,
    t.descricao     AS topico,
    t.ordem         AS ordem,
    d.id            AS disciplina_id,
    d.nome          AS disciplina,
    c.id            AS cargo_id,
    co.usuario_id   AS usuario_id,
    COUNT(s.id)                            AS total_sessoes,
    COALESCE(SUM(s.tempo_minutos), 0)      AS total_minutos,
    COALESCE(SUM(s.questoes_acertadas), 0) AS acertos,
    COALESCE(SUM(s.questoes_erradas), 0)   AS erros,
    COALESCE(SUM(s.questoes_brancas), 0)   AS brancos,
    MAX(s.data)                            AS ultimo_estudo,
    ROUND(
        100.0 * COALESCE(SUM(s.questoes_acertadas), 0) /
        NULLIF(
            COALESCE(SUM(s.questoes_acertadas), 0)
          + COALESCE(SUM(s.questoes_erradas), 0)
          + COALESCE(SUM(s.questoes_brancas), 0), 0
        ), 1
    ) AS percentual_acerto
FROM topicos t
JOIN disciplinas d ON d.id = t.disciplina_id
JOIN cargos c      ON c.id = d.cargo_id
JOIN concursos co  ON co.id = c.concurso_id
LEFT JOIN sessoes_estudo s ON s.topico_id = t.id
GROUP BY t.id, t.codigo_edital, t.descricao, t.ordem, d.id, d.nome, c.id, co.usuario_id;
