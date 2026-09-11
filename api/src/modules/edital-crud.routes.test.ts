import request from 'supertest';
import { afterAll, describe, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

/**
 * Ciclo de vida completo do edital: criar, ler, alterar e apagar cada nivel da
 * hierarquia — incluindo a prova de que o ON DELETE CASCADE realmente limpa
 * tudo abaixo do concurso.
 */
const app = createApp();
const NOME_DO_CONCURSO = `__teste_crud__ ${Date.now()}`;

afterAll(async () => {
  await prisma.concurso.deleteMany({ where: { nome: { startsWith: '__teste_crud__' } } });
  await prisma.$disconnect();
});

describe('ciclo de vida do edital', () => {
  test('percorre os quatro niveis e apaga em cascata', async () => {
    // --- Concurso
    const concurso = await request(app)
      .post('/api/concursos')
      .send({ nome: NOME_DO_CONCURSO, banca: 'Banca Alfa' })
      .expect(201);
    const concursoId = concurso.body.data.id;

    await request(app).get(`/api/concursos/${concursoId}`).expect(200);

    const renomeado = await request(app)
      .patch(`/api/concursos/${concursoId}`)
      .send({ banca: 'Banca Beta', dataProva: '2027-03-14' })
      .expect(200);
    expect(renomeado.body.data.banca).toBe('Banca Beta');

    // --- Cargo
    const cargo = await request(app)
      .post('/api/cargos')
      .send({ concursoId, nome: 'Analista' })
      .expect(201);
    const cargoId = cargo.body.data.id;

    await request(app).get(`/api/cargos/${cargoId}`).expect(200);
    await request(app).patch(`/api/cargos/${cargoId}`).send({ nome: 'Analista de TI' }).expect(200);

    // --- Disciplina
    const disciplina = await request(app)
      .post('/api/disciplinas')
      .send({ cargoId, nome: 'Banco de Dados', peso: 2.5 })
      .expect(201);
    const disciplinaId = disciplina.body.data.id;

    await request(app).get(`/api/disciplinas/${disciplinaId}`).expect(200);
    await request(app).patch(`/api/disciplinas/${disciplinaId}`).send({ peso: 3 }).expect(200);

    // --- Topico
    const topico = await request(app)
      .post('/api/topicos')
      .send({ disciplinaId, codigoEdital: '5.1', descricao: 'Modelo relacional.', ordem: 1 })
      .expect(201);
    const topicoId = topico.body.data.id;

    await request(app).get(`/api/topicos/${topicoId}`).expect(200);
    const alterado = await request(app)
      .patch(`/api/topicos/${topicoId}`)
      .send({ descricao: 'Modelo relacional e normalizacao.' })
      .expect(200);
    expect(alterado.body.data.descricao).toContain('normalizacao');

    // --- Cascata
    await request(app).delete(`/api/concursos/${concursoId}`).expect(204);

    expect(await prisma.topico.findUnique({ where: { id: topicoId } })).toBeNull();
    expect(await prisma.disciplina.findUnique({ where: { id: disciplinaId } })).toBeNull();
    expect(await prisma.cargo.findUnique({ where: { id: cargoId } })).toBeNull();
  });

  test('recusa topico duplicado no mesmo codigo de edital', async () => {
    const concurso = await request(app)
      .post('/api/concursos')
      .send({ nome: `__teste_crud__ dup ${Date.now()}` })
      .expect(201);
    const cargo = await request(app)
      .post('/api/cargos')
      .send({ concursoId: concurso.body.data.id, nome: 'Cargo' })
      .expect(201);
    const disciplina = await request(app)
      .post('/api/disciplinas')
      .send({ cargoId: cargo.body.data.id, nome: 'Redes' })
      .expect(201);

    const corpo = {
      disciplinaId: disciplina.body.data.id,
      codigoEdital: '1.1',
      descricao: 'Modelo OSI.',
    };

    await request(app).post('/api/topicos').send(corpo).expect(201);

    const conflito = await request(app).post('/api/topicos').send(corpo).expect(409);
    expect(conflito.body.error).toContain('codigo de edital');

    await request(app).delete(`/api/concursos/${concurso.body.data.id}`).expect(204);
  });

  test('recusa id invalido na URL', async () => {
    await request(app).get('/api/concursos/abc').expect(400);
    await request(app).get('/api/topicos/-1').expect(400);
  });

  test('recusa payload sem os campos obrigatorios', async () => {
    const resposta = await request(app).post('/api/concursos').send({ nome: 'ab' }).expect(400);

    expect(resposta.body.detalhes.fieldErrors).toHaveProperty('nome');
  });
});

describe('GET /api/health', () => {
  test('confirma que a API alcanca o banco', async () => {
    const resposta = await request(app).get('/api/health').expect(200);

    expect(resposta.body.data.banco.conectado).toBe(true);
  });
});
