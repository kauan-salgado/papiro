import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { como, criarUsuarioDeTeste, removerUsuarioDeTeste } from '../test/apoio.js';

/**
 * Ciclo de vida completo do edital: criar, ler, alterar e apagar cada nivel da
 * hierarquia — incluindo a prova de que o ON DELETE CASCADE realmente limpa
 * tudo abaixo do concurso.
 */
const app = createApp();

let eu: ReturnType<typeof como>;
let usuarioId = 0;
const NOME_DO_CONCURSO = `__teste_crud__ ${Date.now()}`;

beforeAll(async () => {
  const autenticado = await criarUsuarioDeTeste('crud');
  eu = como(app, autenticado.cookie);
  usuarioId = autenticado.usuario.id;
});

afterAll(async () => {
  await removerUsuarioDeTeste(usuarioId);
  await prisma.$disconnect();
});

describe('ciclo de vida do edital', () => {
  test('percorre os quatro niveis e apaga em cascata', async () => {
    // --- Concurso
    const concurso = await eu
      .post('/api/concursos')
      .send({ nome: NOME_DO_CONCURSO, banca: 'Banca Alfa' })
      .expect(201);
    const concursoId = concurso.body.data.id;

    await eu.get(`/api/concursos/${concursoId}`).expect(200);

    const renomeado = await eu
      .patch(`/api/concursos/${concursoId}`)
      .send({ banca: 'Banca Beta', dataProva: '2027-03-14' })
      .expect(200);
    expect(renomeado.body.data.banca).toBe('Banca Beta');

    // --- Cargo
    const cargo = await eu
      .post('/api/cargos')
      .send({ concursoId, nome: 'Analista' })
      .expect(201);
    const cargoId = cargo.body.data.id;

    await eu.get(`/api/cargos/${cargoId}`).expect(200);
    await eu.patch(`/api/cargos/${cargoId}`).send({ nome: 'Analista de TI' }).expect(200);

    // --- Disciplina
    const disciplina = await eu
      .post('/api/disciplinas')
      .send({ cargoId, nome: 'Banco de Dados', peso: 2.5 })
      .expect(201);
    const disciplinaId = disciplina.body.data.id;

    await eu.get(`/api/disciplinas/${disciplinaId}`).expect(200);
    await eu.patch(`/api/disciplinas/${disciplinaId}`).send({ peso: 3 }).expect(200);

    // --- Topico
    const topico = await eu
      .post('/api/topicos')
      .send({ disciplinaId, codigoEdital: '5.1', descricao: 'Modelo relacional.', ordem: 1 })
      .expect(201);
    const topicoId = topico.body.data.id;

    await eu.get(`/api/topicos/${topicoId}`).expect(200);
    const alterado = await eu
      .patch(`/api/topicos/${topicoId}`)
      .send({ descricao: 'Modelo relacional e normalizacao.' })
      .expect(200);
    expect(alterado.body.data.descricao).toContain('normalizacao');

    // --- Cascata
    await eu.delete(`/api/concursos/${concursoId}`).expect(204);

    expect(await prisma.topico.findUnique({ where: { id: topicoId } })).toBeNull();
    expect(await prisma.disciplina.findUnique({ where: { id: disciplinaId } })).toBeNull();
    expect(await prisma.cargo.findUnique({ where: { id: cargoId } })).toBeNull();
  });

  test('recusa topico duplicado no mesmo codigo de edital', async () => {
    const concurso = await eu
      .post('/api/concursos')
      .send({ nome: `__teste_crud__ dup ${Date.now()}` })
      .expect(201);
    const cargo = await eu
      .post('/api/cargos')
      .send({ concursoId: concurso.body.data.id, nome: 'Cargo' })
      .expect(201);
    const disciplina = await eu
      .post('/api/disciplinas')
      .send({ cargoId: cargo.body.data.id, nome: 'Redes' })
      .expect(201);

    const corpo = {
      disciplinaId: disciplina.body.data.id,
      codigoEdital: '1.1',
      descricao: 'Modelo OSI.',
    };

    await eu.post('/api/topicos').send(corpo).expect(201);

    const conflito = await eu.post('/api/topicos').send(corpo).expect(409);
    expect(conflito.body.error).toContain('codigo de edital');

    await eu.delete(`/api/concursos/${concurso.body.data.id}`).expect(204);
  });

  test('recusa id invalido na URL', async () => {
    await eu.get('/api/concursos/abc').expect(400);
    await eu.get('/api/topicos/-1').expect(400);
  });

  test('recusa payload sem os campos obrigatorios', async () => {
    const resposta = await eu.post('/api/concursos').send({ nome: 'ab' }).expect(400);

    expect(resposta.body.detalhes.fieldErrors).toHaveProperty('nome');
  });
});

