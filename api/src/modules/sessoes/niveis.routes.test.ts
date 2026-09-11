import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { como, criarUsuarioDeTeste, removerUsuarioDeTeste } from '../../test/apoio.js';

/**
 * Nem todo estudo cabe em um item do edital.
 *
 * "Fiz 30 questões avulsas de Segurança da Informação" e "fiz um simulado" são
 * estudo de verdade, e antes exigiam escolher um tópico qualquer — o que
 * sujava a estatística daquele item com horas que não eram dele.
 */
const app = createApp();

let eu: ReturnType<typeof como>;
let usuarioId = 0;
let cargoId = 0;
let disciplinaId = 0;
let topicoId = 0;

beforeAll(async () => {
  const autenticado = await criarUsuarioDeTeste('niveis');
  eu = como(app, autenticado.cookie);
  usuarioId = autenticado.usuario.id;

  const concurso = await eu.post('/api/concursos').send({ nome: '__teste_niveis__' }).expect(201);
  const cargo = await eu
    .post('/api/cargos')
    .send({ concursoId: concurso.body.data.id, nome: 'Cargo' })
    .expect(201);
  cargoId = cargo.body.data.id;

  await eu
    .post(`/api/cargos/${cargoId}/edital/importar`)
    .send({
      itens: [
        { disciplina: 'Segurança', codigoEdital: '1.1', descricao: 'Criptografia.' },
        { disciplina: 'Segurança', codigoEdital: '1.2', descricao: 'Firewalls.' },
      ],
    })
    .expect(201);

  const disciplinas = await eu.get(`/api/disciplinas?cargoId=${cargoId}`).expect(200);
  disciplinaId = disciplinas.body.data[0].id;

  const topicos = await eu.get(`/api/topicos?disciplinaId=${disciplinaId}`).expect(200);
  topicoId = topicos.body.data[0].id;
});

afterAll(async () => {
  await removerUsuarioDeTeste(usuarioId);
  await prisma.$disconnect();
});

describe('registro na disciplina', () => {
  test('aceita bateria avulsa sem escolher tópico', async () => {
    const resposta = await eu
      .post('/api/sessoes')
      .send({
        disciplinaId,
        tempoMinutos: 60,
        tipoEstudo: 'Questoes',
        questoesAcertadas: 20,
        questoesErradas: 8,
        questoesBrancas: 2,
      })
      .expect(201);

    expect(resposta.body.data.disciplinaId).toBe(disciplinaId);
    expect(resposta.body.data.topicoId).toBeNull();
    // O cargo é derivado, nunca enviado pelo cliente.
    expect(resposta.body.data.cargoId).toBe(cargoId);
  });

  test('a bateria entra nas estatísticas da disciplina', async () => {
    const macro = await eu.get(`/api/dashboard/disciplinas?cargoId=${cargoId}`).expect(200);
    const linha = macro.body.data.find(
      (l: { disciplinaId: number }) => l.disciplinaId === disciplinaId,
    );

    expect(linha.totalMinutos).toBe(60);
    expect(linha.acertos).toBe(20);
    expect(linha.percentualAcerto).toBe(66.7);
  });

  test('mas não aparece como estudo de nenhum tópico', async () => {
    // O item 1.1 não foi estudado: sujar a estatística dele era exatamente o
    // problema que este nível resolve.
    const micro = await eu.get(`/api/dashboard/topicos/${disciplinaId}`).expect(200);

    expect(micro.body.data.every((t: { totalMinutos: number }) => t.totalMinutos === 0)).toBe(true);
  });

  test('soma com o estudo dos tópicos, e não no lugar dele', async () => {
    await eu
      .post('/api/sessoes')
      .send({ topicoId, tempoMinutos: 40, tipoEstudo: 'Teoria' })
      .expect(201);

    const macro = await eu.get(`/api/dashboard/disciplinas?cargoId=${cargoId}`).expect(200);
    const linha = macro.body.data.find(
      (l: { disciplinaId: number }) => l.disciplinaId === disciplinaId,
    );

    expect(linha.totalMinutos).toBe(100); // 60 da bateria + 40 do tópico
  });

  test('o histórico da disciplina traz só as avulsas', async () => {
    const historico = await eu.get(`/api/disciplinas/${disciplinaId}/sessoes`).expect(200);

    expect(historico.body.data).toHaveLength(1);
    expect(historico.body.data[0].tempoMinutos).toBe(60);
  });
});

describe('registro no cargo (simulado)', () => {
  test('aceita sessão sem disciplina nem tópico', async () => {
    const resposta = await eu
      .post('/api/sessoes')
      .send({
        cargoId,
        tempoMinutos: 240,
        tipoEstudo: 'Questoes',
        questoesAcertadas: 60,
        questoesErradas: 30,
        questoesBrancas: 10,
      })
      .expect(201);

    expect(resposta.body.data.disciplinaId).toBeNull();
    expect(resposta.body.data.topicoId).toBeNull();
  });

  test('não contamina a estatística de nenhuma disciplina', async () => {
    const macro = await eu.get(`/api/dashboard/disciplinas?cargoId=${cargoId}`).expect(200);
    const linha = macro.body.data.find(
      (l: { disciplinaId: number }) => l.disciplinaId === disciplinaId,
    );

    expect(linha.totalMinutos).toBe(100); // continua 100, sem os 240 do simulado
  });

  test('aparece no histórico do cargo', async () => {
    const historico = await eu.get(`/api/cargos/${cargoId}/sessoes`).expect(200);

    expect(historico.body.data).toHaveLength(1);
    expect(historico.body.data[0].tempoMinutos).toBe(240);
  });
});

describe('coerência do alvo', () => {
  test('recusa sessão sem alvo nenhum', async () => {
    const resposta = await eu
      .post('/api/sessoes')
      .send({ tempoMinutos: 30, tipoEstudo: 'Teoria' })
      .expect(400);

    expect(resposta.body.error).toContain('exatamente um alvo');
  });

  test('recusa mais de um alvo ao mesmo tempo', async () => {
    await eu
      .post('/api/sessoes')
      .send({ topicoId, disciplinaId, tempoMinutos: 30, tipoEstudo: 'Teoria' })
      .expect(400);
  });

  test('recusa disciplina de outra pessoa', async () => {
    const outro = await criarUsuarioDeTeste('niveis-vizinho');
    const dele = como(app, outro.cookie);

    await dele
      .post('/api/sessoes')
      .send({ disciplinaId, tempoMinutos: 30, tipoEstudo: 'Teoria' })
      .expect(404);

    await removerUsuarioDeTeste(outro.usuario.id);
  });

  test('exige sessão', async () => {
    await request(app).post('/api/sessoes').send({ disciplinaId, tempoMinutos: 30 }).expect(401);
  });
});
