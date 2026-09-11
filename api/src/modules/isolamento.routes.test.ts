import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { como, criarUsuarioDeTeste, removerUsuarioDeTeste } from '../test/apoio.js';

/**
 * O teste que justifica as contas existirem.
 *
 * Cada rota recebe um id que existe, e valido, e pertence a OUTRA pessoa. A
 * resposta certa e 404 — nao 403: dizer "existe, mas nao e seu" ja entrega
 * informacao a quem nao deveria te-la. E, sobretudo, nao pode ser 200.
 *
 * E a classe de falha mais comum em APIs com dono (IDOR): a rota valida o
 * formato do id, esquece de conferir a posse, e qualquer pessoa le o dado
 * alheio trocando um numero na URL.
 */
const app = createApp();

let alice: Awaited<ReturnType<typeof criarUsuarioDeTeste>>;
let bob: Awaited<ReturnType<typeof criarUsuarioDeTeste>>;
let comoAlice: ReturnType<typeof como>;
let comoBob: ReturnType<typeof como>;

/** Ids que pertencem a Alice — Bob vai tentar alcancar cada um deles. */
const deAlice = { concurso: 0, cargo: 0, disciplina: 0, topico: 0, simulado: 0, sessao: 0 };

beforeAll(async () => {
  alice = await criarUsuarioDeTeste('alice');
  bob = await criarUsuarioDeTeste('bob');
  comoAlice = como(app, alice.cookie);
  comoBob = como(app, bob.cookie);

  const concurso = await comoAlice
    .post('/api/concursos')
    .send({ nome: 'Edital da Alice' })
    .expect(201);
  deAlice.concurso = concurso.body.data.id;

  const cargo = await comoAlice
    .post('/api/cargos')
    .send({ concursoId: deAlice.concurso, nome: 'Cargo da Alice' })
    .expect(201);
  deAlice.cargo = cargo.body.data.id;

  await comoAlice
    .post(`/api/cargos/${deAlice.cargo}/edital/importar`)
    .send({ itens: [{ disciplina: 'Redes', codigoEdital: '1.1', descricao: 'Modelo OSI.' }] })
    .expect(201);

  const disciplinas = await comoAlice.get(`/api/disciplinas?cargoId=${deAlice.cargo}`).expect(200);
  deAlice.disciplina = disciplinas.body.data[0].id;

  const topicos = await comoAlice
    .get(`/api/topicos?disciplinaId=${deAlice.disciplina}`)
    .expect(200);
  deAlice.topico = topicos.body.data[0].id;

  const simulado = await comoAlice
    .post('/api/simulados')
    .send({ cargoId: deAlice.cargo, nome: 'Simulado da Alice' })
    .expect(201);
  deAlice.simulado = simulado.body.data.id;

  const sessao = await comoAlice
    .post('/api/sessoes')
    .send({ topicoId: deAlice.topico, tempoMinutos: 45, tipoEstudo: 'Teoria' })
    .expect(201);
  deAlice.sessao = sessao.body.data.id;
});

afterAll(async () => {
  await removerUsuarioDeTeste(alice.usuario.id);
  await removerUsuarioDeTeste(bob.usuario.id);
  await prisma.$disconnect();
});

describe('sem sessao', () => {
  test.each([
    ['GET', '/api/concursos'],
    ['GET', '/api/cargos'],
    ['GET', '/api/dashboard/disciplinas'],
    ['POST', '/api/sessoes'],
  ])('%s %s responde 401', async (metodo, caminho) => {
    const resposta =
      metodo === 'GET' ? await request(app).get(caminho) : await request(app).post(caminho).send({});

    expect(resposta.status).toBe(401);
  });

  test('a sonda de saude continua publica', async () => {
    await request(app).get('/api/health').expect(200);
  });
});

