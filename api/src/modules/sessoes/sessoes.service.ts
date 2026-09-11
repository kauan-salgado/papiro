import { NaoEncontradoError, RequisicaoInvalidaError } from '../../http/erros.js';
import {
  filtroCargo,
  filtroDisciplina,
  filtroSessao,
  filtroSimulado,
  filtroTopico,
} from '../../http/posse.js';
import { formatarDataISO, paraDataDoBanco } from '../../lib/datas.js';
import { prisma } from '../../lib/prisma.js';
import type { CriarSessao } from './sessoes.schema.js';

/** A API devolve data como YYYY-MM-DD; o horario da coluna DATE nao interessa. */
function paraDTO<T extends { data: Date }>(sessao: T) {
  return { ...sessao, data: formatarDataISO(sessao.data) };
}

const SELECAO_PADRAO = {
  id: true,
  cargoId: true,
  disciplinaId: true,
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
  // De onde veio a sessao, quando veio de um item do edital: o historico da
  // disciplina mistura os dois niveis e precisa dizer qual e qual.
  topico: { select: { id: true, codigoEdital: true, descricao: true } },
  disciplina: { select: { id: true, nome: true } },
} as const;

/**
 * Regra que o banco nao tem como impor sozinho: simulado e sessao precisam
 * pertencer ao mesmo cargo. Sem esta checagem seria possivel pendurar uma
 * sessao de um edital em um simulado de outro, e o consolidado do
 * simulado passaria a somar questoes de outro concurso.
 */
async function garantirSimuladoDoMesmoCargo(
  cargoId: number,
  simuladoId: number,
  usuarioId: number,
): Promise<void> {
  const simulado = await prisma.simulado.findFirst({
    where: { id: simuladoId, ...filtroSimulado(usuarioId) },
    select: { cargoId: true },
  });

  if (!simulado) {
    throw new RequisicaoInvalidaError(`Simulado ${simuladoId} nao encontrado.`);
  }

  if (cargoId !== simulado.cargoId) {
    throw new RequisicaoInvalidaError(
      'O simulado pertence a outro cargo; ele nao pode agrupar sessoes deste topico.',
    );
  }
}

/** Os tres niveis em que um estudo pode entrar. */
type Alvo = { cargoId: number; disciplinaId: number | null; topicoId: number | null };

/**
 * Descobre em que nivel a sessao entra e confere a posse na mesma consulta.
 *
 * Os niveis acima sao derivados, nunca aceitos do cliente: mandar topico de uma
 * disciplina e disciplina de outra seria incoerente, e a chave estrangeira
 * composta do banco recusaria — melhor nem chegar la.
 */
async function resolverAlvo(dados: CriarSessao, usuarioId: number): Promise<Alvo> {
  const informados = [dados.topicoId, dados.disciplinaId, dados.cargoId].filter(
    (valor) => valor !== undefined,
  );

  if (informados.length !== 1) {
    throw new RequisicaoInvalidaError(
      'Informe exatamente um alvo: topicoId, disciplinaId ou cargoId.',
    );
  }

  if (dados.topicoId !== undefined) {
    const topico = await prisma.topico.findFirst({
      where: { id: dados.topicoId, ...filtroTopico(usuarioId) },
      select: { id: true, disciplinaId: true, disciplina: { select: { cargoId: true } } },
    });

    if (!topico) {
      throw new NaoEncontradoError('Topico', dados.topicoId);
    }

    return {
      cargoId: topico.disciplina.cargoId,
      disciplinaId: topico.disciplinaId,
      topicoId: topico.id,
    };
  }

  if (dados.disciplinaId !== undefined) {
    const disciplina = await prisma.disciplina.findFirst({
      where: { id: dados.disciplinaId, ...filtroDisciplina(usuarioId) },
      select: { id: true, cargoId: true },
    });

    if (!disciplina) {
      throw new NaoEncontradoError('Disciplina', dados.disciplinaId);
    }

    return { cargoId: disciplina.cargoId, disciplinaId: disciplina.id, topicoId: null };
  }

  const cargo = await prisma.cargo.findFirst({
    where: { id: dados.cargoId, ...filtroCargo(usuarioId) },
    select: { id: true },
  });

  if (!cargo) {
    throw new NaoEncontradoError('Cargo', dados.cargoId ?? 0);
  }

  return { cargoId: cargo.id, disciplinaId: null, topicoId: null };
}

export async function registrarSessao(dados: CriarSessao, usuarioId: number) {
  const alvo = await resolverAlvo(dados, usuarioId);

  if (dados.simuladoId) {
    await garantirSimuladoDoMesmoCargo(alvo.cargoId, dados.simuladoId, usuarioId);
  }

  const sessao = await prisma.sessaoEstudo.create({
    data: {
      cargoId: alvo.cargoId,
      disciplinaId: alvo.disciplinaId,
      topicoId: alvo.topicoId,
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

/**
 * Historico da materia inteira: as baterias avulsas E o estudo dos itens.
 *
 * E a mesma leitura que o numero ao lado do nome da disciplina faz — se a
 * estatistica soma os dois niveis, o historico que a explica tambem precisa
 * somar, senao os valores nao fecham para quem confere.
 */
export async function listarSessoesDaDisciplina(disciplinaId: number, usuarioId: number) {
  const sessoes = await prisma.sessaoEstudo.findMany({
    where: { disciplinaId, ...filtroSessao(usuarioId) },
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
    select: SELECAO_PADRAO,
  });

  return sessoes.map(paraDTO);
}

/**
 * Historico do edital inteiro: simulados, baterias de materia e estudo de item.
 *
 * Mesma regra do painel da disciplina — o historico mostra tudo que a estatistica
 * do nivel soma. Cada linha diz de onde veio (item ou materia), senao a lista
 * viraria um amontoado sem contexto.
 */
export async function listarSessoesDoCargo(cargoId: number, usuarioId: number) {
  const sessoes = await prisma.sessaoEstudo.findMany({
    where: { cargoId, ...filtroSessao(usuarioId) },
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
    select: SELECAO_PADRAO,
  });

  return sessoes.map(paraDTO);
}
