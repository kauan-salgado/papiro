import { z } from 'zod';
import { NaoEncontradoError } from '../../http/erros.js';
import { filtroSimulado } from '../../http/posse.js';
import { formatarDataISO } from '../../lib/datas.js';
import { prisma } from '../../lib/prisma.js';
import { linhaConsolidadoSchema } from './simulados.schema.js';

/**
 * Consolidado do simulado por disciplina.
 *
 * E aqui que a decisao de modelar Simulado como entidade se paga: as mesmas
 * sessoes que alimentam o desempenho por topico se reagrupam, sem duplicacao
 * de dado, na leitura "como foi a prova inteira".
 */
export async function consolidarSimulado(simuladoId: number, usuarioId: number) {
  const simulado = await prisma.simulado.findFirst({
    where: { id: simuladoId, ...filtroSimulado(usuarioId) },
    include: { cargo: { select: { id: true, nome: true, concursoId: true } } },
  });

  if (!simulado) {
    throw new NaoEncontradoError('Simulado', simuladoId);
  }

  const linhas = await prisma.$queryRawUnsafe(
    `SELECT d.id::int   AS "disciplinaId",
            d.nome      AS "disciplina",
            count(s.id)::int                        AS "totalSessoes",
            coalesce(sum(s.tempo_minutos), 0)::int  AS "totalMinutos",
            coalesce(sum(s.questoes_acertadas), 0)::int AS "acertos",
            coalesce(sum(s.questoes_erradas), 0)::int   AS "erros",
            coalesce(sum(s.questoes_brancas), 0)::int   AS "brancos",
            ROUND(
              100.0 * coalesce(sum(s.questoes_acertadas), 0) /
              NULLIF(coalesce(sum(s.questoes_acertadas), 0)
                   + coalesce(sum(s.questoes_erradas), 0)
                   + coalesce(sum(s.questoes_brancas), 0), 0), 1
            )::float AS "percentualAcerto"
     FROM sessoes_estudo s
     JOIN topicos t     ON t.id = s.topico_id
     JOIN disciplinas d ON d.id = t.disciplina_id
     WHERE s.simulado_id = $1::int
     GROUP BY d.id, d.nome
     ORDER BY d.nome`,
    simuladoId,
  );

  const porDisciplina = z.array(linhaConsolidadoSchema).parse(linhas);

  const totais = porDisciplina.reduce(
    (soma, linha) => ({
      totalSessoes: soma.totalSessoes + linha.totalSessoes,
      totalMinutos: soma.totalMinutos + linha.totalMinutos,
      acertos: soma.acertos + linha.acertos,
      erros: soma.erros + linha.erros,
      brancos: soma.brancos + linha.brancos,
    }),
    { totalSessoes: 0, totalMinutos: 0, acertos: 0, erros: 0, brancos: 0 },
  );

  const questoes = totais.acertos + totais.erros + totais.brancos;

  return {
    simulado: {
      id: simulado.id,
      nome: simulado.nome,
      data: formatarDataISO(simulado.data),
      cargo: simulado.cargo,
    },
    porDisciplina,
    totais: {
      ...totais,
      percentualAcerto:
        questoes > 0 ? Math.round((1000 * totais.acertos) / questoes) / 10 : null,
    },
  };
}
