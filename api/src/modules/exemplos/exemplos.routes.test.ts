import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { como, criarUsuarioDeTeste, removerUsuarioDeTeste } from '../../test/apoio.js';

/**
 * Conta nova comeca vazia, e tela vazia nao mostra o que o projeto faz. Este
 * botao existe para a primeira visita ja ter o que olhar — na conta de quem
 * clicou, e so nela.
 */
const app = createApp();

let eu: ReturnType<typeof como>;
let outro: ReturnType<typeof como>;
let usuarioId = 0;
let outroId = 0;

beforeAll(async () => {
  const autenticado = await criarUsuarioDeTeste('exemplos');
  eu = como(app, autenticado.cookie);
  usuarioId = autenticado.usuario.id;

  const vizinho = await criarUsuarioDeTeste('exemplos-vizinho');
  outro = como(app, vizinho.cookie);
  outroId = vizinho.usuario.id;
});

afterAll(async () => {
  await removerUsuarioDeTeste(usuarioId);
  await removerUsuarioDeTeste(outroId);
  await prisma.$disconnect();
});

describe('POST /api/exemplos', () => {
  test('enche a conta vazia com os dois editais e um historico', async () => {
    const antes = await eu.get('/api/concursos').expect(200);
    expect(antes.body.data).toHaveLength(0);

    const resposta = await eu.post('/api/exemplos').send({}).expect(201);

    expect(resposta.body.data.concursosCriados).toBe(2);
    expect(resposta.body.data.topicosCriados).toBe(70);
    expect(resposta.body.data.sessoesCriadas).toBeGreaterThan(0);
  });

  test('o dashboard deixa de estar vazio', async () => {
    const cargos = await eu.get('/api/cargos').expect(200);
    const cargoId = cargos.body.data[0].id;

    const desempenho = await eu.get(`/api/dashboard/disciplinas?cargoId=${cargoId}`).expect(200);

    expect(desempenho.body.data.length).toBeGreaterThan(0);
    expect(desempenho.body.data.some((l: { totalMinutos: number }) => l.totalMinutos > 0)).toBe(true);
  });

  test('clicar de novo nao duplica nada', async () => {
    const resposta = await eu.post('/api/exemplos').send({}).expect(201);

    expect(resposta.body.data).toMatchObject({ concursosCriados: 0, jaExistiam: 2 });

    const concursos = await eu.get('/api/concursos').expect(200);
    expect(concursos.body.data).toHaveLength(2);
  });

  test('os exemplos vao para a conta de quem pediu, e nao para a do vizinho', async () => {
    const doVizinho = await outro.get('/api/concursos').expect(200);

    expect(doVizinho.body.data).toHaveLength(0);
  });

  test('exige sessao', async () => {
    const { default: request } = await import('supertest');
    await request(app).post('/api/exemplos').send({}).expect(401);
  });
});
