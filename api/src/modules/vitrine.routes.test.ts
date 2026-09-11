import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { esquecerContaDeDemonstracao } from '../modules/auth/vitrine.service.js';
import { como, criarUsuarioDeTeste, removerUsuarioDeTeste } from '../test/apoio.js';

/**
 * A vitrine existe para quem chega sem conta ver o produto funcionando. O
 * limite dela e o ponto: o visitante enxerga a demonstracao, e so ela, e nao
 * escreve nada em lugar nenhum.
 */
const comVitrine = createApp({ vitrinePublica: true });
const semVitrine = createApp({ vitrinePublica: false });

let alice: Awaited<ReturnType<typeof criarUsuarioDeTeste>>;
let comoAlice: ReturnType<typeof como>;
let demonstracaoId = 0;
let topicoDaDemonstracao = 0;
let topicoDaAlice = 0;

beforeAll(async () => {
  esquecerContaDeDemonstracao();

  // A conta de demonstracao com um edital publico.
  const demonstracao = await prisma.usuario.upsert({
    where: { githubId: 'demonstracao' },
    create: { githubId: 'demonstracao', login: 'demonstracao', nome: 'Conta de demonstração' },
    update: {},
  });
  demonstracaoId = demonstracao.id;

  const concurso = await prisma.concurso.create({
    data: {
      usuarioId: demonstracaoId,
      nome: '__vitrine__ Edital público',
      cargos: {
        create: {
          nome: 'Cargo público',
          disciplinas: {
            create: { nome: 'Redes', topicos: { create: { descricao: 'Modelo OSI.' } } },
          },
        },
      },
    },
    include: { cargos: { include: { disciplinas: { include: { topicos: true } } } } },
  });
  topicoDaDemonstracao = concurso.cargos[0]!.disciplinas[0]!.topicos[0]!.id;

  // E uma conta comum, que o visitante nao pode alcancar.
  alice = await criarUsuarioDeTeste('vitrine-alice');
  comoAlice = como(comVitrine, alice.cookie);

  const dela = await comoAlice
    .post('/api/concursos')
    .send({ nome: '__vitrine__ Edital privado da Alice' })
    .expect(201);
  const cargo = await comoAlice
    .post('/api/cargos')
    .send({ concursoId: dela.body.data.id, nome: 'Cargo da Alice' })
    .expect(201);
  await comoAlice
    .post(`/api/cargos/${cargo.body.data.id}/edital/importar`)
    .send({ itens: [{ disciplina: 'Redes', codigoEdital: '1.1', descricao: 'Item da Alice.' }] })
    .expect(201);
  const topicos = await comoAlice.get('/api/topicos').expect(200);
  topicoDaAlice = topicos.body.data[0].id;
});

afterAll(async () => {
  await prisma.concurso.deleteMany({ where: { nome: { startsWith: '__vitrine__' } } });
  await removerUsuarioDeTeste(alice.usuario.id);
  esquecerContaDeDemonstracao();
  await prisma.$disconnect();
});

describe('visitante com a vitrine aberta', () => {
  test('ve o edital da demonstracao sem entrar', async () => {
    const resposta = await request(comVitrine).get('/api/concursos').expect(200);
    const nomes = resposta.body.data.map((c: { nome: string }) => c.nome);

    expect(nomes).toContain('__vitrine__ Edital público');
  });

  test('ve o dashboard da demonstracao', async () => {
    await request(comVitrine).get('/api/dashboard/disciplinas').expect(200);
  });

  test('continua sendo tratado como deslogado em /auth/eu', async () => {
    // Se dissesse que ha alguem logado, o front esconderia o botao de entrar.
    const resposta = await request(comVitrine).get('/api/auth/eu').expect(200);

    expect(resposta.body.data).toBeNull();
  });
});

describe('visitante nao enxerga conta de ninguem', () => {
  test('o edital privado da Alice nao aparece na vitrine', async () => {
    const resposta = await request(comVitrine).get('/api/concursos').expect(200);
    const nomes = resposta.body.data.map((c: { nome: string }) => c.nome);

    expect(nomes).not.toContain('__vitrine__ Edital privado da Alice');
  });

  test('o topico da Alice responde 404 para o visitante', async () => {
    await request(comVitrine).get(`/api/topicos/${topicoDaAlice}`).expect(404);
  });
});

describe('visitante nao escreve', () => {
  test('registrar sessao na demonstracao responde 401', async () => {
    const resposta = await request(comVitrine)
      .post('/api/sessoes')
      .send({ topicoId: topicoDaDemonstracao, tempoMinutos: 30, tipoEstudo: 'Teoria' })
      .expect(401);

    expect(resposta.body.error).toContain('Entre com o GitHub');
  });

  test.each([
    ['POST', '/api/concursos'],
    ['POST', '/api/exemplos'],
  ])('%s %s responde 401', async (_metodo, caminho) => {
    await request(comVitrine).post(caminho).send({ nome: 'Tentativa' }).expect(401);
  });

  test('apagar da demonstracao responde 401', async () => {
    await request(comVitrine).delete(`/api/topicos/${topicoDaDemonstracao}`).expect(401);
  });

  test('o topico da demonstracao continua la depois das tentativas', async () => {
    const topico = await prisma.topico.findUnique({ where: { id: topicoDaDemonstracao } });

    expect(topico).not.toBeNull();
  });
});

describe('vitrine desligada', () => {
  test('visitante volta a receber 401 na leitura', async () => {
    esquecerContaDeDemonstracao();
    await request(semVitrine).get('/api/concursos').expect(401);
  });
});
