-- ---------------------------------------------------------------------------
-- Migration escrita a mao.
--
-- O Prisma Schema Language nao representa CHECK constraints nem views, e essas
-- duas coisas sao justamente onde moram as regras de negocio deste projeto.
-- Deixa-las apenas na camada de aplicacao significaria que qualquer INSERT
-- fora da API (psql, Adminer, script de importacao) poderia gravar lixo.
-- ---------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- 1. Constraints de integridade das sessoes de estudo
-- --------------------------------------------------------------------------

-- Tempo de estudo e sempre positivo. Sessao de zero minuto nao e sessao.
ALTER TABLE "sessoes_estudo"
    ADD CONSTRAINT chk_tempo_minutos_positivo CHECK (tempo_minutos > 0);

-- Regra condicional: se a sessao for de Questoes, os tres contadores sao
-- obrigatorios; se nao for, os tres tem de ser nulos. Sem a segunda metade,
-- o banco aceitaria "Teoria com 30 acertos", que nao significa nada.
ALTER TABLE "sessoes_estudo"
    ADD CONSTRAINT chk_questoes_obrigatorias CHECK (
        (
            tipo_estudo = 'Questões'
            AND questoes_acertadas IS NOT NULL
            AND questoes_erradas   IS NOT NULL
            AND questoes_brancas   IS NOT NULL
        )
        OR (
            tipo_estudo <> 'Questões'
            AND questoes_acertadas IS NULL
            AND questoes_erradas   IS NULL
            AND questoes_brancas   IS NULL
        )
    );

-- Contadores nunca sao negativos.
ALTER TABLE "sessoes_estudo"
    ADD CONSTRAINT chk_questoes_nao_negativas CHECK (
        (questoes_acertadas IS NULL OR questoes_acertadas >= 0) AND
        (questoes_erradas   IS NULL OR questoes_erradas   >= 0) AND
        (questoes_brancas   IS NULL OR questoes_brancas   >= 0)
    );

-- --------------------------------------------------------------------------
-- 2. Views de dashboard
--
-- A agregacao mora aqui, nao no codigo da aplicacao: o banco ja sabe somar.
-- NULLIF protege a divisao quando nenhuma questao foi resolvida ainda.
-- --------------------------------------------------------------------------

CREATE VIEW vw_desempenho_disciplina AS
SELECT
    d.id        AS disciplina_id,
    d.nome      AS disciplina,
    d.peso      AS peso,
    c.id        AS cargo_id,
    c.nome      AS cargo,
    co.id       AS concurso_id,
    co.nome     AS concurso,
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
GROUP BY d.id, d.nome, d.peso, c.id, c.nome, co.id, co.nome;

CREATE VIEW vw_desempenho_topico AS
SELECT
    t.id            AS topico_id,
    t.codigo_edital AS codigo_edital,
    t.descricao     AS topico,
    t.ordem         AS ordem,
    d.id            AS disciplina_id,
    d.nome          AS disciplina,
    c.id            AS cargo_id,
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
LEFT JOIN sessoes_estudo s ON s.topico_id = t.id
GROUP BY t.id, t.codigo_edital, t.descricao, t.ordem, d.id, d.nome, c.id;
