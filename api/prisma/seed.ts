import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { editalAnalistaSeguranca } from './data/edital-analista-seguranca.js';
import { editalPeritoComputacao } from './data/edital-perito-computacao.js';
import { gerarSessoesDemo } from './data/sessoes-demo.js';
import type { EditalSeed, ItemEdital } from './data/tipos.js';

// ---------------------------------------------------------------------------
// Importacao em lote de editais.
//
// Cadastrar 70 itens de edital a mao, um a um, e trabalho de digitador. Este
// script recebe a lista estruturada [disciplina, codigoEdital, descricao] e
// monta a hierarquia inteira em uma unica transacao aninhada.
//
//   npm run seed           -> importa os editais
//   npm run seed -- --demo -> importa e ainda gera historico de estudo ficticio
// ---------------------------------------------------------------------------

const EDITAIS: readonly EditalSeed[] = [editalPeritoComputacao, editalAnalistaSeguranca];

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  console.error('[seed] DATABASE_URL nao definida. Copie api/.env.example para api/.env.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Preserva a ordem de aparicao das disciplinas e dos itens dentro delas. */
function agruparPorDisciplina(
  itens: readonly ItemEdital[],
): ReadonlyMap<string, readonly ItemEdital[]> {
  return itens.reduce((grupos, item) => {
    const acumulados = grupos.get(item.disciplina) ?? [];
    return new Map(grupos).set(item.disciplina, [...acumulados, item]);
  }, new Map<string, readonly ItemEdital[]>());
}

/**
 * Reimporta um edital do zero. O delete em cascata limpa cargos, disciplinas,
 * topicos e sessoes daquele concurso — rodar o seed duas vezes nao duplica nada.
 */
async function importarEdital(edital: EditalSeed): Promise<number> {
  const { count: removidos } = await prisma.concurso.deleteMany({
    where: { nome: edital.concurso.nome },
  });

  if (removidos > 0) {
    console.log(`[seed] ${edital.concurso.nome}: importacao anterior removida.`);
  }

  const disciplinas = [...agruparPorDisciplina(edital.itens)].map(([nome, itens]) => ({
    nome,
    peso: edital.pesos?.[nome] ?? 1,
    topicos: {
      create: itens.map((item, indice) => ({
        codigoEdital: item.codigoEdital,
        descricao: item.descricao,
        ordem: indice + 1,
      })),
    },
  }));

  const concurso = await prisma.concurso.create({
    data: {
      nome: edital.concurso.nome,
      banca: edital.concurso.banca,
      dataProva: edital.concurso.dataProva ? new Date(edital.concurso.dataProva) : null,
      cargos: {
        create: {
          nome: edital.cargo.nome,
          disciplinas: { create: disciplinas },
        },
      },
    },
    include: { cargos: { select: { id: true } } },
  });

  const cargoId = concurso.cargos[0]?.id;

  if (cargoId === undefined) {
    throw new Error(`[seed] cargo nao criado para ${edital.concurso.nome}`);
  }

  console.log(
    `[seed] ${edital.concurso.nome} — ${disciplinas.length} disciplinas, ${edital.itens.length} topicos.`,
  );

  return cargoId;
}

/** Historico ficticio para os dashboards terem o que mostrar antes do uso real. */
async function gerarHistoricoDemo(cargoId: number, semente: number): Promise<void> {
  const topicos = await prisma.topico.findMany({
    where: { disciplina: { cargoId } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const sessoes = gerarSessoesDemo(
    topicos.map((topico) => topico.id),
    semente,
  );

  const simulado = await prisma.simulado.create({
    data: { nome: 'Simulado diagnóstico', cargoId, data: new Date() },
  });

  await prisma.sessaoEstudo.createMany({
    data: sessoes.map(({ noSimulado, ...sessao }) => ({
      ...sessao,
      simuladoId: noSimulado ? simulado.id : null,
    })),
  });

  console.log(`[seed] cargo ${cargoId}: ${sessoes.length} sessoes de demonstracao.`);
}

async function main(): Promise<void> {
  const comDemo = process.argv.includes('--demo');

  for (const [indice, edital] of EDITAIS.entries()) {
    const cargoId = await importarEdital(edital);

    if (comDemo) {
      await gerarHistoricoDemo(cargoId, 20260911 + indice);
    }
  }

  console.log('[seed] concluido.');
}

main()
  .catch((erro: unknown) => {
    console.error('[seed] falhou:', erro);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