describe('Bob nao enxerga o que e da Alice', () => {
  test('a lista de concursos dele nao traz o edital dela', async () => {
    const resposta = await comoBob.get('/api/concursos').expect(200);
    const ids = resposta.body.data.map((c: { id: number }) => c.id);

    expect(ids).not.toContain(deAlice.concurso);
  });

  test('a lista de cargos tambem nao', async () => {
    const resposta = await comoBob.get('/api/cargos').expect(200);

    expect(resposta.body.data.map((c: { id: number }) => c.id)).not.toContain(deAlice.cargo);
  });

  test('o dashboard dele nao soma as horas dela', async () => {
    const resposta = await comoBob.get('/api/dashboard/disciplinas').expect(200);
    const ids = resposta.body.data.map((l: { disciplinaId: number }) => l.disciplinaId);

    expect(ids).not.toContain(deAlice.disciplina);
  });

  test.each([
    ['concurso', () => `/api/concursos/${deAlice.concurso}`],
    ['cargo', () => `/api/cargos/${deAlice.cargo}`],
    ['edital do cargo', () => `/api/cargos/${deAlice.cargo}/edital`],
    ['disciplina', () => `/api/disciplinas/${deAlice.disciplina}`],
    ['topico', () => `/api/topicos/${deAlice.topico}`],
    ['simulado', () => `/api/simulados/${deAlice.simulado}`],
  ])('ler %s alheio devolve 404', async (_rotulo, caminho) => {
    await comoBob.get(caminho()).expect(404);
  });

  test('o historico de um topico alheio vem vazio, e nao com as sessoes dela', async () => {
    const resposta = await comoBob.get(`/api/topicos/${deAlice.topico}/sessoes`).expect(200);

    expect(resposta.body.data).toEqual([]);
  });

  test('o ranking de uma disciplina alheia vem vazio', async () => {
    const resposta = await comoBob.get(`/api/dashboard/topicos/${deAlice.disciplina}`).expect(200);

    expect(resposta.body.data).toEqual([]);
  });
});

describe('Bob nao altera nem apaga o que e da Alice', () => {
  test('renomear o concurso dela devolve 404', async () => {
    await comoBob.patch(`/api/concursos/${deAlice.concurso}`).send({ nome: 'invadido' }).expect(404);
  });

  test.each([
    ['concurso', () => `/api/concursos/${deAlice.concurso}`],
    ['cargo', () => `/api/cargos/${deAlice.cargo}`],
    ['disciplina', () => `/api/disciplinas/${deAlice.disciplina}`],
    ['topico', () => `/api/topicos/${deAlice.topico}`],
    ['simulado', () => `/api/simulados/${deAlice.simulado}`],
    ['sessao', () => `/api/sessoes/${deAlice.sessao}`],
  ])('apagar %s alheio devolve 404', async (_rotulo, caminho) => {
    await comoBob.delete(caminho()).expect(404);
  });

  test('nao consegue pendurar um cargo no edital dela', async () => {
    await comoBob
      .post('/api/cargos')
      .send({ concursoId: deAlice.concurso, nome: 'Cargo do invasor' })
      .expect(404);
  });

  test('nao consegue registrar estudo em um topico dela', async () => {
    await comoBob
      .post('/api/sessoes')
      .send({ topicoId: deAlice.topico, tempoMinutos: 30, tipoEstudo: 'Teoria' })
      .expect(404);
  });

  test('nao consegue importar edital dentro do cargo dela', async () => {
    // Corpo valido de proposito: o que tem de barrar aqui e a posse, nao a
    // validacao. Com um item malformado, o 400 do Zod esconderia o teste.
    await comoBob
      .post(`/api/cargos/${deAlice.cargo}/edital/importar`)
      .send({ itens: [{ disciplina: 'Redes', codigoEdital: '9.9', descricao: 'Invadido.' }] })
      .expect(404);
  });
});

describe('depois de todas as tentativas, os dados da Alice seguem intactos', () => {
  test('o edital dela continua com o nome, o cargo e o tópico originais', async () => {
    const concurso = await comoAlice.get(`/api/concursos/${deAlice.concurso}`).expect(200);

    expect(concurso.body.data.nome).toBe('Edital da Alice');
    expect(concurso.body.data.cargos).toHaveLength(1);

    const edital = await comoAlice.get(`/api/cargos/${deAlice.cargo}/edital`).expect(200);
    expect(edital.body.data.disciplinas[0].topicos).toHaveLength(1);
  });

  test('a sessao de estudo dela continua la, com os 45 minutos', async () => {
    const sessoes = await comoAlice.get(`/api/topicos/${deAlice.topico}/sessoes`).expect(200);

    expect(sessoes.body.data).toHaveLength(1);
    expect(sessoes.body.data[0].tempoMinutos).toBe(45);
  });
});
