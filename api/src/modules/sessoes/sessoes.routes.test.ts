import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { como, criarUsuarioDeTeste, removerUsuarioDeTeste } from '../../test/apoio.js';

/**
 * Teste de integracao: sobe o app inteiro e fala com o Postgres do compose.
 *
 * Nao usa mock de banco de proposito — metade das regras deste projeto mora em
 * CHECK constraints e views, e mock nenhum reproduz isso. O teste cria o
 * proprio concurso e o apaga no final; o CASCADE leva junto tudo que ele criou.
 */
const app = createApp();

let eu: ReturnType<typeof como>;
let usuarioId = 0;
const NOME_DO_CONCURSO = `__teste__ ${Date.now()}`;

let cargoId = 0;
let disciplinaId = 0;
let topicoId = 0;

beforeAll(async () => {
  const autenticado = await criarUsuarioDeTeste('sessoes');
  eu = como(app, autenticado.cookie);
  usuarioId = autenticado.usuario.id;

  const concurso = await eu
    .post('/api/concursos')
    .send({ nome: NOME_DO_CONCURSO, banca: 'Banca de Teste', dataProva: '2026-11-15' })
    .expect(201);

  const cargo = await eu
    .post('/api/cargos')
    .send({ concursoId: concurso.body.data.id, nome: 'Cargo de Teste' })
    .expect(201);

  cargoId = cargo.body.data.id;

  await eu
    .post(`/api/cargos/${cargoId}/edital/importar`)
    .send({
      itens: [
        { disciplina: 'Redes', codigoEdital: '1.1', descricao: 'Modelo OSI e TCP/IP.' },
        { disciplina: 'Redes', codigoEdital: '1.2', descricao: 'Enderecamento IPv4 e IPv6.' },
        { disciplina: 'Seguranca', codigoEdital: '2.1', descricao: 'Criptografia simetrica.' },
      ],
    })
    .expect(201);

  const disciplinas = await eu.get(`/api/disciplinas?cargoId=${cargoId}`).expect(200);
  disciplinaId = disciplinas.body.data.find((d: { nome: string }) => d.nome === 'Redes').id;

  const topicos = await eu.get(`/api/topicos?disciplinaId=${disciplinaId}`).expect(200);
  topicoId = topicos.body.data[0].id;
});

afterAll(async () => {
  await removerUsuarioDeTeste(usuarioId);
  await prisma.$disconnect();
});

describe('POST /api/cargos/:id/edital/importar', () => {
  test('monta a hierarquia inteira a partir da lista de itens', async () => {
    const resposta = await eu.get(`/api/cargos/${cargoId}/edital`).expect(200);
    const { disciplinas } = resposta.body.data;

    expect(disciplinas).toHaveLength(2);
    expect(disciplinas.map((d: { disciplina: string }) => d.disciplina)).toEqual([
      'Redes',
      'Seguranca',
    ]);
    expect(disciplinas[0].topicos).toHaveLength(2);
  });

  test('ignora itens repetidos em vez de duplicar o edital', async () => {
    const resposta = await eu
      .post(`/api/cargos/${cargoId}/edital/importar`)
      .send({
        itens: [{ disciplina: 'Redes', codigoEdital: '1.1', descricao: 'Modelo OSI e TCP/IP.' }],
      })
      .expect(201);

    expect(resposta.body.data.topicosCriados).toBe(0);
    expect(resposta.body.data.topicosIgnorados).toBe(1);
  });
});

