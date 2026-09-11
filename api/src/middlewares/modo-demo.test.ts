import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { como, criarUsuarioDeTeste, removerUsuarioDeTeste } from '../test/apoio.js';

/**
 * O modo demonstracao existe para a vitrine publica sobreviver a visitantes.
 * A linha que ele traca: quem visita pode registrar estudo (o fluxo que a
 * demonstracao mostra), mas nao pode apagar o edital de ninguem.
 */
const demo = createApp({ modoDemo: true });
const normal = createApp({ modoDemo: false });

// O mesmo usuario nos dois apps: o que muda entre eles e a protecao da
// vitrine, nao quem esta pedindo.
let comoDemo: ReturnType<typeof como>;
let comoNormal: ReturnType<typeof como>;
let usuarioId = 0;

const NOME_DO_CONCURSO = `__teste_demo__ ${Date.now()}`;

let concursoId = 0;
let cargoId = 0;
let disciplinaId = 0;
let topicoId = 0;

beforeAll(async () => {
  const autenticado = await criarUsuarioDeTeste('modo-demo');
  comoDemo = como(demo, autenticado.cookie);
  comoNormal = como(normal, autenticado.cookie);
  usuarioId = autenticado.usuario.id;

  const concurso = await comoNormal
    .post('/api/concursos')
    .send({ nome: NOME_DO_CONCURSO })
    .expect(201);
  concursoId = concurso.body.data.id;

  const cargo = await comoNormal
    .post('/api/cargos')
    .send({ concursoId, nome: 'Cargo da demo' })
    .expect(201);
  cargoId = cargo.body.data.id;

  await comoNormal
    .post(`/api/cargos/${cargoId}/edital/importar`)
    .send({ itens: [{ disciplina: 'Redes', codigoEdital: '1.1', descricao: 'Modelo OSI.' }] })
    .expect(201);

  const disciplinas = await comoNormal.get(`/api/disciplinas?cargoId=${cargoId}`).expect(200);
  disciplinaId = disciplinas.body.data[0].id;

  const topicos = await comoNormal.get(`/api/topicos?disciplinaId=${disciplinaId}`).expect(200);
  topicoId = topicos.body.data[0].id;
});

afterAll(async () => {
  await removerUsuarioDeTeste(usuarioId);
  await prisma.$disconnect();
});

describe('modo demonstracao — o que ele bloqueia', () => {
  test.each([
    ['concurso', () => `/api/concursos/${concursoId}`],
    ['cargo', () => `/api/cargos/${cargoId}`],
    ['disciplina', () => `/api/disciplinas/${disciplinaId}`],
    ['topico', () => `/api/topicos/${topicoId}`],
  ])('recusa apagar %s', async (_rotulo, caminho) => {
    const resposta = await comoDemo.delete(caminho()).expect(403);

    expect(resposta.body.error).toContain('demonstração pública');
    expect(resposta.body.detalhes).toEqual({ modoDemonstracao: true });
  });

  test('recusa importacao que substitui o edital existente', async () => {
    await comoDemo
      .post(`/api/cargos/${cargoId}/edital/importar`)
      .send({ itens: [{ disciplina: 'X', codigoEdital: '9.9', descricao: 'Item.' }], substituir: true })
      .expect(403);
  });

  test('o registro continua no banco depois da tentativa', async () => {
    // 403 nao pode ser cosmetico: o dado tem de estar la.
    expect(await prisma.concurso.findUnique({ where: { id: concursoId } })).not.toBeNull();
  });
});

describe('modo demonstracao — o que ele permite', () => {
  test('registrar sessao de estudo', async () => {
    const resposta = await comoDemo
      .post('/api/sessoes')
      .send({ topicoId, tempoMinutos: 40, tipoEstudo: 'Teoria' })
      .expect(201);

    expect(resposta.body.data.id).toBeGreaterThan(0);
  });

  test('excluir a propria sessao recem-registrada', async () => {
    const criada = await comoDemo
      .post('/api/sessoes')
      .send({ topicoId, tempoMinutos: 25, tipoEstudo: 'Resumo' })
      .expect(201);

    await comoDemo.delete(`/api/sessoes/${criada.body.data.id}`).expect(204);
  });

  test('criar um edital novo e importar itens sem substituir', async () => {
    const concurso = await comoDemo
      .post('/api/concursos')
      .send({ nome: `${NOME_DO_CONCURSO} — visitante` })
      .expect(201);

    const cargo = await comoDemo
      .post('/api/cargos')
      .send({ concursoId: concurso.body.data.id, nome: 'Cargo do visitante' })
      .expect(201);

    await comoDemo
      .post(`/api/cargos/${cargo.body.data.id}/edital/importar`)
      .send({ itens: [{ disciplina: 'Redes', codigoEdital: '1.1', descricao: 'Modelo OSI.' }] })
      .expect(201);
  });

  test('ler dashboards e edital', async () => {
    await comoDemo.get(`/api/cargos/${cargoId}/edital`).expect(200);
    await comoDemo.get(`/api/dashboard/disciplinas?cargoId=${cargoId}`).expect(200);
  });
});

describe('modo desligado (uso local)', () => {
  test('apagar o proprio edital volta a funcionar', async () => {
    const concurso = await comoNormal
      .post('/api/concursos')
      .send({ nome: `${NOME_DO_CONCURSO} — local` })
      .expect(201);

    await comoNormal.delete(`/api/concursos/${concurso.body.data.id}`).expect(204);
  });
});
