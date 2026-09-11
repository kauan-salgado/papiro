import { RequisicaoInvalidaError } from '../../http/erros.js';
import { formatarDataISO, paraDataDoBanco } from '../../lib/datas.js';
import { prisma } from '../../lib/prisma.js';
import type { CriarSessao } from './sessoes.schema.js';

/** A API devolve data como YYYY-MM-DD; o horario da coluna DATE nao interessa. */
function paraDTO<T extends { data: Date }>(sessao: T) {
  return { ...sessao, data: formatarDataISO(sessao.data) };
}

const SELECAO_PADRAO = {
  id: true,
  topicoId: true,
  simuladoId: true,
  data: true,
  tempoMinutos: true,
  tipoEstudo: true,
  questoesAcertadas: true,
  questoesErradas: true,
  questoesBrancas: true,
  observacoes: true,
  createdAt: true,
  simulado: { select: { id: true, nome: true } },
} as const;

/**
 * Regra que o banco nao tem como impor sozinho: simulado e sessao precisam
 * pertencer ao mesmo cargo. Sem esta checagem seria possivel pendurar uma
 * sessao de um edital em um simulado de outro, e o consolidado do
 * simulado passaria a somar questoes de outro concurso.
 */
async function garantirSimuladoDoMesmoCargo(
  topicoId: number,
  simuladoId: number,
): Promise<void> {
  const [topico, simulado] = await Promise.all([
    prisma.topico.findUnique({
      where: { id: topicoId },
      select: { disciplina: { select: { cargoId: true } } },
    }),
    prisma.simulado.findUnique({ where: { id: simuladoId }, select: { cargoId: true } }),
  ]);

  if (!simulado) {
    throw new RequisicaoInvalidaError(`Simulado ${simuladoId} nao encontrado.`);
  }

  if (topico && topico.disciplina.cargoId !== simulado.cargoId) {
    throw new RequisicaoInvalidaError(
      'O simulado pertence a outro cargo; ele nao pode agrupar sessoes deste topico.',
    );
  }
}

export async function registrarSessao(dados: CriarSessao) {
  if (dados.simuladoId) {
    await garantirSimuladoDoMesmoCargo(dados.topicoId, dados.simuladoId);
  }

  const sessao = await prisma.sessaoEstudo.create({
    data: {
      topicoId: dados.topicoId,
      simuladoId: dados.simuladoId ?? null,
      ...(dados.data && { data: paraDataDoBanco(dados.data) }),
      tempoMinutos: dados.tempoMinutos,
      tipoEstudo: dados.tipoEstudo,
      questoesAcertadas: dados.questoesAcertadas ?? null,
      questoesErradas: dados.questoesErradas ?? null,
      questoesBrancas: dados.questoesBrancas ?? null,
      observacoes: dados.observacoes ?? null,
    },
    select: SELECAO_PADRAO,
  });

  return paraDTO(sessao);
}

export async function listarSessoesDoTopico(topicoId: number) {
  const sessoes = await prisma.sessaoEstudo.findMany({
    where: { topicoId },
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
    select: SELECAO_PADRAO,
  });

  return sessoes.map(paraDTO);
}

export async function excluirSessao(id: number): Promise<void> {
  await prisma.sessaoEstudo.delete({ where: { id } });
}