describe('POST /api/sessoes', () => {
  test('registra uma sessao de Teoria e devolve a data em YYYY-MM-DD', async () => {
    const resposta = await eu
      .post('/api/sessoes')
      .send({ topicoId, data: '2026-09-10', tempoMinutos: 50, tipoEstudo: 'Teoria' })
      .expect(201);

    expect(resposta.body.data.data).toBe('2026-09-10');
    expect(resposta.body.data.questoesAcertadas).toBeNull();
  });

  test('recusa sessao de Questoes sem os contadores, com erro por campo', async () => {
    const resposta = await eu
      .post('/api/sessoes')
      .send({ topicoId, tempoMinutos: 30, tipoEstudo: 'Questoes' })
      .expect(400);

    expect(resposta.body.detalhes.fieldErrors).toHaveProperty('questoesAcertadas');
  });

  test('recusa contadores em sessao que nao e de Questoes', async () => {
    await eu
      .post('/api/sessoes')
      .send({ topicoId, tempoMinutos: 30, tipoEstudo: 'Resumo', questoesAcertadas: 5 })
      .expect(400);
  });

  test('recusa vinculo a simulado de outro cargo', async () => {
    // O outro cargo e criado aqui, e nao procurado no banco: teste que depende
    // do seed passa na maquina de quem semeou e falha no CI com banco limpo.
    const outroConcurso = await eu
      .post('/api/concursos')
      .send({ nome: `${NOME_DO_CONCURSO} — vizinho` })
      .expect(201);

    const outroCargo = await eu
      .post('/api/cargos')
      .send({ concursoId: outroConcurso.body.data.id, nome: 'Cargo vizinho' })
      .expect(201);

    const simuladoAlheio = await eu
      .post('/api/simulados')
      .send({ cargoId: outroCargo.body.data.id, nome: '__teste__ simulado alheio' })
      .expect(201);

    const resposta = await eu
      .post('/api/sessoes')
      .send({ topicoId, tempoMinutos: 30, tipoEstudo: 'Teoria', simuladoId: simuladoAlheio.body.data.id })
      .expect(400);

    expect(resposta.body.error).toContain('outro cargo');

    await eu.delete(`/api/concursos/${outroConcurso.body.data.id}`).expect(204);
  });
});

describe('CHECK constraint do Postgres', () => {
  test('rejeita sessao invalida mesmo contornando a API', async () => {
    // Esta e a razao de a regra nao viver so no formulario.
    const gravar = prisma.sessaoEstudo.create({
      data: { topicoId, tempoMinutos: 30, tipoEstudo: 'Questoes' },
    });

    await expect(gravar).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
  });
});

describe('Dashboards', () => {
  test('o agregado sobe ao registrar e volta ao excluir a sessao', async () => {
    const antes = await eu
      .get(`/api/dashboard/topicos/${disciplinaId}`)
      .expect(200);
    const minutosAntes = antes.body.data.find(
      (t: { topicoId: number }) => t.topicoId === topicoId,
    ).totalMinutos;

    const criada = await eu
      .post('/api/sessoes')
      .send({
        topicoId,
        tempoMinutos: 90,
        tipoEstudo: 'Questoes',
        questoesAcertadas: 8,
        questoesErradas: 2,
        questoesBrancas: 0,
      })
      .expect(201);

    const durante = await eu.get(`/api/dashboard/topicos/${disciplinaId}`).expect(200);
    const linha = durante.body.data.find((t: { topicoId: number }) => t.topicoId === topicoId);

    expect(linha.totalMinutos).toBe(minutosAntes + 90);
    expect(linha.percentualAcerto).toBe(80);

    await eu.delete(`/api/sessoes/${criada.body.data.id}`).expect(204);

    const depois = await eu.get(`/api/dashboard/topicos/${disciplinaId}`).expect(200);
    const linhaDepois = depois.body.data.find(
      (t: { topicoId: number }) => t.topicoId === topicoId,
    );

    // Fact table: o agregado e soma de fatos, entao excluir a sessao o desfaz.
    // Com contador mutavel no topico, este numero teria ficado inflado.
    expect(linhaDepois.totalMinutos).toBe(minutosAntes);
  });

  test('a visao macro traz o cargo com suas disciplinas', async () => {
    const resposta = await eu
      .get(`/api/dashboard/disciplinas?cargoId=${cargoId}`)
      .expect(200);

    expect(resposta.body.data).toHaveLength(2);
    expect(resposta.body.data[0]).toHaveProperty('percentualAcerto');
  });
});
