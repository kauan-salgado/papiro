-- ---------------------------------------------------------------------------
-- Sessao de estudo em tres niveis.
--
-- Ate aqui, toda sessao precisava de um topico. Mas nem todo estudo cabe em um
-- item do edital: uma bateria de 30 questoes avulsas e "de Seguranca da
-- Informacao", e um simulado e da prova inteira. Forcar um topico nesses casos
-- obrigaria a inventar um item que o edital nao tem.
--
-- Agora a sessao aponta para o cargo (sempre) e, opcionalmente, refina em
-- disciplina e topico:
--     topico  -> estudo de um item do edital
--     so disciplina -> bateria avulsa da materia
--     so cargo      -> simulado da prova inteira
-- ---------------------------------------------------------------------------

-- 1. Colunas novas, aceitando nulo enquanto nao ha dados -----------------------

ALTER TABLE "sessoes_estudo" ADD COLUMN "cargo_id" INTEGER;
ALTER TABLE "sessoes_estudo" ADD COLUMN "disciplina_id" INTEGER;

-- 2. Backfill: toda sessao existente e de um topico, e dele saem os dois ------

UPDATE "sessoes_estudo" s
   SET "disciplina_id" = t."disciplina_id",
       "cargo_id"      = d."cargo_id"
  FROM "topicos" t
  JOIN "disciplinas" d ON d."id" = t."disciplina_id"
 WHERE t."id" = s."topico_id";

ALTER TABLE "sessoes_estudo" ALTER COLUMN "cargo_id" SET NOT NULL;

-- 3. O topico deixa de ser obrigatorio ----------------------------------------

ALTER TABLE "sessoes_estudo" ALTER COLUMN "topico_id" DROP NOT NULL;

-- 4. Consistencia garantida pelo banco, nao pela aplicacao ---------------------
--
-- As chaves compostas impedem o que seria um bug silencioso: uma sessao
-- apontando para disciplina de outro cargo, ou topico de outra disciplina.

CREATE UNIQUE INDEX "disciplinas_id_cargo_id_key" ON "disciplinas"("id", "cargo_id");
CREATE UNIQUE INDEX "topicos_id_disciplina_id_key" ON "topicos"("id", "disciplina_id");

ALTER TABLE "sessoes_estudo" DROP CONSTRAINT "sessoes_estudo_topico_id_fkey";

ALTER TABLE "sessoes_estudo"
  ADD CONSTRAINT "sessoes_estudo_cargo_id_fkey"
  FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessoes_estudo"
  ADD CONSTRAINT "sessoes_estudo_disciplina_id_cargo_id_fkey"
  FOREIGN KEY ("disciplina_id", "cargo_id") REFERENCES "disciplinas"("id", "cargo_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessoes_estudo"
  ADD CONSTRAINT "sessoes_estudo_topico_id_disciplina_id_fkey"
  FOREIGN KEY ("topico_id", "disciplina_id") REFERENCES "topicos"("id", "disciplina_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Topico sem disciplina seria um nivel solto: o refinamento e em cascata.
ALTER TABLE "sessoes_estudo"
  ADD CONSTRAINT chk_nivel_coerente CHECK (
    "topico_id" IS NULL OR "disciplina_id" IS NOT NULL
  );

CREATE INDEX "idx_sessoes_disciplina" ON "sessoes_estudo"("disciplina_id");
CREATE INDEX "idx_sessoes_cargo" ON "sessoes_estudo"("cargo_id");

-- 5. Views: a agregacao por disciplina deixa de passar pelos topicos ----------
--
-- Antes era disciplina -> topicos -> sessoes. Agora a sessao ja diz de qual
-- disciplina ela e (inclusive as de topico, que carregam as duas colunas),
-- entao a soma vem direta — e passa a incluir as baterias avulsas.

DROP VIEW IF EXISTS vw_desempenho_disciplina;
DROP VIEW IF EXISTS vw_desempenho_topico;

CREATE VIEW vw_desempenho_disciplina AS
SELECT
    d.id          AS disciplina_id,
    d.nome        AS disciplina,
    d.peso        AS peso,
    c.id          AS cargo_id,
    c.nome        AS cargo,
    co.id         AS concurso_id,
    co.nome       AS concurso,
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
JOIN cargos c     ON c.id  = d.cargo_id
JOIN concursos co ON co.id = c.concurso_id
LEFT JOIN sessoes_estudo s ON s.disciplina_id = d.id
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

-- 6. Visao do cargo inteiro, incluindo o que nao pertence a disciplina --------

CREATE VIEW vw_desempenho_cargo AS
SELECT
    c.id          AS cargo_id,
    c.nome        AS cargo,
    co.usuario_id AS usuario_id,
    COUNT(s.id)                            AS total_sessoes,
    COALESCE(SUM(s.tempo_minutos), 0)      AS total_minutos,
    COALESCE(SUM(s.questoes_acertadas), 0) AS acertos,
    COALESCE(SUM(s.questoes_erradas), 0)   AS erros,
    COALESCE(SUM(s.questoes_brancas), 0)   AS brancos,
    -- Simulados e estudo geral: sessoes presas ao cargo, sem disciplina.
    COUNT(s.id) FILTER (WHERE s.disciplina_id IS NULL)                       AS sessoes_gerais,
    COALESCE(SUM(s.tempo_minutos) FILTER (WHERE s.disciplina_id IS NULL), 0) AS minutos_gerais,
    ROUND(
        100.0 * COALESCE(SUM(s.questoes_acertadas), 0) /
        NULLIF(
            COALESCE(SUM(s.questoes_acertadas), 0)
          + COALESCE(SUM(s.questoes_erradas), 0)
          + COALESCE(SUM(s.questoes_brancas), 0), 0
        ), 1
    ) AS percentual_acerto
FROM cargos c
JOIN concursos co ON co.id = c.concurso_id
LEFT JOIN sessoes_estudo s ON s.cargo_id = c.id
GROUP BY c.id, c.nome, co.usuario_id;
