import { NaoEncontradoError } from '../../http/erros.js';
import { filtroCargo } from '../../http/posse.js';
import { prisma } from '../../lib/prisma.js';
import {
  desempenhoDosTopicosDoCargo,
  desempenhoPorDisciplina,
} from '../dashboard/dashboard.service.js';
import type { DesempenhoTopico } from '../dashboard/dashboard.schema.js';
import type { ImportarEdital, ItemEdital } from './cargos.schema.js';

/**
 * Edital verticalizado: disciplina como cabecalho de grupo, topicos abaixo,
 * cada um ja com suas metricas. Uma chamada monta a tela inteira — sem isso o
 * front faria uma requisicao por disciplina (o classico waterfall).
 */
export async function montarEditalVerticalizado(cargoId: number, usuarioId: number) {
  const cargo = await prisma.cargo.findFirst({
    where: { id: cargoId, ...filtroCargo(usuarioId) },
    include: { concurso: { select: { id: true, nome: true, banca: true, dataProva: true } } },
  });

  if (!cargo) {
    throw new NaoEncontradoError('Cargo', cargoId);
  }

  const [disciplinas, topicos] = await Promise.all([
    desempenhoPorDisciplina(usuarioId, cargoId),
    desempenhoDosTopicosDoCargo(usuarioId, cargoId),
  ]);

  const topicosPorDisciplina = topicos.reduce((mapa, topico) => {
    const atuais = mapa.get(topico.disciplinaId) ?? [];
    return new Map(mapa).set(topico.disciplinaId, [...atuais, topico]);
  }, new Map<number, readonly DesempenhoTopico[]>());

  return {
    cargo: { id: cargo.id, nome: cargo.nome },
    concurso: cargo.concurso,
    // Ordem do edital, nao do desempenho: esta tela e para ler o edital.
    disciplinas: [...disciplinas]
      .sort((a, b) => a.disciplina.localeCompare(b.disciplina, 'pt-BR'))
      .map((disciplina) => ({
        ...disciplina,
        topicos: topicosPorDisciplina.get(disciplina.disciplinaId) ?? [],
      })),
  };
}

function agruparPorDisciplina(
  itens: readonly ItemEdital[],
): ReadonlyMap<string, readonly ItemEdital[]> {
  return itens.reduce((grupos, item) => {
    const acumulados = grupos.get(item.disciplina) ?? [];
    return new Map(grupos).set(item.disciplina, [...acumulados, item]);
  }, new Map<string, readonly ItemEdital[]>());
}

/**
 * Importacao em lote de um edital inteiro. Cadastrar 70 itens a mao, um a um,
 * e trabalho de digitador — esta rota recebe a lista estruturada de uma vez.
 *
 * Tudo em uma transacao: ou o edital entra inteiro, ou nao entra nada. Sem
 * `substituir`, a importacao e incremental e itens ja existentes (mesma
 * disciplina + mesmo codigo do edital) sao ignorados em vez de duplicados.
 */
export async function importarEdital(
  cargoId: number,
  usuarioId: number,
  entrada: ImportarEdital,
) {
  const cargo = await prisma.cargo.findFirst({
    where: { id: cargoId, ...filtroCargo(usuarioId) },
    select: { id: true },
  });

  if (!cargo) {
    throw new NaoEncontradoError('Cargo', cargoId);
  }

  const grupos = agruparPorDisciplina(entrada.itens);

  return prisma.$transaction(async (tx) => {
    if (entrada.substituir) {
      await tx.disciplina.deleteMany({ where: { cargoId } });
    }

    let disciplinasCriadas = 0;
    let topicosCriados = 0;

    for (const [nome, itens] of grupos) {
      const existente = await tx.disciplina.findFirst({
        where: { cargoId, nome },
        select: { id: true },
      });

      const disciplinaId =
        existente?.id ??
        (
          await tx.disciplina.create({
            data: { cargoId, nome, peso: entrada.pesos?.[nome] ?? 1 },
            select: { id: true },
          })
        ).id;

      if (!existente) {
        disciplinasCriadas += 1;
      }

      const { count } = await tx.topico.createMany({
        data: itens.map((item, indice) => ({
          disciplinaId,
          codigoEdital: item.codigoEdital ?? null,
          descricao: item.descricao,
          ordem: indice + 1,
        })),
        skipDuplicates: true,
      });

      topicosCriados += count;
    }

    return {
      disciplinasCriadas,
      topicosCriados,
      topicosIgnorados: entrada.itens.length - topicosCriados,
    };
  });
}
