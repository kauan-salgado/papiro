-- ---------------------------------------------------------------------------
-- Papiro — schema em SQL legivel
--
-- Espelho fiel do que as migrations do Prisma criam
-- (api/prisma/migrations/). Este arquivo NAO roda no boot: existe para que o
-- modelo de dados possa ser lido sem passar pelo schema.prisma.
--
-- Hierarquia: concursos -> cargos -> disciplinas -> topicos -> sessoes_estudo
-- ---------------------------------------------------------------------------

CREATE TYPE tipo_estudo_enum AS ENUM ('Teoria', 'Revisão', 'Resumo', 'Questões');

-- Nivel raiz. Um mesmo assunto ("IDS/IPS/SIEM") pode existir em dois editais
-- com redacao e numeracao diferentes — sao registros distintos, de proposito.
CREATE TABLE concursos (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(150) NOT NULL,
    banca      VARCHAR(80),
    data_prova DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cargos (
    id          SERIAL PRIMARY KEY,
    concurso_id INTEGER NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
    nome        VARCHAR(150) NOT NULL
);

CREATE TABLE disciplinas (
    id       SERIAL PRIMARY KEY,
    cargo_id INTEGER NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
    nome     VARCHAR(120) NOT NULL,
    peso     NUMERIC(4,2) DEFAULT 1,
    UNIQUE (cargo_id, nome)
);

CREATE TABLE topicos (
    id            SERIAL PRIMARY KEY,
    disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    codigo_edital VARCHAR(20),   -- numeracao literal do edital: "17.1", "7.4.2"
    descricao     TEXT NOT NULL, -- texto literal do item, sem reescrita
    ordem         INTEGER,       -- ordem de exibicao no edital verticalizado
    UNIQUE (disciplina_id, codigo_edital)
);

-- Entidade propria, e nao um valor de tipo_estudo: um simulado agrupa varias
-- sessoes (uma por disciplina coberta), permitindo a visao granular por topico
-- e a consolidada do simulado ao mesmo tempo.
CREATE TABLE simulados (
    id       SERIAL PRIMARY KEY,
    cargo_id INTEGER NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
    nome     VARCHAR(150) NOT NULL,
    data     DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Fact table: uma linha por sessao realizada, nunca um contador agregado e
-- mutavel. Todo total sai de SUM/GROUP BY daqui (ver views.sql).
CREATE TABLE sessoes_estudo (
    id                 SERIAL PRIMARY KEY,
    topico_id          INTEGER NOT NULL REFERENCES topicos(id) ON DELETE CASCADE,
    simulado_id        INTEGER REFERENCES simulados(id) ON DELETE SET NULL,
    data               DATE NOT NULL DEFAULT CURRENT_DATE,
    tempo_minutos      INTEGER NOT NULL,  -- somente minutos; horas sao formatacao
    tipo_estudo        tipo_estudo_enum NOT NULL,
    questoes_acertadas INTEGER,
    questoes_erradas   INTEGER,
    questoes_brancas   INTEGER,
    observacoes        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_tempo_minutos_positivo CHECK (tempo_minutos > 0),

    -- Regra condicional nos dois sentidos: sessao de Questoes exige os tres
    -- contadores; qualquer outro tipo exige que os tres sejam nulos.
    CONSTRAINT chk_questoes_obrigatorias CHECK (
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
    ),

    CONSTRAINT chk_questoes_nao_negativas CHECK (
        (questoes_acertadas IS NULL OR questoes_acertadas >= 0) AND
        (questoes_erradas   IS NULL OR questoes_erradas   >= 0) AND
        (questoes_brancas   IS NULL OR questoes_brancas   >= 0)
    )
);

CREATE INDEX idx_sessoes_topico ON sessoes_estudo(topico_id);
CREATE INDEX idx_sessoes_data   ON sessoes_estudo(data);
