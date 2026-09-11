import { prisma } from '../../lib/prisma.js';
import { editalAnalistaSeguranca } from './dados/edital-analista-seguranca.js';
import { editalPeritoComputacao } from './dados/edital-perito-computacao.js';
import { gerarSessoesDemo } from './dados/sessoes-demo.js';
import type { EditalSeed, ItemEdital } from './dados/tipos.js';

const EDITAIS: readonly EditalSeed[] = [editalPeritoComputacao, editalAnalistaSeguranca];

export type ResultadoExemplos = {
  readonly concursosCriados: number;
  readonly topicosCriados: number;
  readonly sessoesCriadas: number;
  readonly jaExistiam: number;
};

function agruparPorDisciplina(
  itens: readonly ItemEdital[],
): ReadonlyMap<string, readonly ItemEdital[]> {
  return itens.reduce((grupos, item) => {
    const acumulados = grupos.get(item.disciplina) ?? [];
    return new Map(grupos).set(item.disciplina, [...acumulados, item]);
  }, new Map<string, readonly ItemEdital[]>());
}

/**
 * Copia os editais de exemplo para a conta de quem pediu.
 *
 * Conta nova comeca vazia, e tela vazia nao mostra o que o projeto faz: o
 * dashboard so diz alguma coisa quando ha historico. Por isso vem junto um
 * estudo ficticio — deterministico, para a experiencia ser a mesma para todo
 * mundo que clicar.
 *
 * Idempotente: se o edital ja esta na conta, ele e pulado em vez de duplicado.
 * O botao fica seguro contra o clique duplo e contra a segunda visita.
 */
export async function carregarExemplos(usuarioId: number): Promise<ResultadoExemplos> {
  let concursosCriados = 0;
  let topicosCriados = 0;
  let sessoesCriadas = 0;
  let jaExistiam = 0;

  for (const [indice, edital] of EDITAIS.entries()) {
    const existente = await prisma.concurso.findFirst({
      where: { usuarioId, nome: edital.concurso.nome },
      select: { id: true },
    });

    if (existente) {
      jaExistiam += 1;
      continue;
    }

    const disciplinas = [...agruparPorDisciplina(edital.itens)].map(([nome, itens]) => ({
      nome,
      peso: edital.pesos?.[nome] ?? 1,
      topicos: {
        create: itens.map((item, posicao) => ({
          codigoEdital: item.codigoEdital,
          descricao: item.descricao,
          ordem: posicao + 1,
        })),
      },
    }));

    const concurso = await prisma.concurso.create({
      data: {
        usuarioId,
        nome: edital.concurso.nome,
        banca: edital.concurso.banca,
        dataProva: edital.concurso.dataProva ? new Date(edital.concurso.dataProva) : null,
        cargos: { create: { nome: edital.cargo.nome, disciplinas: { create: disciplinas } } },
      },
      include: { cargos: { select: { id: true } } },
    });

    const cargoId = concurso.cargos[0]?.id;

    if (cargoId === undefined) {
      continue;
    }

    concursosCriados += 1;
    topicosCriados += edital.itens.length;

    const topicos = await prisma.topico.findMany({
      where: { disciplina: { cargoId } },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    const simulado = await prisma.simulado.create({
      data: { cargoId, nome: 'Simulado diagnóstico', data: new Date() },
    });

    const sessoes = gerarSessoesDemo(
      topicos.map((topico) => topico.id),
      20260911 + indice,
    );

    const { count } = await prisma.sessaoEstudo.createMany({
      data: sessoes.map(({ noSimulado, ...sessao }) => ({
        ...sessao,
        simuladoId: noSimulado ? simulado.id : null,
      })),
    });

    sessoesCriadas += count;
  }

  return { concursosCriados, topicosCriados, sessoesCriadas, jaExistiam };
}