describe('GET /api/health', () => {
  test('confirma que a API alcanca o banco', async () => {
    const resposta = await eu.get('/api/health').expect(200);

    expect(resposta.body.data.banco.conectado).toBe(true);
  });
});

describe('exclusão de edital pela listagem', () => {
  test('a listagem informa quantos tópicos e sessões cada cargo tem', async () => {
    // É o que a confirmação de exclusão mostra: "apagar 2 tópicos e 1 sessão?"
    const concurso = await eu
      .post('/api/concursos')
      .send({ nome: `__teste_crud__ totais ${Date.now()}` })
      .expect(201);
    const cargo = await eu
      .post('/api/cargos')
      .send({ concursoId: concurso.body.data.id, nome: 'Cargo com conteúdo' })
      .expect(201);

    await eu
      .post(`/api/cargos/${cargo.body.data.id}/edital/importar`)
      .send({
        itens: [
          { disciplina: 'Redes', codigoEdital: '1.1', descricao: 'Modelo OSI.' },
          { disciplina: 'Redes', codigoEdital: '1.2', descricao: 'IPv6.' },
        ],
      })
      .expect(201);

    const topicos = await eu.get('/api/topicos').expect(200);
    const topicoId = topicos.body.data.find(
      (t: { codigoEdital: string }) => t.codigoEdital === '1.1',
    ).id;

    await eu
      .post('/api/sessoes')
      .send({ topicoId, tempoMinutos: 30, tipoEstudo: 'Teoria' })
      .expect(201);

    const lista = await eu.get('/api/cargos').expect(200);
    const meu = lista.body.data.find((c: { id: number }) => c.id === cargo.body.data.id);

    expect(meu.totais).toEqual({ topicos: 2, sessoes: 1 });
  });

  test('apagar o único cargo leva o concurso junto', async () => {
    // Concurso sem cargo sumiria da lista e não teria como ser removido pela
    // interface — vira lixo invisível no banco.
    const concurso = await eu
      .post('/api/concursos')
      .send({ nome: `__teste_crud__ órfão ${Date.now()}` })
      .expect(201);
    const cargo = await eu
      .post('/api/cargos')
      .send({ concursoId: concurso.body.data.id, nome: 'Único cargo' })
      .expect(201);

    await eu.delete(`/api/cargos/${cargo.body.data.id}`).expect(204);

    await eu.get(`/api/concursos/${concurso.body.data.id}`).expect(404);
  });

  test('com dois cargos, apagar um preserva o concurso e o outro', async () => {
    const concurso = await eu
      .post('/api/concursos')
      .send({ nome: `__teste_crud__ dois cargos ${Date.now()}` })
      .expect(201);
    const primeiro = await eu
      .post('/api/cargos')
      .send({ concursoId: concurso.body.data.id, nome: 'Perfil A' })
      .expect(201);
    const segundo = await eu
      .post('/api/cargos')
      .send({ concursoId: concurso.body.data.id, nome: 'Perfil B' })
      .expect(201);

    await eu.delete(`/api/cargos/${primeiro.body.data.id}`).expect(204);

    const restante = await eu.get(`/api/concursos/${concurso.body.data.id}`).expect(200);
    expect(restante.body.data.cargos).toHaveLength(1);
    expect(restante.body.data.cargos[0].id).toBe(segundo.body.data.id);
  });
});
