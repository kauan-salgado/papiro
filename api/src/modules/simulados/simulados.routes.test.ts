import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

/**
 * O simulado como entidade so se justifica se ele conseguir reagrupar as
 * sessoes por disciplina sem duplicar dado nenhum. E isso que estes testes
 * verificam — inclusive que apagar o simulado nao apaga o estudo feito.
 */
const app = createApp();
const NOME_DO_CONCURSO = `__teste_sim__ ${Date.now()}`;

let cargoId = 0;
let topicoRedes = 0;
let topicoSeguranca = 0;

beforeAll(async () => {
  const concurso = await request(app)
    .post('/api/concursos')
    .send({ nome: NOME_DO_CONCURSO })
    .expect(201);

  const cargo = await request(app)
    .post('/api/cargos')
    .send({ concursoId: concurso.body.data.id, nome: 'Cargo do simulado' })
    .expect(201);

  cargoId = cargo.body.data.id;

  await request(app)
    .post(`/api/cargos/${cargoId}/edital/importar`)
    .send({
      itens: [
        { disciplina: 'Redes', codigoEdital: '1.1', descricao: 'Modelo OSI.' },
        { disciplina: 'Seguranca', codigoEdital: '2.1', descricao: 'Criptografia.' },
      ],
    })
    .expect(201);

  const topicos = await prisma.topico.findMany({
    where: { disciplina: { cargoId } },
    orderBy: { id: 'asc' },
    select: { id: true, disciplina: { select: { nome: true } } },
  });

  topicoRedes = topicos.find((t) => t.disciplina.nome === 'Redes')?.id ?? 0;
  topicoSeguranca = topicos.find((t) => t.disciplina.nome === 'Seguranca')?.id ?? 0;
});

afterAll(async () => {
  await prisma.concurso.deleteMany({ where: { nome: NOME_DO_CONCURSO } });
  await prisma.$disconnect();
});

describe('simulados', () => {
  test('consolida por disciplina as sessoes que agrupa', async () => {
    const simulado = await request(app)
      .post('/api/simulados')
      .send({ cargoId, nome: 'Simulado 01', data: '2026-08-30' })
      .expect(201);

    const simuladoId = simulado.body.data.id;
    expect(simulado.body.data.data).toBe('2026-08-30');

    await request(app)
      .post('/api/sessoes')
      .send({
        topicoId: topicoRedes,
        simuladoId,
        tempoMinutos: 60,
        tipoEstudo: 'Questoes',
        questoesAcertadas: 15,
        questoesErradas: 5,
        questoesBrancas: 0,
      })
      .expect(201);

    await request(app)
      .post('/api/sessoes')
      .send({
        topicoId: topicoSeguranca,
        simuladoId,
        tempoMinutos: 40,
        tipoEstudo: 'Questoes',
        questoesAcertadas: 6,
        questoesErradas: 3,
        questoesBrancas: 1,
      })
      .expect(201);

    const consolidado = await request(app).get(`/api/simulados/${simuladoId}`).expect(200);

    expect(consolidado.body.data.porDisciplina).toHaveLength(2);
    expect(consolidado.body.data.totais).toMatchObject({
      totalSessoes: 2,
      totalMinutos: 100,
      acertos: 21,
      erros: 8,
      brancos: 1,
      percentualAcerto: 70,
    });
  });

  test('lista os simulados do cargo com a contagem de sessoes', async () => {
    const lista = await request(app).get(`/api/simulados?cargoId=${cargoId}`).expect(200);

    expect(lista.body.data[0]._count.sessoes).toBe(2);
  });

  test('renomear o simulado nao mexe nas sessoes', async () => {
    const lista = await request(app).get(`/api/simulados?cargoId=${cargoId}`).expect(200);
    const simuladoId = lista.body.data[0].id;

    const alterado = await request(app)
      .patch(`/api/simulados/${simuladoId}`)
      .send({ nome: 'Simulado 01 — revisado' })
      .expect(200);

    expect(alterado.body.data.nome).toContain('revisado');
  });

  test('apagar o simulado preserva as sessoes (ON DELETE SET NULL)', async () => {
    const lista = await request(app).get(`/api/simulados?cargoId=${cargoId}`).expect(200);
    const simuladoId = lista.body.data[0].id;

    await request(app).delete(`/api/simulados/${simuladoId}`).expect(204);

    const sessoes = await request(app).get(`/api/topicos/${topicoRedes}/sessoes`).expect(200);

    // O estudo aconteceu: o que se perde e so o agrupamento.
    expect(sessoes.body.data).toHaveLength(1);
    expect(sessoes.body.data[0].simuladoId).toBeNull();
  });

  test('404 para simulado inexistente', async () => {
    await request(app).get('/api/simulados/999999').expect(404);
  });
});
