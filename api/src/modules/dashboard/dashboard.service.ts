import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import {
  linhaDesempenhoDisciplinaSchema,
  linhaDesempenhoTopicoSchema,
} from './dashboard.schema.js';

/**
 * Leitura das views de dashboard.
 *
 * Os casts explicitos (::int, ::float) nao sao decoracao: COUNT e SUM voltam
 * como BIGINT, que o driver entrega como BigInt do JavaScript — e JSON.stringify
 * quebra em BigInt. ROUND(numeric) viria como Decimal pelo mesmo caminho.
 * Convertendo no SQL, a API entrega number puro.
 *
 * Sobre o $queryRawUnsafe: "unsafe" se refere a montar o texto da query em
 * codigo, nao aos valores. As constantes SQL daqui sao literais do modulo e os
 * valores vao como parametros ($1), ou seja, continuam parametrizados e imunes
 * a injecao. O motivo de nao usar template tag e o filtro opcional por cargo,
 * que precisa reaproveitar o mesmo SELECT com WHERE variavel.
 */

const VISAO_MACRO_SQL = `
  SELECT disciplina_id::int      AS "disciplinaId",
         disciplina              AS "disciplina",
         peso::float             AS "peso",
         cargo_id::int           AS "cargoId",
         cargo                   AS "cargo",
         concurso_id::int        AS "concursoId",
         concurso                AS "concurso",
         total_sessoes::int      AS "totalSessoes",
         total_minutos::int      AS "totalMinutos",
         acertos::int            AS "acertos",
         erros::int              AS "erros",
         brancos::int            AS "brancos",
         percentual_acerto::float AS "percentualAcerto"
  FROM vw_desempenho_disciplina
`;

const VISAO_MICRO_SQL = `
  SELECT topico_id::int          AS "topicoId",
         codigo_edital           AS "codigoEdital",
         topico                  AS "topico",
         ordem::int              AS "ordem",
         disciplina_id::int      AS "disciplinaId",
         disciplina              AS "disciplina",
         total_sessoes::int      AS "totalSessoes",
         total_minutos::int      AS "totalMinutos",
         acertos::int            AS "acertos",
         erros::int              AS "erros",
         brancos::int            AS "brancos",
         to_char(ultimo_estudo, 'YYYY-MM-DD') AS "ultimoEstudo",
         percentual_acerto::float AS "percentualAcerto"
  FROM vw_desempenho_topico
`;

/**
 * Visao macro: como as disciplinas de um cargo se comparam entre si.
 *
 * O `usuario_id` entra em TODA consulta de dashboard. As views agregam sobre o
 * banco inteiro; sem esse filtro, o total de horas de um usuario apareceria
 * somado ao de outro.
 */
export async function desempenhoPorDisciplina(usuarioId: number, cargoId?: number) {
  const linhas = await prisma.$queryRawUnsafe(
    `${VISAO_MACRO_SQL}
     WHERE usuario_id = $1::int
       AND ($2::int IS NULL OR cargo_id = $2::int)
     ORDER BY "percentualAcerto" ASC NULLS LAST, "disciplina" ASC`,
    usuarioId,
    cargoId ?? null,
  );

  return z.array(linhaDesempenhoDisciplinaSchema).parse(linhas);
}

/**
 * Visao micro: topicos da disciplina do PIOR para o MELHOR percentual de
 * acerto. Topico ainda sem questoes resolvidas vai para o fim da lista — ele
 * nao esta indo mal, so nao foi medido ainda.
 */
export async function desempenhoPorTopico(usuarioId: number, disciplinaId: number) {
  const linhas = await prisma.$queryRawUnsafe(
    `${VISAO_MICRO_SQL}
     WHERE usuario_id = $1::int
       AND disciplina_id = $2::int
     ORDER BY "percentualAcerto" ASC NULLS LAST, "ordem" ASC`,
    usuarioId,
    disciplinaId,
  );

  return z.array(linhaDesempenhoTopicoSchema).parse(linhas);
}

/** Metricas de todos os topicos de um cargo, para montar o edital verticalizado. */
export async function desempenhoDosTopicosDoCargo(usuarioId: number, cargoId: number) {
  const linhas = await prisma.$queryRawUnsafe(
    `${VISAO_MICRO_SQL}
     WHERE usuario_id = $1::int
       AND cargo_id = $2::int
     ORDER BY "disciplinaId" ASC, "ordem" ASC, "topicoId" ASC`,
    usuarioId,
    cargoId,
  );

  return z.array(linhaDesempenhoTopicoSchema).parse(linhas);
}
