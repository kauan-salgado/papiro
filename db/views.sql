-- ---------------------------------------------------------------------------
-- Papiro — views de dashboard
--
-- A agregacao mora no banco. A aplicacao le, formata e desenha; ela nao
-- recalcula percentual de acerto em JavaScript.
--
-- LEFT JOIN em topicos/sessoes: disciplina sem nenhuma sessao registrada
-- precisa aparecer no dashboard com zero, e nao sumir da lista.
-- NULLIF: protege a divisao enquanto nenhuma questao foi resolvida.
-- ---------------------------------------------------------------------------

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
