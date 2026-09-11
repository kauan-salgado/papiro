import { NaoEncontradoError, RequisicaoInvalidaError } from '../../http/erros.js';
import { filtroSessao, filtroSimulado, filtroTopico } from '../../http/posse.js';
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
  usuarioId: number,
): Promise<void> {
  const [topico, simulado] = await Promise.all([
    prisma.topico.findFirst({
      where: { id: topicoId, ...filtroTopico(usuarioId) },
      select: { disciplina: { select: { cargoId: true } } },
    }),
    prisma.simulado.findFirst({
      where: { id: simuladoId, ...filtroSimulado(usuarioId) },
      select: { cargoId: true },
    }),
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

export async function registrarSessao(dados: CriarSessao, usuarioId: number) {
  // O topico precisa ser do proprio usuario: sem isto, bastaria mandar o id do
  // topico de outra pessoa para gravar estudo na conta dela.
  const topico = await prisma.topico.findFirst({
    where: { id: dados.topicoId, ...filtroTopico(usuarioId) },
    select: { id: true },
  });

  if (!topico) {
    throw new NaoEncontradoError('Topico', dados.topicoId);
  }

  if (dados.simuladoId) {
    await garantirSimuladoDoMesmoCargo(dados.topicoId, dados.simuladoId, usuarioId);
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

export async function listarSessoesDoTopico(topicoId: number, usuarioId: number) {
  const sessoes = await prisma.sessaoEstudo.findMany({
    where: { topicoId, ...filtroSessao(usuarioId) },
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
    select: SELECAO_PADRAO,
  });

  return sessoes.map(paraDTO);
}

export async function excluirSessao(id: number, usuarioId: number): Promise<void> {
  const { count } = await prisma.sessaoEstudo.deleteMany({
    where: { id, ...filtroSessao(usuarioId) },
  });

  if (count === 0) {
    throw new NaoEncontradoError('Sessao', id);
  }
}
